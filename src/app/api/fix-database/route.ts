import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Check if business_application_stats view exists
    const viewExists = await query(`
      SELECT COUNT(*) AS count
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name = 'business_application_stats'
      AND table_type = 'VIEW'
    `) as any[];

    let viewCreated = false;
    if (viewExists[0]?.count === 0) {
      // Check if service_providers table has application_status column
      const hasApplicationStatus = await query(`
        SHOW COLUMNS FROM service_providers LIKE 'application_status'
      `) as any[];

      if (hasApplicationStatus.length > 0) {
        // Create view using application_status field
        await query(`
          CREATE OR REPLACE VIEW business_application_stats AS
          SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN application_status = 'approved' THEN 1 ELSE 0 END) AS approved,
            SUM(CASE WHEN application_status = 'pending' THEN 1 ELSE 0 END) AS pending,
            SUM(CASE WHEN application_status = 'reviewing' THEN 1 ELSE 0 END) AS reviewing,
            SUM(CASE WHEN application_status = 'declined' THEN 1 ELSE 0 END) AS declined,
            SUM(CASE WHEN application_status = 'documents_required' THEN 1 ELSE 0 END) AS documents_required
          FROM
            service_providers
        `);
        viewCreated = true;
      } else {
        // Create view using verification_status field
        await query(`
          CREATE OR REPLACE VIEW business_application_stats AS
          SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN verification_status = 'verified' THEN 1 ELSE 0 END) AS approved,
            SUM(CASE
                  WHEN verification_status = 'pending' AND
                      (business_permit_path IS NULL OR government_id_path IS NULL)
                  THEN 1 ELSE 0
                END) AS pending,
            SUM(CASE
                  WHEN verification_status = 'pending' AND
                      business_permit_path IS NOT NULL AND
                      government_id_path IS NOT NULL
                  THEN 1 ELSE 0
                END) AS reviewing,
            SUM(CASE WHEN verification_status = 'rejected' OR verification_status = 'declined' THEN 1 ELSE 0 END) AS declined,
            SUM(CASE WHEN verification_status = 'documents_required' THEN 1 ELSE 0 END) AS documents_required
          FROM
            service_providers
        `);
        viewCreated = true;
      }
    }

    // Check and fix foreign key relationships
    const results = {
      viewStatus: viewCreated ? 'created' : 'already exists',
      foreignKeys: {
        providerAvailability: false,
        providerTimeSlots: false,
        passwordResetTokens: false
      }
    };

    // 1. Check provider_availability table
    try {
      const providerAvailabilityFK = await query(`
        SELECT COUNT(*) AS count
        FROM information_schema.key_column_usage
        WHERE table_schema = DATABASE()
        AND table_name = 'provider_availability'
        AND referenced_table_name = 'service_providers'
      `) as any[];

      if (providerAvailabilityFK[0]?.count === 0) {
        // Add foreign key constraint
        await query(`
          ALTER TABLE provider_availability
          ADD CONSTRAINT provider_availability_ibfk_1
          FOREIGN KEY (provider_id) REFERENCES service_providers(id)
          ON DELETE CASCADE
        `);
        results.foreignKeys.providerAvailability = true;
      }
    } catch (error) {
      // Ignore errors, as the constraint might already exist
    }

    // 2. Check provider_time_slots table
    try {
      const providerTimeSlotsFK = await query(`
        SELECT COUNT(*) AS count
        FROM information_schema.key_column_usage
        WHERE table_schema = DATABASE()
        AND table_name = 'provider_time_slots'
        AND referenced_table_name = 'service_providers'
      `) as any[];

      if (providerTimeSlotsFK[0]?.count === 0) {
        // Add foreign key constraint
        await query(`
          ALTER TABLE provider_time_slots
          ADD CONSTRAINT provider_time_slots_ibfk_1
          FOREIGN KEY (provider_id) REFERENCES service_providers(id)
          ON DELETE CASCADE
        `);
        results.foreignKeys.providerTimeSlots = true;
      }
    } catch (error) {
      // Ignore errors, as the constraint might already exist
    }

    // 3. Check password_reset_tokens table
    try {
      const passwordResetTokensFK = await query(`
        SELECT COUNT(*) AS count
        FROM information_schema.key_column_usage
        WHERE table_schema = DATABASE()
        AND table_name = 'password_reset_tokens'
        AND referenced_table_name = 'users'
      `) as any[];

      if (passwordResetTokensFK[0]?.count === 0) {
        // Add foreign key constraint
        await query(`
          ALTER TABLE password_reset_tokens
          ADD CONSTRAINT password_reset_tokens_ibfk_1
          FOREIGN KEY (user_id) REFERENCES users(id)
          ON DELETE CASCADE
        `);
        results.foreignKeys.passwordResetTokens = true;
      }
    } catch (error) {
      // Ignore errors, as the constraint might already exist
    }

    return NextResponse.json({
      success: true,
      message: 'Database connections fixed successfully',
      results
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fix database connections',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
