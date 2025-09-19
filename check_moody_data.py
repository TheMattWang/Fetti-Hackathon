#!/usr/bin/env python3
"""
Check what Moody Center data exists in the database.
"""

import sys
sys.path.append('.')
from agent.utils.tools.database import DatabaseManager

def check_moody_data():
    """Check what Moody Center data actually exists."""
    db_manager = DatabaseManager('sqlite:///rides.sqlite')
    
    # Check for Moody Center in the data
    result = db_manager.run_query_with_logging('''
    SELECT 
        started_at,
        pickup_address,
        dropoff_address,
        COUNT(*) as trip_count
    FROM trips 
    WHERE 
        LOWER(pickup_address) LIKE '%moody%' OR 
        LOWER(dropoff_address) LIKE '%moody%'
    GROUP BY started_at, pickup_address, dropoff_address
    ORDER BY started_at
    LIMIT 10
    ''')
    
    print('Moody Center trips:')
    print(f'Result type: {type(result)}')
    print(f'Result: {result}')
    if result:
        for i, row in enumerate(result):
            print(f'  Row {i}: {row} (type: {type(row)})')
    else:
        print('  No Moody Center trips found')
    
    # Also check the date range
    result2 = db_manager.run_query_with_logging('''
    SELECT 
        MIN(started_at) as earliest,
        MAX(started_at) as latest,
        COUNT(*) as total
    FROM trips 
    WHERE 
        LOWER(pickup_address) LIKE '%moody%' OR 
        LOWER(dropoff_address) LIKE '%moody%'
    ''')
    
    print(f'\nMoody Center date range: {result2[0] if result2 else "No data"}')
    
    # Check total trips in the database
    result3 = db_manager.run_query_with_logging('''
    SELECT 
        MIN(started_at) as earliest,
        MAX(started_at) as latest,
        COUNT(*) as total
    FROM trips
    ''')
    
    print(f'\nTotal database date range: {result3[0] if result3 else "No data"}')

if __name__ == "__main__":
    check_moody_data()
