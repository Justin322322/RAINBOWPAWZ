// Script to update cremation bookings and packages with realistic data
const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rainbow_paws',
  port: parseInt(process.env.DB_PORT || '3306')
};

async function main() {
  console.log('Starting database update for cremation services...');
  
  try {
    // Create a connection
    const connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database successfully');
    
    // Update service packages with realistic data
    console.log('Updating cremation service packages...');
    await connection.query(`
      UPDATE service_packages
      SET name = 'Premium Private Cremation',
          description = 'Private cremation service with premium urn and memorial certificate',
          category = 'Private',
          cremation_type = 'Premium',
          processing_time = '1-2 days',
          price = 4500.00,
          delivery_fee_per_km = 50.00,
          conditions = 'Available for pets up to 50kg. Additional fees may apply for larger pets.'
      WHERE id = 41
    `);
    
    // Add more service package options
    await connection.query(`
      INSERT INTO service_packages 
      (service_provider_id, name, description, category, cremation_type, processing_time, price, delivery_fee_per_km, conditions, is_active, created_at) 
      VALUES 
      (14, 'Standard Private Cremation', 'Private cremation with standard urn', 'Private', 'Standard', '2-3 days', 3200.00, 50.00, 'Available for pets up to 30kg', 1, NOW()),
      (14, 'Basic Communal Cremation', 'Communal cremation service with basic memorial box', 'Communal', 'Standard', '3-4 days', 1800.00, 50.00, 'No individual ashes returned', 1, NOW()),
      (14, 'Deluxe Memorial Package', 'Deluxe private cremation with custom engraved urn and paw print memorial', 'Private', 'Deluxe', '1-2 days', 5900.00, 50.00, 'Includes memorial service. Available for all pet sizes.', 1, NOW())
    `);
    
    // Update bookings with realistic prices
    console.log('Updating cremation bookings with realistic prices...');
    
    // Get new package IDs
    const [packages] = await connection.query('SELECT id FROM service_packages WHERE service_provider_id = 14');
    const packageIds = packages.map(pkg => pkg.id);
    
    // Update booking 1 (Premium)
    await connection.query(`
      UPDATE service_bookings 
      SET package_id = ?, price = 4500.00, cause_of_death = 'Old age'
      WHERE id = 1
    `, [packageIds[0]]);
    
    // Update booking 2 (Standard)
    await connection.query(`
      UPDATE service_bookings 
      SET package_id = ?, price = 3200.00, cause_of_death = 'Illness'
      WHERE id = 2
    `, [packageIds[1]]);
    
    // Update booking 3 (Communal)
    await connection.query(`
      UPDATE service_bookings 
      SET package_id = ?, price = 1800.00, cause_of_death = 'Illness'
      WHERE id = 3
    `, [packageIds[2]]);
    
    // Update booking 4 (Standard)
    await connection.query(`
      UPDATE service_bookings 
      SET package_id = ?, price = 3200.00, cause_of_death = 'Accident'
      WHERE id = 4
    `, [packageIds[1]]);
    
    // Update booking 5 (Standard)
    await connection.query(`
      UPDATE service_bookings 
      SET package_id = ?, price = 3200.00, cause_of_death = 'Old age'
      WHERE id = 5
    `, [packageIds[1]]);
    
    // Update booking 6 (Premium)
    await connection.query(`
      UPDATE service_bookings 
      SET package_id = ?, price = 4500.00, cause_of_death = 'Illness'
      WHERE id = 6
    `, [packageIds[0]]);
    
    // Update booking 7 (Standard)
    await connection.query(`
      UPDATE service_bookings 
      SET package_id = ?, price = 3200.00, cause_of_death = 'Illness'
      WHERE id = 7
    `, [packageIds[1]]);
    
    // Update booking 8 (Standard)
    await connection.query(`
      UPDATE service_bookings 
      SET package_id = ?, price = 3200.00, cause_of_death = 'Old age'
      WHERE id = 8
    `, [packageIds[1]]);
    
    // Update booking 9 (Deluxe)
    await connection.query(`
      UPDATE service_bookings 
      SET package_id = ?, price = 5900.00, cause_of_death = 'Accident'
      WHERE id = 9
    `, [packageIds[3]]);
    
    // Update booking 10 (Standard)
    await connection.query(`
      UPDATE service_bookings 
      SET package_id = ?, price = 3200.00, cause_of_death = 'Illness'
      WHERE id = 10
    `, [packageIds[1]]);
    
    // Add realistic package inclusions
    console.log('Updating package inclusions...');
    
    // Clear existing inclusions
    await connection.query('DELETE FROM package_inclusions WHERE package_id = ?', [packageIds[0]]);
    
    // Add new inclusions for first package
    await connection.query(`
      INSERT INTO package_inclusions (package_id, description, created_at) VALUES
      (?, 'Premium urn', NOW()),
      (?, 'Memorial certificate', NOW()),
      (?, 'Individual cremation', NOW()),
      (?, 'Ashes return', NOW())
    `, [packageIds[0], packageIds[0], packageIds[0], packageIds[0]]);
    
    // Add inclusions for other packages
    if (packageIds.length > 1) {
      await connection.query(`
        INSERT INTO package_inclusions (package_id, description, created_at) VALUES
        (?, 'Standard urn', NOW()),
        (?, 'Individual cremation', NOW()),
        (?, 'Ashes return', NOW())
      `, [packageIds[1], packageIds[1], packageIds[1]]);
    }
    
    if (packageIds.length > 2) {
      await connection.query(`
        INSERT INTO package_inclusions (package_id, description, created_at) VALUES
        (?, 'Basic memorial box', NOW()),
        (?, 'Communal cremation', NOW())
      `, [packageIds[2], packageIds[2]]);
    }
    
    if (packageIds.length > 3) {
      await connection.query(`
        INSERT INTO package_inclusions (package_id, description, created_at) VALUES
        (?, 'Custom engraved urn', NOW()),
        (?, 'Paw print memorial', NOW()),
        (?, 'Individual cremation', NOW()),
        (?, 'Memorial service', NOW()),
        (?, 'Ashes return', NOW())
      `, [packageIds[3], packageIds[3], packageIds[3], packageIds[3], packageIds[3]]);
    }

    // Update package addons with realistic data
    console.log('Updating package addons...');
    
    // Clear existing addons
    await connection.query('DELETE FROM package_addons WHERE package_id IN (?)', [packageIds]);
    
    // Add realistic addons for packages
    await connection.query(`
      INSERT INTO package_addons (package_id, description, price, created_at) VALUES
      (?, 'Custom engraving', 500.00, NOW()),
      (?, 'Additional memorial certificate', 100.00, NOW()),
      (?, 'Paw print keepsake', 300.00, NOW())
    `, [packageIds[0], packageIds[0], packageIds[0]]);
    
    if (packageIds.length > 1) {
      await connection.query(`
        INSERT INTO package_addons (package_id, description, price, created_at) VALUES
        (?, 'Upgrade to premium urn', 800.00, NOW()),
        (?, 'Memorial certificate', 150.00, NOW()),
        (?, 'Paw print keepsake', 300.00, NOW())
      `, [packageIds[1], packageIds[1], packageIds[1]]);
    }
    
    if (packageIds.length > 2) {
      await connection.query(`
        INSERT INTO package_addons (package_id, description, price, created_at) VALUES
        (?, 'Upgrade to private cremation', 1400.00, NOW()),
        (?, 'Basic urn', 500.00, NOW())
      `, [packageIds[2], packageIds[2]]);
    }
    
    if (packageIds.length > 3) {
      await connection.query(`
        INSERT INTO package_addons (package_id, description, price, created_at) VALUES
        (?, 'Additional memorial items', 800.00, NOW()),
        (?, 'Video memorial', 1200.00, NOW())
      `, [packageIds[3], packageIds[3]]);
    }
    
    // Update package images with realistic paths
    console.log('Updating package images...');
    
    // Clear existing images
    await connection.query('DELETE FROM package_images WHERE package_id IN (?)', [packageIds]);
    
    // Add realistic image paths for each package
    await connection.query(`
      INSERT INTO package_images (package_id, image_path, display_order, created_at) VALUES
      (?, '/uploads/packages/41/premium_urn_1.jpg', 0, NOW()),
      (?, '/uploads/packages/41/premium_urn_2.jpg', 1, NOW())
    `, [packageIds[0], packageIds[0]]);
    
    if (packageIds.length > 1) {
      await connection.query(`
        INSERT INTO package_images (package_id, image_path, display_order, created_at) VALUES
        (?, '/uploads/packages/standard/standard_urn_1.jpg', 0, NOW()),
        (?, '/uploads/packages/standard/standard_urn_2.jpg', 1, NOW())
      `, [packageIds[1], packageIds[1]]);
    }
    
    if (packageIds.length > 2) {
      await connection.query(`
        INSERT INTO package_images (package_id, image_path, display_order, created_at) VALUES
        (?, '/uploads/packages/communal/communal_box.jpg', 0, NOW())
      `, [packageIds[2]]);
    }
    
    if (packageIds.length > 3) {
      await connection.query(`
        INSERT INTO package_images (package_id, image_path, display_order, created_at) VALUES
        (?, '/uploads/packages/deluxe/deluxe_memorial_1.jpg', 0, NOW()),
        (?, '/uploads/packages/deluxe/deluxe_memorial_2.jpg', 1, NOW()),
        (?, '/uploads/packages/deluxe/paw_print.jpg', 2, NOW())
      `, [packageIds[3], packageIds[3], packageIds[3]]);
    }
    
    console.log('Data update complete!');
    await connection.end();
    
  } catch (error) {
    console.error('Error updating database:', error);
    process.exit(1);
  }
}

main(); 