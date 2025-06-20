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
        CREATE TABLE pets (
          pet_id INT AUTO_INCREMENT PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          species VARCHAR(100) NOT NULL,
          breed VARCHAR(255),
          gender VARCHAR(50),
          age VARCHAR(50),
          weight DECIMAL(8,2),
          photo_path VARCHAR(255),
          special_notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      return true;
    }

    return true;
  } catch {
    return false;
  }
}

// GET endpoint to fetch a specific pet
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;

    // Verify authentication
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [userId, _accountType] = authToken.split('_');

    // Ensure pets table exists
    await ensurePetsTableExists();

    // Fetch pet from the database
    const petResult = await query(`
      SELECT
        pet_id,
        user_id,
        name,
        species,
        breed,
        gender,
        age,
        weight,
        photo_path as image_path,
        special_notes,
        created_at
      FROM pets
      WHERE pet_id = ? AND user_id = ?
      LIMIT 1
    `, [id, userId]) as any[];

    if (!petResult || petResult.length === 0) {
      return NextResponse.json({
        error: 'Pet not found or you do not have permission to access it'
      }, { status: 404 });
    }

    return NextResponse.json({
      pet: petResult[0]
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch pet',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT endpoint to update a pet
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;

    // Verify authentication
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [userId, _accountType] = authToken.split('_');

    // Ensure pets table exists
    await ensurePetsTableExists();

    // Verify pet ownership
    const petOwnerResult = await query(`
      SELECT pet_id FROM pets
      WHERE pet_id = ? AND user_id = ?
      LIMIT 1
    `, [id, userId]) as any[];

    if (!petOwnerResult || petOwnerResult.length === 0) {
      return NextResponse.json({
        error: 'Pet not found or you do not have permission to update it'
      }, { status: 404 });
    }

    // Get pet data from request body
    const body = await request.json();
    const {
      name,
      species,
      breed,
      gender,
      age,
      weight,
      imagePath,
      specialNotes
    } = body;

    // Validate required fields
    if (!name || !species) {
      return NextResponse.json({
        error: 'Name and species are required'
      }, { status: 400 });
    }

    // Update pet in the database
    await query(`
      UPDATE pets
      SET
        name = ?,
        species = ?,
        breed = ?,
        gender = ?,
        age = ?,
        weight = ?,
        photo_path = ?,
        special_notes = ?
      WHERE pet_id = ? AND user_id = ?
    `, [
      name,
      species,
      breed || null,
      gender || null,
      age || null,
      weight || null,
      imagePath || null,
      specialNotes || null,
      id,
      userId
    ]);

    // Fetch updated pet
    const updatedPetResult = await query(`
      SELECT
        pet_id,
        name,
        species,
        breed,
        gender,
        age,
        weight,
        photo_path as image_path,
        special_notes,
        created_at
      FROM pets
      WHERE pet_id = ?
      LIMIT 1
    `, [id]) as any[];

    return NextResponse.json({
      success: true,
      pet: updatedPetResult[0],
      message: 'Pet updated successfully'
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to update pet',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE endpoint to delete a pet
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;

    // Verify authentication
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [userId, _accountType] = authToken.split('_');

    // Ensure pets table exists
    await ensurePetsTableExists();

    // Verify pet ownership
    const petOwnerResult = await query(`
      SELECT pet_id FROM pets
      WHERE pet_id = ? AND user_id = ?
      LIMIT 1
    `, [id, userId]) as any[];

    if (!petOwnerResult || petOwnerResult.length === 0) {
      return NextResponse.json({
        error: 'Pet not found or you do not have permission to delete it'
      }, { status: 404 });
    }

    // Delete pet from the database
    await query('DELETE FROM pets WHERE pet_id = ?', [id]);

    return NextResponse.json({
      success: true,
      message: 'Pet deleted successfully'
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to delete pet',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
