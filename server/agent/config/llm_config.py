import os
import logging
from dotenv import load_dotenv
from langchain.chat_models import init_chat_model
from langchain_google_genai import ChatGoogleGenerativeAI

logger = logging.getLogger(__name__)


def setup_environment():
    """Load environment variables from .env file."""
    load_dotenv()


def get_llm(temperature: float = 0):
    """
    Initialize and return the LLM instance, prioritizing OpenAI GPT-4o-mini for best cost/performance.
    
    Args:
        temperature: The temperature setting for the LLM (default: 0)
        
    Returns:
        The initialized LLM instance
    """
    setup_environment()
    
    # Try OpenAI GPT-4o-mini first (best cost/performance ratio)
    openai_api_key = os.getenv('OPEN_AI')
    if openai_api_key:
        logger.info("Initializing OpenAI GPT-4o-mini LLM...")
        try:
            os.environ["OPENAI_API_KEY"] = openai_api_key
            llm = init_chat_model("openai:gpt-4o-mini", temperature=temperature)
            logger.info("OpenAI GPT-4o-mini LLM initialized successfully")
            return llm
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI LLM: {e}")
    
    # Fallback to Google Generative AI if OpenAI fails
    google_api_key = os.getenv('GOOGLE')
    if google_api_key:
        logger.info("Falling back to Google Generative AI...")
        try:
            llm = ChatGoogleGenerativeAI(
                model="gemini-1.5-flash",
                google_api_key=google_api_key,
                temperature=temperature,
                max_retries=2,
            )
            logger.info("Google Generative AI LLM initialized successfully as fallback")
            return llm
        except Exception as fallback_e:
            logger.error(f"Fallback to Google also failed: {fallback_e}")
    
    # If all else fails, raise an error
    raise ValueError("No valid API keys found. Please set OPEN_AI or GOOGLE environment variable.")
