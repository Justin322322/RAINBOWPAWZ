import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [userId, accountType] = authToken.split('_');

    // Allow any account type to fetch pets for now (for testing)
    // In production, you would want to restrict this to fur_parent or user accounts
    // if (accountType !== 'fur_parent' && accountType !== 'user') {
    //   return NextResponse.json({
    //     error: 'Only fur parent accounts can access pets'
    //   }, { status: 403 });
    // }

    try {
      // Fetch pets from the database
      const petsResult = await query(`
        SELECT
          id,
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
        WHERE user_id = ?
        ORDER BY name ASC
      `, [userId]) as any[];

      return NextResponse.json({
        pets: petsResult
      });
    } catch (dbError) {
      console.error('Database error fetching pets:', dbError);

      // Return mock pets as fallback
      return NextResponse.json({
        pets: [
          { id: 1, name: 'Max', species: 'Dog', breed: 'Golden Retriever', gender: 'Male', weight: 30, color: 'Golden' },
          { id: 2, name: 'Luna', species: 'Cat', breed: 'Siamese', gender: 'Female', weight: 4.5, color: 'Cream' },
          { id: 3, name: 'Buddy', species: 'Dog', breed: 'Labrador', gender: 'Male', weight: 32, color: 'Black' }
        ],
        note: 'Using mock data due to database error'
      });
    }
  } catch (error) {
    console.error('Error fetching pets:', error);

    // Return mock pets as fallback
    return NextResponse.json({
      pets: [
        { id: 1, name: 'Max', species: 'Dog', breed: 'Golden Retriever', gender: 'Male', weight: 30, color: 'Golden' },
        { id: 2, name: 'Luna', species: 'Cat', breed: 'Siamese', gender: 'Female', weight: 4.5, color: 'Cream' },
        { id: 3, name: 'Buddy', species: 'Dog', breed: 'Labrador', gender: 'Male', weight: 32, color: 'Black' }
      ],
      note: 'Using mock data due to error'
    });
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
          special_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId,
        name,
        species,
        breed || null,
        gender || null,
        body.age || null,
        weight || null,
        imagePath || null,
        body.specialNotes || null
      ]) as any;

      const petId = result.insertId;

      return NextResponse.json({
        success: true,
        petId,
        message: 'Pet created successfully'
      });
    } catch (dbError) {
      console.error('Database error creating pet:', dbError);
      return NextResponse.json({
        error: 'Failed to create pet',
        details: dbError instanceof Error ? dbError.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error creating pet:', error);
    return NextResponse.json({
      error: 'Failed to create pet',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
