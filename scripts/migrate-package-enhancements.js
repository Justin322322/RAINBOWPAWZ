#!/usr/bin/env node

/**
 * Migration Script: Package Enhancements
 * Adds support for pet size-based pricing, custom business options, and pet type selection
 */

const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rainbow_paws',
  multipleStatements: true
};

// SQL statements for creating tables
const CREATE_PACKAGE_SIZE_PRICING = `
  CREATE TABLE IF NOT EXISTS package_size_pricing (
    id int(11) NOT NULL AUTO_INCREMENT,
    package_id int(11) NOT NULL,
    size_category enum('small','medium','large','extra_large') NOT NULL,
    weight_range_min decimal(8,2) DEFAULT NULL,
    weight_range_max decimal(8,2) DEFAULT NULL,
    price decimal(10,2) NOT NULL,
    created_at timestamp NOT NULL DEFAULT current_timestamp(),
    updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id),
    KEY idx_package_size_pricing_package (package_id),
    KEY idx_package_size_pricing_size (size_category),
    CONSTRAINT fk_package_size_pricing_package FOREIGN KEY (package_id) REFERENCES service_packages (package_id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
`;

const CREATE_BUSINESS_CUSTOM_OPTIONS = `
  CREATE TABLE IF NOT EXISTS business_custom_options (
    id int(11) NOT NULL AUTO_INCREMENT,
    provider_id int(11) NOT NULL,
    option_type enum('category','cremation_type','processing_time') NOT NULL,
    option_value varchar(255) NOT NULL,
    is_active tinyint(1) DEFAULT 1,
    created_at timestamp NOT NULL DEFAULT current_timestamp(),
    updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id),
    KEY idx_business_custom_options_provider (provider_id),
    KEY idx_business_custom_options_type (option_type),
    KEY idx_business_custom_options_active (is_active),
    CONSTRAINT fk_business_custom_options_provider FOREIGN KEY (provider_id) REFERENCES service_providers (provider_id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
`;

const CREATE_BUSINESS_PET_TYPES = `
  CREATE TABLE IF NOT EXISTS business_pet_types (
    id int(11) NOT NULL AUTO_INCREMENT,
    provider_id int(11) NOT NULL,
    pet_type varchar(100) NOT NULL,
    is_active tinyint(1) DEFAULT 1,
    created_at timestamp NOT NULL DEFAULT current_timestamp(),
    updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id),
    KEY idx_business_pet_types_provider (provider_id),
    KEY idx_business_pet_types_active (is_active),
    CONSTRAINT fk_business_pet_types_provider FOREIGN KEY (provider_id) REFERENCES service_providers (provider_id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
`;

const ALTER_SERVICE_PACKAGES = `
  ALTER TABLE service_packages
  ADD COLUMN IF NOT EXISTS has_size_pricing tinyint(1) DEFAULT 0 AFTER delivery_fee_per_km,
  ADD COLUMN IF NOT EXISTS uses_custom_options tinyint(1) DEFAULT 0 AFTER has_size_pricing
`;

// Default data
const DEFAULT_PET_TYPES = ['Dogs', 'Cats', 'Birds', 'Rabbits'];
const DEFAULT_OPTIONS = [
  { type: 'category', values: ['Private', 'Communal'] },
  { type: 'cremation_type', values: ['Standard', 'Premium', 'Deluxe'] },
  { type: 'processing_time', values: ['1-2 days', '2-3 days', '3-5 days'] }
];

async function runMigration() {
  let connection;

  try {
    console.log('🚀 Starting package enhancements migration...');

    // Create database connection
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connection established');

    // Execute migration statements
    console.log('📝 Executing migration SQL...');

    // Create tables
    await connection.execute(CREATE_PACKAGE_SIZE_PRICING);
    await connection.execute(CREATE_BUSINESS_CUSTOM_OPTIONS);
    await connection.execute(CREATE_BUSINESS_PET_TYPES);

    // Add columns to service_packages
    try {
      await connection.execute(ALTER_SERVICE_PACKAGES);
    } catch (error) {
      // Handle MariaDB not supporting IF NOT EXISTS for ADD COLUMN
      if (!error.message.includes('Duplicate column name')) {
        throw error;
      }
    }

    // Get cremation providers
    const [providers] = await connection.execute(
      'SELECT provider_id FROM service_providers WHERE provider_type = "cremation"'
    );

    // Populate default data for each provider
    for (const provider of providers) {
      const providerId = provider.provider_id;

      // Add default pet types if none exist
      const [petTypesResult] = await connection.execute(
        'SELECT COUNT(*) as count FROM business_pet_types WHERE provider_id = ?',
        [providerId]
      );

      if (petTypesResult[0].count === 0) {
        for (const petType of DEFAULT_PET_TYPES) {
          await connection.execute(
            'INSERT INTO business_pet_types (provider_id, pet_type, is_active) VALUES (?, ?, 1)',
            [providerId, petType]
          );
        }
      }

      // Add default custom options if none exist
      const [optionsResult] = await connection.execute(
        'SELECT COUNT(*) as count FROM business_custom_options WHERE provider_id = ?',
        [providerId]
      );

      if (optionsResult[0].count === 0) {
        for (const option of DEFAULT_OPTIONS) {
          for (const value of option.values) {
            await connection.execute(
              'INSERT INTO business_custom_options (provider_id, option_type, option_value, is_active) VALUES (?, ?, ?, 1)',
              [providerId, option.type, value]
            );
          }
        }
      }
    }

    // Verify migration
    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('📋 Summary of changes:');
    console.log('  • Created package_size_pricing table for size-based pricing');
    console.log('  • Created business_custom_options table for customizable sections');
    console.log('  • Created business_pet_types table for pet type selection');
    console.log('  • Added has_size_pricing and uses_custom_options columns to service_packages');
    console.log('  • Populated default data for existing providers');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
