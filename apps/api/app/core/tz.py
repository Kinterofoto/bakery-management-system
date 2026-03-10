"""Bogota timezone helpers.

Centralised so every module uses the same offset for date calculations.
"""

from datetime import date, datetime, timezone, timedelta

BOG_OFFSET = timedelta(hours=-5)


def now_bogota() -> datetime:
    """Current datetime in Bogota (UTC-5), timezone-aware."""
    return datetime.now(timezone.utc).astimezone(timezone(BOG_OFFSET))


def today_bogota() -> date:
    """Current date in Bogota."""
    return now_bogota().date()
