import { NextResponse } from 'next/server';
import { ensureRefundsTableExists } from '@/lib/db/schema';

export async function GET() {
  try {
    console.log('🔧 Creating refunds table via API...');

    const success = await ensureRefundsTableExists();

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Refunds table created successfully!'
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Failed to create refunds table'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Error in create-refunds-table API:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
