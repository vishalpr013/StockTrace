-- Create password_reset_otps table for OTP-based password reset

CREATE TABLE IF NOT EXISTS password_reset_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  otp text NOT NULL,
  expires_at timestamptz NOT NULL,
  is_used boolean DEFAULT FALSE,
  created_at timestamptz DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_email ON password_reset_otps(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_expires ON password_reset_otps(expires_at);

-- Add RLS policies
ALTER TABLE password_reset_otps ENABLE ROW LEVEL SECURITY;

-- No policies needed as this is backend-only table
