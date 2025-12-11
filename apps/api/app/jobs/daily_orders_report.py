from supabase import Client
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


async def generate_daily_orders_report(supabase: Client) -> dict:
    """
    Generate a daily orders report.

    This job:
    1. Fetches orders from the last 24 hours
    2. Calculates summary statistics
    3. Logs the report (can be extended to send emails, etc.)

    Args:
        supabase: Supabase client instance

    Returns:
        Report summary dictionary
    """
    logger.info("Generating daily orders report...")

    # Calculate date range (last 24 hours)
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=1)

    try:
        # Fetch orders from the last 24 hours
        orders_response = supabase.table("orders").select(
            "id, order_number, status, total, created_at, client_id"
        ).gte(
            "created_at", start_date.isoformat()
        ).lte(
            "created_at", end_date.isoformat()
        ).execute()

        orders = orders_response.data or []

        # Calculate statistics
        total_orders = len(orders)
        total_revenue = sum(
            float(order.get("total", 0) or 0)
            for order in orders
        )

        # Count by status
        status_counts = {}
        for order in orders:
            status = order.get("status", "unknown")
            status_counts[status] = status_counts.get(status, 0) + 1

        # Build report
        report = {
            "report_date": end_date.date().isoformat(),
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "summary": {
                "total_orders": total_orders,
                "total_revenue": total_revenue,
                "average_order_value": total_revenue / total_orders if total_orders > 0 else 0
            },
            "by_status": status_counts,
            "generated_at": datetime.utcnow().isoformat()
        }

        logger.info(f"Daily report generated: {total_orders} orders, ${total_revenue:.2f} revenue")

        # TODO: Extend this to:
        # - Send email notification
        # - Store report in database
        # - Push to analytics service

        return report

    except Exception as e:
        logger.error(f"Error generating daily orders report: {e}")
        raise
