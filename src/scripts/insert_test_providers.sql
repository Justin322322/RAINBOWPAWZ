-- Script to insert test service providers in the Bataan area
-- Run this script to populate the database with sample data

-- First, create test user accounts for the service providers
INSERT INTO users (email, password, first_name, last_name, phone_number, role, is_verified, is_otp_verified, status)
VALUES 
('rainbow_bridge@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'Rainbow', '09123456789', 'business', 1, 1, 'active'),
('peaceful_paws@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'Peaceful', '09234567890', 'business', 1, 1, 'active'),
('eternal_companions@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'Eternal', '09345678901', 'business', 1, 1, 'active');

-- Get the user IDs for the service providers
SET @rainbow_user_id = LAST_INSERT_ID();
SET @peaceful_user_id = @rainbow_user_id + 1;
SET @eternal_user_id = @rainbow_user_id + 2;

-- Insert service providers
INSERT INTO service_providers (
  user_id, 
  name, 
  provider_type, 
  contact_first_name, 
  contact_last_name, 
  phone, 
  address, 
  province, 
  city, 
  zip, 
  hours, 
  service_description, 
  verification_status, 
  status
)
VALUES 
(
  @rainbow_user_id, 
  'Rainbow Bridge Pet Cremation', 
  'cremation', 
  'Admin', 
  'Rainbow', 
  '09123456789', 
  'Capitol Drive, Balanga City, Bataan, Philippines', 
  'Bataan', 
  'Balanga City', 
  '2100', 
  'Monday-Friday: 8:00 AM - 5:00 PM, Saturday: 8:00 AM - 12:00 PM, Sunday: Closed', 
  'Compassionate pet cremation services with personalized memorials. We provide dignified and respectful end-of-life care for your beloved companions. Our team understands the deep bond between pets and their families, and we strive to honor that connection through our thoughtful services.',
  'verified', 
  'active'
),
(
  @peaceful_user_id, 
  'Peaceful Paws Memorial', 
  'cremation', 
  'Admin', 
  'Peaceful', 
  '09234567890', 
  'Tuyo, Balanga City, Bataan, Philippines', 
  'Bataan', 
  'Balanga City', 
  '2100', 
  'Monday-Saturday: 9:00 AM - 6:00 PM, Sunday: By appointment only', 
  'Dignified pet cremation with eco-friendly options. We focus on providing environmentally conscious memorial services while honoring your pet with the respect they deserve. Our facility is designed to provide a peaceful setting for families during this difficult time.',
  'verified', 
  'active'
),
(
  @eternal_user_id, 
  'Eternal Companions', 
  'cremation', 
  'Admin', 
  'Eternal', 
  '09345678901', 
  'Tenejero, Balanga City, Bataan, Philippines', 
  'Bataan', 
  'Balanga City', 
  '2100', 
  'Monday-Sunday: 24/7 Service Available', 
  'Honoring your pet with respectful cremation services. We offer 24/7 service to ensure your beloved companion receives timely and compassionate care. Our dedicated team is committed to providing support during this difficult time.',
  'verified', 
  'active'
);

-- Get the service provider IDs
SET @rainbow_provider_id = LAST_INSERT_ID();
SET @peaceful_provider_id = @rainbow_provider_id + 1;
SET @eternal_provider_id = @rainbow_provider_id + 2;

-- Insert packages for Rainbow Bridge Pet Cremation
INSERT INTO service_packages (
  service_provider_id, 
  name, 
  description, 
  category, 
  cremation_type, 
  processing_time, 
  price, 
  conditions, 
  is_active
)
VALUES 
(
  @rainbow_provider_id, 
  'Basic Cremation', 
  'Simple cremation service with standard urn', 
  'Communal', 
  'Standard', 
  '2-3 days', 
  3500.00, 
  'For pets up to 50 lbs. Additional fees may apply for larger pets.', 
  TRUE
),
(
  @rainbow_provider_id, 
  'Premium Cremation', 
  'Private cremation with premium urn and memorial certificate', 
  'Private', 
  'Premium', 
  '1-2 days', 
  5500.00, 
  'Available for all pet sizes. Viewing options available upon request.', 
  TRUE
),
(
  @rainbow_provider_id, 
  'Deluxe Package', 
  'Private cremation with wooden urn and memorial service', 
  'Private', 
  'Deluxe', 
  'Same day', 
  6000.00, 
  'Includes private viewing room for family. 24-hour service available.', 
  TRUE
);

-- Get the package IDs for Rainbow Bridge
SET @rainbow_basic_id = LAST_INSERT_ID();
SET @rainbow_premium_id = @rainbow_basic_id + 1;
SET @rainbow_deluxe_id = @rainbow_basic_id + 2;

-- Insert inclusions for Rainbow Bridge packages
INSERT INTO package_inclusions (package_id, description)
VALUES 
(@rainbow_basic_id, 'Standard clay urn'),
(@rainbow_basic_id, 'Memorial certificate'),
(@rainbow_basic_id, 'Paw print impression'),
(@rainbow_premium_id, 'Wooden urn with nameplate'),
(@rainbow_premium_id, 'Memorial certificate'),
(@rainbow_premium_id, 'Paw print impression'),
(@rainbow_premium_id, 'Fur clipping'),
(@rainbow_deluxe_id, 'Custom wooden urn'),
(@rainbow_deluxe_id, 'Memorial service'),
(@rainbow_deluxe_id, 'Photo memorial'),
(@rainbow_deluxe_id, 'Paw print keepsake'),
(@rainbow_deluxe_id, 'Fur clipping');

-- Insert add-ons for Rainbow Bridge packages
INSERT INTO package_addons (package_id, description, price)
VALUES 
(@rainbow_basic_id, 'Personalized nameplate', 500.00),
(@rainbow_basic_id, 'Photo frame', 800.00),
(@rainbow_premium_id, 'Memorial video', 1200.00),
(@rainbow_premium_id, 'Additional urns', 1500.00),
(@rainbow_deluxe_id, 'Memorial jewelry', 2000.00),
(@rainbow_deluxe_id, 'Canvas portrait', 2500.00);

-- Insert packages for Peaceful Paws Memorial
INSERT INTO service_packages (
  service_provider_id, 
  name, 
  description, 
  category, 
  cremation_type, 
  processing_time, 
  price, 
  conditions, 
  is_active
)
VALUES 
(
  @peaceful_provider_id, 
  'Eco-Friendly Basic', 
  'Environmentally conscious cremation with biodegradable urn', 
  'Communal', 
  'Standard', 
  '2-3 days', 
  3800.00, 
  'For pets up to 40 lbs. Additional fees may apply for larger pets.', 
  TRUE
),
(
  @peaceful_provider_id, 
  'Private Eco-Cremation', 
  'Private cremation with sustainable memorial options', 
  'Private', 
  'Premium', 
  '1-2 days', 
  5800.00, 
  'Available for all pet sizes. Carbon offset included in price.', 
  TRUE
),
(
  @peaceful_provider_id, 
  'Legacy Memorial', 
  'Comprehensive memorial service with sustainable options', 
  'Private', 
  'Deluxe', 
  'Same day', 
  7500.00, 
  'Includes private viewing room and memorial planning assistance.', 
  TRUE
);

-- Get the package IDs for Peaceful Paws
SET @peaceful_basic_id = LAST_INSERT_ID();
SET @peaceful_private_id = @peaceful_basic_id + 1;
SET @peaceful_legacy_id = @peaceful_basic_id + 2;

-- Insert inclusions for Peaceful Paws packages
INSERT INTO package_inclusions (package_id, description)
VALUES 
(@peaceful_basic_id, 'Biodegradable urn'),
(@peaceful_basic_id, 'Plantable memorial card'),
(@peaceful_basic_id, 'Digital memorial'),
(@peaceful_private_id, 'Bamboo urn'),
(@peaceful_private_id, 'Seed paper memorial card'),
(@peaceful_private_id, 'Paw print in clay'),
(@peaceful_private_id, 'Digital memorial album'),
(@peaceful_legacy_id, 'Choice of sustainable urn'),
(@peaceful_legacy_id, 'Memorial service'),
(@peaceful_legacy_id, 'Photo tribute'),
(@peaceful_legacy_id, 'Paw print keepsake'),
(@peaceful_legacy_id, 'Memorial planting');

-- Insert add-ons for Peaceful Paws packages
INSERT INTO package_addons (package_id, description, price)
VALUES 
(@peaceful_basic_id, 'Tree planting ceremony', 1200.00),
(@peaceful_basic_id, 'Memorial garden stone', 900.00),
(@peaceful_private_id, 'Memorial tree planting', 2000.00),
(@peaceful_private_id, 'Biodegradable water burial urn', 1500.00),
(@peaceful_legacy_id, 'Video tribute', 1800.00),
(@peaceful_legacy_id, 'Custom memorial garden', 3500.00);

-- Insert packages for Eternal Companions
INSERT INTO service_packages (
  service_provider_id, 
  name, 
  description, 
  category, 
  cremation_type, 
  processing_time, 
  price, 
  conditions, 
  is_active
)
VALUES 
(
  @eternal_provider_id, 
  'Simple Farewell', 
  'Basic communal cremation service with memorial keepsake', 
  'Communal', 
  'Standard', 
  '2-3 days', 
  3200.00, 
  'For pets up to 60 lbs. 24/7 pickup service available.', 
  TRUE
),
(
  @eternal_provider_id, 
  'Private Remembrance', 
  'Individual cremation with personalized memorial options', 
  'Private', 
  'Premium', 
  '1-2 days', 
  5200.00, 
  'All pet sizes welcome. Includes home pickup service within Bataan.', 
  TRUE
),
(
  @eternal_provider_id, 
  'Forever Memorial', 
  'Comprehensive private cremation with custom memorial service', 
  'Private', 
  'Deluxe', 
  'Same day', 
  6800.00, 
  'Includes 24/7 service, home pickup, and private viewing options.', 
  TRUE
);

-- Get the package IDs for Eternal Companions
SET @eternal_simple_id = LAST_INSERT_ID();
SET @eternal_private_id = @eternal_simple_id + 1;
SET @eternal_forever_id = @eternal_simple_id + 2;

-- Insert inclusions for Eternal Companions packages
INSERT INTO package_inclusions (package_id, description)
VALUES 
(@eternal_simple_id, 'Simple ceramic urn'),
(@eternal_simple_id, 'Memorial certificate'),
(@eternal_simple_id, 'Digital photo tribute'),
(@eternal_private_id, 'Personalized wooden urn'),
(@eternal_private_id, 'Memorial certificate'),
(@eternal_private_id, 'Paw print keepsake'),
(@eternal_private_id, 'Fur clipping in glass vial'),
(@eternal_forever_id, 'Custom engraved wooden urn'),
(@eternal_forever_id, 'Memorial service at home or facility'),
(@eternal_forever_id, 'Framed photo memorial'),
(@eternal_forever_id, 'Paw print in clay'),
(@eternal_forever_id, 'Fur clipping in keepsake locket');

-- Insert add-ons for Eternal Companions packages
INSERT INTO package_addons (package_id, description, price)
VALUES 
(@eternal_simple_id, 'Personalized photo frame', 700.00),
(@eternal_simple_id, 'Memorial candle', 500.00),
(@eternal_private_id, 'Memorial video montage', 1500.00),
(@eternal_private_id, 'Additional keepsake urns', 1200.00),
(@eternal_forever_id, 'Custom memorial jewelry', 2200.00),
(@eternal_forever_id, 'Memorial garden stone', 1800.00);

-- Insert sample images for all packages
INSERT INTO package_images (package_id, image_path, display_order)
VALUES 
(@rainbow_basic_id, '/bg_2.png', 0),
(@rainbow_basic_id, '/bg_3.png', 1),
(@rainbow_basic_id, '/bg_4.png', 2),
(@rainbow_premium_id, '/bg_2.png', 0),
(@rainbow_premium_id, '/bg_3.png', 1),
(@rainbow_premium_id, '/bg_4.png', 2),
(@rainbow_deluxe_id, '/bg_2.png', 0),
(@rainbow_deluxe_id, '/bg_3.png', 1),
(@rainbow_deluxe_id, '/bg_4.png', 2),
(@peaceful_basic_id, '/bg_2.png', 0),
(@peaceful_basic_id, '/bg_3.png', 1),
(@peaceful_basic_id, '/bg_4.png', 2),
(@peaceful_private_id, '/bg_2.png', 0),
(@peaceful_private_id, '/bg_3.png', 1),
(@peaceful_private_id, '/bg_4.png', 2),
(@peaceful_legacy_id, '/bg_2.png', 0),
(@peaceful_legacy_id, '/bg_3.png', 1),
(@peaceful_legacy_id, '/bg_4.png', 2),
(@eternal_simple_id, '/bg_2.png', 0),
(@eternal_simple_id, '/bg_3.png', 1),
(@eternal_simple_id, '/bg_4.png', 2),
(@eternal_private_id, '/bg_2.png', 0),
(@eternal_private_id, '/bg_3.png', 1),
(@eternal_private_id, '/bg_4.png', 2),
(@eternal_forever_id, '/bg_2.png', 0),
(@eternal_forever_id, '/bg_3.png', 1),
(@eternal_forever_id, '/bg_4.png', 2);
