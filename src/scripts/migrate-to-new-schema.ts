/**
 * Migration script to convert old database schema to new consolidated schema
 * 
 * This script migrates:
 * 1. package_inclusions -> service_packages.inclusions (JSON)
 * 2. package_images -> service_packages.images (JSON)
 * 3. package_addons -> service_packages.addons (JSON) - if needed
 * 4. Updates any references to old table structures
 */

import { query } from '../lib/db';

interface PackageInclusionRow {
  package_id: number;
  description: string;
}

interface PackageImageRow {
  package_id: number;
  image_path: string;
  display_order: number;
}

interface PackageAddonRow {
  package_id: number;
  description: string;
  price: number;
}

async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const result = await query(
      'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
      [tableName]
    ) as any[];
    return result[0]?.count > 0;
  } catch {
    return false;
  }
}

async function checkColumnExists(tableName: string, columnName: string): Promise<boolean> {
  try {
    const result = await query(
      'SELECT COUNT(*) as count FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?',
      [tableName, columnName]
    ) as any[];
    return result[0]?.count > 0;
  } catch {
    return false;
  }
}

async function migratePackageInclusions() {
  console.log('🔄 Migrating package_inclusions...');
  
  const tableExists = await checkTableExists('package_inclusions');
  if (!tableExists) {
    console.log('✅ package_inclusions table does not exist - skipping migration');
    return;
  }

  const inclusionsColumnExists = await checkColumnExists('service_packages', 'inclusions');
  if (!inclusionsColumnExists) {
    console.log('➕ Adding inclusions column to service_packages...');
    await query(`
      ALTER TABLE service_packages 
      ADD COLUMN inclusions LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL 
      CHECK (json_valid(inclusions))
    `);
  }

  // Get all inclusions grouped by package_id
  const inclusions = await query('SELECT package_id, description FROM package_inclusions ORDER BY package_id') as PackageInclusionRow[];
  
  // Group by package_id
  const groupedInclusions: Record<number, string[]> = {};
  inclusions.forEach(row => {
    if (!groupedInclusions[row.package_id]) {
      groupedInclusions[row.package_id] = [];
    }
    groupedInclusions[row.package_id].push(row.description);
  });

  // Update service_packages with JSON inclusions
  for (const [packageId, inclusionsList] of Object.entries(groupedInclusions)) {
    const inclusionsJson = JSON.stringify(inclusionsList);
    await query(
      'UPDATE service_packages SET inclusions = ? WHERE package_id = ?',
      [inclusionsJson, parseInt(packageId)]
    );
  }

  console.log(`✅ Migrated inclusions for ${Object.keys(groupedInclusions).length} packages`);
}

async function migratePackageImages() {
  console.log('🔄 Migrating package_images...');
  
  const tableExists = await checkTableExists('package_images');
  if (!tableExists) {
    console.log('✅ package_images table does not exist - skipping migration');
    return;
  }

  const imagesColumnExists = await checkColumnExists('service_packages', 'images');
  if (!imagesColumnExists) {
    console.log('➕ Adding images column to service_packages...');
    await query(`
      ALTER TABLE service_packages 
      ADD COLUMN images LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL 
      CHECK (json_valid(images))
    `);
  }

  // Get all images grouped by package_id
  const images = await query('SELECT package_id, image_path, display_order FROM package_images ORDER BY package_id, display_order') as PackageImageRow[];
  
  // Group by package_id
  const groupedImages: Record<number, string[]> = {};
  images.forEach(row => {
    if (!groupedImages[row.package_id]) {
      groupedImages[row.package_id] = [];
    }
    groupedImages[row.package_id].push(row.image_path);
  });

  // Update service_packages with JSON images
  for (const [packageId, imagesList] of Object.entries(groupedImages)) {
    const imagesJson = JSON.stringify(imagesList);
    await query(
      'UPDATE service_packages SET images = ? WHERE package_id = ?',
      [imagesJson, parseInt(packageId)]
    );
  }

  console.log(`✅ Migrated images for ${Object.keys(groupedImages).length} packages`);
}

async function migratePackageAddons() {
  console.log('🔄 Migrating package_addons...');
  
  const tableExists = await checkTableExists('package_addons');
  if (!tableExists) {
    console.log('✅ package_addons table does not exist - skipping migration');
    return;
  }

  const addonsColumnExists = await checkColumnExists('service_packages', 'addons');
  if (!addonsColumnExists) {
    console.log('➕ Adding addons column to service_packages...');
    await query(`
      ALTER TABLE service_packages 
      ADD COLUMN addons LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL 
      CHECK (json_valid(addons))
    `);
  }

  // Get all addons grouped by package_id
  const addons = await query('SELECT package_id, description, price FROM package_addons ORDER BY package_id') as PackageAddonRow[];
  
  // Group by package_id
  const groupedAddons: Record<number, any[]> = {};
  addons.forEach(row => {
    if (!groupedAddons[row.package_id]) {
      groupedAddons[row.package_id] = [];
    }
    groupedAddons[row.package_id].push({
      name: row.description,
      price: row.price
    });
  });

  // Update service_packages with JSON addons
  for (const [packageId, addonsList] of Object.entries(groupedAddons)) {
    const addonsJson = JSON.stringify(addonsList);
    await query(
      'UPDATE service_packages SET addons = ? WHERE package_id = ?',
      [addonsJson, parseInt(packageId)]
    );
  }

  console.log(`✅ Migrated addons for ${Object.keys(groupedAddons).length} packages`);
}

async function cleanupOldTables() {
  console.log('🔄 Cleaning up old tables...');
  
  const tablesToDrop = ['package_inclusions', 'package_images', 'package_addons'];
  
  for (const tableName of tablesToDrop) {
    const exists = await checkTableExists(tableName);
    if (exists) {
      console.log(`🗑️ Dropping ${tableName}...`);
      await query(`DROP TABLE ${tableName}`);
      console.log(`✅ Dropped ${tableName}`);
    } else {
      console.log(`✅ ${tableName} already doesn't exist`);
    }
  }
}

async function verifyMigration() {
  console.log('🔍 Verifying migration...');
  
  // Check that service_packages has the new columns
  const inclusionsExists = await checkColumnExists('service_packages', 'inclusions');
  const imagesExists = await checkColumnExists('service_packages', 'images');
  
  console.log(`✅ Inclusions column exists: ${inclusionsExists}`);
  console.log(`✅ Images column exists: ${imagesExists}`);
  
  // Check some sample data
  const samplePackages = await query('SELECT package_id, name, inclusions, images FROM service_packages LIMIT 3') as any[];
  
  console.log('\n📊 Sample migrated data:');
  samplePackages.forEach(pkg => {
    console.log(`Package ${pkg.package_id} (${pkg.name}):`);
    
    try {
      const inclusions = pkg.inclusions ? JSON.parse(pkg.inclusions) : [];
      console.log(`  - Inclusions: ${inclusions.length} items`);
    } catch (e) {
      console.log(`  - Inclusions: Error parsing JSON`);
    }
    
    try {
      const images = pkg.images ? JSON.parse(pkg.images) : [];
      console.log(`  - Images: ${images.length} items`);
    } catch (e) {
      console.log(`  - Images: Error parsing JSON`);
    }
  });
}

export async function runMigration() {
  console.log('🚀 Starting database schema migration...\n');
  
  try {
    await query('START TRANSACTION');
    
    await migratePackageInclusions();
    await migratePackageImages();
    await migratePackageAddons();
    
    console.log('\n⚠️  Do you want to drop the old tables? This action cannot be undone!');
    console.log('⚠️  Make sure to backup your database before proceeding!');
    
    // For safety, we'll not automatically drop tables in this script
    // Uncomment the line below if you want to drop old tables automatically
    // await cleanupOldTables();
    
    await query('COMMIT');
    
    await verifyMigration();
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\n📝 Manual steps remaining:');
    console.log('1. Test your application thoroughly');
    console.log('2. If everything works, manually drop old tables:');
    console.log('   - DROP TABLE package_inclusions;');
    console.log('   - DROP TABLE package_images;');
    console.log('   - DROP TABLE package_addons;');
    console.log('3. Update your backup scripts to exclude these tables');
    
  } catch (error) {
    await query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
} 