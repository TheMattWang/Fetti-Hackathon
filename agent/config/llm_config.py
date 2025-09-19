import os
from dotenv import load_dotenv
from langchain.chat_models import init_chat_model


def setup_environment():
    """Load environment variables from .env file."""
    load_dotenv()


def get_llm(temperature: float = 0):
    """
    Initialize and return the LLM instance.
    
    Args:
        temperature: The temperature setting for the LLM (default: 0)
        
    Returns:
        The initialized LLM instance
    """
    setup_environment()
    
    # Set up Google API key
    google_api_key = os.getenv('GOOGLE')
    if not google_api_key:
        raise ValueError("GOOGLE environment variable is required")
    
    os.environ["GOOGLE_API_KEY"] = google_api_key
    
    # Initialize and return the LLM
    llm = init_chat_model("google_genai:gemini-2.5-flash-lite", temperature=temperature)
    return llm
