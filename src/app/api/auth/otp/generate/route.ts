import { NextResponse } from 'next/server';
import { generateOtp } from '@/lib/otpService';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, email } = body;

    // Validate required fields
    if (!userId || !email) {
      return NextResponse.json({
        error: 'User ID and email are required'
      }, { status: 400 });
    }

    // Get the client IP address
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';

    const result = await generateOtp({
      userId,
      email,
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
      error: 'Failed to generate OTP',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
