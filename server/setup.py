from setuptools import setup, find_packages

setup(
    name="sql-agent-server",
    version="1.0.0",
    packages=find_packages(),
    py_modules=["main"],
    install_requires=[
        "fastapi>=0.104.1",
        "uvicorn[standard]>=0.24.0",
        "python-multipart>=0.0.6",
        "langgraph>=0.0.40",
        "langchain>=0.1.0",
        "langchain-openai>=0.0.5",
        "langchain-google-genai>=1.0.0",
        "pandas>=2.0.0",
        "numpy>=1.24.0",
    ],
    python_requires=">=3.8",
)
