"""
Socket Bridge Integration Examples
Demonstrates how to use the Socket.io bridge in various scenarios.
"""
from services.cad.socket_bridge import get_socket_bridge
from utils.logger import logger


async def example_send_assignment():
    """
    Example: Send a new assignment to a unit
    Use case: Dispatcher assigns Unit-5 to a cardiac arrest call
    """
    bridge = get_socket_bridge()
    
    incident_data = {
        "incidentId": "INC-2024-12345",
        "type": "Cardiac Arrest",
        "address": "123 Main St, Anytown, USA",
        "priority": 1,
        "details": "67 y/o male, unresponsive, CPR in progress",
        "location": {
            "type": "Point",
            "coordinates": [-122.4194, 37.7749]  # [longitude, latitude]
        }
    }
    
    success = await bridge.send_assignment("UNIT-5", incident_data)
    
    if success:
        logger.info("Assignment sent successfully")
    else:
        logger.error("Failed to send assignment")


async def example_update_unit_location():
    """
    Example: Update unit GPS location from MDT PWA
    Use case: Unit-5 is driving to scene, MDT sends location updates
    """
    bridge = get_socket_bridge()
    
    location = {
        "type": "Point",
        "coordinates": [-122.4184, 37.7759]  # Moving toward scene
    }
    
    success = await bridge.update_unit_location(
        unit_id="UNIT-5",
        location=location,
        heading=45.0,  # Northeast
        speed=65.0     # km/h
    )
    
    if success:
        logger.info("Unit location updated")


async def example_update_unit_status():
    """
    Example: Update unit status when arriving on scene
    Use case: Unit-5 arrives at scene, crew taps "On Scene" button
    """
    bridge = get_socket_bridge()
    
    success = await bridge.update_unit_status(
        unit_id="UNIT-5",
        status="onscene",
        incident_id="INC-2024-12345"
    )
    
    if success:
        logger.info("Unit status updated to On Scene")


async def example_record_timestamps():
    """
    Example: Record incident timestamps automatically
    Use case: Auto-timestamp when unit status changes
    """
    bridge = get_socket_bridge()
    
    from datetime import datetime
    
    # Dispatched timestamp
    await bridge.record_incident_timestamp(
        incident_id="INC-2024-12345",
        field="dispatched_at",
        timestamp=datetime.utcnow().isoformat(),
        source="auto"
    )
    
    # Enroute timestamp with location
    await bridge.record_incident_timestamp(
        incident_id="INC-2024-12345",
        field="enroute_at",
        timestamp=datetime.utcnow().isoformat(),
        location={
            "type": "Point",
            "coordinates": [-122.4180, 37.7755]
        },
        source="auto"
    )
    
    # On scene timestamp
    await bridge.record_incident_timestamp(
        incident_id="INC-2024-12345",
        field="onscene_at",
        timestamp=datetime.utcnow().isoformat(),
        location={
            "type": "Point",
            "coordinates": [-122.4194, 37.7749]
        },
        source="auto"
    )


async def example_transport_completed():
    """
    Example: Notify billing when transport completes
    Use case: Crew completes ePCR, triggers billing workflow
    """
    bridge = get_socket_bridge()
    
    billing_data = {
        "patient_name": "John Doe",
        "transport_type": "ALS-1 Emergency",
        "origin": "123 Main St, Anytown, USA",
        "destination": "General Hospital ER",
        "mileage": 5.2,
        "insurance_type": "Medicare",
        "insurance_id": "123456789A",
        "chief_complaint": "Chest Pain",
        "procedures": ["12-Lead EKG", "IV Access", "Oxygen Administration"],
        "medications": ["Aspirin 324mg", "Nitroglycerin 0.4mg"],
    }
    
    success = await bridge.notify_transport_completed(
        incident_id="INC-2024-12345",
        epcr_id="EPCR-2024-67890",
        billing_data=billing_data
    )
    
    if success:
        logger.info("Billing notification sent, claim creation triggered")


async def example_realtime_metrics():
    """
    Example: Broadcast real-time metrics to founder dashboard
    Use case: System calculates metrics every minute, pushes to dashboard
    """
    bridge = get_socket_bridge()
    
    from datetime import datetime, timedelta
    
    metrics = {
        "active_incidents": 12,
        "available_units": 8,
        "units_enroute": 5,
        "units_onscene": 4,
        "units_transporting": 3,
        "avg_response_time_minutes": 7.2,
        "epcrs_completed_today": 45,
        "revenue_today": 125000.00,
        "claims_submitted_today": 38,
        "claims_pending_review": 7,
        "alert_critical_incidents": 2,
        "alert_delayed_units": 1,
    }
    
    success = await bridge.broadcast_metrics_update(metrics)
    
    if success:
        logger.info("Metrics broadcasted to dashboard")


async def example_listen_for_events():
    """
    Example: Register custom event handlers
    Use case: React to events from CAD backend
    """
    bridge = get_socket_bridge()
    
    # Handler for transport completed events
    async def on_transport_completed(data):
        incident_id = data.get('incidentId')
        epcr_id = data.get('epcrId')
        
        logger.info(f"Transport completed: {incident_id}")
        
        # Custom business logic here
        # - Create billing record
        # - Send notification to billing team
        # - Update KPIs
        # - Generate invoice
        
    # Handler for unit status changes
    async def on_unit_status_changed(data):
        unit_id = data.get('unitId')
        status = data.get('status')
        
        logger.info(f"Unit {unit_id} status changed to {status}")
        
        # Custom business logic here
        # - Update availability board
        # - Trigger auto-dispatch if now available
        # - Log for compliance
        
    # Handler for new incidents
    async def on_new_incident(data):
        incident_id = data.get('incidentId')
        priority = data.get('priority')
        
        logger.info(f"New incident: {incident_id} (Priority {priority})")
        
        # Custom business logic here
        # - Create ePCR stub
        # - Notify supervisors if high priority
        # - Calculate closest units
        # - Pre-load patient history if repeat patient
        
    # Register handlers
    bridge.on('transport:completed', on_transport_completed)
    bridge.on('unit:status:updated', on_unit_status_changed)
    bridge.on('incident:new', on_new_incident)
    
    logger.info("Custom event handlers registered")


async def example_health_monitoring():
    """
    Example: Monitor bridge health
    Use case: Health check endpoint or monitoring dashboard
    """
    bridge = get_socket_bridge()
    
    health = bridge.get_health_status()
    
    print("Socket Bridge Health:")
    print(f"  Connected: {health['connected']}")
    print(f"  CAD URL: {health['cad_url']}")
    print(f"  Last Connection: {health['last_connection']}")
    print(f"  Connection Attempts: {health['connection_attempts']}")
    print(f"  Last Error: {health['last_error']}")
    print(f"  Event Handlers: {health['event_handlers_registered']}")
    print(f"  Uptime: {health['uptime_seconds']} seconds")
    
    if not health['connected']:
        logger.error("Socket bridge is disconnected!")
        # Trigger alert or attempt reconnection


# Example workflow: Complete incident lifecycle
async def example_complete_workflow():
    """
    Example: Complete incident lifecycle from dispatch to billing
    Demonstrates the full flow of data through the platform
    """
    bridge = get_socket_bridge()
    
    # 1. New 911 call comes in, create incident
    incident_id = "INC-2024-12345"
    unit_id = "UNIT-5"
    
    logger.info("Step 1: Dispatcher creates incident and assigns unit")
    await bridge.send_assignment(unit_id, {
        "incidentId": incident_id,
        "type": "Chest Pain",
        "address": "123 Main St",
        "priority": 2,
        "location": {"type": "Point", "coordinates": [-122.4194, 37.7749]}
    })
    
    # 2. Unit acknowledges and goes enroute
    logger.info("Step 2: Unit goes enroute")
    await bridge.update_unit_status(unit_id, "enroute", incident_id)
    await bridge.record_incident_timestamp(
        incident_id, "enroute_at", 
        "2024-01-27T10:05:00Z", source="auto"
    )
    
    # 3. Unit sends GPS updates while driving
    logger.info("Step 3: GPS tracking enroute")
    await bridge.update_unit_location(
        unit_id,
        {"type": "Point", "coordinates": [-122.4184, 37.7755]},
        heading=45.0,
        speed=65.0
    )
    
    # 4. Unit arrives on scene
    logger.info("Step 4: Unit arrives on scene")
    await bridge.update_unit_status(unit_id, "onscene", incident_id)
    await bridge.record_incident_timestamp(
        incident_id, "onscene_at",
        "2024-01-27T10:12:00Z", source="auto"
    )
    
    # 5. Patient assessment and treatment
    logger.info("Step 5: Crew assessing patient (ePCR being filled)")
    # ePCR data entry happens here via separate API calls
    
    # 6. Transporting to hospital
    logger.info("Step 6: Transporting to hospital")
    await bridge.update_unit_status(unit_id, "transport", incident_id)
    await bridge.record_incident_timestamp(
        incident_id, "transport_at",
        "2024-01-27T10:25:00Z", source="auto"
    )
    
    # 7. Arrive at hospital
    logger.info("Step 7: Arrive at hospital")
    await bridge.update_unit_status(unit_id, "hospital", incident_id)
    await bridge.record_incident_timestamp(
        incident_id, "hospital_at",
        "2024-01-27T10:35:00Z", source="auto"
    )
    
    # 8. Complete ePCR and trigger billing
    logger.info("Step 8: ePCR completed, triggering billing")
    await bridge.notify_transport_completed(
        incident_id,
        "EPCR-2024-67890",
        {
            "patient_name": "John Doe",
            "transport_type": "ALS-1 Emergency",
            "mileage": 5.2,
            "insurance_type": "Medicare",
            "procedures": ["12-Lead EKG", "IV Access"],
        }
    )
    
    # 9. Unit back in service
    logger.info("Step 9: Unit back in service")
    await bridge.update_unit_status(unit_id, "available")
    await bridge.update_incident_status(incident_id, "completed", "system")
    
    logger.info("✓ Complete workflow finished")


if __name__ == "__main__":
    import asyncio
    
    async def main():
        # Initialize bridge
        from services.cad.socket_bridge import initialize_socket_bridge
        await initialize_socket_bridge()
        
        # Run examples
        await example_complete_workflow()
        
        # Cleanup
        from services.cad.socket_bridge import shutdown_socket_bridge
        await shutdown_socket_bridge()
    
    asyncio.run(main())
