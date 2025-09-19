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
    
    # Add SQL suggestions (handle text date format MM/DD/YY H:MM)
    result += f"\nSQL PATTERNS (for text dates like '9/8/25 11:47'):\n"
    result += f"- WHERE started_at LIKE '%{DateAnalysis.parse_date(date_string).strftime('%m/%d/%y')}%'  -- {day_of_week} trips\n"
    result += f"- WHERE started_at LIKE '%/%' AND (started_at LIKE '%/0%' OR started_at LIKE '%/6%')  -- Weekend trips (approximate)\n" if weekend_status == 'Weekend' else f"- WHERE started_at LIKE '%/%' AND NOT (started_at LIKE '%/0%' OR started_at LIKE '%/6%')  -- Weekday trips (approximate)\n"
    
    if time_of_day:
        hour_ranges = {
            'Morning': "started_at LIKE '% 0[5-9]:%' OR started_at LIKE '% 1[0-1]:%'",
            'Afternoon': "started_at LIKE '% 1[2-6]:%'", 
            'Evening': "started_at LIKE '% 1[7-9]:%' OR started_at LIKE '% 2[0-1]:%'",
            'Night': "started_at LIKE '% 2[2-3]:%' OR started_at LIKE '% 0[0-4]:%'"
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
DAY OF WEEK SQL PATTERNS (for text dates like '9/8/25 11:47'):

IMPORTANT: Database stores dates as TEXT in format "M/D/YY H:MM" (e.g., "9/8/25 11:47")

Date filtering patterns:
- WHERE started_at LIKE '9/%/25%'  -- September 2025 trips
- WHERE started_at LIKE '%/8/25%'  -- August 8, 2025 trips
- WHERE started_at LIKE '%/25%'   -- All 2025 trips

Time of day patterns (using LIKE with hour patterns):
- WHERE started_at LIKE '% 0[5-9]:%' OR started_at LIKE '% 1[0-1]:%'  -- Morning (5am-11am)
- WHERE started_at LIKE '% 1[2-6]:%'  -- Afternoon (12pm-4pm)
- WHERE started_at LIKE '% 1[7-9]:%' OR started_at LIKE '% 2[0-1]:%'  -- Evening (5pm-9pm)
- WHERE started_at LIKE '% 2[2-3]:%' OR started_at LIKE '% 0[0-4]:%'  -- Night (10pm-4am)

Weekend approximation (since we can't easily extract day of week from text):
- WHERE started_at LIKE '%/0%' OR started_at LIKE '%/6%'  -- Weekend trips (approximate)
- WHERE started_at LIKE '%/%' AND NOT (started_at LIKE '%/0%' OR started_at LIKE '%/6%')  -- Weekday trips

Example queries:
- "Trips in September 2025": SELECT COUNT(*) FROM trips WHERE started_at LIKE '9/%/25%'
- "Morning trips": SELECT COUNT(*) FROM trips WHERE started_at LIKE '% 0[5-9]:%' OR started_at LIKE '% 1[0-1]:%'
- "Recent trips": SELECT * FROM trips WHERE started_at LIKE '%/25%' ORDER BY started_at DESC LIMIT 10

NOTE: For precise day-of-week analysis, consider converting text dates to proper datetime format first.
"""


@tool
def suggest_day_analysis_queries() -> str:
    """
    Suggest useful queries for analyzing trip patterns by day and time.
    
    Returns:
        List of suggested queries for day/time analysis
    """
    return """
SUGGESTED DAY/TIME ANALYSIS QUERIES (for text dates like '9/8/25 11:47'):

1. "What's the busiest time of day?"
   SELECT 
     CASE 
       WHEN started_at LIKE '% 0[5-9]:%' OR started_at LIKE '% 1[0-1]:%' THEN 'Morning'
       WHEN started_at LIKE '% 1[2-6]:%' THEN 'Afternoon'
       WHEN started_at LIKE '% 1[7-9]:%' OR started_at LIKE '% 2[0-1]:%' THEN 'Evening'
       ELSE 'Night'
     END as time_period, 
     COUNT(*) as trips 
   FROM trips GROUP BY time_period ORDER BY trips DESC

2. "Compare weekend vs weekday trip volumes (approximate)"
   SELECT 
     CASE 
       WHEN started_at LIKE '%/0%' OR started_at LIKE '%/6%' THEN 'Weekend'
       ELSE 'Weekday'
     END as day_type, 
     COUNT(*) as trips
   FROM trips GROUP BY day_type

3. "Peak hours analysis"
   SELECT 
     substr(started_at, instr(started_at, ' ') + 1, 2) as hour, 
     COUNT(*) as trips
   FROM trips 
   WHERE started_at LIKE '% %'
   GROUP BY hour 
   ORDER BY trips DESC

4. "Morning rush hour patterns"
   SELECT COUNT(*) as morning_trips
   FROM trips 
   WHERE started_at LIKE '% 0[7-9]:%' OR started_at LIKE '% 1[0-1]:%'

5. "Late night activity"
   SELECT COUNT(*) as late_night_trips
   FROM trips 
   WHERE started_at LIKE '% 2[2-3]:%' OR started_at LIKE '% 0[0-2]:%'

6. "Recent trips (September 2025)"
   SELECT * FROM trips 
   WHERE started_at LIKE '9/%/25%' 
   ORDER BY started_at DESC LIMIT 10
"""
