import { NextRequest, NextResponse } from 'next/server';
import { verifySecureAuth } from '@/lib/secureAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Use secure authentication verification
    const user = await verifySecureAuth(request);
    
    if (!user) {
      return NextResponse.json({
        authenticated: false,
        message: 'No valid authentication found'
      }, { status: 401, headers: { 'cache-control': 'no-store' } });
    }

    return NextResponse.json({
      authenticated: true,
      userId: user.userId,
      accountType: user.accountType,
    }, { headers: { 'cache-control': 'no-store' } });
  } catch (error: unknown) {
    const safeError =
      error instanceof Error
        ? { name: error.name, message: error.message }
        : { message: String(error) };
    console.error('Auth check error:', safeError);
    return NextResponse.json(
      { authenticated: false, error: 'Failed to check authentication' },
      { status: 500, headers: { 'cache-control': 'no-store' } }
    );
  }
}

