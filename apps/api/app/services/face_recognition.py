"""Face recognition service using InsightFace (ArcFace embeddings via ONNX Runtime)."""

import io
import logging
from functools import lru_cache

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)


class FaceRecognitionError(Exception):
    """Base error for face recognition operations."""
    pass


class NoFaceDetectedError(FaceRecognitionError):
    """No face was detected in the image."""
    pass


class MultipleFacesError(FaceRecognitionError):
    """Multiple faces detected when exactly one was expected."""
    pass


class FaceRecognitionService:
    """Face recognition using InsightFace buffalo_sc model (CPU, ONNX Runtime).

    Produces 512-dimensional ArcFace embeddings. Uses cosine similarity for matching.
    """

    def __init__(self):
        from insightface.app import FaceAnalysis

        logger.info("Initializing InsightFace model (buffalo_sc)...")
        self.app = FaceAnalysis(
            name="buffalo_sc",
            providers=["CPUExecutionProvider"],
        )
        self.app.prepare(ctx_id=0, det_size=(640, 640))
        logger.info("InsightFace model ready")

    def _image_from_bytes(self, image_bytes: bytes) -> np.ndarray:
        """Convert raw image bytes to a BGR numpy array (OpenCV format expected by InsightFace)."""
        try:
            img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except Exception:
            raise NoFaceDetectedError("Formato de imagen inválido.")
        arr = np.array(img)
        # InsightFace expects BGR (OpenCV convention)
        return arr[:, :, ::-1].copy()

    def extract_embedding(self, image_bytes: bytes) -> np.ndarray:
        """Extract a 512-dim face embedding from an image.

        Args:
            image_bytes: Raw JPEG/PNG bytes.

        Returns:
            Normalized 512-dimensional numpy array.

        Raises:
            NoFaceDetectedError: If no face is found.
            MultipleFacesError: If more than one face is found.
        """
        img = self._image_from_bytes(image_bytes)
        faces = self.app.get(img)

        if len(faces) == 0:
            raise NoFaceDetectedError("No se detectó un rostro en la imagen.")
        if len(faces) > 1:
            raise MultipleFacesError(
                f"Se detectaron {len(faces)} rostros. Solo debe haber uno."
            )

        return faces[0].normed_embedding  # already L2-normalized, shape (512,)

    @staticmethod
    def compute_similarity(embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """Cosine similarity between two L2-normalized embeddings.

        Returns a value in [-1, 1] where 1 = identical.
        """
        return float(np.dot(embedding1, embedding2))

    def verify(
        self,
        image_bytes: bytes,
        stored_embedding: list[float],
        threshold: float = 0.4,
    ) -> dict:
        """Full verification: extract embedding from image and compare against stored one.

        Args:
            image_bytes: Raw image bytes from the kiosk camera.
            stored_embedding: The employee's stored 512-dim embedding as a list of floats.
            threshold: Cosine similarity threshold for a match (default 0.4).

        Returns:
            dict with keys: match (bool), similarity (float), threshold (float).
        """
        live_embedding = self.extract_embedding(image_bytes)
        stored = np.array(stored_embedding, dtype=np.float32)

        similarity = self.compute_similarity(live_embedding, stored)

        return {
            "match": similarity >= threshold,
            "similarity": round(similarity, 4),
            "threshold": threshold,
        }


@lru_cache()
def get_face_service() -> FaceRecognitionService:
    """Singleton FaceRecognitionService instance."""
    return FaceRecognitionService()
