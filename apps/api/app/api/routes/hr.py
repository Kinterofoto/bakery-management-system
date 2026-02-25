"""HR endpoints - face enrollment, verification, and embedding migration."""

import logging
import re
import unicodedata
from datetime import datetime

import httpx
from fastapi import APIRouter, File, Form, UploadFile, HTTPException

from ...core.supabase import get_supabase_client
from ...services.face_recognition import (
    get_face_service,
    NoFaceDetectedError,
    MultipleFacesError,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/hr", tags=["hr"])


@router.post("/enroll")
async def enroll_face(
    image: UploadFile = File(...),
    first_name: str = Form(None),
    last_name: str = Form(None),
    employee_id: int = Form(None),
):
    """Enroll a face: detect face, extract embedding, upload photo, save employee.

    Either provide employee_id (update existing) or first_name + last_name (create new).
    """
    face_service = get_face_service()
    supabase = get_supabase_client()

    image_bytes = await image.read()

    # Extract embedding
    try:
        embedding = face_service.extract_embedding(image_bytes)
    except NoFaceDetectedError:
        raise HTTPException(
            status_code=400,
            detail={"error": "no_face_detected", "message": "No se detectó un rostro en la imagen."},
        )
    except MultipleFacesError:
        raise HTTPException(
            status_code=422,
            detail={"error": "multiple_faces", "message": "Se detectaron múltiples rostros. Solo debe haber uno."},
        )

    # Upload photo to Supabase Storage
    raw_name = (first_name or "employee")
    # Transliterate accented chars (Nicolás → Nicolas) and strip non-alphanumeric
    safe_name = unicodedata.normalize("NFKD", raw_name).encode("ascii", "ignore").decode()
    safe_name = re.sub(r"[^a-zA-Z0-9]", "", safe_name) or "employee"
    filename = f"{int(datetime.now().timestamp())}-{safe_name}.jpg"
    try:
        supabase.storage.from_("hr").upload(filename, image_bytes, {"content-type": "image/jpeg"})
    except Exception as e:
        logger.error(f"Storage upload failed for {filename}: {e}")
        raise HTTPException(status_code=500, detail={"error": "storage_upload_failed", "message": "Error al subir la foto."})
    photo_url = supabase.storage.from_("hr").get_public_url(filename)

    descriptor_list = embedding.tolist()

    if employee_id:
        # Update existing employee
        result = (
            supabase.table("employees")
            .update({"photo_url": photo_url, "face_descriptor": descriptor_list})
            .eq("id", employee_id)
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=404, detail={"error": "employee_not_found"})
    else:
        # Create new employee
        if not first_name or not last_name:
            raise HTTPException(
                status_code=400,
                detail={"error": "missing_fields", "message": "first_name y last_name son requeridos para un nuevo empleado."},
            )
        result = (
            supabase.table("employees")
            .insert({
                "first_name": first_name,
                "last_name": last_name,
                "name": f"{first_name} {last_name}",
                "photo_url": photo_url,
                "face_descriptor": descriptor_list,
            })
            .execute()
        )
        employee_id = result.data[0]["id"]

    return {
        "success": True,
        "employee_id": employee_id,
        "face_detected": True,
        "embedding_dim": len(descriptor_list),
        "photo_url": photo_url,
    }


@router.post("/verify")
async def verify_face(
    image: UploadFile = File(...),
    employee_id: int = Form(...),
):
    """Verify a face against a stored employee embedding."""
    face_service = get_face_service()
    supabase = get_supabase_client()

    # Fetch stored embedding
    result = (
        supabase.table("employees")
        .select("id, first_name, face_descriptor")
        .eq("id", employee_id)
        .eq("is_active", True)
        .execute()
    )

    if not result.data or not result.data[0].get("face_descriptor"):
        raise HTTPException(
            status_code=404,
            detail={"error": "employee_not_found", "message": "Empleado no encontrado o sin descriptor facial."},
        )

    stored_embedding = result.data[0]["face_descriptor"]
    image_bytes = await image.read()

    try:
        verification = face_service.verify(image_bytes, stored_embedding)
    except NoFaceDetectedError:
        raise HTTPException(
            status_code=400,
            detail={"error": "no_face_detected", "message": "No se detectó un rostro en la imagen."},
        )

    return {
        "success": True,
        "match": verification["match"],
        "similarity": verification["similarity"],
        "threshold": verification["threshold"],
        "employee_id": employee_id,
    }


@router.post("/identify")
async def identify_face(
    image: UploadFile = File(...),
):
    """Identify a face against all active employees (1:N search).

    Returns the best matching employee if similarity exceeds threshold.
    """
    face_service = get_face_service()
    supabase = get_supabase_client()

    image_bytes = await image.read()

    try:
        live_embedding = face_service.extract_embedding(image_bytes)
    except NoFaceDetectedError:
        raise HTTPException(
            status_code=400,
            detail={"error": "no_face_detected", "message": "No se detectó un rostro en la imagen."},
        )

    # Fetch all active employees with face descriptors
    result = (
        supabase.table("employees")
        .select("id, first_name, last_name, photo_url, face_descriptor")
        .eq("is_active", True)
        .not_.is_("face_descriptor", "null")
        .execute()
    )

    employees = result.data or []
    if not employees:
        raise HTTPException(
            status_code=404,
            detail={"error": "no_employees", "message": "No hay empleados registrados con descriptor facial."},
        )

    import numpy as np

    best_match = None
    best_similarity = -1.0
    threshold = 0.4

    for emp in employees:
        stored = np.array(emp["face_descriptor"], dtype=np.float32)
        if stored.shape[0] != live_embedding.shape[0]:
            continue  # skip incompatible embeddings (e.g. old 128-dim from face-api.js)
        similarity = face_service.compute_similarity(live_embedding, stored)
        if similarity > best_similarity:
            best_similarity = similarity
            best_match = emp

    if best_similarity >= threshold and best_match:
        return {
            "success": True,
            "match": True,
            "similarity": round(best_similarity, 4),
            "employee_id": best_match["id"],
            "first_name": best_match["first_name"],
            "last_name": best_match.get("last_name", ""),
            "photo_url": best_match.get("photo_url", ""),
        }

    return {
        "success": True,
        "match": False,
        "similarity": round(best_similarity, 4),
        "employee_id": None,
        "first_name": None,
    }


@router.post("/migrate-embeddings")
async def migrate_embeddings():
    """Re-generate InsightFace embeddings for all employees from their stored photos.

    This is a one-time migration endpoint to move from face-api.js 128-dim
    embeddings to InsightFace 512-dim ArcFace embeddings.
    """
    face_service = get_face_service()
    supabase = get_supabase_client()

    result = (
        supabase.table("employees")
        .select("id, first_name, last_name, photo_url")
        .eq("is_active", True)
        .execute()
    )

    employees = result.data or []
    migrated = 0
    skipped = 0
    errors = []

    async with httpx.AsyncClient(timeout=30.0) as client:
        for emp in employees:
            emp_id = emp["id"]
            photo_url = emp.get("photo_url")

            if not photo_url:
                errors.append({"employee_id": emp_id, "reason": "no_photo_url"})
                skipped += 1
                continue

            try:
                # Download photo from Supabase Storage public URL
                response = await client.get(photo_url)
                response.raise_for_status()
                image_bytes = response.content

                embedding = face_service.extract_embedding(image_bytes)

                supabase.table("employees").update(
                    {"face_descriptor": embedding.tolist()}
                ).eq("id", emp_id).execute()

                migrated += 1
                logger.info(f"Migrated employee {emp_id} ({emp.get('first_name', '')})")

            except NoFaceDetectedError:
                errors.append({"employee_id": emp_id, "reason": "no_face_detected"})
                skipped += 1
                logger.warning(f"No face detected for employee {emp_id}")
            except Exception as e:
                errors.append({"employee_id": emp_id, "reason": str(e)})
                skipped += 1
                logger.error(f"Error migrating employee {emp_id}: {e}")

    return {
        "success": True,
        "total": len(employees),
        "migrated": migrated,
        "skipped": skipped,
        "errors": errors,
    }
