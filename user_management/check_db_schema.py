import sqlite3

def check_table_schema():
    conn = sqlite3.connect('user_management.db')
    cursor = conn.cursor()
    
    print('attribute_definitions表结构:')
    cursor.execute('PRAGMA table_info(attribute_definitions)')
    for row in cursor.fetchall():
        print(row)
    
    print('\n表中的数据:')
    cursor.execute('SELECT * FROM attribute_definitions LIMIT 5')
    for row in cursor.fetchall():
        print(row)
    
    conn.close()

if __name__ == '__main__':
    check_table_schema()