from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, func

from core.database import Base


class FleetVehicle(Base):
    __tablename__ = "fleet_vehicles"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    vehicle_id = Column(String, nullable=False, index=True)
    call_sign = Column(String, default="")
    vehicle_type = Column(String, default="ALS")
    make = Column(String, default="")
    model = Column(String, default="")
    year = Column(String, default="")
    vin = Column(String, default="")
    status = Column(String, default="in_service")
    location = Column(String, default="")
    classification = Column(String, default="OPS")
    training_mode = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class FleetMaintenance(Base):
    __tablename__ = "fleet_maintenance"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    vehicle_id = Column(Integer, ForeignKey("fleet_vehicles.id"), nullable=False)
    service_type = Column(String, default="maintenance")
    status = Column(String, default="scheduled")
    due_mileage = Column(Integer, default=0)
    notes = Column(String, default="")
    payload = Column(JSON, nullable=False, default=dict)
    training_mode = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class FleetSubscription(Base):
    __tablename__ = "fleet_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    push_enabled = Column(Boolean, default=True)
    email_enabled = Column(Boolean, default=True)
    sms_enabled = Column(Boolean, default=False)
    critical_alerts = Column(Boolean, default=True)
    maintenance_due = Column(Boolean, default=True)
    maintenance_overdue = Column(Boolean, default=True)
    dvir_defects = Column(Boolean, default=True)
    daily_summary = Column(Boolean, default=False)
    weekly_summary = Column(Boolean, default=False)
    ai_recommendations = Column(Boolean, default=True)
    vehicle_down = Column(Boolean, default=True)
    fuel_alerts = Column(Boolean, default=False)
    vehicle_ids = Column(JSON, nullable=False, default=list)
    quiet_hours_start = Column(Integer, default=22)
    quiet_hours_end = Column(Integer, default=6)
    training_mode = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class FleetAIInsight(Base):
    __tablename__ = "fleet_ai_insights"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    vehicle_id = Column(Integer, ForeignKey("fleet_vehicles.id"), nullable=True)
    insight_type = Column(String, default="predictive")
    priority = Column(String, default="medium")
    title = Column(String, default="")
    description = Column(String, default="")
    estimated_savings = Column(Integer, nullable=True)
    confidence = Column(Integer, default=0)
    action_required = Column(String, default="")
    action_deadline = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, default="active")
    payload = Column(JSON, nullable=False, default=dict)
    training_mode = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())



class FleetInspection(Base):
    __tablename__ = "fleet_inspections"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    vehicle_id = Column(Integer, ForeignKey("fleet_vehicles.id"), nullable=False)
    status = Column(String, default="pass")
    findings = Column(JSON, nullable=False, default=list)
    performed_by = Column(String, default="")
    payload = Column(JSON, nullable=False, default=dict)
    training_mode = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class FleetTelemetry(Base):
    __tablename__ = "fleet_telemetry"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    vehicle_id = Column(Integer, ForeignKey("fleet_vehicles.id"), nullable=False)
    latitude = Column(String, default="")
    longitude = Column(String, default="")
    speed = Column(String, default="")
    odometer = Column(String, default="")
    payload = Column(JSON, nullable=False, default=dict)
    training_mode = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class FleetDVIR(Base):
    __tablename__ = "fleet_dvir"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    vehicle_id = Column(Integer, ForeignKey("fleet_vehicles.id"), nullable=False)
    inspection_type = Column(String, default="pre_trip")
    inspection_date = Column(DateTime(timezone=True), server_default=func.now())
    odometer = Column(Integer, default=0)
    driver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    driver_name = Column(String, default="")

    brakes_ok = Column(Boolean, default=True)
    steering_ok = Column(Boolean, default=True)
    lights_headlights_ok = Column(Boolean, default=True)
    lights_taillights_ok = Column(Boolean, default=True)
    lights_brake_ok = Column(Boolean, default=True)
    lights_turn_signals_ok = Column(Boolean, default=True)
    lights_emergency_ok = Column(Boolean, default=True)
    horn_ok = Column(Boolean, default=True)
    windshield_ok = Column(Boolean, default=True)
    wipers_ok = Column(Boolean, default=True)
    mirrors_ok = Column(Boolean, default=True)
    tires_front_ok = Column(Boolean, default=True)
    tires_rear_ok = Column(Boolean, default=True)
    wheels_lugs_ok = Column(Boolean, default=True)
    fluid_levels_ok = Column(Boolean, default=True)
    exhaust_ok = Column(Boolean, default=True)
    battery_ok = Column(Boolean, default=True)
    fire_extinguisher_ok = Column(Boolean, default=True)
    reflective_triangles_ok = Column(Boolean, default=True)
    first_aid_kit_ok = Column(Boolean, default=True)
    seatbelts_ok = Column(Boolean, default=True)

    stretcher_ok = Column(Boolean, nullable=True)
    stretcher_straps_ok = Column(Boolean, nullable=True)
    suction_ok = Column(Boolean, nullable=True)
    oxygen_main_ok = Column(Boolean, nullable=True)
    oxygen_portable_ok = Column(Boolean, nullable=True)
    monitor_defibrillator_ok = Column(Boolean, nullable=True)
    drug_box_sealed_ok = Column(Boolean, nullable=True)
    airway_bag_ok = Column(Boolean, nullable=True)
    trauma_bag_ok = Column(Boolean, nullable=True)
    iv_supplies_ok = Column(Boolean, nullable=True)
    splinting_ok = Column(Boolean, nullable=True)
    stair_chair_ok = Column(Boolean, nullable=True)
    backboard_ok = Column(Boolean, nullable=True)
    c_collar_ok = Column(Boolean, nullable=True)

    pump_ok = Column(Boolean, nullable=True)
    pump_gauges_ok = Column(Boolean, nullable=True)
    aerial_ok = Column(Boolean, nullable=True)
    ground_ladders_ok = Column(Boolean, nullable=True)
    hose_loads_ok = Column(Boolean, nullable=True)
    scba_ok = Column(Boolean, nullable=True)
    nozzles_ok = Column(Boolean, nullable=True)
    hand_tools_ok = Column(Boolean, nullable=True)
    forcible_entry_ok = Column(Boolean, nullable=True)
    vent_equipment_ok = Column(Boolean, nullable=True)
    rope_rescue_ok = Column(Boolean, nullable=True)
    thermal_camera_ok = Column(Boolean, nullable=True)

    defects_found = Column(Boolean, default=False)
    defect_description = Column(String, default="")
    defects_corrected = Column(Boolean, nullable=True)
    corrected_by = Column(String, default="")
    mechanic_signature = Column(String, default="")
    vehicle_safe_to_operate = Column(Boolean, default=True)
    driver_signature = Column(String, default="")
    reviewer_id = Column(Integer, nullable=True)
    reviewer_signature = Column(String, default="")
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    notes = Column(String, default="")
    payload = Column(JSON, nullable=False, default=dict)
    training_mode = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


