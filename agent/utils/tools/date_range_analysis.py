"""
Date range analysis tool for SQL agent.

This tool helps the agent understand what date ranges are available in the database,
so it can provide more accurate responses about temporal queries.
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any
import logging
from .database import DatabaseManager

logger = logging.getLogger(__name__)


class DateRangeInfo(BaseModel):
    """Information about available date ranges in the database."""
    earliest_date: str = Field(description="The earliest date in the database")
    latest_date: str = Field(description="The latest date in the database")
    total_trips: int = Field(description="Total number of trips in the database")
    available_dates: List[str] = Field(description="List of all available dates")
    date_summary: str = Field(description="Human-readable summary of the date range")


def analyze_date_ranges(db_manager: DatabaseManager) -> DateRangeInfo:
    """
    Analyze the available date ranges in the trips database.
    
    Args:
        db_manager: The database manager instance
        
    Returns:
        DateRangeInfo: Information about available date ranges
    """
    try:
        # Get the date range from trips table
        query = """
        SELECT 
            MIN(started_at) as earliest_date,
            MAX(started_at) as latest_date,
            COUNT(*) as total_trips
        FROM trips
        """
        
        result = db_manager.run_query_with_logging(query)
        if not result:
            return DateRangeInfo(
                earliest_date="Unknown",
                latest_date="Unknown", 
                total_trips=0,
                available_dates=[],
                date_summary="No date information available"
            )
        
        # Parse the result - it comes as a string like "('8/31/25 22:16', '9/8/25 2:18', 2000)"
        import re
        match = re.search(r"\('([^']+)', '([^']+)', (\d+)\)", result)
        if match:
            earliest, latest, total = match.groups()
            total = int(total)
        else:
            return DateRangeInfo(
                earliest_date="Unknown",
                latest_date="Unknown", 
                total_trips=0,
                available_dates=[],
                date_summary="Could not parse date information"
            )
        
        # Get all unique dates (handle text format MM/DD/YY)
        date_query = """
        SELECT DISTINCT 
            CASE 
                WHEN started_at LIKE '%/%' THEN 
                    substr(started_at, 1, instr(started_at, ' ') - 1)
                ELSE started_at 
            END as date, 
            COUNT(*) as count
        FROM trips 
        WHERE started_at IS NOT NULL AND started_at != ''
        GROUP BY date 
        ORDER BY date
        """
        
        date_results = db_manager.run_query_with_logging(date_query)
        available_dates = []
        
        if date_results:
            # Parse the results - they come as a string like "[('2025-08-31', 100), ('2025-09-01', 150)]"
            import re
            # Find all date-count pairs
            matches = re.findall(r"\('([^']+)', (\d+)\)", date_results)
            for date_str, count_str in matches:
                if date_str and date_str != 'None':
                    available_dates.append(f"{date_str} ({count_str} trips)")
        
        # Create human-readable summary
        if earliest and latest:
            # Parse the dates to provide better context
            try:
                from datetime import datetime
                earliest_parsed = datetime.strptime(earliest.split()[0], "%m/%d/%y")
                latest_parsed = datetime.strptime(latest.split()[0], "%m/%d/%y")
                
                # Calculate the actual date range
                days_span = (latest_parsed - earliest_parsed).days + 1
                date_summary = f"Database contains {total} trips from {earliest} to {latest} ({days_span} days total). Available dates: {', '.join(available_dates[:5])}"
                if len(available_dates) > 5:
                    date_summary += f" and {len(available_dates) - 5} more dates."
                
                # Add specific guidance about partial months
                if earliest_parsed.month == latest_parsed.month:
                    month_name = earliest_parsed.strftime("%B")
                    date_summary += f" NOTE: Data covers only {earliest_parsed.day}-{latest_parsed.day} of {month_name} {earliest_parsed.year}."
                elif earliest_parsed.month != latest_parsed.month:
                    earliest_month = earliest_parsed.strftime("%B")
                    latest_month = latest_parsed.strftime("%B")
                    date_summary += f" NOTE: Data spans from {earliest_month} {earliest_parsed.day} to {latest_month} {latest_parsed.day}, {earliest_parsed.year}."
            except:
                date_summary = f"Database contains {total} trips from {earliest} to {latest}. Available dates: {', '.join(available_dates[:5])}"
                if len(available_dates) > 5:
                    date_summary += f" and {len(available_dates) - 5} more dates."
        else:
            date_summary = f"Database contains {total} trips with date information."
        
        return DateRangeInfo(
            earliest_date=earliest or "Unknown",
            latest_date=latest or "Unknown",
            total_trips=total,
            available_dates=available_dates,
            date_summary=date_summary
        )
        
    except Exception as e:
        logger.error(f"Error analyzing date ranges: {e}")
        return DateRangeInfo(
            earliest_date="Error",
            latest_date="Error",
            total_trips=0,
            available_dates=[],
            date_summary=f"Error retrieving date information: {str(e)}"
        )


def get_date_range_context(db_manager: DatabaseManager) -> str:
    """
    Get a context string about available date ranges for the agent.
    
    Args:
        db_manager: The database manager instance
        
    Returns:
        str: Context string about available dates
    """
    date_info = analyze_date_ranges(db_manager)
    
    context = f"""
DATE RANGE CONTEXT:
- Database contains {date_info.total_trips} trips
- Date range: {date_info.earliest_date} to {date_info.latest_date}
- Available dates: {', '.join(date_info.available_dates[:10])}
- {date_info.date_summary}

IMPORTANT: When users ask about "last month", "this month", or specific dates, 
refer to the actual date range available in the database. If they ask about 
dates outside this range, inform them that the database only contains data 
from {date_info.earliest_date} to {date_info.latest_date}.
"""
    
    return context.strip()


# Create the tool function for the agent
def analyze_database_date_ranges(db_manager: DatabaseManager) -> str:
    """
    Tool function to provide current date context for the agent.
    
    Instead of giving exact database date ranges that make the agent overly cautious,
    this tool provides the current date so the agent can make reasonable assumptions
    about temporal queries like "last month".
    
    Args:
        db_manager: The database manager instance
        
    Returns:
        str: Formatted information about current date context
    """
    try:
        from datetime import datetime, timedelta
        
        # Get current date
        now = datetime.now()
        current_date = now.strftime("%B %d, %Y")
        current_month = now.strftime("%B %Y")
        
        # Calculate last month
        if now.month == 1:
            last_month = f"December {now.year - 1}"
        else:
            last_month_date = now.replace(month=now.month - 1)
            last_month = last_month_date.strftime("%B %Y")
        
        # Get basic database info to provide intelligent guidance
        date_info = analyze_date_ranges(db_manager)
        
        # Parse the actual database date range for smarter interpretation
        earliest_date = date_info.earliest_date
        latest_date = date_info.latest_date
        
        # Extract month/year from database dates for comparison
        from datetime import datetime
        try:
            # Parse database dates (format: "8/31/25 22:16")
            db_earliest = datetime.strptime(earliest_date.split()[0], "%m/%d/%y")
            db_latest = datetime.strptime(latest_date.split()[0], "%m/%d/%y")
            
            # Determine what "last month" should actually mean based on data
            if db_earliest.month == now.month - 1 or (now.month == 1 and db_earliest.month == 12):
                # Data starts in the previous month, so "last month" should include that data
                smart_last_month = f"{db_earliest.strftime('%B')} {db_earliest.year}"
                data_guidance = f"Data is available from {earliest_date} to {latest_date}, so 'last month' queries should include this period."
            else:
                # Data doesn't align with typical "last month" - provide guidance
                smart_last_month = f"{db_earliest.strftime('%B')} {db_earliest.year}"
                data_guidance = f"Data is available from {earliest_date} to {latest_date}. For 'last month' queries, use the available date range."
        except:
            smart_last_month = last_month
            data_guidance = f"Data is available from {earliest_date} to {latest_date}."
        
        result = f"""CURRENT DATE CONTEXT:

📅 Today's Date: {current_date}
📅 Current Month: {current_month}
📅 Last Month: {last_month}
📊 Database Status: Contains {date_info.total_trips} trips with recent data

💡 INTELLIGENT TEMPORAL QUERY GUIDANCE:
- The available data period is {earliest_date} to {latest_date}
- IMPORTANT: Database dates are stored as TEXT in format "M/D/YY H:MM" (e.g., "9/5/25 18:06")
- For temporal queries, use the available date range rather than strict calendar months
- Use LIKE patterns for date filtering: started_at LIKE '9/%/25%' for September 2025
- Be confident in your date interpretations and provide specific answers

🎯 CRITICAL: When users ask about "September 2025" or "last month", clarify that the database only contains data from {earliest_date} to {latest_date}. 
- If they ask about "September 2025", explain this covers only September 1-8, 2025 (partial month)
- If they ask about "last month", explain the available data period
- Always specify the exact date range when providing results

📋 EXAMPLE RESPONSES:
- "September 2025 trips": "There were X trips from the available September data period"
- "Last month": "Based on available data from {earliest_date} to {latest_date}, there were X trips"
- "Moody Center last month": "There were X trips to Moody Center in the available data period"
"""
        
        logger.info(f"Current date context provided: {current_date}, last month: {last_month}")
        return result
        
    except Exception as e:
        error_msg = f"Error providing date context: {str(e)}"
        logger.error(error_msg)
        return error_msg
