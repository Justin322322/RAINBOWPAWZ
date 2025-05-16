ALTER TABLE successful_bookings 
MODIFY COLUMN payment_status ENUM('completed', 'refunded', 'partial', 'cancelled') 
NOT NULL DEFAULT 'completed'; 