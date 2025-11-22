#!/usr/bin/env python3
"""Interactive script to create admin users."""

import sys
import getpass
from database import get_db_cursor
from auth import get_password_hash

def create_admin():
    """Interactive admin user creation."""
    print("=" * 50)
    print("CREATE ADMIN USER")
    print("=" * 50)
    
    # Get admin details from user input
    print("\nEnter admin details:")
    name = input("Full Name: ").strip()
    if not name:
        print("❌ Name cannot be empty!")
        return False
    
    email = input("Email: ").strip().lower()
    if not email or '@' not in email:
        print("❌ Invalid email address!")
        return False
    
    # Get password securely (hidden input)
    while True:
        password = getpass.getpass("Password (min 6 characters): ")
        if len(password) < 6:
            print("❌ Password must be at least 6 characters!")
            continue
        
        password_confirm = getpass.getpass("Confirm Password: ")
        if password != password_confirm:
            print("❌ Passwords do not match!")
            continue
        
        break
    
    # Connect to database
    conn, cursor = get_db_cursor()
    try:
        # Check if email already exists
        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        existing_user = cursor.fetchone()
        
        if existing_user:
            print(f"\n❌ User with email '{email}' already exists!")
            return False
        
        # Hash password
        password_hash = get_password_hash(password)
        
        # Insert admin user (auto-approved)
        cursor.execute(
            """INSERT INTO users (name, email, password_hash, role, is_approved)
               VALUES (%s, %s, %s, %s, %s) RETURNING id, email, role, created_at""",
            (name, email, password_hash, 'ADMIN', True)
        )
        conn.commit()
        new_user = cursor.fetchone()
        
        print("\n" + "=" * 50)
        print("✅ ADMIN USER CREATED SUCCESSFULLY!")
        print("=" * 50)
        print(f"Name: {name}")
        print(f"Email: {new_user['email']}")
        print(f"Role: {new_user['role']}")
        print(f"Created: {new_user['created_at']}")
        print("\nYou can now login with these credentials.")
        
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error creating admin: {e}")
        return False
    finally:
        cursor.close()
        conn.close()

def list_admins():
    """List all current admin users."""
    conn, cursor = get_db_cursor()
    try:
        cursor.execute(
            "SELECT id, name, email, created_at FROM users WHERE role = 'ADMIN' ORDER BY created_at"
        )
        admins = cursor.fetchall()
        
        if not admins:
            print("\n⚠️  No admin users found in the database!")
            return
        
        print("\n" + "=" * 50)
        print(f"CURRENT ADMIN USERS ({len(admins)})")
        print("=" * 50)
        for admin in admins:
            print(f"\n• {admin['name']}")
            print(f"  Email: {admin['email']}")
            print(f"  Created: {admin['created_at']}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        cursor.close()
        conn.close()

def delete_user():
    """Delete a user by email."""
    print("\n" + "=" * 50)
    print("DELETE USER")
    print("=" * 50)
    
    email = input("\nEnter email of user to delete: ").strip().lower()
    if not email:
        print("❌ Email cannot be empty!")
        return False
    
    conn, cursor = get_db_cursor()
    try:
        # Check if user exists
        cursor.execute("SELECT id, name, email, role FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        
        if not user:
            print(f"\n❌ User with email '{email}' not found!")
            return False
        
        # Show user details
        print(f"\nUser found:")
        print(f"  Name: {user['name']}")
        print(f"  Email: {user['email']}")
        print(f"  Role: {user['role']}")
        
        # Confirm deletion
        confirm = input("\n⚠️  Are you sure you want to delete this user? (yes/no): ").strip().lower()
        if confirm not in ['yes', 'y']:
            print("❌ Deletion cancelled.")
            return False
        
        # Delete user
        cursor.execute("DELETE FROM users WHERE id = %s", (user['id'],))
        conn.commit()
        
        print(f"\n✅ User '{user['email']}' has been deleted successfully!")
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error deleting user: {e}")
        return False
    finally:
        cursor.close()
        conn.close()

def main():
    """Main menu."""
    while True:
        print("\n" + "=" * 50)
        print("ADMIN USER MANAGEMENT")
        print("=" * 50)
        print("\n1. Create new admin user")
        print("2. List all admin users")
        print("3. Delete a user")
        print("4. Exit")
        
        choice = input("\nSelect an option (1-4): ").strip()
        
        if choice == '1':
            create_admin()
        elif choice == '2':
            list_admins()
        elif choice == '3':
            delete_user()
        elif choice == '4':
            print("\n👋 Goodbye!")
            sys.exit(0)
        else:
            print("❌ Invalid option. Please select 1-4.")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 Goodbye!")
        sys.exit(0)
