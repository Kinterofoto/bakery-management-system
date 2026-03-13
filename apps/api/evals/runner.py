"""CLI entry point and eval orchestrator for Pastry Chef AI evals.

Usage:
    cd apps/api
    python -m evals.runner                          # All evals, default model
    python -m evals.runner --type router            # Solo router
    python -m evals.runner --model gpt-4o           # Otro modelo
    python -m evals.runner --tags greeting,orders   # Filtrar por tags
    python -m evals.runner --compare gpt-4o-mini,gpt-4o  # Comparar modelos
    python -m evals.runner --output reports/run.json      # Guardar reporte
"""

import argparse
import asyncio
import json
import logging
import os
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv

load_dotenv()

# Add app to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)) if os.path.basename(os.path.dirname(__file__)) == "evals" else os.path.dirname(__file__))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.openai_client import get_openai_client
from app.services.telegram.ai_agent import (
    _route_intent,
    _run_specialist,
    _handle_greeting,
    AGENT_CONFIG,
    process_message,
)
from app.services.telegram import memory
from app.core.tz import today_bogota

from evals.models import ModelOverride, MetricsAccumulator
from evals.scoring import check, check_args, llm_judge
from evals import report as rpt

logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger("evals")

DATASETS_DIR = Path(__file__).parent / "datasets"

# Test user
USER_ID = "a8c6277d-f538-48f7-b31b-c271eb451227"
USER_NAME = "nicolas@pastry.com"
TEST_CHAT_ID = 8888888888  # Separate from test_telegram_flows


@dataclass
class EvalResult:
    id: str
    type: str
    tags: list
    model: str
    passed: bool
    score: float  # 0.0 - 1.0
    latency_ms: float
    tokens_used: int
    cost_usd: float
    details: dict
    error: Optional[str] = None


# ─── Dataset loading ───


def load_dataset(filename: str) -> List[dict]:
    path = DATASETS_DIR / filename
    if not path.exists():
        return []
    cases = []
    for line in path.read_text().strip().split("\n"):
        line = line.strip()
        if line:
            cases.append(json.loads(line))
    return cases


def filter_cases(cases: List[dict], tags: Optional[List[str]] = None) -> List[dict]:
    if not tags:
        return cases
    return [c for c in cases if any(t in c.get("tags", []) for t in tags)]


# ─── Eval functions ───


async def eval_router(cases: List[dict], model: Optional[str] = None) -> List[EvalResult]:
    """Evaluate router intent classification."""
    openai_client = get_openai_client()
    results = []
    today = today_bogota().isoformat()

    for case in cases:
        metrics = MetricsAccumulator()
        with ModelOverride(openai_client, model, metrics):
            try:
                start = time.time()
                intent = await _route_intent(
                    openai_client, USER_NAME, today,
                    case.get("history", []), case["message"],
                )
                latency = (time.time() - start) * 1000

                passed = intent == case["expected_intent"]
                results.append(EvalResult(
                    id=case["id"],
                    type="router",
                    tags=case.get("tags", []),
                    model=model or "gpt-4o-mini",
                    passed=passed,
                    score=1.0 if passed else 0.0,
                    latency_ms=latency,
                    tokens_used=metrics.total_tokens,
                    cost_usd=metrics.total_cost_usd,
                    details={
                        "description": case.get("description", ""),
                        "message": case["message"],
                        "expected": case["expected_intent"],
                        "actual": intent,
                    },
                ))
            except Exception as e:
                results.append(EvalResult(
                    id=case["id"], type="router", tags=case.get("tags", []),
                    model=model or "gpt-4o-mini", passed=False, score=0.0,
                    latency_ms=0, tokens_used=0, cost_usd=0,
                    details={"description": case.get("description", ""), "expected": case["expected_intent"], "actual": "error"},
                    error=str(e),
                ))

    return results


async def eval_tool_calling(cases: List[dict], model: Optional[str] = None) -> List[EvalResult]:
    """Evaluate specialist tool selection and arguments (without executing tools)."""
    openai_client = get_openai_client()
    results = []
    today = today_bogota().isoformat()

    for case in cases:
        metrics = MetricsAccumulator()
        with ModelOverride(openai_client, model, metrics):
            try:
                intent = case["intent"]
                config = AGENT_CONFIG.get(intent)
                if not config:
                    results.append(EvalResult(
                        id=case["id"], type="tool_calling", tags=case.get("tags", []),
                        model=model or "gpt-4o-mini", passed=False, score=0.0,
                        latency_ms=0, tokens_used=0, cost_usd=0,
                        details={"description": case.get("description", ""), "expected_tool": case["expected_tool"], "actual_tool": f"unknown intent: {intent}"},
                        error=f"No config for intent: {intent}",
                    ))
                    continue

                tools = config["tools"]
                prompt_template = config["prompt"]
                format_kwargs = {"today": today, "user_name": USER_NAME}
                if "{table_list}" in prompt_template:
                    from app.services.telegram.schema_registry import get_table_list_prompt
                    format_kwargs["table_list"] = get_table_list_prompt()
                system_prompt = prompt_template.format(**format_kwargs)

                history = case.get("history", [])
                messages = [{"role": "system", "content": system_prompt}]
                messages.extend(history[-6:])
                messages.append({"role": "user", "content": case["message"]})

                start = time.time()
                response = await openai_client.client.chat.completions.create(
                    model=model or "gpt-4o-mini",
                    messages=messages,
                    tools=tools,
                    tool_choice="auto",
                    temperature=0.3,
                    max_tokens=500,
                )
                latency = (time.time() - start) * 1000

                choice = response.choices[0]
                if not choice.message.tool_calls:
                    results.append(EvalResult(
                        id=case["id"], type="tool_calling", tags=case.get("tags", []),
                        model=model or "gpt-4o-mini", passed=False, score=0.0,
                        latency_ms=latency, tokens_used=metrics.total_tokens,
                        cost_usd=metrics.total_cost_usd,
                        details={
                            "description": case.get("description", ""),
                            "expected_tool": case["expected_tool"],
                            "actual_tool": "no tool call",
                            "text_response": choice.message.content[:200] if choice.message.content else "",
                        },
                    ))
                    continue

                tool_call = choice.message.tool_calls[0]
                actual_tool = tool_call.function.name
                actual_args = json.loads(tool_call.function.arguments)

                tool_match = actual_tool == case["expected_tool"]
                expected_args = case.get("expected_args", {})

                if expected_args:
                    args_pass, args_details = check_args(actual_args, expected_args)
                else:
                    args_pass = True
                    args_details = {}

                passed = tool_match and args_pass
                results.append(EvalResult(
                    id=case["id"], type="tool_calling", tags=case.get("tags", []),
                    model=model or "gpt-4o-mini", passed=passed,
                    score=1.0 if passed else (0.5 if tool_match else 0.0),
                    latency_ms=latency, tokens_used=metrics.total_tokens,
                    cost_usd=metrics.total_cost_usd,
                    details={
                        "description": case.get("description", ""),
                        "expected_tool": case["expected_tool"],
                        "actual_tool": actual_tool,
                        "actual_args": actual_args,
                        "args_details": args_details,
                    },
                ))

            except Exception as e:
                results.append(EvalResult(
                    id=case["id"], type="tool_calling", tags=case.get("tags", []),
                    model=model or "gpt-4o-mini", passed=False, score=0.0,
                    latency_ms=0, tokens_used=0, cost_usd=0,
                    details={"description": case.get("description", ""), "expected_tool": case["expected_tool"], "actual_tool": "error"},
                    error=str(e),
                ))

    return results


async def eval_multi_turn(cases: List[dict], model: Optional[str] = None) -> List[EvalResult]:
    """Evaluate multi-turn conversation flows (hits real Supabase)."""
    results = []

    for case in cases:
        metrics = MetricsAccumulator()
        openai_client = get_openai_client()

        # Clean state
        await memory.delete_conversation(TEST_CHAT_ID)
        try:
            from app.core.supabase import get_supabase_client
            sb = get_supabase_client()
            sb.table("telegram_message_history").delete().eq("telegram_chat_id", TEST_CHAT_ID).execute()
        except Exception:
            pass

        turn_results = []
        all_passed = True
        total_latency = 0

        with ModelOverride(openai_client, model, metrics):
            for i, turn in enumerate(case["turns"]):
                try:
                    start = time.time()
                    response = await process_message(
                        user_id=USER_ID,
                        user_name=USER_NAME,
                        telegram_chat_id=TEST_CHAT_ID,
                        message_text=turn["user"],
                    )
                    latency = (time.time() - start) * 1000
                    total_latency += latency

                    turn_passed = all(check(response, spec) for spec in turn.get("checks", []))
                    if not turn_passed:
                        all_passed = False

                    turn_results.append({
                        "num": i + 1,
                        "user_msg": turn["user"],
                        "response": response[:200] if response else "",
                        "passed": turn_passed,
                        "latency_ms": latency,
                    })
                except Exception as e:
                    all_passed = False
                    turn_results.append({
                        "num": i + 1,
                        "user_msg": turn["user"],
                        "response": "",
                        "passed": False,
                        "error": str(e),
                    })

        # Clean up
        await memory.delete_conversation(TEST_CHAT_ID)

        results.append(EvalResult(
            id=case["id"],
            type="multi_turn",
            tags=case.get("tags", []),
            model=model or "gpt-4o-mini",
            passed=all_passed,
            score=sum(1 for t in turn_results if t["passed"]) / max(len(turn_results), 1),
            latency_ms=total_latency,
            tokens_used=metrics.total_tokens,
            cost_usd=metrics.total_cost_usd,
            details={
                "description": case.get("description", ""),
                "turns": turn_results,
            },
        ))

    return results


async def eval_quality(cases: List[dict], model: Optional[str] = None) -> List[EvalResult]:
    """Evaluate response quality using LLM-as-judge."""
    openai_client = get_openai_client()
    results = []
    today = today_bogota().isoformat()

    for case in cases:
        metrics = MetricsAccumulator()

        try:
            # Get response from the AI
            with ModelOverride(openai_client, model, metrics):
                # Clean state
                await memory.delete_conversation(TEST_CHAT_ID)
                try:
                    from app.core.supabase import get_supabase_client
                    sb = get_supabase_client()
                    sb.table("telegram_message_history").delete().eq("telegram_chat_id", TEST_CHAT_ID).execute()
                except Exception:
                    pass

                # Seed history if provided
                history = case.get("history", [])
                for msg in history:
                    await memory.save_message(TEST_CHAT_ID, msg["role"], msg["content"])

                start = time.time()
                response = await process_message(
                    user_id=USER_ID,
                    user_name=USER_NAME,
                    telegram_chat_id=TEST_CHAT_ID,
                    message_text=case["message"],
                )
                latency = (time.time() - start) * 1000

            # Judge with gpt-4o (unpatched — always use judge model)
            judge_result = await llm_judge(
                openai_client, case["message"], response,
                case["criteria"], judge_model="gpt-4o",
            )

            avg_score = judge_result.get("avg_score", 0)
            passed = avg_score >= 3.5

            results.append(EvalResult(
                id=case["id"],
                type="quality",
                tags=case.get("tags", []),
                model=model or "gpt-4o-mini",
                passed=passed,
                score=avg_score / 5.0,
                latency_ms=latency,
                tokens_used=metrics.total_tokens,
                cost_usd=metrics.total_cost_usd,
                details={
                    "description": case.get("description", ""),
                    "message": case["message"],
                    "response": response[:300] if response else "",
                    "avg_score": avg_score,
                    "scores": judge_result.get("scores", {}),
                    "reasoning": judge_result.get("reasoning", ""),
                    "criteria": case["criteria"],
                },
            ))

        except Exception as e:
            results.append(EvalResult(
                id=case["id"], type="quality", tags=case.get("tags", []),
                model=model or "gpt-4o-mini", passed=False, score=0.0,
                latency_ms=0, tokens_used=0, cost_usd=0,
                details={"description": case.get("description", "")},
                error=str(e),
            ))

    # Clean up
    await memory.delete_conversation(TEST_CHAT_ID)

    return results


# ─── Orchestrator ───


async def run_evals(
    eval_types: Optional[List[str]] = None,
    model: Optional[str] = None,
    tags: Optional[List[str]] = None,
    output: Optional[str] = None,
) -> tuple:
    """Run all requested evals and return (results, categories)."""
    all_types = eval_types or ["router", "tool_calling", "multi_turn", "quality"]
    all_results: List[EvalResult] = []
    categories = {}

    # Load datasets
    dataset_map = {
        "router": "router.jsonl",
        "tool_calling": "tool_calling.jsonl",
        "multi_turn": "multi_turn.jsonl",
        "quality": "quality.jsonl",
    }

    datasets_info = {}
    for t in all_types:
        cases = filter_cases(load_dataset(dataset_map.get(t, "")), tags)
        if cases:
            datasets_info[dataset_map[t]] = len(cases)

    total_cases = sum(datasets_info.values())
    rpt.print_header(model or "gpt-4o-mini", total_cases)
    rpt.print_dataset_loading(datasets_info)

    eval_funcs = {
        "router": (eval_router, "🎯 Router Classification", rpt.print_router_result),
        "tool_calling": (eval_tool_calling, "🔧 Tool Calling", rpt.print_tool_result),
        "multi_turn": (eval_multi_turn, "💬 Multi-Turn Flows", rpt.print_multi_turn_result),
        "quality": (eval_quality, "⭐ Quality — LLM Judge", rpt.print_quality_result),
    }

    total_start = time.time()

    for eval_type in all_types:
        cases = filter_cases(load_dataset(dataset_map.get(eval_type, "")), tags)
        if not cases:
            continue

        func, title, print_fn = eval_funcs[eval_type]
        rpt.print_section_header(title.split(" ")[0], " ".join(title.split(" ")[1:]), len(cases))

        results = await func(cases, model)
        all_results.extend(results)

        for r in results:
            print_fn(r)
            if r.error:
                print(f"    {rpt.C.RED}ERROR: {r.error[:80]}{rpt.C.RESET}")

        passed = sum(1 for r in results if r.passed)
        total = len(results)
        avg_lat = sum(r.latency_ms for r in results) / max(total, 1)
        total_lat = sum(r.latency_ms for r in results)
        rpt.print_section_summary(passed, total, avg_lat, total_lat)

        categories[eval_type.replace("_", " ").title()] = {
            "passed": passed,
            "total": total,
            "avg_latency_ms": avg_lat,
            "total_cost": sum(r.cost_usd for r in results),
        }

    total_time = (time.time() - total_start) * 1000
    total_cost = sum(r.cost_usd for r in all_results)
    total_tokens = sum(r.tokens_used for r in all_results)

    rpt.print_final_summary(categories, total_time, total_cost, total_tokens)

    if output:
        rpt.save_json_report(all_results, output, model or "gpt-4o-mini", categories)

    return all_results, categories


async def run_comparison(
    models: List[str],
    eval_types: Optional[List[str]] = None,
    tags: Optional[List[str]] = None,
    output: Optional[str] = None,
):
    """Run evals for multiple models and show comparison."""
    all_types = eval_types or ["router", "tool_calling"]  # Skip slow evals by default for comparison
    model_categories: Dict[str, Dict[str, dict]] = {}

    rpt.print_header("comparison", 0, is_comparison=True)

    for model_name in models:
        print(f"\n  {rpt.C.BOLD}Running: {model_name}{rpt.C.RESET}")
        print(f"  {'─' * 40}")

        dataset_map = {
            "router": "router.jsonl",
            "tool_calling": "tool_calling.jsonl",
            "multi_turn": "multi_turn.jsonl",
            "quality": "quality.jsonl",
        }

        eval_funcs = {
            "router": eval_router,
            "tool_calling": eval_tool_calling,
            "multi_turn": eval_multi_turn,
            "quality": eval_quality,
        }

        categories = {}
        for eval_type in all_types:
            cases = filter_cases(load_dataset(dataset_map.get(eval_type, "")), tags)
            if not cases:
                continue

            results = await eval_funcs[eval_type](cases, model_name)
            passed = sum(1 for r in results if r.passed)
            total = len(results)
            avg_lat = sum(r.latency_ms for r in results) / max(total, 1)
            pct = (passed / total * 100) if total else 0
            color = rpt.C.GREEN if pct >= 90 else rpt.C.YELLOW if pct >= 70 else rpt.C.RED

            print(f"    {eval_type:<15} {color}{passed}/{total} ({pct:.0f}%){rpt.C.RESET}  avg {rpt._fmt_latency(avg_lat)}")

            categories[eval_type.replace("_", " ").title()] = {
                "passed": passed,
                "total": total,
                "avg_latency_ms": avg_lat,
                "total_cost": sum(r.cost_usd for r in results),
            }

        model_categories[model_name] = categories

    print()
    rpt.print_comparison(model_categories)


# ─── CLI ───


def main():
    parser = argparse.ArgumentParser(description="Pastry Chef AI Eval Suite")
    parser.add_argument("--type", type=str, help="Eval type: router, tool_calling, multi_turn, quality")
    parser.add_argument("--model", type=str, help="Model override (e.g., gpt-4o)")
    parser.add_argument("--tags", type=str, help="Filter by tags (comma-separated)")
    parser.add_argument("--compare", type=str, help="Compare models (comma-separated, e.g., gpt-4o-mini,gpt-4o)")
    parser.add_argument("--output", type=str, help="Save JSON report to path")
    args = parser.parse_args()

    eval_types = [args.type] if args.type else None
    tags_list = args.tags.split(",") if args.tags else None

    if args.compare:
        models = [m.strip() for m in args.compare.split(",")]
        asyncio.run(run_comparison(models, eval_types, tags_list, args.output))
    else:
        asyncio.run(run_evals(eval_types, args.model, tags_list, args.output))


if __name__ == "__main__":
    main()
