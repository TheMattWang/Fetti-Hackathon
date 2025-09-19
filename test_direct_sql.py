#!/usr/bin/env python3
"""
Test direct SQL query to verify Moody Center data exists.
"""

import sys
sys.path.append('.')
from agent.utils.tools.database import DatabaseManager

def test_direct_sql():
    """Test direct SQL query to verify Moody Center data exists."""
    db_manager = DatabaseManager('sqlite:///rides.sqlite')
    
    print("Testing direct SQL queries for Moody Center data...")
    print()
    
    # Test 1: Check for Moody Center trips in the date range
    print("1. Checking for Moody Center trips from 2025-09-01 to 2025-09-08:")
    result1 = db_manager.run_query_with_logging('''
    SELECT 
        started_at,
        pickup_address,
        dropoff_address,
        COUNT(*) as trip_count
    FROM trips 
    WHERE 
        (LOWER(pickup_address) LIKE '%moody%' OR 
         LOWER(dropoff_address) LIKE '%moody%')
        AND started_at >= '2025-09-01'
        AND started_at <= '2025-09-08'
    GROUP BY started_at, pickup_address, dropoff_address
    ORDER BY started_at
    ''')
    
    print(f"Result: {result1}")
    print()
    
    # Test 2: Check for Moody Center trips without date filter
    print("2. Checking for Moody Center trips (no date filter):")
    result2 = db_manager.run_query_with_logging('''
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
    
    print(f"Result: {result2}")
    print()
    
    # Test 3: Check date format in the database
    print("3. Checking date format in the database:")
    result3 = db_manager.run_query_with_logging('''
    SELECT 
        started_at,
        typeof(started_at) as data_type
    FROM trips 
    LIMIT 5
    ''')
    
    print(f"Result: {result3}")
    print()
    
    # Test 4: Check for Moody Center with different date format
    print("4. Checking for Moody Center trips with different date format:")
    result4 = db_manager.run_query_with_logging('''
    SELECT 
        started_at,
        pickup_address,
        dropoff_address,
        COUNT(*) as trip_count
    FROM trips 
    WHERE 
        (LOWER(pickup_address) LIKE '%moody%' OR 
         LOWER(dropoff_address) LIKE '%moody%')
        AND started_at LIKE '9/%/25%'
    GROUP BY started_at, pickup_address, dropoff_address
    ORDER BY started_at
    ''')
    
    print(f"Result: {result4}")
    print()

if __name__ == "__main__":
    test_direct_sql()
