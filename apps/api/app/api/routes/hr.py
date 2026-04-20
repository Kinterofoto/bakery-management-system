"""HR endpoints - face enrollment, verification, and embedding migration."""

import logging
import re
import unicodedata
from datetime import datetime, timedelta
from typing import List, Optional

import httpx
from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from pydantic import BaseModel

# Identification policy.
# 0.5 is the InsightFace buffalo_sc recommended cosine-similarity threshold.
# MIN_MARGIN rejects ambiguous matches when top-1 barely beats top-2, which
# happens when two employees have similar features or when a stored embedding
# is degraded (e.g. enrolled wearing a mask).
IDENTIFY_THRESHOLD = 0.5
IDENTIFY_MIN_MARGIN = 0.08

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
    image: Optional[UploadFile] = File(None),
    images: Optional[List[UploadFile]] = File(None),
):
    """Identify a face against all active employees (1:N search).

    Accepts either a single `image` or multiple `images` frames. When multiple
    frames are provided, their embeddings are averaged and re-normalized to
    reduce per-frame noise. Returns match=False with a reason when no
    candidate clears the threshold OR when top-1 vs top-2 margin is too small
    (ambiguous — kiosk should retry).
    """
    face_service = get_face_service()
    supabase = get_supabase_client()

    import numpy as np

    files: List[UploadFile] = []
    if images:
        files.extend(images)
    if image:
        files.append(image)
    if not files:
        raise HTTPException(
            status_code=400,
            detail={"error": "no_image", "message": "No se proporcionó imagen."},
        )

    # Extract embeddings from each frame; skip frames with 0 or >1 faces.
    embeddings: list[np.ndarray] = []
    for f in files:
        try:
            buf = await f.read()
            embeddings.append(face_service.extract_embedding(buf))
        except (NoFaceDetectedError, MultipleFacesError):
            continue

    if not embeddings:
        raise HTTPException(
            status_code=400,
            detail={"error": "no_face_detected", "message": "No se detectó un rostro válido."},
        )

    # Average and L2-normalize so similarity math stays in cosine space.
    live_embedding = np.mean(np.stack(embeddings), axis=0)
    norm = np.linalg.norm(live_embedding)
    if norm > 0:
        live_embedding = live_embedding / norm

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

    scored: list[tuple[float, dict]] = []
    for emp in employees:
        stored = np.array(emp["face_descriptor"], dtype=np.float32)
        if stored.shape[0] != live_embedding.shape[0]:
            continue  # skip incompatible embeddings (e.g. old 128-dim from face-api.js)
        similarity = face_service.compute_similarity(live_embedding, stored)
        scored.append((similarity, emp))

    scored.sort(key=lambda x: x[0], reverse=True)

    top3 = [
        {"id": emp["id"], "name": emp.get("first_name", ""), "sim": round(sim, 4)}
        for sim, emp in scored[:3]
    ]
    logger.info(f"identify frames={len(embeddings)}/{len(files)} top3={top3}")

    # Return the averaged live embedding so the client can persist it for evals.
    # Rounded to 6 decimals to keep JSON payload small without hurting cosine sim.
    live_embedding_list = [round(float(v), 6) for v in live_embedding.tolist()]

    if not scored:
        return {
            "success": True, "match": False, "reason": "no_candidates",
            "similarity": 0.0, "margin": None, "employee_id": None, "first_name": None,
            "top_candidates": [], "embedding": live_embedding_list,
        }

    best_sim, best_emp = scored[0]
    second_sim = scored[1][0] if len(scored) > 1 else -1.0
    margin = best_sim - second_sim

    if best_sim < IDENTIFY_THRESHOLD:
        return {
            "success": True, "match": False, "reason": "below_threshold",
            "similarity": round(best_sim, 4), "margin": round(margin, 4),
            "employee_id": None, "first_name": None,
            "top_candidates": top3, "embedding": live_embedding_list,
        }

    if margin < IDENTIFY_MIN_MARGIN:
        logger.warning(
            f"identify ambiguous: {best_emp.get('first_name')} ({best_sim:.3f}) vs "
            f"{scored[1][1].get('first_name')} ({second_sim:.3f}) margin={margin:.3f}"
        )
        return {
            "success": True, "match": False, "reason": "ambiguous",
            "similarity": round(best_sim, 4), "margin": round(margin, 4),
            "employee_id": None, "first_name": None,
            "top_candidates": top3, "embedding": live_embedding_list,
        }

    return {
        "success": True,
        "match": True,
        "similarity": round(best_sim, 4),
        "margin": round(margin, 4),
        "employee_id": best_emp["id"],
        "first_name": best_emp["first_name"],
        "last_name": best_emp.get("last_name", ""),
        "photo_url": best_emp.get("photo_url", ""),
        "top_candidates": top3,
        "embedding": live_embedding_list,
    }


class EvaluateRequest(BaseModel):
    threshold: float
    min_margin: float
    scope: str = "labeled"  # "labeled" = only reviewed samples, "all" = every sample with an embedding
    days: int = 21


@router.post("/evaluate")
async def evaluate(req: EvaluateRequest):
    """Re-score stored live-capture embeddings against the active employee
    registry using alternative threshold/min_margin values, so we can see how
    a parameter change would have performed on already-labeled data.

    Uses the embedding that was cached at capture time
    (attendance_logs.extracted_embedding / attendance_recognition_failures.extracted_embedding)
    — no re-inference, no photo downloads — so this is cheap enough to run
    interactively from the UI.
    """
    import numpy as np

    supabase = get_supabase_client()

    # Active employees + their stored descriptors. Same shape as /identify.
    emp_result = (
        supabase.table("employees")
        .select("id, first_name, last_name, photo_url, face_descriptor")
        .eq("is_active", True)
        .not_.is_("face_descriptor", "null")
        .execute()
    )
    employees = emp_result.data or []
    employee_by_id = {e["id"]: e for e in employees}

    emp_matrix = []
    emp_ids: list[int] = []
    for e in employees:
        desc = e.get("face_descriptor")
        if not desc:
            continue
        arr = np.array(desc, dtype=np.float32)
        if arr.shape[0] != 512:
            continue
        emp_matrix.append(arr)
        emp_ids.append(e["id"])

    if not emp_matrix:
        raise HTTPException(status_code=400, detail={"error": "no_registered_employees"})

    E = np.stack(emp_matrix)  # (N_employees, 512)

    since = (datetime.utcnow() - timedelta(days=req.days)).isoformat() + "Z"

    # Pull reviewed samples (both successes and failures).
    success_q = (
        supabase.table("attendance_logs")
        .select("id, timestamp, employee_id, extracted_embedding, review_status, correct_employee_id")
        .gte("timestamp", since)
        .not_.is_("extracted_embedding", "null")
    )
    failure_q = (
        supabase.table("attendance_recognition_failures")
        .select("id, timestamp, extracted_embedding, review_status, correct_employee_id")
        .gte("timestamp", since)
        .not_.is_("extracted_embedding", "null")
    )
    if req.scope == "labeled":
        success_q = success_q.not_.is_("review_status", "null")
        failure_q = failure_q.not_.is_("review_status", "null")
    successes = success_q.execute().data or []
    failures = failure_q.execute().data or []

    def ground_truth_for_success(r: dict) -> Optional[int]:
        # Unreviewed → trust what the system captured as the truth (we don't know otherwise).
        if r.get("review_status") in (None, "correct"):
            return r.get("employee_id")
        if r.get("review_status") == "incorrect":
            return r.get("correct_employee_id")
        return r.get("employee_id")

    def ground_truth_for_failure(r: dict) -> Optional[int]:
        if r.get("review_status") == "should_have_matched":
            return r.get("correct_employee_id")
        # confirmed_no_match or unreviewed default to "nobody"
        return None

    # Score a sample's embedding against the employee matrix with new params.
    def predict(embedding: list) -> tuple[Optional[int], float, float]:
        v = np.array(embedding, dtype=np.float32)
        if v.shape[0] != 512:
            return None, 0.0, 0.0
        sims = E @ v  # cosine since both sides are L2-normalized
        order = np.argsort(-sims)
        best_idx = int(order[0])
        second_idx = int(order[1]) if len(order) > 1 else best_idx
        best_sim = float(sims[best_idx])
        second_sim = float(sims[second_idx]) if second_idx != best_idx else -1.0
        margin = best_sim - second_sim
        if best_sim < req.threshold or margin < req.min_margin:
            return None, best_sim, margin
        return emp_ids[best_idx], best_sim, margin

    # Run predictions and aggregate.
    matched_correct = 0  # predicted == ground truth (non-null)
    matched_wrong = 0    # predicted non-null but != ground truth
    false_negatives = 0  # predicted null but ground truth non-null
    true_negatives = 0   # both null
    flipped_positive = []  # prod had this right; new params break it
    flipped_negative = []  # prod had this wrong; new params fix it
    misidentified = []   # new params match but wrong employee

    def prod_prediction_success(r: dict) -> Optional[int]:
        # What production actually registered — always the employee_id.
        return r.get("employee_id")

    def prod_prediction_failure(r: dict) -> Optional[int]:
        return None

    def record_result(
        source: str, rid: str, ground: Optional[int], pred: Optional[int],
        prod: Optional[int], sim: float, margin: float,
    ) -> None:
        def emp_name(eid: Optional[int]) -> str:
            if eid is None:
                return ""
            e = employee_by_id.get(eid)
            return f"{e.get('first_name','')} {e.get('last_name','')}".strip() if e else f"#{eid}"

        correct = (pred == ground)
        if correct and pred is not None:
            nonlocal_counters["matched_correct"] += 1
        elif correct and pred is None:
            nonlocal_counters["true_negatives"] += 1
        elif pred is None and ground is not None:
            nonlocal_counters["false_negatives"] += 1
        elif pred is not None and ground is not None and pred != ground:
            nonlocal_counters["matched_wrong"] += 1
            misidentified.append({
                "source": source, "id": rid,
                "predicted": emp_name(pred), "predicted_id": pred,
                "actual": emp_name(ground), "actual_id": ground,
                "similarity": round(sim, 4), "margin": round(margin, 4),
            })
        elif pred is not None and ground is None:
            nonlocal_counters["matched_wrong"] += 1
            misidentified.append({
                "source": source, "id": rid,
                "predicted": emp_name(pred), "predicted_id": pred,
                "actual": "(nadie)", "actual_id": None,
                "similarity": round(sim, 4), "margin": round(margin, 4),
            })

        prod_correct = (prod == ground)
        if prod_correct and not correct:
            flipped_positive.append({
                "source": source, "id": rid,
                "prod": emp_name(prod), "new": emp_name(pred) or "(nadie)",
                "actual": emp_name(ground) or "(nadie)",
                "similarity": round(sim, 4), "margin": round(margin, 4),
            })
        elif not prod_correct and correct:
            flipped_negative.append({
                "source": source, "id": rid,
                "prod": emp_name(prod) or "(nadie)", "new": emp_name(pred) or "(nadie)",
                "actual": emp_name(ground) or "(nadie)",
                "similarity": round(sim, 4), "margin": round(margin, 4),
            })

    nonlocal_counters = {
        "matched_correct": 0, "matched_wrong": 0,
        "false_negatives": 0, "true_negatives": 0,
    }

    for r in successes:
        emb = r.get("extracted_embedding")
        if not emb:
            continue
        pred, sim, margin = predict(emb)
        ground = ground_truth_for_success(r)
        prod = prod_prediction_success(r)
        record_result("success", r["id"], ground, pred, prod, sim, margin)

    for r in failures:
        emb = r.get("extracted_embedding")
        if not emb:
            continue
        pred, sim, margin = predict(emb)
        ground = ground_truth_for_failure(r)
        prod = prod_prediction_failure(r)
        record_result("failure", r["id"], ground, pred, prod, sim, margin)

    total = sum(nonlocal_counters.values())
    matched_correct = nonlocal_counters["matched_correct"]
    matched_wrong = nonlocal_counters["matched_wrong"]
    false_negatives = nonlocal_counters["false_negatives"]
    true_negatives = nonlocal_counters["true_negatives"]

    accuracy = (matched_correct + true_negatives) / total if total else 0.0
    # Precision: of times we matched, how often was it right.
    preds_positive = matched_correct + matched_wrong
    precision = matched_correct / preds_positive if preds_positive else 0.0
    # Recall: of times ground truth existed, how often did we find it.
    actuals_positive = matched_correct + false_negatives + matched_wrong
    recall = matched_correct / actuals_positive if actuals_positive else 0.0

    return {
        "params": {"threshold": req.threshold, "min_margin": req.min_margin, "scope": req.scope, "days": req.days},
        "counts": {
            "total": total,
            "matched_correct": matched_correct,
            "matched_wrong": matched_wrong,
            "false_negatives": false_negatives,
            "true_negatives": true_negatives,
        },
        "metrics": {
            "accuracy": round(accuracy, 4),
            "precision": round(precision, 4),
            "recall": round(recall, 4),
        },
        "flipped_positive": flipped_positive[:50],  # prod was right, new params break it
        "flipped_negative": flipped_negative[:50],  # prod was wrong, new params fix it
        "misidentified": misidentified[:50],
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
