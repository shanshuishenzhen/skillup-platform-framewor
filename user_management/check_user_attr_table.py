import sqlite3

conn = sqlite3.connect('user_management.db')
cursor = conn.cursor()

print('user_attribute_values表结构:')
cursor.execute('PRAGMA table_info(user_attribute_values)')
for row in cursor.fetchall():
    print(row)

print('\n表中的数据:')
cursor.execute('SELECT * FROM user_attribute_values LIMIT 5')
for row in cursor.fetchall():
    print(row)

conn.close()