# SQL Agent Testing Guide

## Overview
This guide explains how to test the SQL agent's behavior and identify issues with over-caution.

## Current Issue
The agent is being overly cautious when users ask about "last month" or similar time periods, asking for clarification instead of making reasonable assumptions.

## Hypothesis
The `analyze_database_date_ranges_tool` might be causing the agent to be overly cautious by providing exact date range information that makes it too conservative.

## Test Files

### 1. `test_without_date_tool.py`
**Purpose**: Test the agent's behavior to see if it's less cautious without the date range tool.

**Usage**:
```bash
python test_without_date_tool.py
```

**What it tests**:
- Original "last month" query behavior
- Specific date query behavior
- Whether the agent provides specific answers or asks for clarification

### 2. `remove_date_tool.py`
**Purpose**: Temporarily remove the date range tool to test the hypothesis.

**Usage**:
```bash
# Remove the date range tool
python remove_date_tool.py

# Restore the date range tool (after testing)
python remove_date_tool.py restore <backup_path>
```

**What it does**:
- Creates a backup of the current `sql_tools.py`
- Removes the `analyze_database_date_ranges_tool` from the agent
- Allows testing without the date range tool

## Testing Workflow

### Step 1: Test Current Behavior
```bash
# Make sure server is running
cd server && python main.py

# In another terminal, test current behavior
python test_without_date_tool.py
```

### Step 2: Remove Date Range Tool
```bash
python remove_date_tool.py
# Follow prompts to remove the tool
```

### Step 3: Restart Server
```bash
# Kill current server
pkill -f "python main.py"

# Restart server
cd server && python main.py
```

### Step 4: Test Without Date Tool
```bash
python test_without_date_tool.py
```

### Step 5: Compare Results
- If the agent is less cautious without the date tool, the hypothesis is confirmed
- If the agent is still cautious, the issue is with temperature/prompt settings

### Step 6: Restore Date Tool (if needed)
```bash
python remove_date_tool.py restore <backup_path>
```

## Expected Results

### With Date Range Tool:
- Agent asks for clarification about "last month"
- Agent provides exact date range information
- Agent is overly cautious

### Without Date Range Tool:
- Agent makes reasonable assumptions about "last month"
- Agent provides specific answers
- Agent is more confident

## API Quota Note
The Google Gemini API has a 50 requests/day limit for the free tier. If you hit the quota:
- Wait 24 hours for the quota to reset
- Or use a paid API key for more requests

## Current Configuration
- **Temperature**: 0.5 (increased from 0.0 for more confidence)
- **System Prompt**: Enhanced to encourage reasonable assumptions
- **Date Range Tool**: Available but potentially causing over-caution

## Next Steps
1. Run the tests to confirm the hypothesis
2. If confirmed, either:
   - Remove the date range tool permanently
   - Modify the date range tool to be less restrictive
   - Adjust the system prompt to override the tool's cautiousness
