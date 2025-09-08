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

    // Using JSON data structure - no need for legacy column checking

    // Fetch add-ons from JSON column
    const packageQuery = `
      SELECT addons
      FROM service_packages
      WHERE package_id = ?
    `;

    const packageResult = await query(packageQuery, [packageId]) as any[];
    
    let addOns: any[] = [];
    
    if (packageResult.length > 0 && packageResult[0].addons) {
      try {
        const addonsData = typeof packageResult[0].addons === 'string' 
          ? JSON.parse(packageResult[0].addons) 
          : packageResult[0].addons;
        
        if (Array.isArray(addonsData)) {
          addOns = addonsData.map((addon: any, index: number) => ({
            id: index + 1,
            name: addon.name || addon.description,
            description: addon.description || addon.name,
            price: Number(addon.price || 0)
          }));
        }
      } catch (error) {
        console.error('Error parsing addons JSON:', error);
      }
    }

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
