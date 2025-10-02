import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

// Function to check if pets table exists and create it if not
async function ensurePetsTableExists() {
  try {
    // Check if the table exists
    const tableExists = await query(`
      SELECT COUNT(*) as count FROM information_schema.tables
      WHERE table_schema = 'rainbow_paws' AND table_name = 'pets'
    `);

    if (tableExists[0].count === 0) {

      // Create the pets table
      await query(`
        CREATE TABLE IF NOT EXISTS pets (
          pet_id INT AUTO_INCREMENT PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          species VARCHAR(100) NOT NULL,
          breed VARCHAR(255),
          gender VARCHAR(50),
          age VARCHAR(50),
          weight DECIMAL(8,2),
          photo_path VARCHAR(255),
          date_of_birth DATE NULL,
          date_of_death DATE NULL,
          special_notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      return true;
    }

    // Ensure new columns exist on existing table
    const columns = await query(`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pets'
    `) as Array<{ COLUMN_NAME: string }>;

    const colNames = new Set(columns.map(c => c.COLUMN_NAME));
    if (!colNames.has('date_of_birth')) {
      try { await query(`ALTER TABLE pets ADD COLUMN date_of_birth DATE NULL`); } catch {}
    }
    if (!colNames.has('date_of_death')) {
      try { await query(`ALTER TABLE pets ADD COLUMN date_of_death DATE NULL`); } catch {}
    }

    return true;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [userId, _accountType] = authToken.split('_');

    // Allow any account type to fetch pets for now (for testing)
    // In production, you would want to restrict this to fur_parent or user accounts
    // if (accountType !== 'fur_parent' && accountType !== 'user') {
    //   return NextResponse.json({
    //     error: 'Only fur parent accounts can access pets'
    //   }, { status: 403 });
    // }

    // Ensure pets table exists
    await ensurePetsTableExists();

    try {
      // Fetch pets from the database
      const petsResult = await query(`
        SELECT
          pet_id,
          name,
          species,
          breed,
          gender,
          age,
          weight,
          photo_path as image_path,
          date_of_birth,
          date_of_death,
          special_notes,
          created_at
        FROM pets
        WHERE user_id = ?
        ORDER BY name ASC
      `, [userId]) as any[];

      return NextResponse.json({
        pets: petsResult
      });
    } catch (dbError) {
      console.error('Database error fetching pets:', dbError);
      return NextResponse.json({
        error: 'Database error',
        message: 'Unable to fetch pets. Please try again later.'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('General error in pets GET route:', error);
    return NextResponse.json({
      error: 'Server error',
      message: 'An unexpected error occurred. Please try again later.'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [userId, accountType] = authToken.split('_');

    // Only allow fur_parent or user accounts to create pets
    if (accountType !== 'fur_parent' && accountType !== 'user') {
      return NextResponse.json({
        error: 'Only fur parent accounts can create pets'
      }, { status: 403 });
    }

    // Ensure pets table exists before insertion
    await ensurePetsTableExists();

    // Get pet data from request body
    const body = await request.json();

    // Extract fields with support for multiple field name formats
    const name = body.name;
    const species = body.species;
    const breed = body.breed;
    const gender = body.gender;
    const _age = body.age;
    const weight = body.weight;

    // Support multiple field names for image path
    const imagePath = body.imagePath || body.image_url || body.photoPath || body.imageUrl;
    const dateOfBirth: string | null = body.dateOfBirth || body.date_of_birth || null;
    const dateOfDeath: string | null = body.dateOfDeath || body.date_of_death || null;

    // Support multiple field names for special notes
    const _specialNotes = body.specialNotes || body.special_notes || body.notes;

    // Validate required fields
    if (!name || !species) {
      return NextResponse.json({
        error: 'Name and species are required'
      }, { status: 400 });
    }

    try {
      // Insert pet into the database
      const result = await query(`
        INSERT INTO pets (
          user_id,
          name,
          species,
          breed,
          gender,
          age,
          weight,
          photo_path,
          date_of_birth,
          date_of_death,
          special_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId,
        name,
        species,
        breed || null,
        gender || null,
        body.age || null,
        weight || null,
        imagePath || null,
        dateOfBirth || null,
        dateOfDeath || null,
        body.specialNotes || null
      ]) as any;

      const petId = result.insertId;

      return NextResponse.json({
        success: true,
        petId,
        message: 'Pet created successfully'
      });
    } catch (dbError) {
      return NextResponse.json({
        error: 'Failed to create pet',
        details: dbError instanceof Error ? dbError.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to create pet',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
