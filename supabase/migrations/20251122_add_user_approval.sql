-- Add is_approved column to users table for approval workflow

-- Add the is_approved column
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false;

-- Set existing users (especially admin) as approved
UPDATE users SET is_approved = true WHERE role = 'ADMIN';

-- Add index for faster queries on approval status
CREATE INDEX IF NOT EXISTS idx_users_is_approved ON users(is_approved);
