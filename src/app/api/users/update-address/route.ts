import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let userId: string | null = null;
    let accountType: string | null = null;

    // Check if it's a JWT token or old format
    if (authToken.includes('.')) {
      // JWT token format
      const { decodeTokenUnsafe } = await import('@/lib/jwt');
      const payload = decodeTokenUnsafe(authToken);
      userId = payload?.userId || null;
      accountType = payload?.accountType || null;
    } else {
      // Old format fallback
      const parts = authToken.split('_');
      if (parts.length === 2) {
        userId = parts[0];
        accountType = parts[1];
      }
    }

    // Allow both fur_parent and user account types to update address
    if (accountType !== 'fur_parent' && accountType !== 'user') {
      return NextResponse.json({
        error: 'Only fur parent accounts can update address'
      }, { status: 403 });
    }

    // Get address data from request body
    const body = await request.json();
    const { address, city, state, postalCode, country } = body;

    // Validate required fields
    if (!address && !city) {
      return NextResponse.json({
        error: 'At least address or city is required'
      }, { status: 400 });
    }

    // Build the update query dynamically based on provided fields
    const updateFields = [];
    const queryParams = [];

    if (address) {
      updateFields.push('address = ?');
      queryParams.push(address);
    }

    if (city) {
      updateFields.push('city = ?');
      queryParams.push(city);
    }

    if (state) {
      updateFields.push('state = ?');
      queryParams.push(state);
    }

    if (postalCode) {
      updateFields.push('postal_code = ?');
      queryParams.push(postalCode);
    }

    if (country) {
      updateFields.push('country = ?');
      queryParams.push(country);
    }

    // Add user ID to params
    queryParams.push(userId);

    // Update user address in database
    const updateQuery = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;

    await query(updateQuery, queryParams);

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Address updated successfully'
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to update address',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
