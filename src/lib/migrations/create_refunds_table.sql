-- Create refunds table to track refund transactions
CREATE TABLE IF NOT EXISTS refunds (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  reason TEXT,
  status ENUM('pending', 'processed', 'failed') DEFAULT 'pending',
  processed_by INT NULL, -- admin user ID who processed the refund
  payment_method VARCHAR(50),
  transaction_id VARCHAR(255), -- external transaction ID if applicable
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_booking_id (booking_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- Add foreign key constraints if the tables exist
-- Note: These will only work if the referenced tables exist
-- ALTER TABLE refunds ADD CONSTRAINT fk_refunds_booking_id 
--   FOREIGN KEY (booking_id) REFERENCES service_bookings(id) ON DELETE CASCADE;

-- Add a refund_id column to service_bookings table if it doesn't exist
ALTER TABLE service_bookings 
ADD COLUMN refund_id INT NULL AFTER payment_status,
ADD INDEX idx_refund_id (refund_id);

-- Add refund tracking to payment_transactions if it doesn't exist
ALTER TABLE payment_transactions 
ADD COLUMN refund_id INT NULL AFTER status,
ADD COLUMN refunded_at TIMESTAMP NULL AFTER refund_id,
ADD INDEX idx_refund_id (refund_id);
