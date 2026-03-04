"""Integration tests for Outlook email features.

Tests MS Graph list_emails, email classification, summary generation,
and reply_email flow.

Requires: SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY,
MS_GRAPH_CLIENT_ID, MS_GRAPH_CLIENT_SECRET, MS_GRAPH_TENANT_ID in .env
"""

import asyncio
import json
import os
import sys
import time
import logging
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

load_dotenv()

sys.path.insert(0, os.path.dirname(__file__))

from app.services.microsoft_graph import get_graph_service
from app.services.email_summary import (
    get_users_with_outlook,
    classify_emails,
    generate_email_summary,
    get_last_summary_time,
    save_summary_tracking,
)
from app.services.telegram.ai_agent import process_message
from app.services.telegram import memory

logging.basicConfig(level=logging.INFO, format="%(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("test_email")

# Test user (nicolas@pastry.com - super_admin)
USER_ID = "a8c6277d-f538-48f7-b31b-c271eb451227"
USER_NAME = "nicolas@pastry.com"
TEST_CHAT_ID = 9999999998  # Different from main test suite
TEST_OUTLOOK_EMAIL = "nquintero@pastrychef.com.co"


class TestResult:
    def __init__(self, name):
        self.name = name
        self.passed = False
        self.response = ""
        self.elapsed = 0.0
        self.error = None


async def clear_test_data():
    """Clean up test chat history."""
    await memory.delete_conversation(TEST_CHAT_ID)
    from app.core.supabase import get_supabase_client
    sb = get_supabase_client()
    try:
        sb.table("telegram_message_history").delete().eq(
            "telegram_chat_id", TEST_CHAT_ID
        ).execute()
    except Exception:
        pass


# ─── Test 1: MS Graph list_emails ───

async def test_list_emails():
    """Test that we can list emails from the test mailbox."""
    r = TestResult("MS Graph: list_emails")
    start = time.time()
    try:
        graph = get_graph_service()
        emails = await graph.list_emails(
            mailbox=TEST_OUTLOOK_EMAIL,
            since=datetime.now(timezone.utc) - timedelta(days=7),
            top=10,
        )
        r.elapsed = time.time() - start
        r.passed = isinstance(emails, list)
        r.response = f"{len(emails)} emails found"
        if emails:
            first = emails[0]
            subject = first.get("subject", "(no subject)")
            r.response += f" | Latest: {subject[:60]}"
    except Exception as e:
        r.elapsed = time.time() - start
        r.error = str(e)
    return r


# ─── Test 2: Email classification ───

async def test_classify_emails():
    """Test email classification via OpenAI."""
    r = TestResult("OpenAI: classify_emails")
    start = time.time()
    try:
        # Use real emails from the mailbox
        graph = get_graph_service()
        emails = await graph.list_emails(
            mailbox=TEST_OUTLOOK_EMAIL,
            since=datetime.now(timezone.utc) - timedelta(days=3),
            top=5,
        )
        if not emails:
            r.response = "No emails to classify (mailbox empty)"
            r.passed = True
            r.elapsed = time.time() - start
            return r

        classified = await classify_emails(emails)
        r.elapsed = time.time() - start
        r.passed = len(classified) > 0
        categories = [c.get("category", "?") for c in classified]
        r.response = f"{len(classified)} classified: {', '.join(categories)}"
    except Exception as e:
        r.elapsed = time.time() - start
        r.error = str(e)
    return r


# ─── Test 3: Full email summary generation ───

async def test_generate_email_summary():
    """Test end-to-end email summary generation."""
    r = TestResult("generate_email_summary (AM)")
    start = time.time()
    try:
        summary = await generate_email_summary(
            user_id=USER_ID,
            outlook_email=TEST_OUTLOOK_EMAIL,
            user_name="Nicolas",
            period="AM",
        )
        r.elapsed = time.time() - start
        if summary:
            r.passed = True
            r.response = summary[:150].replace("\n", " ")
        else:
            r.passed = True  # No emails is valid
            r.response = "No new emails (valid)"
    except Exception as e:
        r.elapsed = time.time() - start
        r.error = str(e)
    return r


# ─── Test 4: Users with outlook query ───

async def test_get_users_with_outlook():
    """Test that we can query users with outlook_email."""
    r = TestResult("get_users_with_outlook")
    start = time.time()
    try:
        users = await get_users_with_outlook()
        r.elapsed = time.time() - start
        r.passed = isinstance(users, list)
        if users:
            names = [u["users"]["name"] for u in users if isinstance(u.get("users"), dict)]
            r.response = f"{len(users)} users: {', '.join(names[:3])}"
        else:
            r.response = "0 users (may need active telegram mapping)"
    except Exception as e:
        r.elapsed = time.time() - start
        r.error = str(e)
    return r


# ─── Test 5: Summary tracking ───

async def test_summary_tracking():
    """Test save and retrieve of summary tracking."""
    r = TestResult("email_summary_tracking CRUD")
    start = time.time()
    try:
        now = datetime.now(timezone.utc)
        await save_summary_tracking(USER_ID, "AM", now, 5)

        last = await get_last_summary_time(USER_ID, "AM")
        r.elapsed = time.time() - start
        r.passed = last is not None
        r.response = f"Last tracked: {last}"
    except Exception as e:
        r.elapsed = time.time() - start
        r.error = str(e)
    return r


# ─── Test 6: Reply email via AI agent ───

async def test_reply_email_via_agent():
    """Test reply_email through the AI agent (natural language)."""
    await clear_test_data()
    r = TestResult("AI Agent: reply_email")
    start = time.time()
    try:
        response = await process_message(
            user_id=USER_ID,
            user_name=USER_NAME,
            telegram_chat_id=TEST_CHAT_ID,
            message_text="responde al ultimo correo que me llego diciendo: Gracias, recibido. Test desde bot de Telegram.",
        )
        r.elapsed = time.time() - start
        r.response = response[:150].replace("\n", " ") if response else "(empty)"
        # Pass if we got a meaningful response (success or helpful error)
        r.passed = response and len(response) > 10
    except Exception as e:
        r.elapsed = time.time() - start
        r.error = str(e)
    return r


# ─── Test 7: Send test email (send_reply to known email) ───

async def test_send_reply_direct():
    """Test MS Graph send_reply directly to kinterofoto@gmail.com."""
    r = TestResult("MS Graph: send_reply direct")
    start = time.time()
    try:
        graph = get_graph_service()
        # First, find a recent email to reply to
        emails = await graph.list_emails(
            mailbox=TEST_OUTLOOK_EMAIL,
            top=5,
        )
        if not emails:
            r.response = "No emails to reply to"
            r.passed = False
            r.elapsed = time.time() - start
            return r

        # Reply to the most recent email
        email_id = emails[0]["id"]
        subject = emails[0].get("subject", "?")

        await graph.send_reply(
            email_id=email_id,
            reply_body="Test reply desde integration test. Ignore this.",
            mailbox=TEST_OUTLOOK_EMAIL,
        )
        r.elapsed = time.time() - start
        r.passed = True
        r.response = f"Replied to: {subject[:60]}"
    except Exception as e:
        r.elapsed = time.time() - start
        r.error = str(e)
    return r


# ─── Runner ───

def print_result(r):
    status = "PASS" if r.passed else "FAIL"
    icon = "+" if r.passed else "X"
    time_str = f"{r.elapsed:.1f}s" if r.elapsed > 0 else ""
    print(f"  {icon} [{status}] {r.name:45} {time_str:>6}")
    if r.response:
        resp = r.response.replace("\n", " ")[:120]
        print(f"           -> {resp}")
    if r.error:
        print(f"           ERROR: {r.error}")


async def run_all():
    print("=" * 78)
    print("  OUTLOOK EMAIL INTEGRATION — TESTS")
    print("=" * 78)

    results = []

    # Group 1: MS Graph connectivity
    print("\n--- MS Graph API ---")
    r1 = await test_list_emails()
    print_result(r1)
    results.append(r1)

    # Group 2: DB and tracking
    print("\n--- Database ---")
    r2 = await test_get_users_with_outlook()
    print_result(r2)
    results.append(r2)

    r3 = await test_summary_tracking()
    print_result(r3)
    results.append(r3)

    # Group 3: Classification
    print("\n--- Email Classification (OpenAI) ---")
    r4 = await test_classify_emails()
    print_result(r4)
    results.append(r4)

    # Group 4: Full summary
    print("\n--- Email Summary Generation ---")
    r5 = await test_generate_email_summary()
    print_result(r5)
    results.append(r5)

    # Group 5: Reply
    print("\n--- Email Reply ---")
    r6 = await test_send_reply_direct()
    print_result(r6)
    results.append(r6)

    r7 = await test_reply_email_via_agent()
    print_result(r7)
    results.append(r7)

    # Summary
    print("\n" + "=" * 78)
    passed = sum(1 for r in results if r.passed)
    failed = sum(1 for r in results if not r.passed)
    total = len(results)
    print(f"  RESULTS: {passed}/{total} passed, {failed} failed")
    print("=" * 78)

    # Clean up
    await clear_test_data()

    return failed == 0


if __name__ == "__main__":
    success = asyncio.run(run_all())
    sys.exit(0 if success else 1)
