"""Integration tests for Telegram AI agent flows.

Calls process_message() directly to simulate real conversations.
Requires: SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY in .env
"""

import asyncio
import os
import sys
import time
import json
import logging
from dotenv import load_dotenv

load_dotenv()

# Add app to path
sys.path.insert(0, os.path.dirname(__file__))

from app.services.telegram.ai_agent import process_message, generate_summary
from app.services.telegram.conversation import (
    start_modify_order_flow,
    handle_conversation_message,
    _search_client,
    _parse_products,
    resolve_date,
)
from app.services.telegram import memory

logging.basicConfig(level=logging.INFO, format="%(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("test")

# Test user (nicolas@pastry.com - super_admin)
USER_ID = "a8c6277d-f538-48f7-b31b-c271eb451227"
USER_NAME = "nicolas@pastry.com"
# Use a fake chat_id for tests so we don't pollute real history
TEST_CHAT_ID = 9999999999


class TestResult:
    def __init__(self, name):
        self.name = name
        self.passed = False
        self.response = ""
        self.elapsed = 0.0
        self.error = None


async def clear_test_data():
    """Clean up test chat history and conversations."""
    await memory.delete_conversation(TEST_CHAT_ID)
    from app.core.supabase import get_supabase_client
    sb = get_supabase_client()
    try:
        sb.table("telegram_message_history").delete().eq(
            "telegram_chat_id", TEST_CHAT_ID
        ).execute()
    except Exception:
        pass


async def send(text: str, label: str = "") -> TestResult:
    """Send a message and measure response time."""
    result = TestResult(label or text[:40])
    start = time.time()
    try:
        response = await process_message(
            user_id=USER_ID,
            user_name=USER_NAME,
            telegram_chat_id=TEST_CHAT_ID,
            message_text=text,
        )
        result.response = response
        result.elapsed = time.time() - start
        result.passed = True
    except Exception as e:
        result.error = str(e)
        result.elapsed = time.time() - start
    return result


# ─── Test Flows ───

async def test_greeting():
    """Test 1: Greeting — should respond naturally without tool call."""
    await clear_test_data()
    r = await send("hola, como vas?", "Saludo natural")
    # Should NOT contain old greeting_or_help format
    r.passed = (
        r.passed
        and r.response
        and "greeting_or_help" not in r.response.lower()
        and len(r.response) > 10
    )
    return [r]


async def test_help_question():
    """Test 2: Ask what the bot can do — natural text response."""
    await clear_test_data()
    r = await send("que puedes hacer?", "Pregunta de ayuda")
    r.passed = r.passed and r.response and len(r.response) > 20
    return [r]


async def test_order_conversation():
    """Test 3: Full order creation conversation flow."""
    await clear_test_data()
    results = []

    # Step 1: User wants to make an order
    r1 = await send("quiero hacer un pedido", "Pedido: inicio")
    r1.passed = r1.passed and r1.response and "cliente" in r1.response.lower()
    results.append(r1)

    # Step 2: User provides client and date
    r2 = await send("para Compensar, mañana", "Pedido: cliente+fecha")
    r2.passed = (
        r2.passed
        and r2.response
        and ("producto" in r2.response.lower() or "cantid" in r2.response.lower())
    )
    results.append(r2)

    # Step 3: User provides products
    r3 = await send(
        "50 croissants europa de 30g y 20 pasteles de pollo",
        "Pedido: productos",
    )
    r3.passed = r3.passed and r3.response and len(r3.response) > 10
    results.append(r3)

    # Step 4: User confirms
    r4 = await send("si, confirma", "Pedido: confirmar")
    # Should either create the order or ask for confirmation
    r4.passed = r4.passed and r4.response and len(r4.response) > 10
    results.append(r4)

    return results


async def test_query_orders_today():
    """Test 4: Query data — pedidos de hoy."""
    await clear_test_data()
    r = await send("cuantos pedidos tengo para hoy?", "Query: pedidos hoy")
    r.passed = r.passed and r.response and len(r.response) > 10
    return [r]


async def test_query_clients():
    """Test 5: Query data — mis clientes."""
    await clear_test_data()
    r = await send("cuales son mis clientes?", "Query: mis clientes")
    r.passed = r.passed and r.response and len(r.response) > 10
    return [r]


async def test_query_specific():
    """Test 6: Query data — specific question."""
    await clear_test_data()
    r = await send(
        "cuanto he vendido este mes?",
        "Query: ventas del mes",
    )
    r.passed = r.passed and r.response and len(r.response) > 10
    return [r]


async def test_daily_summary():
    """Test 7: Daily summary via AI."""
    await clear_test_data()
    r = await send("dame el resumen del dia", "Resumen diario")
    r.passed = r.passed and r.response and len(r.response) > 20
    return [r]


async def test_create_activity():
    """Test 8: CRM — register activity."""
    await clear_test_data()
    r = await send(
        "registrar una llamada con Hotel Bogota Plaza",
        "CRM: registrar llamada",
    )
    r.passed = r.passed and r.response and (
        "registr" in r.response.lower() or "actividad" in r.response.lower()
    )
    return [r]


async def test_modify_order_start():
    """Test 9: Start modify order flow."""
    await clear_test_data()
    r = await send("modificar pedido 001936", "Modificar pedido")
    # Should show order details or start flow
    r.passed = r.passed and r.response and (
        "001936" in r.response or "pedido" in r.response.lower()
    )
    # Clean up conversation
    await memory.delete_conversation(TEST_CHAT_ID)
    return [r]


async def test_resolve_date():
    """Test 10: Helper — resolve_date function."""
    results = []
    cases = [
        ("hoy", True),
        ("manana", True),
        ("mañana", True),
        ("pasado mañana", True),
        ("lunes", True),
        ("2026-03-15", True),
        ("15/03/2026", True),
        ("blabla", False),
    ]
    for text, should_resolve in cases:
        r = TestResult(f"resolve_date('{text}')")
        resolved = resolve_date(text)
        r.passed = (resolved is not None) == should_resolve
        r.response = str(resolved)
        results.append(r)
    return results


async def test_search_client():
    """Test 11: Helper — _search_client with RAG fallback."""
    results = []

    # Exact-ish match
    r1 = TestResult("search_client('compensar')")
    start = time.time()
    clients = await _search_client(USER_ID, "compensar")
    r1.elapsed = time.time() - start
    r1.passed = len(clients) >= 1
    r1.response = ", ".join(c["name"] for c in clients[:3]) if clients else "(none)"
    results.append(r1)

    # Fuzzy/RAG match
    r2 = TestResult("search_client('bogota plaza')")
    start = time.time()
    clients2 = await _search_client(USER_ID, "bogota plaza")
    r2.elapsed = time.time() - start
    r2.passed = len(clients2) >= 1
    r2.response = ", ".join(c["name"] for c in clients2[:3]) if clients2 else "(none)"
    results.append(r2)

    return results


async def test_parse_products():
    """Test 12: Helper — _parse_products with RAG matching."""
    r = TestResult("parse_products('50 croissants, 20 pasteles de pollo')")
    start = time.time()
    items, ambiguous = await _parse_products("50 croissants, 20 pasteles de pollo")
    r.elapsed = time.time() - start
    r.passed = len(items) >= 1
    r.response = ", ".join(
        f"{i['product_name']}({i['quantity']})" for i in items
    ) if items else "(none)"
    if ambiguous:
        r.response += f" | ambiguous: {len(ambiguous)}"
    return [r]


# ─── Runner ───

async def run_all():
    print("=" * 78)
    print("  TELEGRAM AI AGENT — INTEGRATION TESTS")
    print("=" * 78)

    # Group 1: Quick tests (helpers, no OpenAI)
    print("\n--- Helpers (no API calls) ---")
    date_results = await test_resolve_date()
    print_results(date_results)

    # Group 2: Supabase + RAG tests
    print("\n--- Client & Product Search (Supabase + RAG) ---")
    client_results = await test_search_client()
    print_results(client_results)
    product_results = await test_parse_products()
    print_results(product_results)

    # Group 3: AI agent tests (OpenAI calls)
    print("\n--- AI Agent (OpenAI calls) ---")

    greeting_results = await test_greeting()
    print_results(greeting_results)

    help_results = await test_help_question()
    print_results(help_results)

    summary_results = await test_daily_summary()
    print_results(summary_results)

    activity_results = await test_create_activity()
    print_results(activity_results)

    # Group 4: Query data
    print("\n--- Query Data (Text-to-SQL) ---")

    query1 = await test_query_orders_today()
    print_results(query1)

    query2 = await test_query_clients()
    print_results(query2)

    query3 = await test_query_specific()
    print_results(query3)

    # Group 5: Order flows
    print("\n--- Order Flows ---")

    modify_results = await test_modify_order_start()
    print_results(modify_results)

    order_results = await test_order_conversation()
    print_results(order_results)

    # Summary
    all_results = (
        date_results + client_results + product_results
        + greeting_results + help_results + summary_results
        + activity_results + query1 + query2 + query3
        + modify_results + order_results
    )

    print("\n" + "=" * 78)
    passed = sum(1 for r in all_results if r.passed)
    failed = sum(1 for r in all_results if not r.passed)
    total = len(all_results)
    print(f"  RESULTS: {passed}/{total} passed, {failed} failed")
    print("=" * 78)

    # Clean up
    await clear_test_data()

    return failed == 0


def print_results(results):
    for r in results:
        status = "PASS" if r.passed else "FAIL"
        icon = "✓" if r.passed else "✗"
        time_str = f"{r.elapsed:.1f}s" if r.elapsed > 0 else ""
        print(f"  {icon} [{status}] {r.name:40} {time_str:>6}")
        if r.response:
            # Truncate long responses
            resp = r.response.replace("\n", " ")[:100]
            print(f"           → {resp}")
        if r.error:
            print(f"           ERROR: {r.error}")


if __name__ == "__main__":
    success = asyncio.run(run_all())
    sys.exit(0 if success else 1)
