"""SQL query generation and execution for the Telegram AI agent.

Implements the text-to-SQL pipeline:
1. Load curated schema context for requested tables
2. Generate SQL via a lightweight OpenAI call
3. Validate the generated SQL (SELECT-only, user scoping)
4. Execute via Supabase RPC function
5. Return results
"""

import json
import logging
import re
from typing import List, Dict, Any, Optional

from ...core.supabase import get_supabase_client
from ...services.openai_client import get_openai_client
from .schema_registry import get_schema_context

logger = logging.getLogger(__name__)

# Keywords that must never appear in a SELECT query
BLOCKED_KEYWORDS = re.compile(
    r'\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|pg_sleep)\b',
    re.IGNORECASE,
)

SQL_GENERATION_PROMPT = """Eres un generador de SQL para PostgreSQL. Genera SOLO la consulta SQL, sin explicaciones.

Reglas:
- Solo SELECT (nunca INSERT/UPDATE/DELETE)
- Usa aliases claros con AS en español cuando sea util
- Siempre incluye los filtros de scoping indicados en cada tabla
- Limita a 50 filas con LIMIT 50
- Usa CURRENT_DATE para "hoy", CURRENT_DATE + 1 para "mañana"
- Para dias de la semana usa EXTRACT(DOW FROM date)
- Formatea moneda como numeros (el formateo lo hace el frontend)
- Si necesitas agrupar o agregar, usa GROUP BY / ORDER BY apropiados
- El user_id del comercial es: '{user_id}'

{schema_context}

Pregunta del usuario: {question}

SQL:"""


def validate_select_query(sql: str) -> bool:
    """Validate that a SQL string is a safe SELECT query.

    Returns True if valid, raises ValueError if not.
    """
    clean = sql.strip().lower()

    # Must start with SELECT or WITH (CTE)
    if not (clean.startswith("select") or clean.startswith("with")):
        raise ValueError("Solo se permiten consultas SELECT")

    # Check for blocked keywords
    if BLOCKED_KEYWORDS.search(clean):
        raise ValueError("La consulta contiene operaciones no permitidas")

    # Must not contain semicolons (prevent multiple statements)
    if ";" in sql.strip().rstrip(";"):
        raise ValueError("No se permiten multiples sentencias SQL")

    return True


async def generate_sql(question: str, tables: List[str], user_id: str) -> str:
    """Generate a SQL query using OpenAI based on the curated schema.

    Args:
        question: The user's natural language question
        tables: List of table names the AI thinks it needs
        user_id: The commercial user's ID for scoping

    Returns:
        The generated SQL query string
    """
    schema_context = get_schema_context(tables, user_id)
    prompt = SQL_GENERATION_PROMPT.format(
        user_id=user_id,
        schema_context=schema_context,
        question=question,
    )

    openai_client = get_openai_client()
    response = await openai_client.client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.0,
        max_tokens=500,
    )

    sql = response.choices[0].message.content or ""

    # Clean up: remove markdown code fences if present
    sql = sql.strip()
    if sql.startswith("```"):
        sql = re.sub(r'^```(?:sql)?\s*', '', sql)
        sql = re.sub(r'\s*```$', '', sql)
    sql = sql.strip().rstrip(";")

    logger.info(f"Generated SQL: {sql[:200]}")
    return sql


async def execute_select(sql: str) -> List[Dict[str, Any]]:
    """Execute a validated SELECT query via the Supabase RPC function.

    Returns list of row dicts.
    """
    supabase = get_supabase_client()
    result = supabase.rpc("execute_readonly_query", {"query_text": sql}).execute()

    if result.data is None:
        return []

    # RPC returns JSONB which the client deserializes
    data = result.data
    if isinstance(data, list):
        return data
    if isinstance(data, str):
        return json.loads(data)
    return []


async def generate_and_execute_query(
    question: str,
    tables: List[str],
    user_id: str,
) -> Dict[str, Any]:
    """Full text-to-SQL pipeline: generate, validate, execute.

    Args:
        question: User's natural language question
        tables: Tables the AI needs
        user_id: Commercial user's ID

    Returns:
        Dict with 'rows' (list of dicts), 'sql' (the query), 'row_count' (int),
        or 'error' (str) if something failed.
    """
    try:
        # 1. Generate SQL
        sql = await generate_sql(question, tables, user_id)

        if not sql:
            return {"error": "No se pudo generar la consulta SQL", "rows": [], "row_count": 0}

        # 2. Validate
        validate_select_query(sql)

        # 3. Execute
        rows = await execute_select(sql)

        return {
            "rows": rows,
            "sql": sql,
            "row_count": len(rows),
        }

    except ValueError as e:
        logger.warning(f"SQL validation failed: {e}")
        return {"error": str(e), "rows": [], "row_count": 0}
    except Exception as e:
        logger.error(f"Query execution failed: {e}")
        return {"error": f"Error ejecutando consulta: {str(e)}", "rows": [], "row_count": 0}
