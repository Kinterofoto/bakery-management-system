"""Model override and metrics capture for evals."""

import time
from contextlib import contextmanager
from dataclasses import dataclass, field
from typing import Optional

# Cost per 1K tokens (input, output) in USD
COST_PER_1K = {
    "gpt-4o-mini": (0.00015, 0.0006),
    "gpt-4o": (0.0025, 0.01),
    "gpt-4.1": (0.002, 0.008),
    "gpt-4.1-mini": (0.0004, 0.0016),
    "gpt-4.1-nano": (0.0001, 0.0004),
}


@dataclass
class CallMetrics:
    model: str = ""
    latency_ms: float = 0.0
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0

    @property
    def cost_usd(self) -> float:
        rates = COST_PER_1K.get(self.model, (0.001, 0.002))
        return (self.input_tokens / 1000 * rates[0]) + (self.output_tokens / 1000 * rates[1])


@dataclass
class MetricsAccumulator:
    """Accumulates metrics across multiple OpenAI calls."""
    calls: list = field(default_factory=list)

    @property
    def total_tokens(self) -> int:
        return sum(c.total_tokens for c in self.calls)

    @property
    def total_cost_usd(self) -> float:
        return sum(c.cost_usd for c in self.calls)

    @property
    def total_latency_ms(self) -> float:
        return sum(c.latency_ms for c in self.calls)

    def record(self, model: str, latency_ms: float, usage) -> None:
        m = CallMetrics(
            model=model,
            latency_ms=latency_ms,
            input_tokens=usage.prompt_tokens if usage else 0,
            output_tokens=usage.completion_tokens if usage else 0,
            total_tokens=usage.total_tokens if usage else 0,
        )
        self.calls.append(m)


class ModelOverride:
    """Context manager that monkey-patches OpenAI client to override model."""

    def __init__(self, openai_client, model: Optional[str] = None, metrics: Optional[MetricsAccumulator] = None):
        self.openai_client = openai_client
        self.model = model
        self.metrics = metrics or MetricsAccumulator()
        self._original_create = None

    def __enter__(self):
        original = self.openai_client.client.chat.completions.create
        self._original_create = original
        model_override = self.model
        metrics = self.metrics

        async def patched_create(*args, **kwargs):
            if model_override:
                kwargs["model"] = model_override
            start = time.time()
            response = await original(*args, **kwargs)
            latency = (time.time() - start) * 1000
            actual_model = kwargs.get("model", "unknown")
            usage = response.usage if response else None
            metrics.record(actual_model, latency, usage)
            return response

        self.openai_client.client.chat.completions.create = patched_create
        return self.metrics

    def __exit__(self, *exc):
        if self._original_create:
            self.openai_client.client.chat.completions.create = self._original_create
