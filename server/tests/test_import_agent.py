def test_import_agent():
    import importlib
    m = importlib.import_module("agent.core")
    assert hasattr(m, "AgentBuilder")
