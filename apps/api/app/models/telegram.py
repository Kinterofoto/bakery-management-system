"""Pydantic models for Telegram Bot."""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# === Enums ===

class ConversationFlowType(str, Enum):
    CREATE_ORDER = "create_order"
    MODIFY_ORDER = "modify_order"


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"


class AIIntent(str, Enum):
    # Orders
    QUERY_ORDERS = "query_orders"
    QUERY_DELIVERY_STATUS = "query_delivery_status"
    QUERY_CLIENTS = "query_clients"
    QUERY_FREQUENCIES = "query_frequencies"
    CREATE_ORDER = "create_order"
    MODIFY_ORDER = "modify_order"
    # CRM
    QUERY_LEADS = "query_leads"
    QUERY_PIPELINE = "query_pipeline"
    QUERY_ACTIVITIES = "query_activities"
    QUERY_OPPORTUNITIES = "query_opportunities"
    CREATE_ACTIVITY = "create_activity"
    COMPLETE_ACTIVITY = "complete_activity"
    # General
    DAILY_SUMMARY = "daily_summary"
    GREETING_OR_HELP = "greeting_or_help"


# === Telegram User Mapping ===

class TelegramUserMapping(BaseModel):
    id: str
    user_id: str
    telegram_chat_id: int
    telegram_username: Optional[str] = None
    is_active: bool = True
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


# === Conversation State ===

class ConversationState(BaseModel):
    id: str
    telegram_chat_id: int
    flow_type: ConversationFlowType
    state: str = "init"
    context: Dict[str, Any] = {}
    expires_at: Optional[str] = None
    created_at: Optional[str] = None


# === Message History ===

class TelegramMessage(BaseModel):
    role: MessageRole
    content: str
    intent: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


# === AI Agent Models ===

class UserContext(BaseModel):
    """Context about the authenticated commercial user."""
    user_id: str
    user_name: str
    telegram_chat_id: int


class OrderSummaryItem(BaseModel):
    order_number: Optional[str] = None
    client_name: Optional[str] = None
    branch_name: Optional[str] = None
    expected_delivery_date: Optional[str] = None
    status: Optional[str] = None
    total_value: Optional[float] = None
    items_count: int = 0


class ClientSummary(BaseModel):
    id: str
    name: str
    category: Optional[str] = None
    lead_status: Optional[str] = None
    branch_count: int = 0


class DailySummaryData(BaseModel):
    """Data for AM/PM daily summary."""
    # Orders
    orders_today_count: int = 0
    orders_today_total: float = 0
    orders_by_status: Dict[str, int] = {}
    orders_with_missing: int = 0
    # CRM
    pending_activities: int = 0
    overdue_activities: int = 0
    completed_activities_today: int = 0
    # Tomorrow preview
    orders_tomorrow_count: int = 0
    orders_tomorrow_total: float = 0
    # Leads needing follow-up
    leads_needing_followup: int = 0
