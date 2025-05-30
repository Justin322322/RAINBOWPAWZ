-- Migration script to update old booking notification links
-- This script updates notification links from the old format:
-- /user/furparent_dashboard/bookings/[id]
-- to the new format:
-- /user/furparent_dashboard/bookings?bookingId=[id]

-- Update notifications that use the old booking detail URL format
UPDATE notifications 
SET link = CONCAT('/user/furparent_dashboard/bookings?bookingId=', 
                  SUBSTRING(link, LENGTH('/user/furparent_dashboard/bookings/') + 1))
WHERE link LIKE '/user/furparent_dashboard/bookings/%' 
  AND link NOT LIKE '/user/furparent_dashboard/bookings?%'
  AND link NOT LIKE '/user/furparent_dashboard/bookings/checkout%'
  AND link NOT LIKE '/user/furparent_dashboard/bookings/cart%'
  AND link REGEXP '/user/furparent_dashboard/bookings/[0-9]+$';

-- Show the updated notifications for verification
SELECT notification_id, user_id, title, link, created_at 
FROM notifications 
WHERE link LIKE '/user/furparent_dashboard/bookings?bookingId=%'
ORDER BY created_at DESC;
