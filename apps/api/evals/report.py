"""Terminal UI report and JSON export for eval results."""

import json
import sys
from dataclasses import asdict
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional


# ─── ANSI colors ───

class C:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    RED = "\033[31m"
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    BLUE = "\033[34m"
    MAGENTA = "\033[35m"
    CYAN = "\033[36m"
    WHITE = "\033[37m"
    BG_RED = "\033[41m"
    BG_GREEN = "\033[42m"


def _bar(pct: float, width: int = 20) -> str:
    filled = int(pct / 100 * width)
    return f"{'█' * filled}{'░' * (width - filled)}"


def _fmt_latency(ms: float) -> str:
    if ms >= 1000:
        return f"{ms/1000:.1f}s"
    return f"{ms:.0f}ms"


def _fmt_cost(usd: float) -> str:
    return f"${usd:.4f}"


def print_header(model: str, total_cases: int, is_comparison: bool = False):
    print()
    print(f"{C.BOLD}{C.CYAN}🧠 PASTRY CHEF — AI EVAL SUITE{C.RESET}")
    print(f"{C.CYAN}{'━' * 57}{C.RESET}")
    if not is_comparison:
        print(f"  Model: {C.BOLD}{model}{C.RESET}  |  Date: {datetime.now().strftime('%Y-%m-%d')}  |  Cases: {total_cases}")
    else:
        print(f"  Mode: {C.BOLD}Model Comparison{C.RESET}  |  Date: {datetime.now().strftime('%Y-%m-%d')}")
    print(f"{C.CYAN}{'━' * 57}{C.RESET}")
    print()


def print_dataset_loading(datasets: Dict[str, int]):
    print(f"  {C.DIM}Loading datasets...{C.RESET}")
    for name, count in datasets.items():
        print(f"   {name:<25} {count:>3} cases")
    print()


def print_section_header(icon: str, title: str, count: int):
    print(f"─── {icon} {title} ({count} cases) {'─' * max(0, 40 - len(title))}")


def print_router_result(result):
    if result.passed:
        icon = f"{C.GREEN}✓{C.RESET}"
        detail = f"→ {C.GREEN}{result.details.get('actual', '')}{C.RESET}"
    else:
        icon = f"{C.RED}✗{C.RESET}"
        expected = result.details.get("expected", "")
        actual = result.details.get("actual", "")
        detail = f"→ {C.RED}{actual}{C.RESET}  ≠ {expected}"

    latency = _fmt_latency(result.latency_ms)
    print(f"  {icon} {result.id:<12} {result.details.get('description', ''):<30} {detail:<30} {C.DIM}{latency}{C.RESET}")


def print_tool_result(result):
    if result.passed:
        icon = f"{C.GREEN}✓{C.RESET}"
        detail = f"→ {C.GREEN}{result.details.get('actual_tool', '')}{C.RESET}"
    else:
        icon = f"{C.RED}✗{C.RESET}"
        expected = result.details.get("expected_tool", "")
        actual = result.details.get("actual_tool", "no tool call")
        if result.details.get("args_details"):
            failed_args = [k for k, v in result.details["args_details"].items() if not v.get("passed")]
            detail = f"→ {C.RED}{actual}{C.RESET} (missing: {', '.join(failed_args)})"
        else:
            detail = f"→ {C.RED}{actual}{C.RESET}  ≠ {expected}"

    latency = _fmt_latency(result.latency_ms)
    print(f"  {icon} {result.id:<12} {result.details.get('description', ''):<30} {detail}  {C.DIM}{latency}{C.RESET}")


def print_multi_turn_result(result):
    if result.passed:
        icon = f"{C.GREEN}✓{C.RESET}"
    else:
        icon = f"{C.RED}✗{C.RESET}"

    turns = result.details.get("turns", [])
    avg_latency = _fmt_latency(result.latency_ms / max(len(turns), 1))
    print(f"  {icon} {result.id:<12} {result.details.get('description', ''):<35} avg {avg_latency}/turn")

    for turn in turns:
        t_icon = f"{C.GREEN}✓{C.RESET}" if turn.get("passed") else f"{C.RED}✗{C.RESET}"
        msg = turn.get("user_msg", "")[:40]
        print(f"    Turn {turn.get('num', '?')}: {t_icon}  \"{msg}\"")


def print_quality_result(result):
    avg = result.details.get("avg_score", 0)
    if avg >= 4.0:
        icon = f"{C.GREEN}✓{C.RESET}"
        score_color = C.GREEN
    elif avg >= 3.0:
        icon = f"{C.YELLOW}~{C.RESET}"
        score_color = C.YELLOW
    else:
        icon = f"{C.RED}✗{C.RESET}"
        score_color = C.RED

    bar = _bar(avg / 5 * 100, 10)
    print(f"  {icon} {result.id:<12} {result.details.get('description', ''):<30} {score_color}{avg:.1f}/5.0{C.RESET}  {bar}")
    reasoning = result.details.get("reasoning", "")
    if reasoning:
        print(f"    {C.DIM}\"{reasoning[:80]}\"{C.RESET}")


def print_section_summary(passed: int, total: int, avg_latency_ms: float, total_latency_ms: float = 0):
    pct = (passed / total * 100) if total else 0
    bar = _bar(pct)
    color = C.GREEN if pct >= 90 else C.YELLOW if pct >= 70 else C.RED
    print(f"  ┌{'─' * 53}┐")
    print(f"  │  Score: {color}{passed}/{total} ({pct:.1f}%){C.RESET}  {bar}  {pct:.0f}%{' ' * max(0, 8 - len(str(int(pct))))}│")
    lat_str = _fmt_latency(avg_latency_ms)
    tot_str = _fmt_latency(total_latency_ms) if total_latency_ms else ""
    extra = f"  |  Total: {tot_str}" if tot_str else ""
    line = f"  Avg latency: {lat_str}{extra}"
    print(f"  │{line:<53}│")
    print(f"  └{'─' * 53}┘")
    print()


def print_final_summary(categories: Dict[str, dict], total_time_ms: float, total_cost: float, total_tokens: int):
    print(f"{C.CYAN}{'━' * 57}{C.RESET}")
    print(f"  {C.BOLD}📊 RESULTS{C.RESET}")
    print(f"{C.CYAN}{'━' * 57}{C.RESET}")
    print(f"  ┌{'─' * 14}┬{'─' * 9}┬{'─' * 9}┬{'─' * 9}┐")
    print(f"  │ {'Category':<12} │ {'Pass':<7} │ {'Score':<7} │ {'Latency':<7} │")
    print(f"  ├{'─' * 14}┼{'─' * 9}┼{'─' * 9}┼{'─' * 9}┤")

    total_passed = 0
    total_cases = 0
    for name, data in categories.items():
        passed = data["passed"]
        total = data["total"]
        pct = (passed / total * 100) if total else 0
        latency = _fmt_latency(data.get("avg_latency_ms", 0))
        color = C.GREEN if pct >= 90 else C.YELLOW if pct >= 70 else C.RED
        print(f"  │ {name:<12} │ {color}{passed:>2}/{total:<3}{C.RESET} │ {color}{pct:>5.1f}%{C.RESET} │ {latency:>7} │")
        total_passed += passed
        total_cases += total

    overall_pct = (total_passed / total_cases * 100) if total_cases else 0
    overall_color = C.GREEN if overall_pct >= 90 else C.YELLOW if overall_pct >= 70 else C.RED
    print(f"  ├{'─' * 14}┼{'─' * 9}┼{'─' * 9}┼{'─' * 9}┤")
    print(f"  │ {C.BOLD}{'TOTAL':<12}{C.RESET} │ {overall_color}{C.BOLD}{total_passed:>2}/{total_cases:<3}{C.RESET} │ {overall_color}{C.BOLD}{overall_pct:>5.1f}%{C.RESET} │ {_fmt_latency(total_time_ms / max(total_cases, 1)):>7} │")
    print(f"  └{'─' * 14}┴{'─' * 9}┴{'─' * 9}┴{'─' * 9}┘")
    print()
    print(f"  ⏱  Total time: {_fmt_latency(total_time_ms)}  |  💰 Cost: {_fmt_cost(total_cost)}  |  🔤 Tokens: {total_tokens:,}")
    print(f"{C.CYAN}{'━' * 57}{C.RESET}")
    print()


def print_comparison(model_results: Dict[str, Dict[str, dict]]):
    """Print model comparison table."""
    models = list(model_results.keys())
    if len(models) < 2:
        return

    print(f"{C.CYAN}{'━' * 57}{C.RESET}")
    print(f"  {C.BOLD}🔄 MODEL COMPARISON{C.RESET}")
    print(f"{C.CYAN}{'━' * 57}{C.RESET}")

    categories = set()
    for m in models:
        categories.update(model_results[m].keys())
    categories = sorted(categories)

    # Header
    col_w = 14
    header = f"  ┌{'─' * col_w}"
    for m in models:
        header += f"┬{'─' * col_w}"
    if len(models) == 2:
        header += f"┬{'─' * 9}"
    header += "┐"
    print(header)

    labels = f"  │ {'Category':<{col_w-2}} "
    for m in models:
        labels += f"│ {m:<{col_w-2}} "
    if len(models) == 2:
        labels += f"│ {'Delta':<7} "
    labels += "│"
    print(labels)

    sep = f"  ├{'─' * col_w}"
    for m in models:
        sep += f"┼{'─' * col_w}"
    if len(models) == 2:
        sep += f"┼{'─' * 9}"
    sep += "┤"
    print(sep)

    for cat in categories:
        row = f"  │ {cat:<{col_w-2}} "
        scores = []
        for m in models:
            data = model_results[m].get(cat, {})
            passed = data.get("passed", 0)
            total = data.get("total", 0)
            pct = (passed / total * 100) if total else 0
            scores.append(pct)
            color = C.GREEN if pct >= 90 else C.YELLOW if pct >= 70 else C.RED
            row += f"│ {color}{pct:>5.1f}%{C.RESET}{' ' * (col_w - 8)} "
        if len(models) == 2:
            delta = scores[1] - scores[0]
            d_color = C.GREEN if delta > 0 else C.RED if delta < 0 else C.DIM
            row += f"│ {d_color}{delta:>+5.1f}%{C.RESET}  "
        row += "│"
        print(row)

    # Latency + cost rows
    print(sep)
    row_lat = f"  │ {'Latency avg':<{col_w-2}} "
    lat_vals = []
    for m in models:
        total_lat = sum(d.get("avg_latency_ms", 0) for d in model_results[m].values())
        n_cats = len(model_results[m]) or 1
        avg_lat = total_lat / n_cats
        lat_vals.append(avg_lat)
        row_lat += f"│ {_fmt_latency(avg_lat):>{col_w-3}}  "
    if len(models) == 2 and lat_vals[0] > 0:
        delta_pct = (lat_vals[1] - lat_vals[0]) / lat_vals[0] * 100
        d_color = C.RED if delta_pct > 0 else C.GREEN
        row_lat += f"│ {d_color}{delta_pct:>+4.0f}%{C.RESET}   "
    row_lat += "│"
    print(row_lat)

    row_cost = f"  │ {'Cost':<{col_w-2}} "
    cost_vals = []
    for m in models:
        total_cost = sum(d.get("total_cost", 0) for d in model_results[m].values())
        cost_vals.append(total_cost)
        row_cost += f"│ {_fmt_cost(total_cost):>{col_w-3}}  "
    if len(models) == 2 and cost_vals[0] > 0:
        delta_pct = (cost_vals[1] - cost_vals[0]) / cost_vals[0] * 100
        d_color = C.RED if delta_pct > 0 else C.GREEN
        row_cost += f"│ {d_color}{delta_pct:>+4.0f}%{C.RESET}   "
    row_cost += "│"
    print(row_cost)

    footer = f"  └{'─' * col_w}"
    for m in models:
        footer += f"┴{'─' * col_w}"
    if len(models) == 2:
        footer += f"┴{'─' * 9}"
    footer += "┘"
    print(footer)
    print()


def save_json_report(results: list, output_path: str, model: str, categories: Dict[str, dict]):
    """Save results as JSON report."""
    report = {
        "model": model,
        "timestamp": datetime.now().isoformat(),
        "summary": {
            "total_passed": sum(c["passed"] for c in categories.values()),
            "total_cases": sum(c["total"] for c in categories.values()),
            "categories": categories,
        },
        "results": [
            {
                "id": r.id,
                "type": r.type,
                "tags": r.tags,
                "model": r.model,
                "passed": r.passed,
                "score": r.score,
                "latency_ms": r.latency_ms,
                "tokens_used": r.tokens_used,
                "cost_usd": r.cost_usd,
                "details": r.details,
                "error": r.error,
            }
            for r in results
        ],
    }

    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, indent=2, ensure_ascii=False, default=str))
    print(f"  {C.DIM}Report saved to {output_path}{C.RESET}")
