from database import get_db_cursor

conn, cursor = get_db_cursor()

# Check stock_movements
cursor.execute("""
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'stock_movements'
    ORDER BY ordinal_position
""")
rows = cursor.fetchall()
print("\nstock_movements table structure:")
print("="*40)
for row in rows:
    print(f"{row['column_name']}: {row['data_type']}")

cursor.close()
conn.close()
