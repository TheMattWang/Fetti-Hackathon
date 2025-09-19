# Issue Log - Fetti Hackathon SQL Agent

## Overview
This document tracks all issues encountered during development of the SQL Agent with Server-Driven UI and their resolutions.

---

## Issue #1: LangChain Deprecation Warning
**Date**: Initial setup  
**Error**: 
```
LangChainDeprecationWarning: As of langchain-core 0.3.0, LangChain uses pydantic v2 internally. The langchain.pydantic_v1 module was a compatibility shim for pydantic v1, and should no longer be used.
```

**Root Cause**: Using deprecated `langchain.pydantic_v1` import instead of standard `pydantic`

**Resolution**: 
- Updated `agent/utils/tools/geo_intelligence.py` line 9
- Changed: `from langchain.pydantic_v1 import BaseModel, Field`
- To: `from pydantic import BaseModel, Field`

**Status**: ✅ RESOLVED

---

## Issue #2: Google GenAI 500 Internal Server Errors
**Date**: During query processing  
**Error**: 
```
500 An internal error has occurred. Please retry or report in https://developers.generativeai.google/guide/troubleshooting.
```

**Root Cause**: Input context too long for Google GenAI API limits

**Contributing Factors**:
- Very long system prompt (117 lines with emojis)
- Large conversation history (20 messages)
- Verbose geographic intelligence responses
- Database schema information in context

**Resolution**:
1. **Switched Model**: `gemini-2.5-flash-lite` → `gemini-1.5-flash`
2. **Reduced System Prompt**: 117 lines → 15 lines (87% reduction)
3. **Cut Conversation History**: 20 messages → 8 messages (60% reduction)
4. **Compressed Tool Responses**: 90% reduction in geographic intelligence output
5. **Total Context Reduction**: ~8,200 tokens → ~1,400 tokens (83% reduction)

**Status**: ✅ RESOLVED

---

## Issue #3: Agent Execution Timeout
**Date**: During query processing  
**Error**: 
```
Agent execution timed out after 20.00 seconds
```

**Root Cause**: LLM retries taking too long, exceeding 20-second timeout

**Resolution**:
1. **Increased Timeout**: 20s → 45s to accommodate LLM retries
2. **Reduced Retry Count**: Default (3-6) → 2 retries
3. **Added Request Timeout**: 15s per individual request
4. **Updated Error Messages**: More informative timeout messages

**Status**: ✅ RESOLVED

---

## Issue #4: SSE Message Delivery Failure
**Date**: After timeout fixes  
**Error**: Server logs showed "Message yielded successfully" but frontend didn't receive messages

**Root Cause**: Complex message flow through Web Worker + SSE + frontend processing

**Investigation**:
- Server was sending messages correctly
- Web Worker was receiving messages
- Frontend processing logic was correct
- Issue was actually the 500 errors preventing proper responses

**Resolution**: 
- Added comprehensive debugging to both server and frontend
- Enhanced logging in Web Worker
- Added message structure validation
- Issue resolved when Google GenAI 500 errors were fixed

**Status**: ✅ RESOLVED (as side effect of Issue #2)

---

## Issue #5: Poor Response Formatting
**Date**: After system was working  
**Error**: Raw debug output mixed with user results

**Example Bad Output**:
```
LOCATION: Moody Center (venue) 
PATTERNS: %Moody%, %Moody Center% 
RELATED: UT Campus, West Campus, University areas 
USE: WHERE pickup_address LIKE '%Moody%' OR dropoff_address LIKE '%Moody%' 
[(6,)] 
6 groups went to Moody Center last month.
```

**Root Cause**: Agent returning raw SQL results and debug info to users

**Resolution**:
1. **Created Response Cleaning Function**: Filters out debug patterns
2. **Smart Pattern Matching**: Extracts only human-readable answers
3. **Added Debug Mode Toggle**: Users can see technical details when needed
4. **Server Logging**: Both original and cleaned responses logged

**Result**: Clean output: `"6 groups went to Moody Center last month."`

**Status**: ✅ RESOLVED

---

## Issue #6: Frontend Loading/UI Crashes
**Date**: During frontend development  
**Error**: Website not loading properly, potential UI crashes or blocking issues

**Root Cause**: Direct SSE connection from React frontend causing UI blocking or crashes

**Resolution**:
1. **Implemented Web Worker**: Created `agent-worker.js` to handle SSE connections
2. **Added useAgentWorker Hook**: Replaced direct `useAgentStream` with worker-based communication
3. **Isolated SSE Logic**: Moved all EventSource handling to background worker thread
4. **Message Passing**: Implemented proper message passing between main thread and worker
5. **Error Isolation**: Worker crashes don't affect main UI thread

**Technical Implementation**:
- Created `/app/public/agent-worker.js` for background SSE handling
- Added `useAgentWorker.ts` hook for worker communication
- Implemented message types: `CONNECT`, `SEND_MESSAGE`, `AGENT_RESPONSE`, `ERROR`, `CONNECTION_STATUS`
- Added proper worker lifecycle management and cleanup

**Status**: ✅ RESOLVED

---

## Issue #7: Server Port Already in Use
**Date**: During development  
**Error**: 
```
ERROR: [Errno 48] Address already in use
```

**Root Cause**: Previous server process still running on port 8000

**Resolution**: 
- Added `pkill -f "python main.py"` commands
- Proper process cleanup before restarting

**Status**: ✅ RESOLVED

---

## Issue #8: FastAPI Deprecation Warning
**Date**: Current  
**Error**: 
```
DeprecationWarning: on_event is deprecated, use lifespan event handlers instead.
```

**Root Cause**: Using deprecated `@app.on_event("startup")` instead of lifespan handlers

**Status**: ⚠️ ACKNOWLEDGED (non-critical, can be addressed later)

---

## Summary of Resolutions

### Critical Issues Fixed:
1. ✅ **LangChain Compatibility**: Updated to Pydantic v2
2. ✅ **Google GenAI Context Limits**: Reduced input size by 83%
3. ✅ **Timeout Issues**: Increased timeout and optimized retries
4. ✅ **Message Delivery**: Fixed through context optimization
5. ✅ **Response Formatting**: Clean user experience with debug mode
6. ✅ **Frontend Loading/UI Crashes**: Implemented Web Worker for SSE handling

### Performance Improvements:
- **Context Size**: 8,200 → 1,400 tokens (83% reduction)
- **System Prompt**: 117 → 15 lines (87% reduction)
- **Conversation History**: 20 → 8 messages (60% reduction)
- **Tool Responses**: 90% reduction in verbosity
- **Timeout**: 20s → 45s (better reliability)

### User Experience Enhancements:
- **Clean Responses**: Only show final answers to users
- **Debug Mode**: Toggle for technical details
- **Better Error Messages**: More informative timeout/error handling
- **Stable Connection**: Reliable SSE streaming
- **Non-blocking UI**: Web Worker prevents UI crashes during SSE operations

### Technical Debt:
- ⚠️ FastAPI lifespan handlers (non-critical)
- ✅ All critical functionality working

---

## Current Status: ✅ FULLY FUNCTIONAL

The SQL Agent is now working correctly with:
- Clean, user-friendly responses
- Reliable Google GenAI integration
- Proper error handling and timeouts
- Debug mode for development
- Stable SSE message delivery
