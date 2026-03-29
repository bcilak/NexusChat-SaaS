"""Chat service — RAG-based question answering."""
import os
import json
from typing import List, Tuple

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.documents import Document
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from models.bot import Bot
from models.chat_history import ChatHistory
from models.chat_history import ChatHistory
from models.bot_integration import BotIntegration
from services.vectordb import VectorDBService
from services.tools import ECommerceProductSearchTool
from langchain_core.messages import ToolMessage

load_dotenv()


# Removed build_prompt since we will construct it dynamically with history


def format_context(docs: List[Document]) -> str:
    """Format retrieved documents into context string."""
    parts = []
    for i, doc in enumerate(docs, 1):
        source = doc.metadata.get("file_name", "Bilinmeyen Kaynak")
        parts.append(f"[Kaynak {i}: {source}]\n{doc.page_content}")
    return "\n\n---\n\n".join(parts)


def format_sources(docs: List[Document]) -> List[dict]:
    """Extract source metadata from retrieved documents."""
    sources = []
    seen = set()
    for i, doc in enumerate(docs):
        source_name = doc.metadata.get("file_name") or doc.metadata.get("title") or doc.metadata.get("source") or f"Kaynak {i+1}"
        if source_name not in seen:
            seen.add(source_name)
            sources.append({
                "file_name": source_name,
                "snippet": doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content,
            })
    return sources


def rag_chat(
    bot: Bot,
    question: str,
    session_id: str,
    db: Session,
) -> dict:
    """Full RAG chain: retrieve → prompt → generate → save."""
    # 1. Retrieve relevant documents using Hybrid Search
    vectordb = VectorDBService()
    retrieved_docs = vectordb.hybrid_search(str(bot.id), question, k=4)

    if not retrieved_docs:
        answer = "Bu konuda bilgim yok. Lütfen farklı bir soru sorun veya botun eğitim verilerine daha fazla bilgi ekleyin."
        sources = []
        is_fallback = True
    else:
        sources = format_sources(retrieved_docs) if bot.show_sources else []
        # 2. Build prompt with context and History memory
        context = format_context(retrieved_docs)
        
        recent_history = db.query(ChatHistory).filter(
            ChatHistory.bot_id == bot.id,
            ChatHistory.session_id == session_id
        ).order_by(ChatHistory.created_at.desc()).limit(4).all()
        recent_history.reverse()

        history_msgs = []
        for h in recent_history:
            history_msgs.append(("human", h.question))
            history_msgs.append(("ai", h.answer))

        system_text = bot.prompt + "\n\nİlgili İçerikler (Knowledge Base):\n{context}\n\nUnutma: Eğer kullanıcı stok veya ürün sorarsa, sana sağlanan ecommerce aracını(tool) kullanıp gerçek veriyi söyleyebilirsin."
        prompt_msgs = [("system", system_text)] + history_msgs + [("human", "{question}")]
        prompt = ChatPromptTemplate.from_messages(prompt_msgs)

        # 3. Call LLM
        model_name = bot.model or "gpt-4o-mini"
        if "gemini" in model_name:
            from langchain_google_genai import ChatGoogleGenerativeAI
            llm = ChatGoogleGenerativeAI(
                model=model_name,
                temperature=bot.temperature,
                max_output_tokens=bot.max_tokens,
                google_api_key=os.getenv("GOOGLE_API_KEY", ""),
            )
        elif "claude" in model_name:
            from langchain_anthropic import ChatAnthropic
            llm = ChatAnthropic(
                model_name=model_name,
                temperature=bot.temperature,
                max_tokens=bot.max_tokens,
                anthropic_api_key=os.getenv("ANTHROPIC_API_KEY", ""),
            )
        else:
            llm = ChatOpenAI(
                model=model_name,
                temperature=bot.temperature,
                max_tokens=bot.max_tokens,
                openai_api_key=os.getenv("OPENAI_API_KEY"),
            )
        
        # Determine tools based on Bot Integration
        active_tools = []
        integrations = db.query(BotIntegration).filter(BotIntegration.bot_id == bot.id, BotIntegration.is_active == True).all()
        for i in integrations:
            if i.provider in ["woocommerce", "shopify"]:
                active_tools.append(ECommerceProductSearchTool(
                    api_url=i.api_url,
                    api_key=i.api_key,
                    api_secret=i.api_secret or "",
                    provider=i.provider
                ))

        if active_tools:
            llm_with_tools = llm.bind_tools(active_tools)
            chain = prompt | llm_with_tools
            
            # Initial invocation
            response_msg = chain.invoke({"context": context, "question": question})
            
            if response_msg.tool_calls:
                messages = prompt.format_messages(context=context, question=question)
                messages.append(response_msg)
                
                for tc in response_msg.tool_calls:
                    tool = next((t for t in active_tools if t.name == tc["name"]), None)
                    if tool:
                        try:
                            tool_result = tool.invoke(tc["args"])
                            messages.append(ToolMessage(content=str(tool_result), tool_call_id=tc["id"]))
                        except Exception as e:
                            messages.append(ToolMessage(content=f"Error executing tool: {e}", tool_call_id=tc["id"]))
                
                # Final LLM output combining tool results
                final_response = llm.invoke(messages)
                answer = final_response.content
            else:
                answer = response_msg.content
        else:
            # Fallback to simple chain if no tools
            # Fallback to simple chain if no tools
            simple_prompt = ChatPromptTemplate.from_messages(
                [("system", bot.prompt + "\n\nBilgiler:\n{context}")] + history_msgs + [("human", "{question}")]
            )
            chain = simple_prompt | llm
            response = chain.invoke({"context": context, "question": question})
            answer = response.content
        is_fallback = False

    # 4. Save to chat history
    history = ChatHistory(
        bot_id=bot.id,
        session_id=session_id,
        question=question,
        answer=answer,
        sources=json.dumps(sources, ensure_ascii=False),
        is_fallback=is_fallback
    )
    db.add(history)
    db.commit()

    return {
        "answer": answer,
        "sources": sources,
        "session_id": session_id,
    }
