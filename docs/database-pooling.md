# Database Connection Pooling Guide

## Overview

The FusonEMS Quantum platform uses SQLAlchemy connection pooling to efficiently manage database connections across multiple database instances (main, telehealth, fire, and hems). This document outlines the pooling configuration, best practices, and deployment recommendations for various scales.

## Connection Pooling Parameters

### DB_POOL_SIZE
**Default:** `5` (development), `20` (production)

The number of connections to maintain in the pool at all times. This is the base pool size.

- **Small deployments (1-10 users):** `5`
- **Medium deployments (10-100 users):** `10-20`
- **Large deployments (100+ users):** `20-50`
- **High-traffic production:** `50-100`

### DB_MAX_OVERFLOW
**Default:** `10` (development), `40` (production)

The maximum number of connections that can be created beyond the pool_size. Total maximum connections = pool_size + max_overflow.

- **Small deployments:** `10`
- **Medium deployments:** `20-40`
- **Large deployments:** `40-100`
- **High-traffic production:** `100-200`

### DB_POOL_RECYCLE
**Default:** `3600` (1 hour), `1800` (30 minutes for production)

Time in seconds after which a connection is automatically recycled. This prevents stale connections and helps with database server connection limits.

- **Development:** `3600` (1 hour)
- **Production:** `1800` (30 minutes)
- **Managed databases with aggressive timeouts:** `900` (15 minutes)

### DB_POOL_TIMEOUT
**Default:** `30` seconds

The number of seconds to wait before giving up on getting a connection from the pool.

- **Low-latency environments:** `10-20` seconds
- **Standard environments:** `30` seconds
- **High-latency or distributed environments:** `60` seconds

### DB_POOL_PRE_PING
**Default:** `true`

When enabled, the pool will test connections for liveness before using them. This prevents errors from stale connections but adds a small performance overhead.

- **Development:** `true` (recommended)
- **Production:** `true` (recommended for reliability)
- **High-performance tuned environments:** `false` (only if pool_recycle is optimized)

### DB_ECHO_POOL
**Default:** `false`

When enabled, logs pool checkouts/checkins/recycles. Useful for debugging but should be disabled in production.

- **Development/debugging:** `true`
- **Production:** `false`

## Deployment Scale Recommendations

### Small Scale (Development/Testing)
**Use case:** Local development, small staging environments, proof-of-concept

```env
DB_POOL_SIZE=5
DB_MAX_OVERFLOW=10
DB_POOL_RECYCLE=3600
DB_POOL_TIMEOUT=30
DB_POOL_PRE_PING=true
DB_ECHO_POOL=false
```

**Total connections:** Up to 15 per database instance (4 instances = 60 total)

### Medium Scale (Small Production)
**Use case:** 10-100 concurrent users, single application server

```env
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20
DB_POOL_RECYCLE=1800
DB_POOL_TIMEOUT=30
DB_POOL_PRE_PING=true
DB_ECHO_POOL=false
```

**Total connections:** Up to 30 per database instance (4 instances = 120 total)

### Large Scale (Standard Production)
**Use case:** 100-1000 concurrent users, 2-4 application servers

```env
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=40
DB_POOL_RECYCLE=1800
DB_POOL_TIMEOUT=30
DB_POOL_PRE_PING=true
DB_ECHO_POOL=false
```

**Total connections per server:** Up to 60 per database instance (4 instances = 240 total)
**Multiple servers:** Multiply by number of application servers

### Enterprise Scale (High-Traffic Production)
**Use case:** 1000+ concurrent users, 5+ application servers, high transaction volume

```env
DB_POOL_SIZE=30
DB_MAX_OVERFLOW=70
DB_POOL_RECYCLE=900
DB_POOL_TIMEOUT=20
DB_POOL_PRE_PING=true
DB_ECHO_POOL=false
```

**Total connections per server:** Up to 100 per database instance (4 instances = 400 total)
**Multiple servers:** Calculate total: servers × instances × (pool_size + max_overflow)

## Database Server Configuration

Ensure your database server's `max_connections` setting can accommodate all application servers:

```
max_connections = (num_app_servers × 4 database_instances × (DB_POOL_SIZE + DB_MAX_OVERFLOW)) + buffer
```

### PostgreSQL Recommendations
- **Small/Medium:** `max_connections = 100`
- **Large:** `max_connections = 200-300`
- **Enterprise:** `max_connections = 400-500`

Always add a 20-30% buffer for administrative connections and other services.

## Monitoring and Tuning

### Key Metrics to Monitor

1. **Connection Pool Exhaustion**
   - Monitor for `QueuePool limit exceeded` errors
   - Indicates need to increase pool_size or max_overflow

2. **Connection Wait Times**
   - High wait times indicate insufficient pool size
   - May also indicate slow queries that hold connections too long

3. **Idle Connections**
   - Too many idle connections waste resources
   - Reduce pool_size if consistently underutilized

4. **Connection Churn**
   - Frequent connection creation/destruction
   - Increase pool_size if overflow connections are frequently used

### Tuning Guidelines

1. **Start Conservative:** Begin with default values and monitor
2. **Scale Gradually:** Increase by 20-50% increments based on metrics
3. **Balance Resources:** More connections = more memory and database load
4. **Consider Query Performance:** Optimize slow queries before scaling pools
5. **Test Under Load:** Use realistic load testing before production deployment

## Multi-Database Instance Considerations

The FusonEMS platform uses 4 database instances:
- Main database (primary EMS operations)
- Telehealth database
- Fire database
- HEMS database

Each instance has its own connection pool with the same configuration. Consider:

1. **Total Connection Budget:** Each pool uses memory and database connections
2. **Uneven Load:** Some databases may need different pool sizes
3. **Connection Limits:** Database server must support 4× the connections

## Production Deployment Checklist

- [ ] Set `ENV=production` to enforce runtime validation
- [ ] Configure appropriate pool_size for expected load
- [ ] Set pool_recycle to 30 minutes or less
- [ ] Enable pool_pre_ping for reliability
- [ ] Disable echo_pool to reduce logging overhead
- [ ] Verify database server max_connections is sufficient
- [ ] Set up monitoring for connection pool metrics
- [ ] Load test to validate configuration
- [ ] Document configuration decisions and expected capacity

## Troubleshooting

### "QueuePool limit of size X overflow Y reached"
**Cause:** Pool exhaustion - all connections in use
**Solutions:**
- Increase `DB_MAX_OVERFLOW`
- Optimize slow queries holding connections
- Check for connection leaks (not properly closed)
- Scale horizontally with more application servers

### "TimeoutError: QueuePool limit exceeded"
**Cause:** Could not get connection within `DB_POOL_TIMEOUT`
**Solutions:**
- Increase `DB_POOL_TIMEOUT`
- Increase `DB_POOL_SIZE` or `DB_MAX_OVERFLOW`
- Investigate blocking/slow operations

### Stale Connection Errors
**Cause:** Database server closed connections
**Solutions:**
- Reduce `DB_POOL_RECYCLE` to refresh connections more frequently
- Ensure `DB_POOL_PRE_PING=true`
- Check database server timeout settings

### High Memory Usage
**Cause:** Too many connections or connection leaks
**Solutions:**
- Reduce `DB_POOL_SIZE` and `DB_MAX_OVERFLOW`
- Check for proper session cleanup in code
- Monitor pool statistics with `DB_ECHO_POOL=true` temporarily

## References

- [SQLAlchemy Connection Pooling Documentation](https://docs.sqlalchemy.org/en/20/core/pooling.html)
- [PostgreSQL Connection Management](https://www.postgresql.org/docs/current/runtime-config-connection.html)
- [Database Connection Pool Sizing](https://github.com/brettwooldridge/HikariCP/wiki/About-Pool-Sizing)

## Configuration Files

Connection pooling settings are configured in:
- `backend/core/config.py` - Environment variable definitions and defaults
- `backend/core/database.py` - SQLAlchemy engine configuration
- `infrastructure/do-app.yaml` - DigitalOcean App Platform deployment
- `docker-compose.yml` - Local Docker development
- `.env.template` - Environment variable template
- `backend/.env.example` - Backend environment example
