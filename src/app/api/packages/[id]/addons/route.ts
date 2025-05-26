import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: packageId } = await params;

    if (!packageId) {
      return NextResponse.json({
        success: false,
        error: 'Package ID is required'
      }, { status: 400 });
    }

    // Check if package_addons table exists
    const tableCheckQuery = `
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name = 'package_addons'
    `;

    const tableCheckResult = await query(tableCheckQuery) as any[];
    const tableExists = tableCheckResult[0]?.count > 0;

    if (!tableExists) {
      return NextResponse.json({
        success: true,
        addOns: []
      });
    }

    // Fetch add-ons for the package
    const addOnsQuery = `
      SELECT addon_id as id, description, price
      FROM package_addons
      WHERE package_id = ?
      ORDER BY addon_id ASC
    `;

    const addOns = await query(addOnsQuery, [packageId]) as any[];

    return NextResponse.json({
      success: true,
      addOns
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch add-ons',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
