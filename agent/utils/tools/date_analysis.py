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
    
    # Add SQL suggestions
    result += f"\nSQL PATTERNS:\n"
    result += f"- WHERE strftime('%w', started_at) = '{DateAnalysis.parse_date(date_string).weekday()}'  -- {day_of_week}\n"
    result += f"- WHERE strftime('%w', started_at) IN ('0','6')  -- Weekend trips\n" if weekend_status == 'Weekend' else f"- WHERE strftime('%w', started_at) NOT IN ('0','6')  -- Weekday trips\n"
    
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
DAY OF WEEK SQL PATTERNS:

Basic day extraction:
- strftime('%w', started_at)  -- Returns 0=Sunday, 1=Monday, ..., 6=Saturday
- strftime('%A', started_at)  -- Returns full day name (Sunday, Monday, etc.)

Common queries:
- WHERE strftime('%w', started_at) = '1'  -- Monday trips
- WHERE strftime('%w', started_at) IN ('0','6')  -- Weekend trips (Sat/Sun)
- WHERE strftime('%w', started_at) NOT IN ('0','6')  -- Weekday trips

Group by day:
- GROUP BY strftime('%A', started_at)  -- Group by day name
- GROUP BY strftime('%w', started_at)  -- Group by day number

Time of day patterns:
- strftime('%H', started_at) BETWEEN '05' AND '11'  -- Morning (5am-11am)
- strftime('%H', started_at) BETWEEN '12' AND '16'  -- Afternoon (12pm-4pm)
- strftime('%H', started_at) BETWEEN '17' AND '21'  -- Evening (5pm-9pm)
- strftime('%H', started_at) BETWEEN '22' AND '23' OR strftime('%H', started_at) BETWEEN '00' AND '04'  -- Night

Example queries:
- "Most popular day for trips": SELECT strftime('%A', started_at) as day, COUNT(*) as trips FROM trips GROUP BY strftime('%A', started_at) ORDER BY trips DESC
- "Weekend vs weekday patterns": SELECT CASE WHEN strftime('%w', started_at) IN ('0','6') THEN 'Weekend' ELSE 'Weekday' END as day_type, COUNT(*) as trips FROM trips GROUP BY day_type
"""


@tool
def suggest_day_analysis_queries() -> str:
    """
    Suggest useful queries for analyzing trip patterns by day and time.
    
    Returns:
        List of suggested queries for day/time analysis
    """
    return """
SUGGESTED DAY/TIME ANALYSIS QUERIES:

1. "What's the busiest day of the week?"
   SELECT strftime('%A', started_at) as day, COUNT(*) as trips 
   FROM trips GROUP BY strftime('%A', started_at) ORDER BY trips DESC

2. "Compare weekend vs weekday trip volumes"
   SELECT CASE WHEN strftime('%w', started_at) IN ('0','6') THEN 'Weekend' ELSE 'Weekday' END as day_type, 
          COUNT(*) as trips, AVG(CAST(strftime('%H', started_at) AS INTEGER)) as avg_hour
   FROM trips GROUP BY day_type

3. "Peak hours by day of week"
   SELECT strftime('%A', started_at) as day, strftime('%H', started_at) as hour, COUNT(*) as trips
   FROM trips GROUP BY strftime('%A', started_at), strftime('%H', started_at) 
   ORDER BY day, trips DESC

4. "Morning rush hour patterns"
   SELECT strftime('%A', started_at) as day, COUNT(*) as morning_trips
   FROM trips WHERE strftime('%H', started_at) BETWEEN '07' AND '09'
   GROUP BY strftime('%A', started_at) ORDER BY morning_trips DESC

5. "Late night weekend activity"
   SELECT strftime('%A', started_at) as day, COUNT(*) as late_night_trips
   FROM trips WHERE strftime('%w', started_at) IN ('0','6') 
   AND (strftime('%H', started_at) BETWEEN '22' AND '23' OR strftime('%H', started_at) BETWEEN '00' AND '02')
   GROUP BY strftime('%A', started_at) ORDER BY late_night_trips DESC
"""
