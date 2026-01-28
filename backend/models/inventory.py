from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, JSON, String, func

from core.database import Base


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(String, default="")
    category = Column(String, default="supply")
    subcategory = Column(String, default="")
    sku = Column(String, default="", index=True)
    barcode = Column(String, default="", index=True)
    ndc_code = Column(String, default="")
    manufacturer = Column(String, default="")
    manufacturer_part = Column(String, default="")
    unit_of_measure = Column(String, default="each")
    unit_cost = Column(Float, default=0.0)
    reorder_cost = Column(Float, default=0.0)
    par_level = Column(Integer, default=0)
    reorder_point = Column(Integer, default=0)
    reorder_quantity = Column(Integer, default=0)
    quantity_on_hand = Column(Integer, default=0)
    quantity_allocated = Column(Integer, default=0)
    quantity_on_order = Column(Integer, default=0)
    location = Column(String, default="")
    bin_location = Column(String, default="")
    supplier_id = Column(Integer, nullable=True)
    supplier_name = Column(String, default="")
    supplier_sku = Column(String, default="")
    lead_time_days = Column(Integer, default=7)
    is_controlled = Column(Boolean, default=False)
    dea_schedule = Column(String, nullable=True)
    requires_refrigeration = Column(Boolean, default=False)
    is_single_use = Column(Boolean, default=True)
    is_critical = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    image_url = Column(String, default="")
    status = Column(String, default="in_stock")
    classification = Column(String, default="OPS")
    training_mode = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class InventoryLot(Base):
    __tablename__ = "inventory_lots"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    item_id = Column(Integer, ForeignKey("inventory_items.id"), nullable=False)
    lot_number = Column(String, nullable=False, index=True)
    serial_number = Column(String, default="")
    expiration_date = Column(DateTime(timezone=True), nullable=True)
    manufacture_date = Column(DateTime(timezone=True), nullable=True)
    quantity = Column(Integer, default=0)
    quantity_available = Column(Integer, default=0)
    unit_cost = Column(Float, default=0.0)
    received_date = Column(DateTime(timezone=True), server_default=func.now())
    received_by = Column(Integer, nullable=True)
    po_number = Column(String, default="")
    location_id = Column(Integer, nullable=True)
    location_name = Column(String, default="")
    status = Column(String, default="available")
    is_recalled = Column(Boolean, default=False)
    recall_id = Column(Integer, nullable=True)
    notes = Column(String, default="")
    training_mode = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class InventoryLocation(Base):
    __tablename__ = "inventory_locations"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    location_type = Column(String, default="station")
    parent_location_id = Column(Integer, nullable=True)
    address = Column(String, default="")
    is_vehicle = Column(Boolean, default=False)
    vehicle_id = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)
    training_mode = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class InventoryUnitStock(Base):
    __tablename__ = "inventory_unit_stock"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    location_id = Column(Integer, ForeignKey("inventory_locations.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("inventory_items.id"), nullable=False)
    lot_id = Column(Integer, ForeignKey("inventory_lots.id"), nullable=True)
    quantity = Column(Integer, default=0)
    par_level = Column(Integer, default=0)
    bin_location = Column(String, default="")
    last_counted = Column(DateTime(timezone=True), nullable=True)
    last_counted_by = Column(Integer, nullable=True)
    training_mode = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    item_id = Column(Integer, ForeignKey("inventory_items.id"), nullable=False)
    lot_id = Column(Integer, ForeignKey("inventory_lots.id"), nullable=True)
    movement_type = Column(String, default="transfer")
    quantity = Column(Integer, default=0)
    from_location_id = Column(Integer, nullable=True)
    from_location = Column(String, default="")
    to_location_id = Column(Integer, nullable=True)
    to_location = Column(String, default="")
    reference_type = Column(String, default="")
    reference_id = Column(Integer, nullable=True)
    reason = Column(String, default="")
    cost = Column(Float, default=0.0)
    performed_by = Column(Integer, nullable=True)
    payload = Column(JSON, nullable=False, default=dict)
    classification = Column(String, default="OPS")
    training_mode = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class InventoryControlledLog(Base):
    __tablename__ = "inventory_controlled_logs"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    item_id = Column(Integer, ForeignKey("inventory_items.id"), nullable=False)
    lot_id = Column(Integer, ForeignKey("inventory_lots.id"), nullable=True)
    location_id = Column(Integer, ForeignKey("inventory_locations.id"), nullable=True)
    transaction_type = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    balance_before = Column(Integer, nullable=False)
    balance_after = Column(Integer, nullable=False)
    patient_id = Column(Integer, nullable=True)
    incident_id = Column(Integer, nullable=True)
    employee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    employee_name = Column(String, default="")
    witness_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    witness_name = Column(String, default="")
    waste_amount = Column(Float, default=0.0)
    waste_reason = Column(String, default="")
    waste_witnessed = Column(Boolean, default=False)
    seal_number_broken = Column(String, default="")
    seal_number_new = Column(String, default="")
    discrepancy_noted = Column(Boolean, default=False)
    discrepancy_explanation = Column(String, default="")
    supervisor_notified = Column(Boolean, default=False)
    notes = Column(String, default="")
    signature = Column(String, default="")
    witness_signature = Column(String, default="")
    training_mode = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class InventorySupplyKit(Base):
    __tablename__ = "inventory_supply_kits"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    kit_type = Column(String, default="custom")
    description = Column(String, default="")
    is_template = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    training_mode = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class InventorySupplyKitItem(Base):
    __tablename__ = "inventory_supply_kit_items"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    kit_id = Column(Integer, ForeignKey("inventory_supply_kits.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("inventory_items.id"), nullable=False)
    quantity_required = Column(Integer, default=1)
    is_critical = Column(Boolean, default=False)
    notes = Column(String, default="")
    training_mode = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class InventoryRecall(Base):
    __tablename__ = "inventory_recalls"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    item_id = Column(Integer, ForeignKey("inventory_items.id"), nullable=False)
    recall_number = Column(String, nullable=False)
    recall_class = Column(String, default="")
    affected_lots = Column(JSON, nullable=False, default=list)
    reason = Column(String, default="")
    instructions = Column(String, default="")
    fda_recall_id = Column(String, default="")
    manufacturer_notice = Column(String, default="")
    date_issued = Column(DateTime(timezone=True), nullable=True)
    date_acknowledged = Column(DateTime(timezone=True), nullable=True)
    acknowledged_by = Column(Integer, nullable=True)
    status = Column(String, default="active")
    quantity_affected = Column(Integer, default=0)
    quantity_quarantined = Column(Integer, default=0)
    quantity_returned = Column(Integer, default=0)
    notes = Column(String, default="")
    training_mode = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class InventoryPurchaseOrder(Base):
    __tablename__ = "inventory_purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    po_number = Column(String, nullable=False, index=True)
    supplier_id = Column(Integer, nullable=True)
    supplier_name = Column(String, default="")
    status = Column(String, default="draft")
    order_date = Column(DateTime(timezone=True), nullable=True)
    expected_date = Column(DateTime(timezone=True), nullable=True)
    received_date = Column(DateTime(timezone=True), nullable=True)
    subtotal = Column(Float, default=0.0)
    tax = Column(Float, default=0.0)
    shipping = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    notes = Column(String, default="")
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_by = Column(Integer, nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    training_mode = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class InventoryPurchaseOrderItem(Base):
    __tablename__ = "inventory_purchase_order_items"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    po_id = Column(Integer, ForeignKey("inventory_purchase_orders.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("inventory_items.id"), nullable=False)
    quantity_ordered = Column(Integer, default=0)
    quantity_received = Column(Integer, default=0)
    unit_cost = Column(Float, default=0.0)
    total_cost = Column(Float, default=0.0)
    training_mode = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class InventoryCount(Base):
    __tablename__ = "inventory_counts"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    location_id = Column(Integer, ForeignKey("inventory_locations.id"), nullable=True)
    count_type = Column(String, default="cycle")
    status = Column(String, default="in_progress")
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    performed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified_by = Column(Integer, nullable=True)
    items_counted = Column(Integer, default=0)
    discrepancies_found = Column(Integer, default=0)
    discrepancies_resolved = Column(Integer, default=0)
    notes = Column(String, default="")
    training_mode = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class InventoryCountItem(Base):
    __tablename__ = "inventory_count_items"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    count_id = Column(Integer, ForeignKey("inventory_counts.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("inventory_items.id"), nullable=False)
    lot_id = Column(Integer, ForeignKey("inventory_lots.id"), nullable=True)
    expected_quantity = Column(Integer, default=0)
    counted_quantity = Column(Integer, nullable=True)
    variance = Column(Integer, default=0)
    variance_reason = Column(String, default="")
    variance_approved = Column(Boolean, default=False)
    approved_by = Column(Integer, nullable=True)
    training_mode = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class InventoryUsageLog(Base):
    __tablename__ = "inventory_usage_logs"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    item_id = Column(Integer, ForeignKey("inventory_items.id"), nullable=False)
    lot_id = Column(Integer, ForeignKey("inventory_lots.id"), nullable=True)
    location_id = Column(Integer, ForeignKey("inventory_locations.id"), nullable=True)
    incident_id = Column(Integer, nullable=True)
    patient_id = Column(Integer, nullable=True)
    quantity_used = Column(Integer, default=1)
    unit_cost = Column(Float, default=0.0)
    total_cost = Column(Float, default=0.0)
    used_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    usage_reason = Column(String, default="patient_care")
    notes = Column(String, default="")
    training_mode = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class InventoryRigCheck(Base):
    __tablename__ = "inventory_rig_checks"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    location_id = Column(Integer, ForeignKey("inventory_locations.id"), nullable=True)
    unit_id = Column(String, default="")
    check_type = Column(String, default="daily")
    status = Column(String, default="pass")
    items_checked = Column(Integer, default=0)
    items_passed = Column(Integer, default=0)
    items_failed = Column(Integer, default=0)
    items_expired = Column(Integer, default=0)
    items_below_par = Column(Integer, default=0)
    findings = Column(JSON, nullable=False, default=list)
    performed_by = Column(String, default="")
    performed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified_by_id = Column(Integer, nullable=True)
    signature = Column(String, default="")
    duration_minutes = Column(Integer, default=0)
    payload = Column(JSON, nullable=False, default=dict)
    classification = Column(String, default="OPS")
    training_mode = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
