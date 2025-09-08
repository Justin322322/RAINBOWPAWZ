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

    // Check if package_data table exists
    const tableCheckQuery = `
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name = 'service_packages'
    `;

    const tableCheckResult = await query(tableCheckQuery) as any[];
    const tableExists = tableCheckResult[0]?.count > 0;

    if (!tableExists) {
      return NextResponse.json({
        success: true,
        addOns: []
      });
    }

    // Check which id column exists
    const idColumnExists = await query(`
      SELECT COUNT(*) as count
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
      AND table_name = 'service_packages'
      AND column_name = 'id'
    `) as any[];

    const addonIdColumnExists = await query(`
      SELECT COUNT(*) as count
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
      AND table_name = 'service_packages'
      AND column_name = 'addon_id'
    `) as any[];

    // Use appropriate id column
    let idColumn = 'addon_id';
    if (idColumnExists[0].count > 0) {
      idColumn = 'id';
    } else if (addonIdColumnExists[0].count > 0) {
      idColumn = 'addon_id';
    }

    // Fetch add-ons for the package
    const addOnsQuery = `
      SELECT ${idColumn} as id, description, price
      FROM service_packages sp, JSON_TABLE(sp.addons, '$[*]' COLUMNS (name VARCHAR(255) PATH '$.name', description TEXT PATH '$.description', price DECIMAL(10,2) PATH '$.price')) as addons
      WHERE package_id = ?
      ORDER BY ${idColumn} ASC
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
