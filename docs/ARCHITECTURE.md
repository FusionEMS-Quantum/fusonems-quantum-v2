# FusonEMS Quantum Architecture

## Overview
FusonEMS Quantum is a comprehensive EMS operations platform with modular architecture supporting CAD dispatch, ePCR documentation, scheduling, billing, communications, and analytics.

## Database Connection Pooling

### Overview
Database connection pooling is a critical component for performance, scalability, and resource management. The platform uses SQLAlchemy's QueuePool with carefully tuned parameters to ensure reliable database connectivity across all deployment tiers.

### Configuration Variables

All database pooling parameters are configurable via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_POOL_SIZE` | 5 | Maximum number of permanent connections maintained in the pool |
| `DB_MAX_OVERFLOW` | 10 | Maximum number of connections beyond pool_size that can be created on demand |
| `DB_POOL_TIMEOUT` | 30 | Maximum seconds to wait for a connection from the pool before raising an error |
| `DB_POOL_RECYCLE` | 1800 | Recycle connections after this many seconds to prevent stale connections |

### Pool Pre-Ping

The platform enables `pool_pre_ping=True` for all database engines. This feature tests each connection with a simple query (`SELECT 1`) before returning it from the pool, ensuring that stale or broken connections are automatically replaced.

### Deployment Tier Recommendations

#### Pilot / Small Agency (1-50 users)
Recommended settings for pilot deployments or small agencies:
```
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20
DB_POOL_TIMEOUT=30
DB_POOL_RECYCLE=1800
```

These are the defaults in `infrastructure/do-app.yaml`.

#### Medium Agency (50-200 users)
```
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=40
DB_POOL_TIMEOUT=30
DB_POOL_RECYCLE=1800
```

#### Large Agency / Regional (200+ users)
```
DB_POOL_SIZE=50
DB_MAX_OVERFLOW=100
DB_POOL_TIMEOUT=45
DB_POOL_RECYCLE=1800
```

### Operational Notes

1. **Connectivity Testing**: On startup, each database engine performs a connectivity test (`SELECT 1`). In production environments, connectivity failures result in immediate application failure to prevent degraded operation. In development, warnings are printed but the application continues.

2. **Multiple Database Support**: The platform supports multiple database engines for different modules:
   - Main database (`DATABASE_URL`)
   - Telehealth database (`TELEHEALTH_DATABASE_URL`)
   - Fire database (`FIRE_DATABASE_URL`)
   - HEMS database (uses main `DATABASE_URL`)

3. **Connection Recycling**: The `DB_POOL_RECYCLE` setting prevents issues with databases that automatically close idle connections (common with managed PostgreSQL services). The default of 1800 seconds (30 minutes) is conservative and suitable for most environments.

4. **Pool Exhaustion**: If the pool is exhausted (all `pool_size + max_overflow` connections in use), new connection requests will block for up to `DB_POOL_TIMEOUT` seconds before raising a `TimeoutError`. Monitor pool usage to avoid this scenario.

5. **SQLite Behavior**: When using SQLite databases (primarily for development), pooling parameters are not applied as SQLite uses a simpler connection model. The `check_same_thread=False` option is automatically configured.

### Monitoring

Monitor these metrics in production:
- Connection pool utilization (via database metrics)
- Connection timeout errors
- Query latency
- Stale connection detection (via pool_pre_ping)

### Tuning Guidelines

1. Start with default values and monitor under typical load
2. If you see frequent timeout errors, increase `DB_POOL_SIZE` and/or `DB_MAX_OVERFLOW`
3. If you see "connection reset" or "server closed connection" errors, decrease `DB_POOL_RECYCLE`
4. If connection acquisition is slow but pool not exhausted, check `DB_POOL_TIMEOUT`

### References

- [SQLAlchemy Connection Pooling](https://docs.sqlalchemy.org/en/20/core/pooling.html)
- [PostgreSQL Connection Best Practices](https://www.postgresql.org/docs/current/runtime-config-connection.html)
