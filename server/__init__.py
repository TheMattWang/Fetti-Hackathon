"""
Organized Agent Package

This package provides a well-structured approach to building LangGraph agents
with modular components for different functionalities.

Main Components:
- core: Core agent building functionality
- config: Configuration management (LLM setup, environment)
- utils: Utility modules (state, nodes, tools, evaluations)

Quick Start:
    from agent import create_sql_agent
    
    # Create a SQL agent quickly
    agent = create_sql_agent()
    
    # Or use the builder pattern for more control
    from agent.core import AgentBuilder
    
    builder = AgentBuilder()
    agent = builder.setup_llm().create_sql_agent()
"""

from .core import AgentBuilder, create_sql_agent

__all__ = ["AgentBuilder", "create_sql_agent"]
__version__ = "1.0.0"
