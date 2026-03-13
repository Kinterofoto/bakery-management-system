"""Scoring utilities: automated checks and LLM-as-judge."""

import json
import re
from typing import Any, Dict, List, Tuple


def check(response: str, spec: dict) -> bool:
    """Run a single check spec against a response string."""
    check_type = spec.get("type", "")
    value = spec.get("value", "")
    values = spec.get("values", [])

    if check_type == "equals":
        return response.strip().lower() == str(value).strip().lower()
    elif check_type == "contains":
        return str(value).lower() in response.lower()
    elif check_type == "contains_any":
        return any(v.lower() in response.lower() for v in values)
    elif check_type == "not_contains":
        return str(value).lower() not in response.lower()
    elif check_type == "regex":
        return bool(re.search(str(value), response, re.IGNORECASE))
    elif check_type == "min_length":
        return len(response) >= int(value)
    else:
        return False


def check_args(actual_args: dict, expected_specs: dict) -> Tuple[bool, Dict[str, Any]]:
    """Check tool call arguments against expected specs.

    expected_specs format:
        {"client_name": {"contains": "bogota"}, "activity_type": {"equals": "llamada"}}
    """
    details = {}
    all_pass = True

    for arg_name, spec in expected_specs.items():
        actual = actual_args.get(arg_name, "")
        if isinstance(actual, (list, dict)):
            actual_str = json.dumps(actual, ensure_ascii=False)
        else:
            actual_str = str(actual)

        passed = False
        for check_type, check_value in spec.items():
            if check_type == "equals":
                passed = actual_str.strip().lower() == str(check_value).strip().lower()
            elif check_type == "contains":
                passed = str(check_value).lower() in actual_str.lower()
            elif check_type == "regex":
                passed = bool(re.search(str(check_value), actual_str, re.IGNORECASE))
            elif check_type == "type":
                if check_value == "array":
                    passed = isinstance(actual_args.get(arg_name), list)
                elif check_value == "string":
                    passed = isinstance(actual_args.get(arg_name), str)
                elif check_value == "number":
                    passed = isinstance(actual_args.get(arg_name), (int, float))
                else:
                    passed = False
            elif check_type == "exists":
                passed = arg_name in actual_args
            else:
                passed = False

        details[arg_name] = {"expected": spec, "actual": actual, "passed": passed}
        if not passed:
            all_pass = False

    return all_pass, details


async def llm_judge(
    openai_client,
    user_message: str,
    response: str,
    criteria: List[str],
    judge_model: str = "gpt-4o",
) -> Dict[str, Any]:
    """Use a stronger LLM to judge response quality.

    Returns: {"scores": {criterion: score}, "avg_score": float, "reasoning": str}
    """
    criteria_text = "\n".join(f"{i+1}. {c}" for i, c in enumerate(criteria))

    judge_prompt = f"""Evalua la respuesta de un asistente de IA (Geraldine, asistente comercial de una panaderia industrial colombiana).

Mensaje del usuario: "{user_message}"

Respuesta del asistente: "{response}"

Criterios de evaluacion (puntua cada uno de 1 a 5):
{criteria_text}

Responde en JSON exacto:
{{"scores": {{"1": <score>, "2": <score>, ...}}, "reasoning": "<explicacion breve>"}}"""

    result = await openai_client.client.chat.completions.create(
        model=judge_model,
        messages=[{"role": "user", "content": judge_prompt}],
        temperature=0.0,
        max_tokens=500,
    )

    content = result.choices[0].message.content or "{}"

    # Parse JSON from response (handle markdown code blocks)
    content = content.strip()
    if content.startswith("```"):
        content = re.sub(r"^```(?:json)?\s*", "", content)
        content = re.sub(r"\s*```$", "", content)

    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        return {"scores": {}, "avg_score": 0.0, "reasoning": f"Failed to parse judge response: {content[:200]}"}

    scores = parsed.get("scores", {})
    float_scores = {}
    for k, v in scores.items():
        try:
            float_scores[k] = float(v)
        except (ValueError, TypeError):
            float_scores[k] = 0.0

    avg = sum(float_scores.values()) / len(float_scores) if float_scores else 0.0

    return {
        "scores": float_scores,
        "avg_score": avg,
        "reasoning": parsed.get("reasoning", ""),
        "criteria": criteria,
    }
