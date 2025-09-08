/**
 * Admin Refunds API
 * Provides omnipresent visibility into all refunds across the platform
 */

import { NextResponse } from 'next/server';

/**
 * GET /api/admin/refunds - Get all refunds with comprehensive filtering
 */
export async function GET() {
  return NextResponse.json({ error: 'Removed' }, { status: 410 });
}
