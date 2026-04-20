"""Purge stored HR face-recognition captures older than the retention window.

Captures are only kept for diagnostic / evaluation purposes. Once we're past
the retention window we:
  - delete the row from `attendance_recognition_failures` entirely (these are
    fully disposable — they're not timekeeping records),
  - null out `photo_url` on `attendance_logs` so the attendance record
    survives but the photo does not,
  - remove the underlying file from storage in both cases.

Rows whose `review_status` is set are preserved (flag `preserve_reviewed`) so
the labeled eval set isn't wiped.
"""

import logging
from datetime import datetime, timedelta
from urllib.parse import urlparse

from ..core.supabase import get_supabase_client

logger = logging.getLogger(__name__)

RETENTION_DAYS = 21
STORAGE_BUCKET = "hr"


def _storage_key_from_url(url: str | None) -> str | None:
    """Extract the storage object key from a Supabase public URL.

    Supabase URLs look like:
        https://<proj>.supabase.co/storage/v1/object/public/hr/captures/XXXX.jpg
    We return `captures/XXXX.jpg` (the path inside the bucket).
    """
    if not url:
        return None
    try:
        path = urlparse(url).path
        marker = f"/object/public/{STORAGE_BUCKET}/"
        idx = path.find(marker)
        if idx < 0:
            return None
        return path[idx + len(marker):]
    except Exception:
        return None


def _delete_storage_files(keys: list[str]) -> int:
    if not keys:
        return 0
    supabase = get_supabase_client()
    deleted = 0
    # Batch in chunks of 100 to be safe with URL lengths.
    for i in range(0, len(keys), 100):
        chunk = keys[i:i + 100]
        try:
            supabase.storage.from_(STORAGE_BUCKET).remove(chunk)
            deleted += len(chunk)
        except Exception as e:
            logger.warning(f"hr_captures_purge: storage delete failed for chunk: {e}")
    return deleted


def purge_old_hr_captures(
    retention_days: int = RETENTION_DAYS,
    preserve_reviewed: bool = True,
) -> dict:
    """Remove stale capture photos + metadata. Safe to run repeatedly."""
    supabase = get_supabase_client()
    cutoff = (datetime.utcnow() - timedelta(days=retention_days)).isoformat() + "Z"

    # ── Failures: delete rows + files ───────────────────────────────
    failures_q = (
        supabase.table("attendance_recognition_failures")
        .select("id, photo_url, review_status")
        .lt("timestamp", cutoff)
    )
    stale_failures = failures_q.execute().data or []
    failures_to_delete = [
        f for f in stale_failures
        if not (preserve_reviewed and f.get("review_status"))
    ]
    failure_keys = [k for k in (
        _storage_key_from_url(f.get("photo_url")) for f in failures_to_delete
    ) if k]
    failure_files_deleted = _delete_storage_files(failure_keys)
    failure_rows_deleted = 0
    if failures_to_delete:
        ids = [f["id"] for f in failures_to_delete]
        # Supabase `in_` takes a list; delete in chunks to avoid huge URLs.
        for i in range(0, len(ids), 200):
            chunk = ids[i:i + 200]
            supabase.table("attendance_recognition_failures").delete().in_("id", chunk).execute()
            failure_rows_deleted += len(chunk)

    # ── attendance_logs: null out photo_url + extracted_embedding ───
    # We keep the timekeeping row intact — only the diagnostic payload goes.
    logs_q = (
        supabase.table("attendance_logs")
        .select("id, photo_url, review_status")
        .lt("timestamp", cutoff)
        .not_.is_("photo_url", "null")
    )
    stale_logs = logs_q.execute().data or []
    logs_to_strip = [
        l for l in stale_logs
        if not (preserve_reviewed and l.get("review_status"))
    ]
    log_keys = [k for k in (
        _storage_key_from_url(l.get("photo_url")) for l in logs_to_strip
    ) if k]
    log_files_deleted = _delete_storage_files(log_keys)
    logs_stripped = 0
    if logs_to_strip:
        ids = [l["id"] for l in logs_to_strip]
        for i in range(0, len(ids), 200):
            chunk = ids[i:i + 200]
            supabase.table("attendance_logs").update({
                "photo_url": None,
                "extracted_embedding": None,
                "top_candidates": None,
            }).in_("id", chunk).execute()
            logs_stripped += len(chunk)

    result = {
        "cutoff": cutoff,
        "retention_days": retention_days,
        "preserve_reviewed": preserve_reviewed,
        "failures_rows_deleted": failure_rows_deleted,
        "failures_files_deleted": failure_files_deleted,
        "logs_stripped": logs_stripped,
        "logs_files_deleted": log_files_deleted,
    }
    logger.info(f"hr_captures_purge done: {result}")
    return result
