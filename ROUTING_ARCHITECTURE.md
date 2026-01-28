# Routing & Traffic Awareness Layer

## Overview

FusionEMS Quantum uses **OpenStreetMap (OSM) + Valhalla** as the primary routing engine with optional traffic awareness from open government feeds (DOT/511) and selective enhancement via paid APIs (Mapbox).

## Architecture

### Primary Routing: Valhalla + OSM
- **Self-hosted Valhalla** routing engine (Docker container)
- **OpenStreetMap** data (North America extracts from Geofabrik)
- Zero per-request costs
- Full control and customization
- Runs at `http://valhalla:8002` in Docker network

### Traffic Awareness: Open Government Feeds
- Poll DOT/511 feeds every 1-5 minutes
- Normalize traffic events (accidents, closures, construction)
- Apply severity-based penalties to routing
- Display events as dispatcher context (never authoritative)

### Optional Enhancement: Paid APIs
- **Mapbox Directions API** for live traffic refinement
- Used ONLY when:
  - High-priority call (ESI-1, ESI-2)
  - Dispatcher explicitly requests traffic-adjusted ETA
  - Urban congestion detected
  - Budget allows
- Rate-limited and cost-capped
- Silent fallback to Valhalla if failed

## Database Models

### `TrafficEvent`
Stores normalized traffic incidents from feeds.

```python
- id: str (PK)
- source: str (feed name)
- event_type: enum (accident, closure, construction, congestion, hazard)
- severity: enum (road_closure, major, moderate, minor)
- title: str
- description: str
- geometry: PostGIS geometry (point/line/polygon)
- active: bool
- start_time: datetime
- end_time: datetime
- penalty_multiplier: float
- metadata: JSONB
```

### `RouteCalculation`
Audit log of all route calculations.

```python
- id: str (PK)
- incident_id: str
- unit_id: str
- origin_lat/lon: float
- destination_lat/lon: float
- routing_engine: enum (valhalla, mapbox, google)
- route_geometry: LineString
- baseline_eta_seconds: int
- traffic_adjusted: bool
- traffic_adjusted_eta_seconds: int
- traffic_events_applied: JSONB array
- penalties_applied: JSONB
- dispatcher_requested: bool
- paid_api_used: bool
- paid_api_cost_cents: int
- created_at: datetime
- created_by: str
```

### `TrafficFeedSource`
Configuration for traffic feed ingestion.

```python
- id: str (PK)
- name: str
- source_type: str (511_json, waze, etc.)
- url: str
- poll_interval_seconds: int (default 300)
- active: bool
- last_poll_at: datetime
- events_ingested_count: int
```

### `RoutingConfig`
Organization-level routing settings.

```python
- valhalla_endpoint: str
- use_traffic_penalties: bool
- enable_paid_apis: bool
- paid_api_provider: str (mapbox, google)
- paid_api_rate_limit_per_hour: int
- paid_api_monthly_budget_cents: int
- severity_penalties: JSONB (road_closure: 9999, major: 600, etc.)
```

## API Endpoints

### `POST /api/routing/route/calculate`
Calculate route with traffic awareness.

**Request:**
```json
{
  "origin_lat": 40.7128,
  "origin_lon": -74.0060,
  "destination_lat": 40.7829,
  "destination_lon": -73.9654,
  "incident_id": "inc_123",
  "unit_id": "unit_45",
  "priority_level": "ESI-1",
  "dispatcher_requested": true
}
```

**Response:**
```json
{
  "route_id": "route_1738012345",
  "baseline_eta_seconds": 1200,
  "baseline_distance_meters": 8500,
  "traffic_adjusted": true,
  "traffic_adjusted_eta_seconds": 1450,
  "routing_engine": "valhalla",
  "traffic_events_count": 2,
  "calculation_time_ms": 85,
  "paid_api_used": false,
  "route_geojson": {...}
}
```

### `GET /api/routing/traffic/events`
Get active traffic events for map overlay.

**Query params:**
- `bounds`: bbox (min_lon,min_lat,max_lon,max_lat)
- `severity`: filter by severity

**Response:**
```json
{
  "events": [
    {
      "id": "dot_511_12345",
      "type": "accident",
      "severity": "major",
      "title": "Multi-vehicle crash on I-95",
      "source": "NY_DOT_511",
      "geometry": {...},
      "start_time": "2026-01-27T14:30:00Z",
      "end_time": "2026-01-27T16:00:00Z"
    }
  ],
  "count": 1,
  "disclaimer": "Traffic data is reference-only. Dispatcher judgment overrides."
}
```

### `GET /api/routing/audit`
Audit log of route calculations.

**Query params:**
- `incident_id`: filter by incident
- `unit_id`: filter by unit
- `limit`: max results (default 50)

## Background Jobs

### Traffic Feed Poller
Run every 1-5 minutes via cron:
```bash
python /app/jobs/traffic_feed_poller.py
```

Polls all active feeds, normalizes events, updates database.

### Traffic Event Expiration
Run every 5 minutes:
```bash
python /app/jobs/traffic_feed_poller.py
```

Marks events as inactive if past `end_time`.

## Severity-Based Penalties

Traffic events apply time penalties to affected road segments:

| Severity | Penalty (seconds) | Effect |
|----------|-------------------|--------|
| `road_closure` | 9999 | Effectively blocks segment |
| `major` | 600 (10 min) | Strong avoidance |
| `moderate` | 300 (5 min) | Medium avoidance |
| `minor` | 60 (1 min) | Light penalty |

Valhalla routing engine applies these as cost adjustments.

## Paid API Usage Rules

Mapbox is used ONLY when ALL conditions met:
1. `enable_paid_apis == true` in config
2. `dispatcher_requested == true` in request
3. Priority level in `high_priority_threshold` (ESI-1, ESI-2)
4. Active traffic events detected on baseline route
5. Monthly budget not exceeded

Cost tracking:
- Each Mapbox call: ~5 cents
- Monthly spend tracked in `RoutingConfig.paid_api_current_month_spend_cents`
- Hard cap at `paid_api_monthly_budget_cents`

## Dispatcher Experience

### Always Receive a Route
- Valhalla always returns a route (even through penalties)
- Paid API failures silently fall back to Valhalla
- No API errors exposed to dispatcher

### Traffic as Context
- Traffic events shown on map as visual overlays
- ETA displayed as:
  - **Baseline:** "18 min (no traffic)"
  - **Traffic-adjusted:** "23 min (with traffic)"
- Dispatcher can request manual refresh

### No Blocking
- System never prevents routing due to:
  - API failures
  - Budget exhaustion
  - Missing traffic data
- Dispatcher authority > automation

## Deployment

### Docker Compose
Valhalla service included in `docker-compose.yml`:
```yaml
valhalla:
  image: ghcr.io/gis-ops/docker-valhalla/valhalla:latest
  ports:
    - "8002:8002"
  volumes:
    - valhalla_tiles:/custom_files
  environment:
    tile_urls: https://download.geofabrik.de/north-america/us-latest.osm.pbf
```

### Initial Setup
1. Start Docker stack: `docker-compose up -d`
2. Valhalla downloads OSM data (10-30 min first run)
3. Builds routing tiles
4. Ready at `http://valhalla:8002`

### Traffic Feed Configuration
Add feeds via database:
```sql
INSERT INTO traffic_feed_sources (id, name, source_type, url, poll_interval_seconds, active)
VALUES (
  'ny_dot_511',
  'NY DOT 511',
  '511_json',
  'https://511ny.org/api/getevents',
  300,
  true
);
```

## Cost Control

### Zero-Cost Default
- OSM data: free
- Valhalla: self-hosted (server costs only)
- DOT/511 feeds: free government data

### Paid API Budget
Set monthly budget:
```python
routing_config.paid_api_monthly_budget_cents = 5000  # $50/month
routing_config.paid_api_rate_limit_per_hour = 100
```

Budget resets automatically each month.

## Audit & Compliance

Every route calculation logged with:
- Routing engine used
- Traffic data applied
- ETA baseline vs adjusted
- Paid API usage and cost
- Dispatcher actions
- Timestamp and user

Query audit log:
```sql
SELECT * FROM route_calculations 
WHERE incident_id = 'inc_123'
ORDER BY created_at DESC;
```

## Future Enhancements

- [ ] Waze Connected Citizens feed integration
- [ ] Real-time bus/train data for route penalties
- [ ] Historical traffic patterns (time-of-day weighting)
- [ ] Machine learning ETA refinement
- [ ] Multi-modal routing (air ambulance consideration)
