"""
Lightweight agent wrapper that uses dynamic imports to reduce bundle size.
This module provides a minimal interface that loads heavy dependencies only when needed.
"""

import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

class LightweightAgent:
    """Lightweight wrapper that dynamically loads the full agent when needed."""
    
    def __init__(self):
        self._agent = None
        self._agent_builder = None
        self._initialized = False
    
    def _ensure_agent_loaded(self):
        """Dynamically load the agent and its dependencies."""
        if self._initialized:
            return
        
        try:
            logger.info("Loading agent dependencies dynamically...")
            
            # Import heavy dependencies only when needed
            from agent.core.agent_builder import AgentBuilder
            
            logger.info("Creating agent builder...")
            self._agent_builder = AgentBuilder()
            self._agent_builder.print_database_info()
            
            logger.info("Setting up LLM and creating SQL agent...")
            self._agent = self._agent_builder.setup_llm(temperature=0.5).create_sql_agent(max_iterations=3)
            
            self._initialized = True
            logger.info("Agent loaded successfully!")
            
        except Exception as e:
            logger.error(f"Failed to load agent: {e}")
            raise
    
    def invoke(self, input_data: Dict[str, Any], config: Optional[Dict] = None) -> Dict[str, Any]:
        """Invoke the agent with the given input."""
        self._ensure_agent_loaded()
        return self._agent.invoke(input_data, config or {})
    
    def is_ready(self) -> bool:
        """Check if the agent is ready to use."""
        return self._initialized and self._agent is not None

# Global lightweight agent instance
_lightweight_agent = None

def get_lightweight_agent() -> LightweightAgent:
    """Get the global lightweight agent instance."""
    global _lightweight_agent
    if _lightweight_agent is None:
        _lightweight_agent = LightweightAgent()
    return _lightweight_agent
