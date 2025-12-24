"""Routes delivery operations endpoints."""

import logging
import io
from datetime import datetime
from typing import Optional, List
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Header, UploadFile, File
from pydantic import BaseModel

from ....core.supabase import get_supabase_client

logger = logging.getLogger(__name__)
router = APIRouter()


def get_user_id_from_token(authorization: Optional[str]) -> Optional[str]:
    """Extract user_id from JWT token."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        import jwt
        token = authorization.replace("Bearer ", "")
        decoded = jwt.decode(token, options={"verify_signature": False})
        return decoded.get("sub")
    except Exception:
        return None


# === MODELS ===

class ItemReceiveUpdate(BaseModel):
    item_id: str
    quantity_available: int
    quantity_missing: int


class ReceiveOrderRequest(BaseModel):
    order_id: str
    items: List[ItemReceiveUpdate]


class ItemDeliveryUpdate(BaseModel):
    item_id: str
    delivery_status: str  # delivered, partial, rejected
    quantity_delivered: int
    quantity_rejected: int = 0
    rejection_reason: Optional[str] = None


class CompleteDeliveryRequest(BaseModel):
    route_order_id: str
    order_id: str
    evidence_url: str  # OBLIGATORIO
    items: List[ItemDeliveryUpdate]
    general_return_reason: Optional[str] = None


class CreateReturnRequest(BaseModel):
    order_id: str
    product_id: str
    quantity_returned: int
    return_reason: str
    route_id: Optional[str] = None
    rejection_reason: Optional[str] = None


# === IMAGE COMPRESSION ===

def compress_image(file_content: bytes, max_size_kb: int = 50) -> bytes:
    """Comprimir imagen a máximo 50KB."""
    try:
        from PIL import Image
    except ImportError:
        logger.warning("Pillow not installed, returning original image")
        return file_content

    img = Image.open(io.BytesIO(file_content))

    # Convertir a RGB si es necesario (para JPEG)
    if img.mode in ('RGBA', 'P', 'LA', 'L'):
        if img.mode == 'LA' or img.mode == 'L':
            img = img.convert('RGB')
        else:
            # Create white background for transparent images
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'RGBA':
                background.paste(img, mask=img.split()[3])
            else:
                background.paste(img)
            img = background

    # Reducir dimensiones si es muy grande
    max_dimension = 800
    if max(img.size) > max_dimension:
        img.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)

    # Comprimir con calidad decreciente hasta alcanzar tamaño
    quality = 85
    buffer = io.BytesIO()

    while quality > 10:
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG', quality=quality, optimize=True)
        if buffer.tell() <= max_size_kb * 1024:
            buffer.seek(0)
            return buffer.getvalue()
        quality -= 10

    # Si aún es muy grande, reducir más las dimensiones
    max_dimension = 400
    img.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG', quality=50, optimize=True)
    buffer.seek(0)
    return buffer.getvalue()


# === ENDPOINTS ===

@router.post("/upload-evidence")
async def upload_evidence(
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None),
):
    """
    Upload delivery evidence with automatic compression to ≤50KB.
    """
    logger.info(f"Uploading evidence: {file.filename}")
    supabase = get_supabase_client()

    try:
        # 1. Leer contenido
        content = await file.read()
        logger.info(f"Original file size: {len(content)} bytes")

        # 2. Comprimir a max 50KB
        compressed = compress_image(content, max_size_kb=50)
        logger.info(f"Compressed file size: {len(compressed)} bytes")

        # 3. Generar nombre único
        filename = f"evidence_{uuid4()}.jpg"

        # 4. Subir a Supabase Storage
        upload_result = supabase.storage.from_("evidencia_de_entrega").upload(
            filename,
            compressed,
            {"content-type": "image/jpeg"}
        )

        # 5. Obtener URL pública
        url_data = supabase.storage.from_("evidencia_de_entrega").get_public_url(filename)

        return {
            "success": True,
            "evidence_url": url_data,
            "filename": filename,
            "original_size": len(content),
            "compressed_size": len(compressed),
        }

    except Exception as e:
        logger.error(f"Error uploading evidence: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pending-orders/{driver_id}")
async def get_pending_orders(
    driver_id: str,
    role: str = "driver",
    authorization: Optional[str] = Header(None),
):
    """
    Get orders with status=dispatched assigned to driver's routes.
    If role is admin/administrator, returns all pending orders.
    """
    logger.info(f"Getting pending orders for driver: {driver_id}, role: {role}")
    supabase = get_supabase_client()

    try:
        is_admin = role in ["admin", "administrator", "super_admin"]

        # 1. Obtener rutas del conductor (o todas si es admin)
        routes_query = supabase.table("routes").select(
            "id, route_name, status, driver_id"
        ).in_("status", ["planned", "in_progress"])

        if not is_admin:
            routes_query = routes_query.eq("driver_id", driver_id)

        routes_result = routes_query.execute()

        if not routes_result.data:
            return {"orders": [], "total": 0}

        route_ids = [r["id"] for r in routes_result.data]

        # 2. Obtener pedidos dispatched de esas rutas
        orders_result = supabase.table("orders").select(
            "id, order_number, expected_delivery_date, status, observations, assigned_route_id, "
            "client:clients(id, name), "
            "branch:branches(id, name, address), "
            "order_items(id, product_id, quantity_requested, quantity_available, "
            "product:products(id, name, unit, weight))"
        ).eq("status", "dispatched").in_("assigned_route_id", route_ids).order(
            "created_at", desc=True
        ).execute()

        return {
            "orders": orders_result.data or [],
            "total": len(orders_result.data or []),
        }

    except Exception as e:
        logger.error(f"Error getting pending orders: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/receive")
async def receive_order_to_route(
    data: ReceiveOrderRequest,
    authorization: Optional[str] = Header(None),
):
    """
    Receive dispatched order and transition to in_delivery.
    Updates item quantities and changes order status.
    """
    logger.info(f"Receiving order: {data.order_id}")
    supabase = get_supabase_client()
    user_id = get_user_id_from_token(authorization)

    try:
        # 1. Actualizar cantidades de cada item
        for item in data.items:
            update_result = supabase.table("order_items").update({
                "quantity_available": item.quantity_available,
                "quantity_missing": item.quantity_missing,
            }).eq("id", item.item_id).execute()

            if not update_result.data:
                logger.warning(f"Item not found: {item.item_id}")

        # 2. Cambiar estado del pedido a in_delivery
        order_result = supabase.table("orders").update({
            "status": "in_delivery",
        }).eq("id", data.order_id).execute()

        if not order_result.data:
            raise HTTPException(status_code=404, detail="Order not found")

        # 3. Registrar evento
        supabase.table("order_events").insert({
            "order_id": data.order_id,
            "event_type": "status_change",
            "old_value": "dispatched",
            "new_value": "in_delivery",
            "created_by": user_id,
        }).execute()

        return {
            "success": True,
            "order_id": data.order_id,
            "new_status": "in_delivery",
            "message": "Order received and ready for delivery",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error receiving order: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/complete-delivery")
async def complete_delivery(
    data: CompleteDeliveryRequest,
    authorization: Optional[str] = Header(None),
):
    """
    Complete a delivery with evidence (REQUIRED).
    Updates item delivery status and order final status.
    """
    logger.info(f"Completing delivery for order: {data.order_id}")
    supabase = get_supabase_client()
    user_id = get_user_id_from_token(authorization)

    # Validar evidencia obligatoria
    if not data.evidence_url:
        raise HTTPException(
            status_code=400,
            detail="Evidence URL is required to complete delivery"
        )

    try:
        # 1. Actualizar cada item
        has_rejected = False
        has_partial = False
        all_delivered = True

        for item in data.items:
            update_data = {
                "delivery_status": item.delivery_status,
                "quantity_delivered": item.quantity_delivered,
                "quantity_rejected": item.quantity_rejected,
            }

            if item.rejection_reason:
                update_data["rejection_reason"] = item.rejection_reason

            supabase.table("order_items").update(update_data).eq("id", item.item_id).execute()

            if item.delivery_status == "rejected":
                has_rejected = True
                all_delivered = False
            elif item.delivery_status == "partial":
                has_partial = True
                all_delivered = False

        # 2. Determinar estado final del pedido
        if has_rejected and not has_partial and all_delivered is False:
            # Todos rechazados
            final_status = "returned"
        elif has_partial or has_rejected:
            final_status = "partially_delivered"
        else:
            final_status = "delivered"

        # 3. Actualizar pedido
        supabase.table("orders").update({
            "status": final_status,
        }).eq("id", data.order_id).execute()

        # 4. Registrar evento
        supabase.table("order_events").insert({
            "order_id": data.order_id,
            "event_type": "delivery_completed",
            "old_value": "in_delivery",
            "new_value": final_status,
            "created_by": user_id,
            "metadata": {
                "evidence_url": data.evidence_url,
                "general_return_reason": data.general_return_reason,
            }
        }).execute()

        return {
            "success": True,
            "order_id": data.order_id,
            "new_status": final_status,
            "message": f"Delivery completed with status: {final_status}",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error completing delivery: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/returns")
async def create_return(
    data: CreateReturnRequest,
    authorization: Optional[str] = Header(None),
):
    """
    Create a return record when driver rejects product.
    Automatically appears in returns module.
    """
    logger.info(f"Creating return for order: {data.order_id}, product: {data.product_id}")
    supabase = get_supabase_client()
    user_id = get_user_id_from_token(authorization)

    try:
        # Insertar en tabla returns
        return_data = {
            "order_id": data.order_id,
            "product_id": data.product_id,
            "quantity_returned": data.quantity_returned,
            "return_reason": data.return_reason,
            "rejection_reason": data.rejection_reason or data.return_reason,
            "route_id": data.route_id,
            "status": "pending",
            "return_date": datetime.utcnow().isoformat(),
            "processed_by": user_id,
        }

        result = supabase.table("returns").insert(return_data).select().single().execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create return")

        return {
            "success": True,
            "return": result.data,
            "message": "Return created successfully",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating return: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{route_id}/complete")
async def complete_route(
    route_id: str,
    authorization: Optional[str] = Header(None),
):
    """
    Mark route as completed.
    Validates all orders are in final state.
    """
    logger.info(f"Completing route: {route_id}")
    supabase = get_supabase_client()
    user_id = get_user_id_from_token(authorization)

    try:
        # 1. Verificar que la ruta existe
        route_result = supabase.table("routes").select(
            "id, status, route_orders(order_id)"
        ).eq("id", route_id).single().execute()

        if not route_result.data:
            raise HTTPException(status_code=404, detail="Route not found")

        route = route_result.data

        # 2. Verificar que todos los pedidos están en estado final
        order_ids = [ro["order_id"] for ro in route.get("route_orders", []) if ro.get("order_id")]

        if order_ids:
            orders_result = supabase.table("orders").select(
                "id, status"
            ).in_("id", order_ids).execute()

            final_statuses = ["delivered", "partially_delivered", "returned"]
            pending_orders = [
                o for o in (orders_result.data or [])
                if o["status"] not in final_statuses
            ]

            if pending_orders:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot complete route: {len(pending_orders)} orders still pending"
                )

        # 3. Marcar ruta como completada
        supabase.table("routes").update({
            "status": "completed",
        }).eq("id", route_id).execute()

        return {
            "success": True,
            "route_id": route_id,
            "new_status": "completed",
            "message": "Route completed successfully",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error completing route: {e}")
        raise HTTPException(status_code=500, detail=str(e))
