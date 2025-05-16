require('dotenv').config();
const mysql = require('mysql2/promise');

async function createTestPackage() {
  console.log('Creating test package...');
  
  try {
    // Create a connection to the database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'rainbowpaws',
      multipleStatements: true
    });
    
    console.log('Connected to the database');
    
    // First, check if we have any service providers
    const [providers] = await connection.query(`
      SELECT id FROM service_providers LIMIT 1
    `);
    
    let providerId = 14; // Default provider ID
    
    if (providers.length > 0) {
      providerId = providers[0].id;
      console.log(`Using existing provider ID: ${providerId}`);
    } else {
      // Insert a test provider if none exists
      console.log('No providers found. Creating a test provider...');
      const [result] = await connection.query(`
        INSERT INTO service_providers (
          name, 
          city, 
          address, 
          phone, 
          service_description,
          provider_type,
          application_status
        ) VALUES (
          'Test Pet Cremation Service',
          'Balanga City',
          'Test Address, Balanga City, Bataan, Philippines',
          '123-456-7890',
          'Test pet cremation service description',
          'Pet Cremation',
          'approved'
        )
      `);
      
      providerId = result.insertId;
      console.log(`Created test provider with ID: ${providerId}`);
    }
    
    // Insert a test package with delivery_fee_per_km
    console.log('Inserting test package...');
    const [packageResult] = await connection.query(`
      INSERT INTO service_packages (
        provider_id,
        name,
        description,
        category,
        cremation_type,
        processing_time,
        price,
        delivery_fee_per_km,
        conditions,
        is_active
      ) VALUES (
        ?,
        'Test Premium Package',
        'A premium cremation package with delivery available',
        'Private',
        'Premium',
        '1-2 days',
        5000.00,
        50.00,
        'For pets up to 50 lbs. Additional fees may apply for larger pets.',
        1
      )
    `, [providerId]);
    
    const packageId = packageResult.insertId;
    console.log(`Created test package with ID: ${packageId}`);
    
    // Add some inclusions
    await connection.query(`
      INSERT INTO package_inclusions (package_id, description) VALUES
      (?, 'Premium wooden urn'),
      (?, 'Memorial certificate'),
      (?, 'Paw print impression')
    `, [packageId, packageId, packageId]);
    
    console.log('Added package inclusions');
    
    // Close the connection
    await connection.end();
    console.log('Database connection closed');
    
    console.log(`Test package created successfully with ID: ${packageId}`);
    console.log(`You can now test the checkout with provider=${providerId}&package=${packageId}`);
  } catch (error) {
    console.error('Error creating test package:', error);
    process.exit(1);
  }
}

createTestPackage(); 