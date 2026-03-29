"""Vector database service — ChromaDB with multi-tenant isolation per bot."""
import os
from typing import List, Optional

import chromadb
from langchain_chroma import Chroma
from langchain_core.documents import Document
from dotenv import load_dotenv

from services.embedding import get_embedding_model

load_dotenv()

CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_data")


class VectorDBService:
    """Manages ChromaDB collections with one collection per bot (multi-tenant)."""

    def __init__(self):
        self.client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
        self.embedding_model = get_embedding_model()

    def _collection_name(self, bot_id: str) -> str:
        return f"bot_{bot_id}"

    def add_documents(self, bot_id: str, documents: List[Document]) -> int:
        """Add documents to the bot's vector store. Returns number of chunks added."""
        collection_name = self._collection_name(bot_id)
        vectorstore = Chroma(
            collection_name=collection_name,
            embedding_function=self.embedding_model,
            persist_directory=CHROMA_PERSIST_DIR,
        )
        vectorstore.add_documents(documents)
        return len(documents)

    def similarity_search(
        self, bot_id: str, query: str, k: int = 4
    ) -> List[Document]:
        """Search for similar documents in the bot's vector store."""
        collection_name = self._collection_name(bot_id)
        vectorstore = Chroma(
            collection_name=collection_name,
            embedding_function=self.embedding_model,
            persist_directory=CHROMA_PERSIST_DIR,
        )
        return vectorstore.similarity_search(query, k=k)

    def hybrid_search(
        self, bot_id: str, query: str, k: int = 4
    ) -> List[Document]:
        """Perform Hybrid Search: Combine Vector Semantic Search and BM25 Keyword Search."""
        collection_name = self._collection_name(bot_id)
        vectorstore = Chroma(
            collection_name=collection_name,
            embedding_function=self.embedding_model,
            persist_directory=CHROMA_PERSIST_DIR,
        )
        
        # 1. Semantic (Vector) Search
        semantic_docs = vectorstore.similarity_search(query, k=k)
        
        # 2. Keyword (BM25) Search
        try:
            collection = self.client.get_collection(collection_name)
            all_data = collection.get(include=["documents", "metadatas"])
            
            if not all_data or not all_data.get("documents"):
                return semantic_docs
                
            docs = []
            for doc_text, metadata in zip(all_data["documents"], all_data["metadatas"]):
                if doc_text:
                    docs.append(Document(page_content=doc_text, metadata=metadata or {}))
            
            from langchain_community.retrievers import BM25Retriever
            bm25_retriever = BM25Retriever.from_documents(docs)
            bm25_retriever.k = k
            keyword_docs = bm25_retriever.invoke(query)
            
            # 3. Combine and deduplicate
            combined_docs = {}
            for doc in semantic_docs + keyword_docs:
                if doc.page_content not in combined_docs:
                    combined_docs[doc.page_content] = doc
                    
            return list(combined_docs.values())[:k]
            
        except Exception as e:
            # Fallback to pure semantic if BM25 fails (e.g., missing package)
            return semantic_docs

    def delete_collection(self, bot_id: str) -> None:
        """Delete an entire bot's vector store collection."""
        collection_name = self._collection_name(bot_id)
        try:
            self.client.delete_collection(collection_name)
        except Exception:
            pass  # Collection may not exist

    def collection_count(self, bot_id: str) -> int:
        """Get number of documents in a bot's collection."""
        collection_name = self._collection_name(bot_id)
        try:
            collection = self.client.get_collection(collection_name)
            return collection.count()
        except Exception:
            return 0
