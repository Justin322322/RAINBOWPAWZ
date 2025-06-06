#!/usr/bin/env node

/**
 * Retry Failed PayMongo Refunds Script
 * 
 * This script can be run periodically (e.g., via cron job) to automatically
 * retry failed PayMongo refunds that are eligible for retry.
 * 
 * Usage:
 *   node src/scripts/retry-failed-refunds.ts
 *   
 * Or with validation:
 *   node src/scripts/retry-failed-refunds.ts --validate
 */

import { retryFailedRefunds, validatePaymentDataForRefund } from '../services/refundService';
import { query } from '../lib/db';

async function main() {
  try {
    console.log('Starting PayMongo refund retry process...');
    
    const args = process.argv.slice(2);
    const shouldValidate = args.includes('--validate') || args.includes('-v');
    
    let validationResults = { validated: 0, failed: 0 };
    
    // Optionally validate payment data first
    if (shouldValidate) {
      console.log('Validating payment data before retry...');
      
      // Get bookings with missing payment IDs
      const bookingsToValidate = await query(`
        SELECT DISTINCT sb.id
        FROM service_bookings sb
        JOIN payment_transactions pt ON sb.id = pt.booking_id
        WHERE sb.payment_method = 'gcash' 
        AND sb.payment_status = 'paid'
        AND pt.status = 'succeeded'
        AND pt.provider_transaction_id IS NULL
        AND (pt.payment_intent_id IS NOT NULL OR pt.source_id IS NOT NULL)
        LIMIT 20
      `) as any[];

      console.log(`Found ${bookingsToValidate.length} bookings with missing payment data`);

      for (const booking of bookingsToValidate) {
        try {
          console.log(`Validating payment data for booking ${booking.id}...`);
          const validated = await validatePaymentDataForRefund(booking.id);
          if (validated) {
            validationResults.validated++;
            console.log(`✓ Successfully validated booking ${booking.id}`);
          } else {
            validationResults.failed++;
            console.log(`✗ Could not validate booking ${booking.id}`);
          }
        } catch (error) {
          console.error(`Error validating booking ${booking.id}:`, error);
          validationResults.failed++;
        }
      }

      console.log(`Payment validation completed: ${validationResults.validated} validated, ${validationResults.failed} failed`);
    }

    // Retry failed refunds
    console.log('Retrying failed PayMongo refunds...');
    const retryResults = await retryFailedRefunds();

    console.log(`Retry completed: ${retryResults.success} successful, ${retryResults.failed} failed`);

    // Summary
    console.log('\n=== SUMMARY ===');
    if (shouldValidate) {
      console.log(`Payment Data Validation: ${validationResults.validated} fixed, ${validationResults.failed} failed`);
    }
    console.log(`Refund Retries: ${retryResults.success} successful, ${retryResults.failed} failed`);
    
    const totalActions = validationResults.validated + retryResults.success;
    if (totalActions > 0) {
      console.log(`\n✓ Total successful actions: ${totalActions}`);
    } else {
      console.log('\n• No actions needed - all refunds are in good state');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error in retry script:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  main();
}

export { main as retryFailedRefundsScript }; 