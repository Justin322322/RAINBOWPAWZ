1. revenue here is not update accross all cremation center service provider /admin/dashboard
2. Using fallback image
Fetching reviews for provider ID: 4
Direct database check: Found 1 reviews for provider ID 4
Provider found in service_providers table: Rainbow Paws Cremation Center (ID: 4)
Executing dynamic query with provider ID: 4 (type: number)
Database query error: {
  code: 'ER_BAD_FIELD_ERROR',
  message: "Unknown column 'sp.id' in 'on clause'",
  sql: '\n' +
    '        SELECT \n' +
    '        r.*,\n' +
    "        CONCAT(u.first_name, ' ', u.last_name) as user_name,\n" +
    '        u...',
  params: [ 4 ]
}
Error with dynamic JOIN query: Error: Unknown column 'sp.id' in 'on clause'
    at R.query (C:\xampp\htdocs\app_rainbowpaws\.next\server\chunks\6101.js:5:289279)
    at o (C:\xampp\htdocs\app_rainbowpaws\.next\server\app\api\admin\create\route.js:1:776)
    at async c (C:\xampp\htdocs\app_rainbowpaws\.next\server\app\api\reviews\provider\[id]\route.js:21:12) {
  code: 'ER_BAD_FIELD_ERROR',
  errno: 1054,
  sql: '\n' +
    '        SELECT \n' +
    '        r.*,\n' +
    "        CONCAT(u.first_name, ' ', u.last_name) as user_name,\n" +
    '        u.email as user_email,\n' +
    '        r.booking_id\n' +
    '      , sb.booking_date, sp.name as service_name\n' +
    '        FROM reviews r\n' +
    '        \n' +
    '        JOIN users u ON r.user_id = u.user_id\n' +
    '        LEFT JOIN service_bookings sb ON r.booking_id = sb.id\n' +
    '       LEFT JOIN service_packages sp ON sb.package_id = sp.id\n' +
    '        WHERE r.service_provider_id = 4\n' +
    '        ORDER BY r.created_at DESC\n' +
    '      ',
  sqlState: '42S22',
  sqlMessage: "Unknown column 'sp.id' in 'on clause'"
}

3. animation of /cremation/bookings/20
is not smooth the button spin ianimation is so bad the full icon is like revolving and after clicking the button after showing the toast the page it refresh the page 4x it should not do that 