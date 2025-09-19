# Agent Package Structure

This directory contains a well-organized agent package built with LangGraph, providing modular components for building different types of AI agents.

## Directory Structure

```
agent/
├── __init__.py                 # Main package exports
├── agent.py                    # Example usage and demonstration
├── README.md                   # This file
├── config/                     # Configuration management
│   ├── __init__.py
│   └── llm_config.py          # LLM setup and environment configuration
├── core/                       # Core agent building functionality
│   ├── __init__.py
│   ├── agent_builder.py       # Main agent builder class
│   └── graph_builder.py       # Graph construction utilities
└── utils/                      # Utility modules
    ├── __init__.py
    ├── evals/                  # Evaluation utilities (placeholder)
    │   └── __init__.py
    ├── nodes/                  # Graph node definitions
    │   ├── __init__.py
    │   ├── chatbot.py         # Chatbot node implementation
    │   └── graph_utils.py     # Graph utility functions
    ├── state/                  # State management
    │   ├── __init__.py
    │   └── state.py           # State schema definitions
    └── tools/                  # Agent tools and database utilities
        ├── __init__.py
        ├── database.py        # Database connection management
        └── sql_tools.py       # SQL-specific tools and prompts
```

## Quick Start

### Option 1: Using the Convenience Function

```python
from agent import create_sql_agent

# Create a SQL agent with default settings
agent = create_sql_agent()

# Ask a question
question = "What is the most common place for drop offs?"
for step in agent.stream(
    {"messages": [{"role": "user", "content": question}]},
    stream_mode="values",
):
    step["messages"][-1].pretty_print()
```

### Option 2: Using the Builder Pattern

```python
from agent.core import AgentBuilder

# Create an agent builder
builder = AgentBuilder()

# Setup and create a SQL agent
agent = builder.setup_llm(temperature=0).create_sql_agent()

# Or create a simple chatbot
chatbot = builder.create_simple_chatbot()

# Get database information
builder.print_database_info()
```

### Option 3: Direct Component Usage

```python
from agent.config import get_llm
from agent.utils.tools import DatabaseManager, get_sql_tools
from agent.core import GraphBuilder

# Setup components individually
llm = get_llm(temperature=0)
db_manager = DatabaseManager("sqlite:///rides.sqlite")
tools = get_sql_tools(db_manager, llm)

# Build a custom graph
graph_builder = GraphBuilder()
graph = (graph_builder
         .add_chatbot_node(llm)
         .add_simple_flow()
         .compile())
```

## Key Components

### AgentBuilder
The main class for orchestrating agent creation. Provides methods for:
- Setting up LLMs with different configurations
- Creating SQL-enabled reactive agents
- Creating simple chatbot agents
- Managing database connections

### DatabaseManager
Handles database connections and operations:
- Automatic connection management
- Database information retrieval
- Sample query execution

### GraphBuilder
Utility for building LangGraph instances:
- Adding different types of nodes
- Configuring graph flows
- Compiling graphs

### State Management
Centralized state schema definition using TypedDict with LangGraph message handling.

## Configuration

The package uses environment variables for configuration:
- `GOOGLE`: Google API key for Gemini models

Make sure to set up your `.env` file with the required environment variables.

## Usage Examples

See `agent.py` for comprehensive examples of how to use the organized structure, including:
- Database information display
- SQL agent creation and testing
- Simple chatbot creation
- Interactive mode implementation

## Extending the Package

### Adding New Node Types
1. Create a new module in `utils/nodes/`
2. Define your node function
3. Export it in `utils/nodes/__init__.py`
4. Add it to the GraphBuilder if needed

### Adding New Tools
1. Create a new module in `utils/tools/`
2. Implement your tool functions
3. Export them in `utils/tools/__init__.py`
4. Integrate with AgentBuilder if needed

### Adding Evaluations
1. Add evaluation utilities to `utils/evals/`
2. Follow the same pattern as other utility modules

## Benefits of This Structure

1. **Modularity**: Each component has a specific responsibility
2. **Reusability**: Components can be used independently or together
3. **Maintainability**: Easy to locate and modify specific functionality
4. **Extensibility**: Simple to add new features without breaking existing code
5. **Testability**: Each module can be tested independently
6. **Documentation**: Clear separation makes the codebase self-documenting
