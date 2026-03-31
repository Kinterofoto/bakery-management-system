"""
Tests for inventory deduction timing logic.

Verifies that:
1. Dispatch does NOT deduct inventory
2. Direct billing (invoice) DOES deduct inventory
3. Remision creation DOES deduct inventory
4. Invoicing after remision does NOT deduct again (no double deduction)
5. inventory_deducted flag prevents double deduction
6. prepare_order_items_for_deduction correctly filters items
"""

import importlib.util
import json
import os
import sys
import unittest
from unittest.mock import MagicMock, patch, call
from datetime import datetime

# Project root (two levels up from apps/api)
PROJECT_ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", ".."))
API_ROOT = os.path.dirname(__file__)


def _load_module_directly(module_name, file_path):
    """Load a Python module directly without triggering __init__.py chains."""
    spec = importlib.util.spec_from_file_location(module_name, file_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


# Load inventory module directly to avoid triggering unrelated imports
_inventory_mod = _load_module_directly(
    "billing_inventory",
    os.path.join(API_ROOT, "app", "api", "routes", "billing", "inventory.py"),
)
deduct_inventory_for_order = _inventory_mod.deduct_inventory_for_order
prepare_order_items_for_deduction = _inventory_mod.prepare_order_items_for_deduction


# ---------------------------------------------------------------------------
# Helper: mock Supabase client with chainable API
# ---------------------------------------------------------------------------

class MockQueryBuilder:
    """Mimics Supabase's chainable query builder."""

    def __init__(self, data=None, count=None):
        self._data = data
        self._count = count

    def select(self, *args, **kwargs):
        return self

    def insert(self, *args, **kwargs):
        return self

    def update(self, *args, **kwargs):
        return self

    def upsert(self, *args, **kwargs):
        return self

    def delete(self):
        return self

    def eq(self, *args, **kwargs):
        return self

    def in_(self, *args, **kwargs):
        return self

    def single(self):
        return self

    def limit(self, *args):
        return self

    def order(self, *args, **kwargs):
        return self

    def range(self, *args):
        return self

    def gte(self, *args):
        return self

    def lte(self, *args):
        return self

    def execute(self):
        result = MagicMock()
        result.data = self._data
        result.count = self._count
        return result


# ---------------------------------------------------------------------------
# Tests for prepare_order_items_for_deduction
# ---------------------------------------------------------------------------

class TestPrepareOrderItems(unittest.TestCase):
    """Test the item preparation helper function."""

    def test_filters_unavailable_items(self):
        """Items with availability_status='unavailable' should be excluded."""
        items = [
            {"product_id": "p1", "quantity_available": 10, "availability_status": "available"},
            {"product_id": "p2", "quantity_available": 5, "availability_status": "unavailable"},
            {"product_id": "p3", "quantity_available": 8, "availability_status": "partial"},
        ]
        result = prepare_order_items_for_deduction(items)
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0]["product_id"], "p1")
        self.assertEqual(result[1]["product_id"], "p3")

    def test_filters_zero_quantity_items(self):
        """Items with zero or negative quantity should be excluded."""
        items = [
            {"product_id": "p1", "quantity_available": 0, "availability_status": "available"},
            {"product_id": "p2", "quantity_available": -1, "availability_status": "available"},
            {"product_id": "p3", "quantity_available": 5, "availability_status": "available"},
        ]
        result = prepare_order_items_for_deduction(items)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["product_id"], "p3")

    def test_falls_back_to_quantity_requested(self):
        """If quantity_available is missing, use quantity_requested."""
        items = [
            {"product_id": "p1", "quantity_requested": 10, "availability_status": "available"},
        ]
        result = prepare_order_items_for_deduction(items)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["quantity"], 10)

    def test_empty_list(self):
        """Empty item list returns empty result."""
        result = prepare_order_items_for_deduction([])
        self.assertEqual(result, [])

    def test_uses_quantity_available_over_requested(self):
        """quantity_available takes precedence over quantity_requested."""
        items = [
            {"product_id": "p1", "quantity_available": 7, "quantity_requested": 10, "availability_status": "available"},
        ]
        result = prepare_order_items_for_deduction(items)
        self.assertEqual(result[0]["quantity"], 7)

    def test_items_without_availability_status(self):
        """Items without availability_status should be included if they have quantity."""
        items = [
            {"product_id": "p1", "quantity_available": 5},
        ]
        result = prepare_order_items_for_deduction(items)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["quantity"], 5)

    def test_output_format(self):
        """Output items should only have product_id and quantity keys."""
        items = [
            {"product_id": "p1", "quantity_available": 5, "availability_status": "available",
             "unit_price": 100, "extra": "data"},
        ]
        result = prepare_order_items_for_deduction(items)
        self.assertEqual(set(result[0].keys()), {"product_id", "quantity"})


# ---------------------------------------------------------------------------
# Tests for deduct_inventory_for_order
# ---------------------------------------------------------------------------

class TestDeductInventoryForOrder(unittest.TestCase):
    """Test the shared inventory deduction function."""

    def test_skips_if_already_deducted(self):
        """Should skip deduction if order.inventory_deducted is True."""
        supabase = MagicMock()
        order_builder = MockQueryBuilder(data={"inventory_deducted": True})
        supabase.table = MagicMock(return_value=order_builder)

        result = deduct_inventory_for_order(
            supabase=supabase,
            order_id="order-1",
            order_number="ORD-001",
            items=[{"product_id": "p1", "quantity": 5}],
            user_id="user-1",
        )

        self.assertTrue(result["success"])
        self.assertTrue(result["skipped"])
        # RPC should NOT have been called
        supabase.schema.assert_not_called()

    def test_deducts_when_not_yet_deducted(self):
        """Should call RPC and mark order when inventory_deducted is False."""
        supabase = MagicMock()
        call_count = {"table_calls": 0}

        def table_side_effect(table_name):
            call_count["table_calls"] += 1
            if table_name == "orders" and call_count["table_calls"] == 1:
                return MockQueryBuilder(data={"inventory_deducted": False})
            elif table_name == "dispatch_inventory_config":
                return MockQueryBuilder(data={"default_dispatch_location_id": "loc-1"})
            elif table_name == "orders":
                return MockQueryBuilder(data=[{"id": "order-1"}])
            return MockQueryBuilder(data=None)

        supabase.table.side_effect = table_side_effect

        schema_mock = MagicMock()
        rpc_builder = MockQueryBuilder(data={"success": True, "errors": []})
        schema_mock.rpc.return_value = rpc_builder
        supabase.schema.return_value = schema_mock

        result = deduct_inventory_for_order(
            supabase=supabase,
            order_id="order-1",
            order_number="ORD-001",
            items=[{"product_id": "p1", "quantity": 5}],
            user_id="user-1",
            notes="Test deduction",
        )

        self.assertTrue(result["success"])
        self.assertFalse(result["skipped"])
        supabase.schema.assert_called_with("inventario")
        schema_mock.rpc.assert_called_once_with(
            "perform_batch_dispatch_movements",
            {
                "p_order_id": "order-1",
                "p_order_number": "ORD-001",
                "p_items": [{"product_id": "p1", "quantity": 5}],
                "p_location_id_from": "loc-1",
                "p_notes": "Test deduction",
                "p_recorded_by": "user-1",
            },
        )

    def test_returns_error_when_no_location_configured(self):
        """Should return error if no default dispatch location is configured."""
        supabase = MagicMock()

        def table_side_effect(table_name):
            if table_name == "orders":
                return MockQueryBuilder(data={"inventory_deducted": False})
            elif table_name == "dispatch_inventory_config":
                return MockQueryBuilder(data={"default_dispatch_location_id": None})
            return MockQueryBuilder(data=None)

        supabase.table.side_effect = table_side_effect

        result = deduct_inventory_for_order(
            supabase=supabase,
            order_id="order-1",
            order_number="ORD-001",
            items=[{"product_id": "p1", "quantity": 5}],
            user_id="user-1",
        )

        self.assertFalse(result["success"])
        self.assertIn("No default dispatch location configured", result["errors"])

    def test_skips_when_no_items(self):
        """Should skip gracefully if items list is empty."""
        supabase = MagicMock()

        def table_side_effect(table_name):
            if table_name == "orders":
                return MockQueryBuilder(data={"inventory_deducted": False})
            elif table_name == "dispatch_inventory_config":
                return MockQueryBuilder(data={"default_dispatch_location_id": "loc-1"})
            return MockQueryBuilder(data=None)

        supabase.table.side_effect = table_side_effect

        result = deduct_inventory_for_order(
            supabase=supabase,
            order_id="order-1",
            order_number="ORD-001",
            items=[],
            user_id="user-1",
        )

        self.assertTrue(result["success"])
        self.assertTrue(result["skipped"])

    def test_handles_rpc_failure(self):
        """Should return errors if the RPC call returns success=false."""
        supabase = MagicMock()

        def table_side_effect(table_name):
            if table_name == "orders":
                return MockQueryBuilder(data={"inventory_deducted": False})
            elif table_name == "dispatch_inventory_config":
                return MockQueryBuilder(data={"default_dispatch_location_id": "loc-1"})
            return MockQueryBuilder(data=None)

        supabase.table.side_effect = table_side_effect

        schema_mock = MagicMock()
        rpc_builder = MockQueryBuilder(
            data={"success": False, "errors": [{"product_id": "p1", "error": "insufficient stock"}]}
        )
        schema_mock.rpc.return_value = rpc_builder
        supabase.schema.return_value = schema_mock

        result = deduct_inventory_for_order(
            supabase=supabase,
            order_id="order-1",
            order_number="ORD-001",
            items=[{"product_id": "p1", "quantity": 5}],
            user_id="user-1",
        )

        self.assertFalse(result["success"])
        self.assertTrue(len(result["errors"]) > 0)

    def test_does_not_mark_order_on_rpc_failure(self):
        """Should NOT mark inventory_deducted=true if RPC fails."""
        supabase = MagicMock()
        update_calls = []

        def table_side_effect(table_name):
            if table_name == "orders":
                builder = MockQueryBuilder(data={"inventory_deducted": False})
                original_update = builder.update

                def track_update(*args, **kwargs):
                    update_calls.append(args)
                    return original_update(*args, **kwargs)

                builder.update = track_update
                return builder
            elif table_name == "dispatch_inventory_config":
                return MockQueryBuilder(data={"default_dispatch_location_id": "loc-1"})
            return MockQueryBuilder(data=None)

        supabase.table.side_effect = table_side_effect

        schema_mock = MagicMock()
        rpc_builder = MockQueryBuilder(
            data={"success": False, "errors": [{"error": "fail"}]}
        )
        schema_mock.rpc.return_value = rpc_builder
        supabase.schema.return_value = schema_mock

        result = deduct_inventory_for_order(
            supabase=supabase,
            order_id="order-1",
            order_number="ORD-001",
            items=[{"product_id": "p1", "quantity": 5}],
            user_id="user-1",
        )

        self.assertFalse(result["success"])
        # update with inventory_deducted should not have been called
        self.assertEqual(len(update_calls), 0)

    def test_handles_exception_gracefully(self):
        """Should catch exceptions and return error."""
        supabase = MagicMock()
        supabase.table.side_effect = Exception("DB connection failed")

        result = deduct_inventory_for_order(
            supabase=supabase,
            order_id="order-1",
            order_number="ORD-001",
            items=[{"product_id": "p1", "quantity": 5}],
            user_id="user-1",
        )

        self.assertFalse(result["success"])
        self.assertIn("DB connection failed", result["errors"][0])


# ---------------------------------------------------------------------------
# Tests for the dispatch endpoint (should NOT deduct inventory)
# ---------------------------------------------------------------------------

class TestDispatchNoInventoryDeduction(unittest.TestCase):
    """Verify that dispatch no longer creates inventory movements."""

    def test_dispatch_source_has_no_rpc_call(self):
        """Dispatch endpoint source should not contain perform_batch_dispatch_movements."""
        dispatch_path = os.path.join(
            API_ROOT, "app", "api", "routes", "dispatch", "operations.py"
        )
        with open(dispatch_path) as f:
            source = f.read()

        # The function body should not contain the RPC call
        # (it was replaced with a comment)
        lines_after_comment = False
        for line in source.split("\n"):
            if "Inventory movements are NO LONGER created during dispatch" in line:
                lines_after_comment = True
            if lines_after_comment and "perform_batch_dispatch_movements" in line:
                self.fail(
                    "dispatch_order still contains perform_batch_dispatch_movements "
                    "after the 'no longer created' comment"
                )

        self.assertIn(
            "Inventory movements are NO LONGER created during dispatch",
            source,
        )

    def test_dispatch_source_does_not_call_rpc(self):
        """The dispatch function should not reference the batch dispatch RPC."""
        dispatch_path = os.path.join(
            API_ROOT, "app", "api", "routes", "dispatch", "operations.py"
        )
        with open(dispatch_path) as f:
            source = f.read()

        # Count occurrences - should only appear in comments/old code, not in active code
        # Look specifically in the dispatch_order function
        in_dispatch_fn = False
        rpc_in_dispatch = False
        for line in source.split("\n"):
            if "async def dispatch_order" in line:
                in_dispatch_fn = True
            elif in_dispatch_fn and line.startswith("@") or (in_dispatch_fn and "async def " in line and "dispatch_order" not in line):
                in_dispatch_fn = False
            if in_dispatch_fn and "perform_batch_dispatch_movements" in line and not line.strip().startswith("#"):
                rpc_in_dispatch = True

        self.assertFalse(
            rpc_in_dispatch,
            "dispatch_order should not have active perform_batch_dispatch_movements calls"
        )


# ---------------------------------------------------------------------------
# Tests for billing flow source code (process_billing)
# ---------------------------------------------------------------------------

class TestBillingInventoryDeduction(unittest.TestCase):
    """Verify that process_billing deducts inventory correctly via source inspection."""

    def _get_export_source(self):
        export_path = os.path.join(
            API_ROOT, "app", "api", "routes", "billing", "export.py"
        )
        with open(export_path) as f:
            return f.read()

    def test_export_imports_inventory_helpers(self):
        """Billing export module should import inventory deduction helpers."""
        source = self._get_export_source()
        self.assertIn("from .inventory import deduct_inventory_for_order", source)
        self.assertIn("prepare_order_items_for_deduction", source)

    def test_direct_billing_deducts_inventory(self):
        """process_billing should deduct inventory for direct billing orders."""
        source = self._get_export_source()
        self.assertIn("Invoice billing", source)
        self.assertIn("deduct_inventory_for_order", source)

    def test_remision_billing_deducts_inventory(self):
        """process_billing should deduct inventory when creating remisions."""
        source = self._get_export_source()
        # The remision flow should call deduction with remision number in notes
        self.assertIn("Remision {remision_number}", source)


# ---------------------------------------------------------------------------
# Tests for unfactured billing (should NOT deduct inventory)
# ---------------------------------------------------------------------------

class TestUnfacturedBillingNoDeduction(unittest.TestCase):
    """Verify that process_unfactured_billing does NOT deduct inventory."""

    def test_unfactured_billing_does_not_deduct(self):
        """Invoicing already-remisioned orders should not deduct inventory again."""
        export_path = os.path.join(
            API_ROOT, "app", "api", "routes", "billing", "export.py"
        )
        with open(export_path) as f:
            source = f.read()

        # Find the process_unfactured_billing function body
        lines = source.split("\n")
        in_fn = False
        fn_source = []
        for line in lines:
            if "async def process_unfactured_billing" in line:
                in_fn = True
            elif in_fn and (line.startswith("@") or ("async def " in line and "process_unfactured_billing" not in line)):
                break
            if in_fn:
                fn_source.append(line)

        # Check that deduct_inventory_for_order is NOT called (only in comments)
        active_lines = [
            line for line in fn_source
            if not line.strip().startswith("#") and not line.strip().startswith("//")
        ]
        active_code = "\n".join(active_lines)

        self.assertNotIn(
            "deduct_inventory_for_order(",
            active_code,
            "process_unfactured_billing should not call deduct_inventory_for_order"
        )
        # Should have explicit comment about not deducting
        fn_body = "\n".join(fn_source)
        self.assertIn(
            "Inventory is NOT deducted here",
            fn_body,
        )


# ---------------------------------------------------------------------------
# Tests for remision creation (should deduct inventory)
# ---------------------------------------------------------------------------

class TestRemisionInventoryDeduction(unittest.TestCase):
    """Verify that create_remision deducts inventory."""

    def _get_remision_source(self):
        path = os.path.join(
            API_ROOT, "app", "api", "routes", "billing", "remisions.py"
        )
        with open(path) as f:
            return f.read()

    def test_remision_imports_inventory_helpers(self):
        """Remisions module should import inventory helpers."""
        source = self._get_remision_source()
        self.assertIn("from .inventory import deduct_inventory_for_order", source)

    def test_remision_creation_deducts_inventory(self):
        """Creating a remision should trigger inventory deduction."""
        source = self._get_remision_source()
        self.assertIn("deduct_inventory_for_order", source)
        self.assertIn("prepare_order_items_for_deduction", source)

    def test_remision_returns_inventory_status(self):
        """Remision response should include inventory deduction status."""
        source = self._get_remision_source()
        self.assertIn('"inventory_deducted"', source)
        self.assertIn('"inventory_errors"', source)


# ---------------------------------------------------------------------------
# Integration-style test: double deduction prevention
# ---------------------------------------------------------------------------

class TestDoubleDeductionPrevention(unittest.TestCase):
    """
    End-to-end logic test: simulate the full flow to verify no double deduction.

    Flow: create remision (deducts) -> invoice from remision (should NOT deduct again)
    """

    def test_second_deduction_is_skipped(self):
        """
        Calling deduct_inventory_for_order twice for the same order
        should result in the second call being skipped.
        """
        supabase = MagicMock()
        deduction_call_count = {"n": 0}

        def table_side_effect(table_name):
            if table_name == "orders":
                deduction_call_count["n"] += 1
                if deduction_call_count["n"] == 1:
                    # First call: not yet deducted
                    return MockQueryBuilder(data={"inventory_deducted": False})
                elif deduction_call_count["n"] == 2:
                    # Update call after deduction
                    return MockQueryBuilder(data=[{"id": "order-1"}])
                else:
                    # Third call (second deduction attempt): already deducted
                    return MockQueryBuilder(data={"inventory_deducted": True})
            elif table_name == "dispatch_inventory_config":
                return MockQueryBuilder(data={"default_dispatch_location_id": "loc-1"})
            return MockQueryBuilder(data=None)

        supabase.table.side_effect = table_side_effect

        schema_mock = MagicMock()
        rpc_builder = MockQueryBuilder(data={"success": True, "errors": []})
        schema_mock.rpc.return_value = rpc_builder
        supabase.schema.return_value = schema_mock

        items = [{"product_id": "p1", "quantity": 5}]

        # First deduction (remision): should succeed
        result1 = deduct_inventory_for_order(
            supabase=supabase,
            order_id="order-1",
            order_number="ORD-001",
            items=items,
            user_id="user-1",
            notes="Remision REM-000001",
        )
        self.assertTrue(result1["success"])
        self.assertFalse(result1["skipped"])

        # Second deduction (invoice): should be skipped
        result2 = deduct_inventory_for_order(
            supabase=supabase,
            order_id="order-1",
            order_number="ORD-001",
            items=items,
            user_id="user-1",
            notes="Invoice billing",
        )
        self.assertTrue(result2["success"])
        self.assertTrue(result2["skipped"])

        # RPC should only have been called once
        self.assertEqual(schema_mock.rpc.call_count, 1)

    def test_multiple_orders_independent(self):
        """Each order's deduction is independent - deducting order A doesn't affect order B."""
        supabase = MagicMock()

        def table_side_effect(table_name):
            if table_name == "orders":
                # Both orders not yet deducted
                return MockQueryBuilder(data={"inventory_deducted": False})
            elif table_name == "dispatch_inventory_config":
                return MockQueryBuilder(data={"default_dispatch_location_id": "loc-1"})
            return MockQueryBuilder(data=None)

        supabase.table.side_effect = table_side_effect

        schema_mock = MagicMock()
        rpc_builder = MockQueryBuilder(data={"success": True, "errors": []})
        schema_mock.rpc.return_value = rpc_builder
        supabase.schema.return_value = schema_mock

        items = [{"product_id": "p1", "quantity": 5}]

        result1 = deduct_inventory_for_order(
            supabase=supabase,
            order_id="order-1",
            order_number="ORD-001",
            items=items,
            user_id="user-1",
        )
        result2 = deduct_inventory_for_order(
            supabase=supabase,
            order_id="order-2",
            order_number="ORD-002",
            items=items,
            user_id="user-1",
        )

        self.assertTrue(result1["success"])
        self.assertTrue(result2["success"])
        self.assertFalse(result1["skipped"])
        self.assertFalse(result2["skipped"])
        # RPC should have been called twice (once per order)
        self.assertEqual(schema_mock.rpc.call_count, 2)


# ---------------------------------------------------------------------------
# Test the migration
# ---------------------------------------------------------------------------

class TestMigration(unittest.TestCase):
    """Verify the migration file exists and has correct content."""

    def _get_migration_content(self):
        migration_path = os.path.join(
            PROJECT_ROOT, "supabase", "migrations",
            "20260331000001_add_inventory_deducted_to_orders.sql"
        )
        with open(migration_path) as f:
            return f.read()

    def test_migration_file_exists(self):
        """Migration file for inventory_deducted column should exist."""
        migration_path = os.path.join(
            PROJECT_ROOT, "supabase", "migrations",
            "20260331000001_add_inventory_deducted_to_orders.sql"
        )
        self.assertTrue(os.path.exists(migration_path))

    def test_migration_adds_column(self):
        """Migration should add inventory_deducted column."""
        content = self._get_migration_content()
        self.assertIn("inventory_deducted", content)
        self.assertIn("BOOLEAN", content)
        self.assertIn("DEFAULT FALSE", content)

    def test_migration_backfills_dispatched_orders(self):
        """Migration should backfill already-dispatched orders."""
        content = self._get_migration_content()
        self.assertIn("dispatched", content)
        self.assertIn("SET inventory_deducted = TRUE", content)

    def test_migration_is_idempotent(self):
        """Migration uses IF NOT EXISTS for safety."""
        content = self._get_migration_content()
        self.assertIn("IF NOT EXISTS", content)


# ---------------------------------------------------------------------------
# Test frontend default changed
# ---------------------------------------------------------------------------

class TestFrontendDefault(unittest.TestCase):
    """Verify the frontend dispatch action defaults to no inventory movements."""

    def test_create_inventory_movements_defaults_to_false(self):
        """Frontend dispatch action should default create_inventory_movements to false."""
        actions_path = os.path.join(
            PROJECT_ROOT, "apps", "web", "app", "order-management", "dispatch", "actions.ts"
        )
        with open(actions_path) as f:
            content = f.read()

        self.assertIn(
            "create_inventory_movements: options.create_inventory_movements ?? false",
            content,
        )

    def test_frontend_has_comment_explaining_change(self):
        """Frontend should explain why inventory movements are disabled."""
        actions_path = os.path.join(
            PROJECT_ROOT, "apps", "web", "app", "order-management", "dispatch", "actions.ts"
        )
        with open(actions_path) as f:
            content = f.read()

        self.assertIn("billing/remision time", content.lower())


if __name__ == "__main__":
    unittest.main()
