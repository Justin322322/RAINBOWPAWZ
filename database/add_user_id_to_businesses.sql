-- Add user_id column to businesses table
ALTER TABLE businesses
ADD COLUMN user_id INT NULL,
ADD CONSTRAINT fk_businesses_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add index for faster lookups
CREATE INDEX idx_businesses_user_id ON businesses(user_id);
