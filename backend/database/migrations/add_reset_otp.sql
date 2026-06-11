-- Adds reset_otp and reset_otp_expires columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_otp VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_otp_expires TIMESTAMP WITH TIME ZONE;
