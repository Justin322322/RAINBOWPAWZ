import { NextResponse } from 'next/server';
import { verifyOtp } from '@/lib/otpService';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, otpCode } = body;

    // Validate required fields
    if (!userId || !otpCode) {
      return NextResponse.json({
        error: 'User ID and OTP code are required'
      }, { status: 400 });
    }

    // Get the client IP address
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';

    const result = await verifyOtp({
      userId,
      otpCode,
      ipAddress,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message
      });
    } else {
      return NextResponse.json({
        error: result.error,
        message: result.message
      }, { status: result.error === 'User not found' ? 404 : result.error === 'Too many attempts. Please try again later.' ? 429 : 400 });
    }

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to verify OTP',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
