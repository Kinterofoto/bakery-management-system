"""Services module for business logic."""

from .openai_client import OpenAIClient, get_openai_client
from .microsoft_graph import MicrosoftGraphService, get_graph_service
from .storage import StorageService, get_storage_service
from .ai_classifier import EmailClassifier, get_classifier
from .ai_extractor import PDFExtractor, get_extractor
from .email_processor import EmailProcessor, get_email_processor

__all__ = [
    "OpenAIClient",
    "get_openai_client",
    "MicrosoftGraphService",
    "get_graph_service",
    "StorageService",
    "get_storage_service",
    "EmailClassifier",
    "get_classifier",
    "PDFExtractor",
    "get_extractor",
    "EmailProcessor",
    "get_email_processor",
]
