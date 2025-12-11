"""Supabase Storage service for file uploads."""

import logging
import re
import uuid
from datetime import datetime
from functools import lru_cache
from typing import Optional

from supabase import Client
from tenacity import retry, stop_after_attempt, wait_exponential

from ..core.config import get_settings
from ..core.supabase import get_supabase_client

logger = logging.getLogger(__name__)


class StorageService:
    """Service for Supabase Storage operations."""

    def __init__(self, supabase: Client, bucket: str):
        self.supabase = supabase
        self.bucket = bucket
        self.folder = "oc"

    def _sanitize_filename(self, filename: str) -> str:
        """
        Sanitize filename for storage.

        Args:
            filename: Original filename

        Returns:
            Sanitized filename
        """
        # Remove extension
        name = filename.rsplit(".", 1)[0] if "." in filename else filename

        # Convert to lowercase and replace spaces
        name = name.lower().replace(" ", "-")

        # Remove invalid characters
        name = re.sub(r"[^a-z0-9\-._]", "", name)

        # Truncate if too long
        if len(name) > 50:
            name = name[:50]

        return name

    def _generate_filename(self, original_name: str) -> str:
        """
        Generate a unique filename for storage.

        Format: {date}_{timestamp}_{random}_{sanitized_name}.pdf

        Args:
            original_name: Original filename

        Returns:
            Generated unique filename
        """
        now = datetime.now()
        date_str = now.strftime("%Y-%m-%d")
        timestamp = int(now.timestamp())
        random_suffix = uuid.uuid4().hex[:9]
        sanitized = self._sanitize_filename(original_name)

        return f"{date_str}_{timestamp}_{random_suffix}_{sanitized}.pdf"

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
    )
    async def upload_pdf(
        self,
        content: bytes,
        original_name: str,
        content_type: str = "application/pdf",
    ) -> dict:
        """
        Upload a PDF file to Supabase Storage.

        Args:
            content: File content as bytes
            original_name: Original filename
            content_type: MIME type

        Returns:
            Dict with path, url, and filename
        """
        filename = self._generate_filename(original_name)
        path = f"{self.folder}/{filename}"

        logger.info(f"Uploading PDF to storage: {path}")

        try:
            # Upload file
            result = self.supabase.storage.from_(self.bucket).upload(
                path=path,
                file=content,
                file_options={"content-type": content_type},
            )

            # Get public URL
            url = self.supabase.storage.from_(self.bucket).get_public_url(path)

            logger.info(f"PDF uploaded successfully: {path}")

            return {
                "path": path,
                "url": url,
                "filename": filename,
                "bucket": self.bucket,
            }

        except Exception as e:
            logger.error(f"Failed to upload PDF: {e}")
            raise

    async def get_signed_url(
        self, path: str, expires_in: int = 3600
    ) -> str:
        """
        Get a signed URL for a file.

        Args:
            path: File path in storage
            expires_in: Seconds until URL expires

        Returns:
            Signed URL
        """
        logger.info(f"Generating signed URL for: {path}")

        result = self.supabase.storage.from_(self.bucket).create_signed_url(
            path=path,
            expires_in=expires_in,
        )

        return result.get("signedURL", "")

    async def delete_file(self, path: str) -> bool:
        """
        Delete a file from storage.

        Args:
            path: File path in storage

        Returns:
            True if successful
        """
        logger.info(f"Deleting file: {path}")

        try:
            self.supabase.storage.from_(self.bucket).remove([path])
            logger.info("File deleted successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to delete file: {e}")
            return False

    async def list_files(self, prefix: Optional[str] = None) -> list:
        """
        List files in the bucket.

        Args:
            prefix: Optional path prefix to filter

        Returns:
            List of file objects
        """
        path = prefix or self.folder

        try:
            result = self.supabase.storage.from_(self.bucket).list(path)
            return result
        except Exception as e:
            logger.error(f"Failed to list files: {e}")
            return []


@lru_cache()
def get_storage_service() -> StorageService:
    """Get cached Storage service instance."""
    settings = get_settings()
    supabase = get_supabase_client()
    return StorageService(
        supabase=supabase,
        bucket=settings.supabase_storage_bucket,
    )
