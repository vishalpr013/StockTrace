"""
Password Reset Module using Supabase OTP
This module handles OTP generation and verification for password reset functionality
"""

import os
import secrets
import string
from datetime import datetime, timedelta
from pathlib import Path
from dotenv import load_dotenv
from database import get_db_cursor
from auth import get_password_hash

# Load .env from parent directory (root of project)
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# Note: We don't actually need Supabase client for OTP functionality
# The email sending uses Resend, and database uses PostgreSQL directly
# Removing unused Supabase initialization

# OTP Configuration
OTP_LENGTH = 6
OTP_EXPIRY_MINUTES = 10

def generate_otp(length: int = OTP_LENGTH) -> str:
    """Generate a random numeric OTP"""
    return ''.join(secrets.choice(string.digits) for _ in range(length))

def store_otp(email: str, otp: str) -> bool:
    """Store OTP in database with expiry time"""
    conn, cursor = get_db_cursor()
    try:
        from datetime import timezone
        # Use timezone-aware datetime to match database timestamptz
        current_time = datetime.now(timezone.utc)
        expiry_time = current_time + timedelta(minutes=OTP_EXPIRY_MINUTES)
        
        # Delete any existing OTPs for this email
        cursor.execute(
            "DELETE FROM password_reset_otps WHERE email = %s",
            (email,)
        )
        
        # Insert new OTP
        cursor.execute(
            """INSERT INTO password_reset_otps (email, otp, expires_at, created_at)
               VALUES (%s, %s, %s, %s)""",
            (email, otp, expiry_time, current_time)
        )
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        print(f"Error storing OTP: {e}")
        return False
    finally:
        cursor.close()
        conn.close()

def verify_otp(email: str, otp: str) -> bool:
    """Verify if the OTP is valid and not expired"""
    conn, cursor = get_db_cursor()
    try:
        cursor.execute(
            """SELECT otp, expires_at FROM password_reset_otps 
               WHERE email = %s AND is_used = FALSE
               ORDER BY created_at DESC LIMIT 1""",
            (email,)
        )
        result = cursor.fetchone()
        
        if not result:
            return False
        
        stored_otp = result['otp']
        expires_at = result['expires_at']
        
        # Make current time timezone-aware to match database timestamp
        from datetime import timezone
        current_time = datetime.now(timezone.utc)
        
        # Check if OTP matches and is not expired
        if stored_otp == otp and current_time < expires_at:
            # Mark OTP as used
            cursor.execute(
                "UPDATE password_reset_otps SET is_used = TRUE WHERE email = %s AND otp = %s",
                (email, otp)
            )
            conn.commit()
            return True
        
        return False
    except Exception as e:
        print(f"Error verifying OTP: {e}")
        return False
    finally:
        cursor.close()
        conn.close()

def send_otp_email(email: str, otp: str) -> bool:
    """Send OTP via email using Resend email service"""
    try:
        import resend
        
        # Get configuration from environment
        resend_api_key = os.getenv("RESEND_API_KEY")
        from_email = os.getenv("FROM_EMAIL", "onboarding@yourdomain.com")
        
        # Check if Resend is configured
        if not resend_api_key or resend_api_key == "your_resend_api_key_here":
            print(f"⚠️  Resend not configured. OTP for {email}: {otp}")
            print("📧 To enable email sending:")
            print("1. Sign up at https://resend.com")
            print("2. Get your API key")
            print("3. Add RESEND_API_KEY to .env file")
            return True  # Return True for development
        
        # Configure Resend
        resend.api_key = resend_api_key
        
        # Create HTML email template
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background-color: #4F46E5;
                    color: white;
                    padding: 20px;
                    text-align: center;
                    border-radius: 5px 5px 0 0;
                }}
                .content {{
                    background-color: #f9f9f9;
                    padding: 30px;
                    border-radius: 0 0 5px 5px;
                }}
                .otp-box {{
                    background-color: white;
                    border: 2px dashed #4F46E5;
                    padding: 20px;
                    text-align: center;
                    margin: 20px 0;
                    border-radius: 5px;
                }}
                .otp-code {{
                    font-size: 32px;
                    font-weight: bold;
                    letter-spacing: 5px;
                    color: #4F46E5;
                }}
                .footer {{
                    text-align: center;
                    margin-top: 20px;
                    font-size: 12px;
                    color: #666;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 Password Reset Request</h1>
                </div>
                <div class="content">
                    <h2>Hello!</h2>
                    <p>You recently requested to reset your password for your StockTrace account.</p>
                    <p>Use the following One-Time Password (OTP) to complete your password reset:</p>
                    
                    <div class="otp-box">
                        <div class="otp-code">{otp}</div>
                    </div>
                    
                    <p><strong>⏰ This OTP will expire in {OTP_EXPIRY_MINUTES} minutes.</strong></p>
                    
                    <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
                    
                    <div class="footer">
                        <p>This is an automated message from StockTrace Inventory Management System.</p>
                        <p>Please do not reply to this email.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Send email via Resend
        params = {
            "from": from_email,
            "to": [email],
            "subject": "Your Password Reset OTP - StockTrace",
            "html": html_content,
        }
        
        response = resend.Emails.send(params)
        print(f"✅ OTP email sent successfully to {email}. Email ID: {response.get('id')}")
        return True
        
    except ImportError:
        print(f"⚠️  Resend package not installed. OTP for {email}: {otp}")
        print("Run: pip install resend")
        return True  # Return True for development
    except Exception as e:
        print(f"❌ Error sending OTP email: {e}")
        print(f"🔍 Debug - OTP for {email}: {otp}")
        return False

def reset_password_with_otp(email: str, new_password: str) -> bool:
    """Reset user password after OTP verification"""
    conn, cursor = get_db_cursor()
    try:
        # Hash the new password
        password_hash = get_password_hash(new_password)
        
        # Update user password
        cursor.execute(
            "UPDATE users SET password_hash = %s WHERE email = %s",
            (password_hash, email)
        )
        
        if cursor.rowcount == 0:
            return False
        
        # Delete all OTPs for this email
        cursor.execute("DELETE FROM password_reset_otps WHERE email = %s", (email,))
        
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        print(f"Error resetting password: {e}")
        return False
    finally:
        cursor.close()
        conn.close()
