import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * Diagnostic endpoint to check password reset configuration
 * GET /api/auth/check-password-reset
 */
export async function GET() {
  try {
    const checks = {
      timestamp: new Date().toISOString(),
      smtp: {
        configured: false,
        host: process.env.SMTP_HOST || 'NOT SET',
        port: process.env.SMTP_PORT || 'NOT SET',
        user: process.env.SMTP_USER || 'NOT SET',
        from: process.env.SMTP_FROM || 'NOT SET',
        hasPassword: !!process.env.SMTP_PASS
      },
      database: {
        tableExists: false,
        tokenCount: 0,
        recentTokens: [] as any[],
        error: undefined as string | undefined
      }
    };

    // Check SMTP configuration
    checks.smtp.configured = !!(
      process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    );

    // Check if password_reset_tokens table exists
    try {
      const tableCheck = await query(
        `SELECT COUNT(*) as count FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = 'password_reset_tokens'`
      ) as any[];

      checks.database.tableExists = tableCheck[0].count > 0;

      if (checks.database.tableExists) {
        // Get token count
        const countResult = await query(
          'SELECT COUNT(*) as count FROM password_reset_tokens'
        ) as any[];
        checks.database.tokenCount = countResult[0].count;

        // Get recent tokens (without exposing the actual token values)
        const recentTokens = await query(
          `SELECT 
            id,
            user_id,
            created_at,
            expires_at,
            is_used,
            CASE 
              WHEN expires_at > NOW() THEN 'valid'
              ELSE 'expired'
            END as status
           FROM password_reset_tokens
           ORDER BY created_at DESC
           LIMIT 5`
        ) as any[];
        checks.database.recentTokens = recentTokens;
      }
    } catch (dbError) {
      checks.database.error = dbError instanceof Error ? dbError.message : 'Unknown error';
    }

    return NextResponse.json({
      success: true,
      checks,
      recommendations: getRecommendations(checks)
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function getRecommendations(checks: any): string[] {
  const recommendations: string[] = [];

  if (!checks.smtp.configured) {
    recommendations.push('⚠️ SMTP is not fully configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS in your environment variables.');
  }

  if (!checks.database.tableExists) {
    recommendations.push('⚠️ password_reset_tokens table does not exist. Run migrations or execute scripts/create-password-reset-table.sql');
  }

  if (checks.smtp.configured && checks.database.tableExists) {
    recommendations.push('✅ Password reset system is properly configured!');
  }

  return recommendations;
}
