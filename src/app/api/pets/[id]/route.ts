import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

// GET endpoint to fetch a specific pet
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const petId = params.id;

    // Verify authentication
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [userId, accountType] = authToken.split('_');

    // Fetch pet from the database
    const petResult = await query(`
      SELECT
        id,
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
      WHERE id = ? AND user_id = ?
      LIMIT 1
    `, [petId, userId]) as any[];

    if (!petResult || petResult.length === 0) {
      return NextResponse.json({
        error: 'Pet not found or you do not have permission to access it'
      }, { status: 404 });
    }

    return NextResponse.json({
      pet: petResult[0]
    });
  } catch (error) {
    console.error('Error fetching pet:', error);
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
    const petId = params.id;

    // Verify authentication
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [userId, accountType] = authToken.split('_');

    // Verify pet ownership
    const petOwnerResult = await query(`
      SELECT id FROM pets
      WHERE id = ? AND user_id = ?
      LIMIT 1
    `, [petId, userId]) as any[];

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
      WHERE id = ? AND user_id = ?
    `, [
      name,
      species,
      breed || null,
      gender || null,
      age || null,
      weight || null,
      imagePath || null,
      specialNotes || null,
      petId,
      userId
    ]);

    // Fetch updated pet
    const updatedPetResult = await query(`
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
      WHERE id = ?
      LIMIT 1
    `, [petId]) as any[];

    return NextResponse.json({
      success: true,
      pet: updatedPetResult[0],
      message: 'Pet updated successfully'
    });
  } catch (error) {
    console.error('Error updating pet:', error);
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
    const petId = params.id;

    // Verify authentication
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [userId, accountType] = authToken.split('_');

    // Verify pet ownership
    const petOwnerResult = await query(`
      SELECT id FROM pets
      WHERE id = ? AND user_id = ?
      LIMIT 1
    `, [petId, userId]) as any[];

    if (!petOwnerResult || petOwnerResult.length === 0) {
      return NextResponse.json({
        error: 'Pet not found or you do not have permission to delete it'
      }, { status: 404 });
    }

    // Delete pet from the database
    await query('DELETE FROM pets WHERE id = ?', [petId]);

    return NextResponse.json({
      success: true,
      message: 'Pet deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting pet:', error);
    return NextResponse.json({
      error: 'Failed to delete pet',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
