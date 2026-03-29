"""Training service — orchestrates the full training pipeline."""
from typing import List

from sqlalchemy.orm import Session

from models.document import Document as DocumentModel
from services.document_loader import load_document
from services.text_splitter import split_documents
from services.vectordb import VectorDBService


def train_document(
    doc: DocumentModel, file_path: str, bot_id: int, db: Session
) -> int:
    """Train a single document: load → split → embed → store. Returns chunk count."""
    # 1. Load document
    raw_docs = load_document(file_path, doc.file_type)

    # 2. Split into chunks
    chunks = split_documents(raw_docs)

    # 3. Add metadata
    for chunk in chunks:
        chunk.metadata["bot_id"] = str(bot_id)
        chunk.metadata["document_id"] = str(doc.id)

    # 4. Store in vector DB
    vectordb = VectorDBService()
    chunk_count = vectordb.add_documents(str(bot_id), chunks)

    # 5. Update document record
    doc.chunk_count = chunk_count
    doc.is_trained = True
    db.commit()

    return chunk_count


def train_all_documents(
    bot_id: int, db: Session, upload_dir: str, retrain: bool = False
) -> dict:
    """Train all documents for a bot. If retrain=True, re-process everything."""
    vectordb = VectorDBService()

    if retrain:
        vectordb.delete_collection(str(bot_id))
        # Reset training status
        docs = db.query(DocumentModel).filter(DocumentModel.bot_id == bot_id).all()
        for doc in docs:
            doc.is_trained = False
        db.commit()

    # Get untrained documents
    docs = (
        db.query(DocumentModel)
        .filter(DocumentModel.bot_id == bot_id, DocumentModel.is_trained == False)
        .all()
    )

    if not docs:
        return {"trained": 0, "total_chunks": 0, "message": "Eğitilecek döküman yok"}

    total_chunks = 0
    trained_count = 0
    errors = []

    for doc in docs:
        file_path = f"{upload_dir}/{bot_id}/{doc.file_name}"
        try:
            chunks = train_document(doc, file_path, bot_id, db)
            total_chunks += chunks
            trained_count += 1
        except Exception as e:
            error_msg = str(e)
            print(f"Error training document {doc.file_name}: {error_msg}")
            errors.append(f"{doc.file_name}: {error_msg}")

    final_message = f"{trained_count} döküman eğitildi, toplam {total_chunks} parça oluşturuldu."
    if errors:
        final_message += " Hatalar: " + " | ".join(errors)

    return {
        "trained": trained_count,
        "total_chunks": total_chunks,
        "message": final_message,
    }
