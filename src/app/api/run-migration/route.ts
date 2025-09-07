import { NextResponse } from 'next/server';
import { ensureRefundsTableExists } from '@/lib/db/schema';

export async function GET() {
  try {
    console.log('🚀 Starting migration via Railway environment...');

    // The app is running in Railway environment with database access
    const success = await ensureRefundsTableExists();

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Migration completed successfully!',
        environment: 'railway'
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Migration failed'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Migration error:', error);
    return NextResponse.json({
      success: false,
      message: 'Migration failed with error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
