-- ============================================================================
-- FIRE MDT PostgreSQL RLS (Row Level Security) Policies
-- ============================================================================
--
-- This file implements tenant isolation and role-based access control
-- for the Fire MDT system using PostgreSQL Row Level Security.
--
-- All policies enforce org_id-based multi-tenancy and device-bound writes.
-- Policies follow the locked specification:
-- - MDT devices can only write to their own unit/org
-- - MDT cannot UPDATE or DELETE (write-once)
-- - Admins can read all org data
-- - Founder can read cross-org with explicit permission
-- ============================================================================

-- Enable RLS on all Fire MDT tables
ALTER TABLE fire_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE fire_incident_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE mdt_obd_ingest ENABLE ROW LEVEL SECURITY;
ALTER TABLE mdt_gps_breadcrumb ENABLE ROW LEVEL SECURITY;
ALTER TABLE fire_geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE fire_mdt_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE fire_mdt_offline_queue ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- FIRE_INCIDENTS - RLS Policies
-- ============================================================================

-- MDT Device Write Policy: Can INSERT incidents for own unit/org only
CREATE POLICY mdt_device_insert_incident ON fire_incidents
    FOR INSERT
    TO fire_mdt_unit
    WITH CHECK (
        org_id = current_setting('app.current_org_id')::uuid
        AND unit_id = current_setting('app.current_unit_id')::uuid
    );

-- MDT Device Read Policy: Can read own unit's incidents only
CREATE POLICY mdt_device_read_incident ON fire_incidents
    FOR SELECT
    TO fire_mdt_unit
    USING (
        org_id = current_setting('app.current_org_id')::uuid
        AND unit_id = current_setting('app.current_unit_id')::uuid
    );

-- Dispatch Read Policy: Can read all incidents in org
CREATE POLICY dispatch_read_incident ON fire_incidents
    FOR SELECT
    TO fire_dispatch
    USING (org_id = current_setting('app.current_org_id')::uuid);

-- Admin/Supervisor/QA Read Policy: Can read all org incidents
CREATE POLICY admin_read_incident ON fire_incidents
    FOR SELECT
    TO fire_admin, fire_supervisor, fire_qa
    USING (org_id = current_setting('app.current_org_id')::uuid);

-- Founder Read Policy: Can read all incidents (cross-org)
CREATE POLICY founder_read_incident ON fire_incidents
    FOR SELECT
    TO founder
    USING (true);

-- ============================================================================
-- FIRE_INCIDENT_TIMELINE - RLS Policies (MOST CRITICAL)
-- ============================================================================

-- MDT Device Write Policy: Can INSERT timeline events for own unit/org only
CREATE POLICY mdt_device_insert_timeline ON fire_incident_timeline
    FOR INSERT
    TO fire_mdt_unit
    WITH CHECK (
        org_id = current_setting('app.current_org_id')::uuid
        AND unit_id = current_setting('app.current_unit_id')::uuid
        AND EXISTS (
            SELECT 1 FROM fire_incidents
            WHERE fire_incidents.id = fire_incident_timeline.incident_id
            AND fire_incidents.org_id = current_setting('app.current_org_id')::uuid
        )
    );

-- MDT Device Read Policy: Can read timeline for own unit's incidents only
CREATE POLICY mdt_device_read_timeline ON fire_incident_timeline
    FOR SELECT
    TO fire_mdt_unit
    USING (
        org_id = current_setting('app.current_org_id')::uuid
        AND unit_id = current_setting('app.current_unit_id')::uuid
    );

-- Admin/Supervisor/QA Read Policy: Can read all org timeline
CREATE POLICY admin_read_timeline ON fire_incident_timeline
    FOR SELECT
    TO fire_admin, fire_supervisor, fire_qa, fire_dispatch
    USING (org_id = current_setting('app.current_org_id')::uuid);

-- Founder Read Policy: Can read all timelines
CREATE POLICY founder_read_timeline ON fire_incident_timeline
    FOR SELECT
    TO founder
    USING (true);

-- ============================================================================
-- MDT_OBD_INGEST - RLS Policies
-- ============================================================================

CREATE POLICY mdt_device_insert_obd ON mdt_obd_ingest
    FOR INSERT TO fire_mdt_unit
    WITH CHECK (
        org_id = current_setting('app.current_org_id')::uuid
        AND unit_id = current_setting('app.current_unit_id')::uuid
        AND device_id = current_setting('app.current_device_id')::uuid
    );

CREATE POLICY mdt_device_read_obd ON mdt_obd_ingest
    FOR SELECT TO fire_mdt_unit
    USING (org_id = current_setting('app.current_org_id')::uuid AND unit_id = current_setting('app.current_unit_id')::uuid);

CREATE POLICY admin_read_obd ON mdt_obd_ingest
    FOR SELECT TO fire_admin, fire_supervisor
    USING (org_id = current_setting('app.current_org_id')::uuid);

CREATE POLICY founder_read_obd ON mdt_obd_ingest FOR SELECT TO founder USING (true);

-- ============================================================================
-- MDT_GPS_BREADCRUMB - RLS Policies
-- ============================================================================

CREATE POLICY mdt_device_insert_gps ON mdt_gps_breadcrumb
    FOR INSERT TO fire_mdt_unit
    WITH CHECK (
        org_id = current_setting('app.current_org_id')::uuid
        AND unit_id = current_setting('app.current_unit_id')::uuid
        AND device_id = current_setting('app.current_device_id')::uuid
    );

CREATE POLICY mdt_device_read_gps ON mdt_gps_breadcrumb
    FOR SELECT TO fire_mdt_unit
    USING (org_id = current_setting('app.current_org_id')::uuid AND unit_id = current_setting('app.current_unit_id')::uuid);

CREATE POLICY admin_read_gps ON mdt_gps_breadcrumb FOR SELECT TO fire_admin, fire_supervisor
    USING (org_id = current_setting('app.current_org_id')::uuid);

CREATE POLICY founder_read_gps ON mdt_gps_breadcrumb FOR SELECT TO founder USING (true);

-- ============================================================================
-- FIRE_GEOFENCES - RLS Policies
-- ============================================================================

CREATE POLICY admin_write_geofence ON fire_geofences FOR ALL TO fire_admin
    USING (org_id = current_setting('app.current_org_id')::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id')::uuid);

CREATE POLICY fire_read_geofence ON fire_geofences FOR SELECT 
    TO fire_mdt_unit, fire_dispatch, fire_admin, fire_supervisor, fire_qa
    USING (org_id = current_setting('app.current_org_id')::uuid);

CREATE POLICY founder_read_geofence ON fire_geofences FOR SELECT TO founder USING (true);

-- ============================================================================
-- FIRE_MDT_DEVICES - RLS Policies
-- ============================================================================

CREATE POLICY admin_write_device ON fire_mdt_devices FOR ALL TO fire_admin
    USING (org_id = current_setting('app.current_org_id')::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id')::uuid);

CREATE POLICY fire_read_device ON fire_mdt_devices FOR SELECT 
    TO fire_mdt_unit, fire_dispatch, fire_admin, fire_supervisor
    USING (org_id = current_setting('app.current_org_id')::uuid);

CREATE POLICY founder_read_device ON fire_mdt_devices FOR SELECT TO founder USING (true);

-- ============================================================================
-- FIRE_MDT_OFFLINE_QUEUE - RLS Policies
-- ============================================================================

CREATE POLICY mdt_device_write_queue ON fire_mdt_offline_queue FOR ALL TO fire_mdt_unit
    USING (org_id = current_setting('app.current_org_id')::uuid 
           AND unit_id = current_setting('app.current_unit_id')::uuid
           AND device_id = current_setting('app.current_device_id')::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id')::uuid 
                AND unit_id = current_setting('app.current_unit_id')::uuid
                AND device_id = current_setting('app.current_device_id')::uuid);

CREATE POLICY admin_read_queue ON fire_mdt_offline_queue FOR SELECT TO fire_admin, fire_supervisor
    USING (org_id = current_setting('app.current_org_id')::uuid);

CREATE POLICY founder_read_queue ON fire_mdt_offline_queue FOR SELECT TO founder USING (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION set_fire_mdt_context(
    p_org_id uuid,
    p_unit_id uuid DEFAULT NULL,
    p_device_id uuid DEFAULT NULL,
    p_station_id uuid DEFAULT NULL
) RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_org_id', p_org_id::text, true);
    IF p_unit_id IS NOT NULL THEN PERFORM set_config('app.current_unit_id', p_unit_id::text, true); END IF;
    IF p_device_id IS NOT NULL THEN PERFORM set_config('app.current_device_id', p_device_id::text, true); END IF;
    IF p_station_id IS NOT NULL THEN PERFORM set_config('app.current_station_id', p_station_id::text, true); END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION validate_device_token(p_device_id uuid, p_unit_id uuid) RETURNS boolean AS $$
BEGIN
    RETURN EXISTS(SELECT 1 FROM fire_mdt_devices WHERE id = p_device_id AND unit_id = p_unit_id AND active = true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANT STATEMENTS
-- ============================================================================

GRANT SELECT, INSERT ON fire_incidents TO fire_mdt_unit;
GRANT SELECT, INSERT ON fire_incident_timeline TO fire_mdt_unit;
GRANT SELECT, INSERT ON mdt_obd_ingest TO fire_mdt_unit;
GRANT SELECT, INSERT ON mdt_gps_breadcrumb TO fire_mdt_unit;
GRANT SELECT ON fire_geofences TO fire_mdt_unit;
GRANT ALL ON fire_mdt_offline_queue TO fire_mdt_unit;

GRANT SELECT ON fire_incidents TO fire_dispatch;
GRANT SELECT ON fire_incident_timeline TO fire_dispatch;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO fire_admin;
GRANT ALL ON fire_geofences TO fire_admin;
GRANT ALL ON fire_mdt_devices TO fire_admin;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO fire_supervisor, fire_qa;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO founder;
