"""Embedding service — wraps OpenAI embedding model."""
import os
from langchain_openai import OpenAIEmbeddings
from dotenv import load_dotenv

load_dotenv()


def get_embedding_model() -> OpenAIEmbeddings:
    """Return a configured OpenAI embedding model."""
    return OpenAIEmbeddings(
        model="text-embedding-3-small",
        openai_api_key=os.getenv("OPENAI_API_KEY"),
    )
