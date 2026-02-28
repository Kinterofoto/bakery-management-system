"""Conversational memory: save/retrieve message history for OpenAI context."""

import logging
from typing import List, Dict, Any, Optional

from ...core.supabase import get_supabase_client

logger = logging.getLogger(__name__)

MAX_HISTORY_MESSAGES = 20


async def save_message(
    telegram_chat_id: int,
    role: str,
    content: str,
    intent: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    """Save a message to the conversation history."""
    supabase = get_supabase_client()
    try:
        insert_data = {
            "telegram_chat_id": telegram_chat_id,
            "role": role,
            "content": content,
        }
        if intent:
            insert_data["intent"] = intent
        if metadata:
            insert_data["metadata"] = metadata

        supabase.table("telegram_message_history").insert(insert_data).execute()
    except Exception as e:
        logger.error(f"Failed to save message history: {e}")


async def get_recent_messages(
    telegram_chat_id: int,
    limit: int = MAX_HISTORY_MESSAGES,
) -> List[Dict[str, str]]:
    """
    Retrieve recent messages for OpenAI context.

    Returns list of {"role": "user"|"assistant", "content": "..."}
    ordered oldest-first for OpenAI messages array.
    """
    supabase = get_supabase_client()
    try:
        result = (
            supabase.table("telegram_message_history")
            .select("role, content")
            .eq("telegram_chat_id", telegram_chat_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        if result.data:
            # Reverse to oldest-first for OpenAI
            return list(reversed(result.data))
        return []
    except Exception as e:
        logger.error(f"Failed to retrieve message history: {e}")
        return []


async def get_active_conversation(telegram_chat_id: int) -> Optional[Dict[str, Any]]:
    """Get active (non-expired) conversation flow for this chat."""
    supabase = get_supabase_client()
    try:
        result = (
            supabase.table("telegram_conversations")
            .select("*")
            .eq("telegram_chat_id", telegram_chat_id)
            .gte("expires_at", "now()")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if result.data:
            return result.data[0]
        return None
    except Exception as e:
        logger.error(f"Failed to get active conversation: {e}")
        return None


async def create_conversation(
    telegram_chat_id: int,
    flow_type: str,
    state: str = "init",
    context: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    """Create a new conversation flow."""
    supabase = get_supabase_client()
    try:
        # Delete any existing conversations for this chat
        supabase.table("telegram_conversations").delete().eq(
            "telegram_chat_id", telegram_chat_id
        ).execute()

        result = (
            supabase.table("telegram_conversations")
            .insert({
                "telegram_chat_id": telegram_chat_id,
                "flow_type": flow_type,
                "state": state,
                "context": context or {},
            })
            .execute()
        )
        if result.data:
            return result.data[0]
        return None
    except Exception as e:
        logger.error(f"Failed to create conversation: {e}")
        return None


async def update_conversation(
    conversation_id: str,
    state: Optional[str] = None,
    context: Optional[Dict[str, Any]] = None,
) -> None:
    """Update conversation state and/or context."""
    supabase = get_supabase_client()
    try:
        update_data = {}
        if state is not None:
            update_data["state"] = state
        if context is not None:
            update_data["context"] = context
        # Reset expiration on every update
        update_data["expires_at"] = "now() + interval '30 minutes'"

        supabase.table("telegram_conversations").update(
            update_data
        ).eq("id", conversation_id).execute()
    except Exception as e:
        logger.error(f"Failed to update conversation: {e}")


async def delete_conversation(telegram_chat_id: int) -> None:
    """Delete all conversations for a chat (cancel/complete flow)."""
    supabase = get_supabase_client()
    try:
        supabase.table("telegram_conversations").delete().eq(
            "telegram_chat_id", telegram_chat_id
        ).execute()
    except Exception as e:
        logger.error(f"Failed to delete conversation: {e}")


async def get_user_mapping(telegram_chat_id: int) -> Optional[Dict[str, Any]]:
    """Get the user mapping for a Telegram chat ID."""
    supabase = get_supabase_client()
    try:
        result = (
            supabase.table("telegram_user_mappings")
            .select("*, users(id, name, email, role)")
            .eq("telegram_chat_id", telegram_chat_id)
            .eq("is_active", True)
            .limit(1)
            .execute()
        )
        if result.data:
            return result.data[0]
        return None
    except Exception as e:
        logger.error(f"Failed to get user mapping: {e}")
        return None


async def create_user_mapping(
    user_id: str,
    telegram_chat_id: int,
    telegram_username: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Create a new Telegram user mapping."""
    supabase = get_supabase_client()
    try:
        result = (
            supabase.table("telegram_user_mappings")
            .insert({
                "user_id": user_id,
                "telegram_chat_id": telegram_chat_id,
                "telegram_username": telegram_username,
            })
            .execute()
        )
        if result.data:
            return result.data[0]
        return None
    except Exception as e:
        logger.error(f"Failed to create user mapping: {e}")
        return None
