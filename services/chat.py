"""Chat service — RAG-based question answering."""
import os
import json
from typing import List

from langchain_openai import ChatOpenAI
from langchain_core.documents import Document
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from models.bot import Bot
from models.user import User
from models.chat_history import ChatHistory
from services.vectordb import VectorDBService
from services.tools import build_ecommerce_tools, build_dynamic_tools_from_db
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
    attachment_url: str = None,
    platform: str = "web"
) -> dict:
    """Full RAG chain: retrieve → prompt → generate → save."""
    # Check if the bot owner has enough credits
    user = db.query(User).filter(User.id == bot.user_id).first()
    if user and user.credits <= 0:
        return {
            "answer": "Bu botun kullanım limiti (kredi) dolmuştur. Lütfen bot sahibiyle iletişime geçin.",
            "sources": [],
            "session_id": session_id,
        }

    model_name = bot.model or "gpt-4o-mini"
    llm_invoked = False

    # 1. Retrieve relevant documents using Hybrid Search
    vectordb = VectorDBService()
    retrieved_docs = vectordb.hybrid_search(str(bot.id), question, k=4)

    if not retrieved_docs and not attachment_url:
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

        system_text = bot.prompt + "\n\nİlgili İçerikler (Knowledge Base):\n{context}\n\nÖNEMLİ KURALLAR:\n1. Gelen API verilerini veya cevaplarını düz bir uzun paragraf yerine; MUTLAKA satır atlayarak, Markdown listeleri (- ) ve kalın fontlar (**bold**) kullanarak ÇOK ŞIK, KISA ve OKUNAKLI formatla.\n2. Cümle aralarında 'Daha fazla sorun varsa buradayım', 'İşte hava durumu' gibi gereksiz sohbet uzatmaları yapma, direkt net cevabı listeler halinde ver.\n3. Kullanıcı ürün/stok soruyorsa e-ticaret aracını, dinamik bilgi (hava, kur vb.) için uygun aracı kullan."
        
        from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
        
        messages_input = [SystemMessage(content=system_text.format(context=context))]
        for h in recent_history:
            messages_input.append(HumanMessage(content=h.question))
            messages_input.append(AIMessage(content=h.answer))
            
        import base64
        import mimetypes

        if attachment_url:
            # Prevent OpenAI's "cannot download local file" error by intercepting local uploads
            image_url_payload = attachment_url
            if "/uploads/" in attachment_url:
                # Extract filename and load locally
                filename = attachment_url.split("/uploads/")[-1]
                upload_dir = os.getenv("UPLOAD_DIR", "./uploads")
                local_path = os.path.join(upload_dir, filename)
                
                if os.path.exists(local_path):
                    mime_type, _ = mimetypes.guess_type(local_path)
                    mime_type = mime_type or 'image/jpeg'
                    with open(local_path, "rb") as image_file:
                        b64_img = base64.b64encode(image_file.read()).decode("utf-8")
                    image_url_payload = f"data:{mime_type};base64,{b64_img}"

            messages_input.append(HumanMessage(content=[
                {"type": "text", "text": question},
                {"type": "image_url", "image_url": {"url": image_url_payload}}
            ]))
        else:
            messages_input.append(HumanMessage(content=question))

        # 3. Call LLM
        llm_invoked = True
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
        
        # E-ticaret entegrasyon araçları (WooCommerce, IdeaSoft, Shopify, Ticimax)
        active_tools = []
        ecommerce_tools = build_ecommerce_tools(bot.id, db)
        active_tools.extend(ecommerce_tools)

        # Dynamic API tools defined by the user in the dashboard
        dynamic_tools = build_dynamic_tools_from_db(bot.id, db)
        active_tools.extend(dynamic_tools)

        if active_tools:
            llm_with_tools = llm.bind_tools(active_tools)
            
            # Initial invocation
            response_msg = llm_with_tools.invoke(messages_input)
            
            if response_msg.tool_calls:
                messages_input.append(response_msg)
                
                for tc in response_msg.tool_calls:
                    tool = next((t for t in active_tools if t.name == tc["name"]), None)
                    if tool:
                        try:
                            tool_result = tool.invoke(tc["args"])
                            messages_input.append(ToolMessage(content=str(tool_result), tool_call_id=tc["id"]))
                        except Exception as e:
                            messages_input.append(ToolMessage(content=f"Error executing tool: {e}", tool_call_id=tc["id"]))
                
                # Final LLM output combining tool results
                final_response = llm.invoke(messages_input)
                answer = final_response.content
            else:
                answer = response_msg.content
        else:
            # Fallback to simple chain if no tools
            response = llm.invoke(messages_input)
            answer = response.content
        is_fallback = False

    # 4. Save to chat history
    save_question = question
    if attachment_url:
        save_question = f"{question}\n\n![Resim]({attachment_url})"
        
    history = ChatHistory(
        bot_id=bot.id,
        session_id=session_id,
        question=save_question,
        answer=answer,
        sources=json.dumps(sources, ensure_ascii=False),
        platform=platform,
        is_fallback=is_fallback
    )
    db.add(history)

    # 5. Deduct credits
    if user and llm_invoked:
        if "gpt-4o-mini" in model_name:
            deduction = 1
        elif "gpt-4o" in model_name:
            deduction = 30
        elif "claude-3-opus" in model_name:
            deduction = 100
        elif "claude-3-5-sonnet" in model_name or "claude-3" in model_name:
            deduction = 20
        else:
            deduction = 2
            
        user.credits -= deduction
        db.add(user)

    db.commit()

    return {
        "answer": answer,
        "sources": sources,
        "session_id": session_id,
    }
