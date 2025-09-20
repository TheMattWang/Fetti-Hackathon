"""
Date Analysis Tools for SQL Agent.

This module provides tools for analyzing dates and determining day-of-the-week patterns
in the ride-sharing data.
"""

from typing import List, Optional
from datetime import datetime
from langchain.tools import tool
from pydantic import BaseModel, Field


class DateAnalysis:
    """Date analysis utilities for ride-sharing data."""
    
    @staticmethod
    def parse_date(date_string: str) -> Optional[datetime]:
        """
        Parse various date formats commonly found in databases.
        
        Args:
            date_string: Date string in various formats
            
        Returns:
            datetime object or None if parsing fails
        """
        # Common date formats to try
        date_formats = [
            '%Y-%m-%d %H:%M:%S',  # 2024-01-15 14:30:00
            '%Y-%m-%d',           # 2024-01-15
            '%m/%d/%Y %H:%M:%S',  # 01/15/2024 14:30:00
            '%m/%d/%Y',           # 01/15/2024
            '%m/%d/%y %H:%M',     # 9/8/25 11:47 (ACTUAL DATABASE FORMAT)
            '%m/%d/%y',           # 9/8/25
            '%d/%m/%Y %H:%M:%S',  # 15/01/2024 14:30:00
            '%d/%m/%Y',           # 15/01/2024
            '%Y-%m-%dT%H:%M:%S',  # 2024-01-15T14:30:00
            '%Y-%m-%dT%H:%M:%SZ', # 2024-01-15T14:30:00Z
        ]
        
        for fmt in date_formats:
            try:
                return datetime.strptime(date_string.strip(), fmt)
            except ValueError:
                continue
        
        return None
    
    @staticmethod
    def get_day_of_week(date_string: str) -> Optional[str]:
        """
        Get the day of the week from a date string.
        
        Args:
            date_string: Date string to analyze
            
        Returns:
            Day of the week (Monday, Tuesday, etc.) or None if parsing fails
        """
        parsed_date = DateAnalysis.parse_date(date_string)
        if parsed_date:
            return parsed_date.strftime('%A')
        return None
    
    @staticmethod
    def get_weekend_status(date_string: str) -> Optional[str]:
        """
        Determine if a date falls on a weekend.
        
        Args:
            date_string: Date string to analyze
            
        Returns:
            'Weekend' or 'Weekday' or None if parsing fails
        """
        parsed_date = DateAnalysis.parse_date(date_string)
        if parsed_date:
            # Monday is 0, Sunday is 6
            weekday = parsed_date.weekday()
            return 'Weekend' if weekday >= 5 else 'Weekday'
        return None
    
    @staticmethod
    def get_time_of_day(date_string: str) -> Optional[str]:
        """
        Get time of day category from a datetime string.
        
        Args:
            date_string: Date string with time to analyze
            
        Returns:
            Time category (Morning, Afternoon, Evening, Night) or None if parsing fails
        """
        parsed_date = DateAnalysis.parse_date(date_string)
        if parsed_date:
            hour = parsed_date.hour
            if 5 <= hour < 12:
                return 'Morning'
            elif 12 <= hour < 17:
                return 'Afternoon'
            elif 17 <= hour < 22:
                return 'Evening'
            else:
                return 'Night'
        return None


@tool
def analyze_date_patterns(date_string: str) -> str:
    """
    Analyze a date string and provide comprehensive date information.
    
    Use this tool when you need to understand the day of the week, weekend status,
    or time of day for trip analysis.
    
    Args:
        date_string: Date string to analyze (e.g., "2024-01-15 14:30:00")
        
    Returns:
        Formatted analysis of the date including day of week, weekend status, and time of day
    """
    day_of_week = DateAnalysis.get_day_of_week(date_string)
    weekend_status = DateAnalysis.get_weekend_status(date_string)
    time_of_day = DateAnalysis.get_time_of_day(date_string)
    
    if not day_of_week:
        return f"Could not parse date: {date_string}. Try formats like '2024-01-15' or '2024-01-15 14:30:00'"
    
    result = f"DATE ANALYSIS: {date_string}\n"
    result += f"Day of Week: {day_of_week}\n"
    result += f"Type: {weekend_status}\n"
    
    if time_of_day:
        result += f"Time of Day: {time_of_day}\n"
    
    # Add SQL suggestions (handle proper datetime format YYYY-MM-DD HH:MM:SS)
    result += f"\nSQL PATTERNS (for datetime format like '2025-09-08 11:47:00'):\n"
    result += f"- WHERE started_at >= date('{DateAnalysis.parse_date(date_string).strftime('%Y-%m-%d')}')  -- {day_of_week} trips\n"
    result += f"- WHERE strftime('%w', started_at) IN ('0', '6')  -- Weekend trips\n" if weekend_status == 'Weekend' else f"- WHERE strftime('%w', started_at) NOT IN ('0', '6')  -- Weekday trips\n"
    
    if time_of_day:
        hour_ranges = {
            'Morning': "strftime('%H', started_at) BETWEEN '05' AND '11'",
            'Afternoon': "strftime('%H', started_at) BETWEEN '12' AND '16'", 
            'Evening': "strftime('%H', started_at) BETWEEN '17' AND '21'",
            'Night': "strftime('%H', started_at) BETWEEN '22' AND '23' OR strftime('%H', started_at) BETWEEN '00' AND '04'"
        }
        result += f"- WHERE {hour_ranges[time_of_day]}  -- {time_of_day} trips\n"
    
    return result


@tool
def get_day_of_week_sql_patterns() -> str:
    """
    Get SQL patterns for analyzing trips by day of the week.
    
    Returns:
        SQL patterns and examples for day-of-week analysis
    """
    return """
DAY OF WEEK SQL PATTERNS (for datetime format like '2025-09-08 11:47:00'):

IMPORTANT: Database stores dates as proper DATETIME in format "YYYY-MM-DD HH:MM:SS" (e.g., "2025-09-08 11:47:00")

Date filtering patterns:
- WHERE started_at >= date('2025-09-01')  -- September 2025 trips
- WHERE started_at >= date('2025-08-08') AND started_at < date('2025-08-09')  -- August 8, 2025 trips
- WHERE started_at >= date('2025-01-01')  -- All 2025 trips
- WHERE started_at >= date('now', '-30 days')  -- Last 30 days
- WHERE started_at >= date('now', '-7 days')  -- Last week

Time of day patterns (using strftime):
- WHERE strftime('%H', started_at) BETWEEN '05' AND '11'  -- Morning (5am-11am)
- WHERE strftime('%H', started_at) BETWEEN '12' AND '16'  -- Afternoon (12pm-4pm)
- WHERE strftime('%H', started_at) BETWEEN '17' AND '21'  -- Evening (5pm-9pm)
- WHERE strftime('%H', started_at) BETWEEN '22' AND '23' OR strftime('%H', started_at) BETWEEN '00' AND '04'  -- Night (10pm-4am)

Day of week patterns (using strftime):
- WHERE strftime('%w', started_at) IN ('0', '6')  -- Weekend trips (Sunday=0, Saturday=6)
- WHERE strftime('%w', started_at) NOT IN ('0', '6')  -- Weekday trips
- WHERE strftime('%w', started_at) = '1'  -- Monday trips
- WHERE strftime('%w', started_at) = '5'  -- Friday trips

Example queries:
- "Trips in September 2025": SELECT COUNT(*) FROM trips WHERE started_at >= date('2025-09-01')
- "Morning trips": SELECT COUNT(*) FROM trips WHERE strftime('%H', started_at) BETWEEN '05' AND '11'
- "Weekend trips": SELECT COUNT(*) FROM trips WHERE strftime('%w', started_at) IN ('0', '6')
- "Recent trips": SELECT * FROM trips WHERE started_at >= date('now', '-7 days') ORDER BY started_at DESC LIMIT 10
- "Past month": SELECT COUNT(*) FROM trips WHERE started_at >= date('now', '-30 days')

NOTE: Database now uses proper datetime format, so standard SQLite date functions work correctly.
"""


@tool
def suggest_day_analysis_queries() -> str:
    """
    Suggest useful queries for analyzing trip patterns by day and time.
    
    Returns:
        List of suggested queries for day/time analysis
    """
    return """
SUGGESTED DAY/TIME ANALYSIS QUERIES (for datetime format like '2025-09-08 11:47:00'):

1. "What's the busiest time of day?"
   SELECT 
     CASE 
       WHEN strftime('%H', started_at) BETWEEN '05' AND '11' THEN 'Morning'
       WHEN strftime('%H', started_at) BETWEEN '12' AND '16' THEN 'Afternoon'
       WHEN strftime('%H', started_at) BETWEEN '17' AND '21' THEN 'Evening'
       ELSE 'Night'
     END as time_period, 
     COUNT(*) as trips 
   FROM trips GROUP BY time_period ORDER BY trips DESC

2. "Compare weekend vs weekday trip volumes"
   SELECT 
     CASE 
       WHEN strftime('%w', started_at) IN ('0', '6') THEN 'Weekend'
       ELSE 'Weekday'
     END as day_type, 
     COUNT(*) as trips
   FROM trips GROUP BY day_type

3. "Peak hours analysis"
   SELECT 
     strftime('%H', started_at) as hour, 
     COUNT(*) as trips
   FROM trips 
   GROUP BY hour 
   ORDER BY trips DESC

4. "Morning rush hour patterns"
   SELECT COUNT(*) as morning_trips
   FROM trips 
   WHERE strftime('%H', started_at) BETWEEN '07' AND '11'

5. "Late night activity"
   SELECT COUNT(*) as late_night_trips
   FROM trips 
   WHERE strftime('%H', started_at) BETWEEN '22' AND '23' OR strftime('%H', started_at) BETWEEN '00' AND '02'

6. "Recent trips (last 7 days)"
   SELECT * FROM trips 
   WHERE started_at >= date('now', '-7 days')
   ORDER BY started_at DESC LIMIT 10

7. "Trips by day of week"
   SELECT 
     CASE strftime('%w', started_at)
       WHEN '0' THEN 'Sunday'
       WHEN '1' THEN 'Monday'
       WHEN '2' THEN 'Tuesday'
       WHEN '3' THEN 'Wednesday'
       WHEN '4' THEN 'Thursday'
       WHEN '5' THEN 'Friday'
       WHEN '6' THEN 'Saturday'
     END as day_name,
     COUNT(*) as trips
   FROM trips 
   GROUP BY strftime('%w', started_at)
   ORDER BY strftime('%w', started_at)

8. "Past month analysis"
   SELECT COUNT(*) as trips_last_month
   FROM trips 
   WHERE started_at >= date('now', '-30 days')
"""
