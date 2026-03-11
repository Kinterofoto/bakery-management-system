"""Tests for the audit backfill mechanism.

Verifies that backfill_audit_user correctly fixes NULL changed_by entries
in audit tables after write operations through the Supabase REST API.
"""

import pytest
from unittest.mock import MagicMock, patch, call
from datetime import datetime, timedelta, timezone

from app.core.supabase import backfill_audit_user, set_audit_user, ALL_AUDIT_TABLES


# ============================================================
# Helpers
# ============================================================

def make_mock_supabase():
    """Create a mock Supabase client with chained query builder."""
    supabase = MagicMock()

    # Each .table() call returns a fresh chain so assertions are per-table
    chains = {}

    def table_side_effect(name):
        if name not in chains:
            chain = MagicMock()
            chain.update.return_value = chain
            chain.eq.return_value = chain
            chain.is_.return_value = chain
            chain.gte.return_value = chain
            chain.execute.return_value = MagicMock(data=[])
            chains[name] = chain
        return chains[name]

    supabase.table.side_effect = table_side_effect
    supabase._chains = chains
    return supabase


# ============================================================
# backfill_audit_user tests
# ============================================================

class TestBackfillAuditUser:
    """Tests for the backfill_audit_user function."""

    def test_backfill_updates_all_default_audit_tables(self):
        """Should update all three audit tables by default."""
        supabase = make_mock_supabase()
        user_id = "aaaa-bbbb-cccc-dddd"
        order_id = "1111-2222-3333-4444"

        backfill_audit_user(supabase, user_id, order_id)

        # All 3 default tables should have been called
        called_tables = [c.args[0] for c in supabase.table.call_args_list]
        assert "orders_audit" in called_tables
        assert "order_items_audit" in called_tables
        assert "order_item_deliveries_audit" in called_tables

    def test_backfill_scopes_by_order_id(self):
        """Should filter updates by order_id."""
        supabase = make_mock_supabase()
        order_id = "order-123"

        backfill_audit_user(supabase, "user-1", order_id)

        for table_name in ALL_AUDIT_TABLES:
            chain = supabase._chains[table_name]
            chain.eq.assert_any_call("order_id", order_id)

    def test_backfill_only_updates_null_changed_by(self):
        """Should only update entries where changed_by IS NULL."""
        supabase = make_mock_supabase()

        backfill_audit_user(supabase, "user-1", "order-1")

        for table_name in ALL_AUDIT_TABLES:
            chain = supabase._chains[table_name]
            chain.is_.assert_called_once_with("changed_by", "null")

    def test_backfill_sets_correct_user_id(self):
        """Should set changed_by to the provided user_id."""
        supabase = make_mock_supabase()
        user_id = "real-user-uuid"

        backfill_audit_user(supabase, user_id, "order-1")

        for table_name in ALL_AUDIT_TABLES:
            chain = supabase._chains[table_name]
            chain.update.assert_called_once_with({"changed_by": user_id})

    def test_backfill_uses_recent_time_window(self):
        """Should only update entries created within the time window."""
        supabase = make_mock_supabase()

        backfill_audit_user(supabase, "user-1", "order-1", since_seconds=30)

        for table_name in ALL_AUDIT_TABLES:
            chain = supabase._chains[table_name]
            # gte should have been called with changed_at and a recent timestamp
            gte_calls = [c for c in chain.gte.call_args_list if c.args[0] == "changed_at"]
            assert len(gte_calls) == 1
            cutoff_str = gte_calls[0].args[1]
            # The cutoff should be a recent ISO timestamp
            assert "T" in cutoff_str  # ISO format

    def test_backfill_skips_when_no_user_id(self):
        """Should not make any API calls when user_id is None or empty."""
        supabase = make_mock_supabase()

        backfill_audit_user(supabase, None, "order-1")
        supabase.table.assert_not_called()

        backfill_audit_user(supabase, "", "order-1")
        supabase.table.assert_not_called()

    def test_backfill_skips_when_no_order_id(self):
        """Should not make any API calls when order_id is None or empty."""
        supabase = make_mock_supabase()

        backfill_audit_user(supabase, "user-1", None)
        supabase.table.assert_not_called()

        backfill_audit_user(supabase, "user-1", "")
        supabase.table.assert_not_called()

    def test_backfill_with_custom_tables(self):
        """Should only update the specified tables."""
        supabase = make_mock_supabase()

        backfill_audit_user(
            supabase, "user-1", "order-1",
            tables=["orders_audit"]
        )

        called_tables = [c.args[0] for c in supabase.table.call_args_list]
        assert called_tables == ["orders_audit"]

    def test_backfill_continues_on_single_table_error(self):
        """If one table fails, should still attempt the others."""
        supabase = MagicMock()
        call_count = {"n": 0}

        def table_side_effect(name):
            chain = MagicMock()
            chain.update.return_value = chain
            chain.eq.return_value = chain
            chain.is_.return_value = chain
            chain.gte.return_value = chain

            call_count["n"] += 1
            if name == "orders_audit":
                chain.execute.side_effect = Exception("Connection error")
            else:
                chain.execute.return_value = MagicMock(data=[])
            return chain

        supabase.table.side_effect = table_side_effect

        # Should not raise
        backfill_audit_user(supabase, "user-1", "order-1")

        # Should have tried all 3 tables
        assert supabase.table.call_count == 3

    def test_backfill_with_empty_tables_list(self):
        """Should do nothing when tables list is empty."""
        supabase = make_mock_supabase()

        backfill_audit_user(supabase, "user-1", "order-1", tables=[])

        supabase.table.assert_not_called()


# ============================================================
# set_audit_user tests (legacy, kept for backward compat)
# ============================================================

class TestSetAuditUser:
    """Tests for the legacy set_audit_user function."""

    def test_calls_rpc_with_user_id(self):
        """Should call set_audit_context RPC with the user_id."""
        supabase = MagicMock()
        rpc_chain = MagicMock()
        supabase.rpc.return_value = rpc_chain

        set_audit_user(supabase, "user-uuid-123")

        supabase.rpc.assert_called_once_with(
            "set_audit_context", {"p_user_id": "user-uuid-123"}
        )
        rpc_chain.execute.assert_called_once()

    def test_skips_when_no_user_id(self):
        """Should not call RPC when user_id is None."""
        supabase = MagicMock()

        set_audit_user(supabase, None)
        supabase.rpc.assert_not_called()

        set_audit_user(supabase, "")
        # Empty string is falsy, should also skip
        supabase.rpc.assert_not_called()

    def test_handles_rpc_error_gracefully(self):
        """Should log warning but not raise on RPC failure."""
        supabase = MagicMock()
        supabase.rpc.side_effect = Exception("Network error")

        # Should not raise
        set_audit_user(supabase, "user-1")


# ============================================================
# Integration-style tests (verifying backfill logic in endpoint patterns)
# ============================================================

class TestAuditBackfillInEndpoints:
    """Tests verifying backfill patterns work correctly in endpoint-like flows."""

    def test_jwt_extraction_and_backfill_flow(self):
        """Simulate the full flow: extract user from JWT, do writes, then backfill."""
        import jwt as pyjwt

        fake_token = pyjwt.encode(
            {"sub": "carlos-uuid-123"},
            "secret",
            algorithm="HS256"
        )

        # Extract user_id the same way endpoints do
        authorization = f"Bearer {fake_token}"
        user_id = None
        if authorization and authorization.startswith("Bearer "):
            token = authorization.replace("Bearer ", "")
            decoded = pyjwt.decode(token, options={"verify_signature": False})
            user_id = decoded.get("sub")

        assert user_id == "carlos-uuid-123"

        # Simulate write + backfill
        supabase = make_mock_supabase()
        order_id = "order-test-123"

        # Backfill should update audit entries
        backfill_audit_user(supabase, user_id, order_id, ["orders_audit", "order_items_audit"])

        # Verify both audit tables were updated
        assert "orders_audit" in supabase._chains
        assert "order_items_audit" in supabase._chains
        supabase._chains["orders_audit"].update.assert_called_once_with({"changed_by": "carlos-uuid-123"})
        supabase._chains["order_items_audit"].update.assert_called_once_with({"changed_by": "carlos-uuid-123"})

    def test_no_token_means_no_backfill(self):
        """When there's no JWT, user_id is None and backfill should skip."""
        supabase = make_mock_supabase()

        # Simulate no token scenario
        authorization = None
        user_id = None
        if authorization and authorization.startswith("Bearer "):
            import jwt as pyjwt
            token = authorization.replace("Bearer ", "")
            decoded = pyjwt.decode(token, options={"verify_signature": False})
            user_id = decoded.get("sub")

        assert user_id is None

        backfill_audit_user(supabase, user_id, "order-456")
        supabase.table.assert_not_called()

    def test_expired_or_invalid_token_doesnt_crash(self):
        """Even with a bad JWT, the endpoint pattern should handle gracefully."""
        authorization = "Bearer invalid-token-data"
        user_id = None
        if authorization and authorization.startswith("Bearer "):
            import jwt as pyjwt
            token = authorization.replace("Bearer ", "")
            try:
                decoded = pyjwt.decode(token, options={"verify_signature": False})
                user_id = decoded.get("sub")
            except Exception:
                pass

        # user_id should remain None
        assert user_id is None

        # Backfill should skip gracefully
        supabase = make_mock_supabase()
        backfill_audit_user(supabase, user_id, "order-789")
        supabase.table.assert_not_called()

    def test_full_update_flow_multiple_audit_tables(self):
        """Simulate update_order_full: writes to orders + order_items, backfill both."""
        supabase = make_mock_supabase()
        user_id = "real-user-uuid"
        order_id = "order-full-update"

        # Simulate the writes (these would create audit entries with NULL changed_by)
        supabase.table("orders").update({"total_value": 100}).eq("id", order_id).execute()
        supabase.table("order_items").delete().in_("id", ["item-1"]).execute()
        supabase.table("order_items").insert([{"order_id": order_id}]).execute()

        # Reset mock chains to track backfill calls separately
        supabase._chains.clear()

        # Now backfill - this is the critical fix
        backfill_audit_user(supabase, user_id, order_id, ["orders_audit", "order_items_audit"])

        # Both audit tables should have been updated with the user
        for table in ["orders_audit", "order_items_audit"]:
            chain = supabase._chains[table]
            chain.update.assert_called_once_with({"changed_by": user_id})
            chain.eq.assert_any_call("order_id", order_id)
            chain.is_.assert_called_once_with("changed_by", "null")


# ============================================================
# Time window tests
# ============================================================

class TestBackfillTimeWindow:
    """Tests for the time window parameter."""

    def test_default_window_is_10_seconds(self):
        """Default since_seconds should be 10."""
        supabase = make_mock_supabase()
        before = datetime.now(timezone.utc)

        backfill_audit_user(supabase, "user-1", "order-1")

        after = datetime.now(timezone.utc)
        expected_cutoff_min = (before - timedelta(seconds=10)).isoformat()
        expected_cutoff_max = (after - timedelta(seconds=10)).isoformat()

        chain = supabase._chains["orders_audit"]
        gte_calls = [c for c in chain.gte.call_args_list if c.args[0] == "changed_at"]
        actual_cutoff = gte_calls[0].args[1]

        # The cutoff should be approximately 10 seconds ago
        assert actual_cutoff >= expected_cutoff_min
        assert actual_cutoff <= expected_cutoff_max

    def test_custom_window(self):
        """Custom since_seconds should shift the cutoff accordingly."""
        supabase = make_mock_supabase()
        before = datetime.now(timezone.utc)

        backfill_audit_user(supabase, "user-1", "order-1", since_seconds=60)

        after = datetime.now(timezone.utc)
        expected_cutoff_min = (before - timedelta(seconds=60)).isoformat()
        expected_cutoff_max = (after - timedelta(seconds=60)).isoformat()

        chain = supabase._chains["orders_audit"]
        gte_calls = [c for c in chain.gte.call_args_list if c.args[0] == "changed_at"]
        actual_cutoff = gte_calls[0].args[1]

        assert actual_cutoff >= expected_cutoff_min
        assert actual_cutoff <= expected_cutoff_max


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
