// Script to fix pricing in package 45 and any other remaining packages
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
  console.log('Starting fix for package pricing...');
  
  try {
    // Create a connection
    const connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database successfully');
    
    // Find all packages with unrealistically high prices
    const [packages] = await connection.query(`
      SELECT id, name, price 
      FROM service_packages 
      WHERE price > 10000
    `);
    
    console.log(`Found ${packages.length} packages with unrealistic prices`);
    
    // Fix each package
    for (const pkg of packages) {
      console.log(`Fixing package ${pkg.id}: ${pkg.name} - Current price: ${pkg.price}`);
      
      // Set more realistic price based on package name
      let newPrice = 3500; // Default price
      
      if (pkg.name.toLowerCase().includes('basic')) {
        newPrice = 2000;
      } else if (pkg.name.toLowerCase().includes('standard')) {
        newPrice = 3500;
      } else if (pkg.name.toLowerCase().includes('premium')) {
        newPrice = 4500;
      } else if (pkg.name.toLowerCase().includes('deluxe')) {
        newPrice = 5900;
      }
      
      // Update the price
      await connection.query(`
        UPDATE service_packages 
        SET price = ?, 
            description = CASE 
              WHEN description = 'asdasd' OR description IS NULL THEN 'Professional pet cremation service with respectful handling'
              ELSE description 
            END,
            delivery_fee_per_km = 50.00
        WHERE id = ?
      `, [newPrice, pkg.id]);
      
      console.log(`Updated package ${pkg.id} price to ${newPrice}`);
      
      // Add proper inclusions if missing
      const [inclusions] = await connection.query(
        'SELECT COUNT(*) as count FROM package_inclusions WHERE package_id = ?', 
        [pkg.id]
      );
      
      if (inclusions[0].count < 2) {
        console.log(`Adding proper inclusions for package ${pkg.id}`);
        
        // Delete existing basic inclusions
        await connection.query('DELETE FROM package_inclusions WHERE package_id = ?', [pkg.id]);
        
        // Add proper inclusions
        await connection.query(`
          INSERT INTO package_inclusions (package_id, description, created_at) VALUES
          (?, 'Professional handling', NOW()),
          (?, 'Memorial certificate', NOW()),
          (?, 'Standard urn', NOW()),
          (?, 'Respectful cremation', NOW())
        `, [pkg.id, pkg.id, pkg.id, pkg.id]);
      }
      
      // Add proper addons if missing
      const [addons] = await connection.query(
        'SELECT COUNT(*) as count FROM package_addons WHERE package_id = ?', 
        [pkg.id]
      );
      
      if (addons[0].count < 2) {
        console.log(`Adding proper addons for package ${pkg.id}`);
        
        // Delete existing basic addons
        await connection.query('DELETE FROM package_addons WHERE package_id = ?', [pkg.id]);
        
        // Add proper addons
        await connection.query(`
          INSERT INTO package_addons (package_id, description, price, created_at) VALUES
          (?, 'Custom engraving', 300.00, NOW()),
          (?, 'Paw print keepsake', 250.00, NOW()),
          (?, 'Additional urn', 500.00, NOW())
        `, [pkg.id, pkg.id, pkg.id]);
      }
    }
    
    console.log('Fixing delivery fee display formatting...');
    
    // Just to be safe, also update all other packages to have realistic delivery fees
    await connection.query(`
      UPDATE service_packages 
      SET delivery_fee_per_km = 50.00
      WHERE delivery_fee_per_km IS NULL OR delivery_fee_per_km = 0
    `);
    
    console.log('Price fix completed!');
    await connection.end();
    
  } catch (error) {
    console.error('Error updating database:', error);
    process.exit(1);
  }
}

main(); 