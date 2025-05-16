require('dotenv').config();
const mysql = require('mysql2/promise');

async function createSampleBookings() {
  console.log('Starting to create sample service bookings...');
  
  try {
    // Create a connection to the database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'rainbow_paws',
      multipleStatements: true
    });
    
    console.log('Connected to the database');
    
    // Get a service provider ID
    const [providers] = await connection.query(`
      SELECT id FROM service_providers LIMIT 1
    `);
    
    if (providers.length === 0) {
      console.log('No service providers found. Creating one...');
      await connection.query(`
        INSERT INTO service_providers (name, contact_email, contact_phone, status)
        VALUES ('Sample Cremation Provider', 'sample@cremation.com', '123-456-7890', 'active')
      `);
      
      const [newProviders] = await connection.query(`SELECT LAST_INSERT_ID() as id`);
      providers.push({ id: newProviders[0].id });
    }
    
    // Get a package ID or create one
    const [packages] = await connection.query(`
      SELECT id, price FROM service_packages LIMIT 1
    `);
    
    let packageId;
    let price;
    
    if (packages.length === 0) {
      console.log('No service packages found. Creating one...');
      await connection.query(`
        INSERT INTO service_packages (name, description, price, service_provider_id, delivery_fee_per_km)
        VALUES ('Basic Cremation', 'Standard cremation service for pets', 3500, ?, 50)
      `, [providers[0].id]);
      
      const [newPackages] = await connection.query(`SELECT id, price FROM service_packages WHERE id = LAST_INSERT_ID()`);
      packageId = newPackages[0].id;
      price = newPackages[0].price;
    } else {
      packageId = packages[0].id;
      price = packages[0].price;
    }
    
    // Get a furparent user ID or create one
    const [users] = await connection.query(`
      SELECT id FROM users WHERE role = 'furparent' LIMIT 1
    `);
    
    let userId;
    
    if (users.length === 0) {
      console.log('No furparent users found. Creating one...');
      await connection.query(`
        INSERT INTO users (first_name, last_name, email, password, role, status)
        VALUES ('Sample', 'User', 'furparent@example.com', 'password123', 'furparent', 'active')
      `);
      
      const [newUsers] = await connection.query(`SELECT id FROM users WHERE id = LAST_INSERT_ID()`);
      userId = newUsers[0].id;
    } else {
      userId = users[0].id;
    }
    
    // Create sample booking data with various statuses and dates
    const statuses = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];
    const petTypes = ['Dog', 'Cat', 'Rabbit', 'Hamster', 'Bird'];
    const petNames = ['Max', 'Bella', 'Charlie', 'Luna', 'Cooper', 'Lucy', 'Milo', 'Daisy'];
    
    for (let i = 0; i < 10; i++) {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const bookingDate = new Date();
      bookingDate.setDate(bookingDate.getDate() - Math.floor(Math.random() * 30)); // Random date in the last 30 days
      
      const petName = petNames[Math.floor(Math.random() * petNames.length)];
      const petType = petTypes[Math.floor(Math.random() * petTypes.length)];
      
      const deliveryOption = Math.random() > 0.5 ? 'delivery' : 'pickup';
      const deliveryDistance = deliveryOption === 'delivery' ? Math.floor(Math.random() * 20) + 1 : 0;
      const deliveryFee = deliveryDistance * 50; // 50 per km
      
      await connection.query(`
        INSERT INTO service_bookings (
          user_id, provider_id, package_id,
          booking_date, booking_time,
          status, special_requests,
          pet_name, pet_type,
          payment_method, delivery_option, 
          delivery_distance, delivery_fee, price
        ) VALUES (
          ?, ?, ?,
          DATE_FORMAT(?, '%Y-%m-%d'), '10:00:00',
          ?, 'Please handle with care',
          ?, ?,
          'cash', ?,
          ?, ?, ?
        )
      `, [
        userId,
        providers[0].id,
        packageId,
        bookingDate,
        status,
        petName,
        petType,
        deliveryOption,
        deliveryDistance,
        deliveryFee,
        price
      ]);
    }
    
    console.log('Successfully created 10 sample service bookings!');
    
    await connection.end();
    console.log('Connection closed');
    
  } catch (error) {
    console.error('Error creating sample bookings:', error);
  }
}

createSampleBookings(); 