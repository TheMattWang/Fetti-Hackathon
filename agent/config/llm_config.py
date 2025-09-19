import os
import logging
from dotenv import load_dotenv
from langchain.chat_models import init_chat_model

logger = logging.getLogger(__name__)


def setup_environment():
    """Load environment variables from .env file."""
    load_dotenv()


def get_llm(temperature: float = 0):
    """
    Initialize and return the LLM instance with proper retry configuration.
    
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
    
    try:
        # Initialize Google GenAI with retry configuration
        logger.info("Initializing Google GenAI LLM with retry configuration...")
        llm = init_chat_model(
            "google_genai:gemini-1.5-flash", 
            temperature=temperature,
            # Configure retries - reduce retry attempts to prevent long waits
            max_retries=2,  # Reduce from default (usually 3-6)
            request_timeout=15.0,  # 15 second timeout per request
        )
        logger.info("Google GenAI LLM initialized successfully")
        return llm
        
    except Exception as e:
        logger.error(f"Failed to initialize Google GenAI LLM: {e}")
        
        # Try fallback to OpenAI if available
        openai_api_key = os.getenv('OPENAI_API_KEY')
        if openai_api_key:
            logger.info("Falling back to OpenAI GPT-4o-mini...")
            try:
                llm = init_chat_model("openai:gpt-4o-mini", temperature=temperature)
                logger.info("OpenAI LLM initialized successfully as fallback")
                return llm
            except Exception as fallback_e:
                logger.error(f"Fallback to OpenAI also failed: {fallback_e}")
        
        # If all else fails, re-raise the original error
        raise e
