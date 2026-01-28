import { Server, Socket } from 'socket.io';
import { db } from '../config/database';
import { Point, UnitStatus, IncidentStatus } from '../types';
import { config } from '../config';

export function setupSocketHandlers(io: Server) {
  // Middleware for authentication
  io.use((socket, next) => {
    const auth = socket.handshake.auth;
    const token = auth?.token;
    
    // Allow connections with valid token or from FastAPI bridge
    if (token === process.env.CAD_BACKEND_AUTH_TOKEN || token === config.jwt.secret) {
      socket.data.authenticated = true;
      socket.data.source = token === process.env.CAD_BACKEND_AUTH_TOKEN ? 'fastapi' : 'client';
      console.log(`✓ Socket authenticated: ${socket.id} (source: ${socket.data.source})`);
      next();
    } else if (!token) {
      // Allow unauthenticated connections but mark them
      socket.data.authenticated = false;
      socket.data.source = 'unauthenticated';
      console.log(`⚠ Unauthenticated socket connected: ${socket.id}`);
      next();
    } else {
      console.error(`✗ Socket authentication failed: ${socket.id}`);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`Socket connected: ${socket.id} (${socket.data.source})`);

    // FastAPI bridge authentication event
    socket.on('fastapi:authenticate', (data: { token: string }) => {
      if (data.token === process.env.CAD_BACKEND_AUTH_TOKEN) {
        socket.data.authenticated = true;
        socket.data.source = 'fastapi';
        socket.join('fastapi-bridge');
        console.log(`✓ FastAPI bridge authenticated: ${socket.id}`);
        socket.emit('authenticated', { success: true, source: 'fastapi' });
      } else {
        console.error(`✗ FastAPI bridge authentication failed: ${socket.id}`);
        socket.emit('authenticated', { success: false, error: 'Invalid token' });
      }
    });

    socket.on('unit:location', async (data: { unitId: string; location: Point; heading?: number; speed?: number }) => {
      try {
        await db('units')
          .where({ id: data.unitId })
          .update({
            current_location: db.raw(`ST_SetSRID(ST_MakePoint(?, ?), 4326)`, [data.location.coordinates[0], data.location.coordinates[1]]),
            heading: data.heading,
            speed: data.speed,
            updated_at: db.fn.now(),
          });

        io.emit('unit:location:updated', {
          unitId: data.unitId,
          location: data.location,
          heading: data.heading,
          speed: data.speed,
        });
      } catch (error) {
        console.error('Error updating unit location:', error);
      }
    });

    socket.on('unit:status', async (data: { unitId: string; status: UnitStatus; incidentId?: string }) => {
      try {
        await db('units')
          .where({ id: data.unitId })
          .update({
            status: data.status,
            current_incident_id: data.incidentId || null,
            updated_at: db.fn.now(),
          });

        await db('timeline_events').insert({
          incident_id: data.incidentId,
          event_type: 'unit_status_changed',
          event_data: {
            unit_id: data.unitId,
            new_status: data.status,
            timestamp: new Date().toISOString(),
          },
          created_by: 'system',
        });

        io.emit('unit:status:updated', {
          unitId: data.unitId,
          status: data.status,
          incidentId: data.incidentId,
        });
      } catch (error) {
        console.error('Error updating unit status:', error);
      }
    });

    socket.on('incident:status', async (data: { incidentId: string; status: IncidentStatus; userId: string }) => {
      try {
        await db('incidents')
          .where({ id: data.incidentId })
          .update({
            status: data.status,
            updated_at: db.fn.now(),
          });

        await db('timeline_events').insert({
          incident_id: data.incidentId,
          event_type: 'status_change',
          event_data: {
            new_status: data.status,
            timestamp: new Date().toISOString(),
          },
          created_by: data.userId,
        });

        io.emit('incident:status:updated', {
          incidentId: data.incidentId,
          status: data.status,
        });
      } catch (error) {
        console.error('Error updating incident status:', error);
      }
    });

    socket.on('incident:timestamp', async (data: { 
      incidentId: string; 
      field: string; 
      timestamp: string; 
      location?: Point;
      source: 'manual' | 'auto';
    }) => {
      try {
        const updateData: any = {
          [data.field]: data.timestamp,
          updated_at: db.fn.now(),
        };

        if (data.location) {
          updateData[`${data.field}_location`] = db.raw(`ST_SetSRID(ST_MakePoint(?, ?), 4326)`, [
            data.location.coordinates[0],
            data.location.coordinates[1]
          ]);
        }

        await db('incidents')
          .where({ id: data.incidentId })
          .update(updateData);

        await db('timeline_events').insert({
          incident_id: data.incidentId,
          event_type: 'timestamp_recorded',
          event_data: {
            field: data.field,
            timestamp: data.timestamp,
            location: data.location,
            source: data.source,
          },
          created_by: data.source === 'auto' ? 'system' : 'crew',
        });

        io.emit('incident:timestamp:updated', {
          incidentId: data.incidentId,
          field: data.field,
          timestamp: data.timestamp,
          location: data.location,
        });
      } catch (error) {
        console.error('Error recording timestamp:', error);
      }
    });

    socket.on('incident:created', (data) => {
      io.emit('incident:new', data);
    });

    socket.on('assignment:sent', (data) => {
      io.to(`unit:${data.unitId}`).emit('assignment:received', data);
    });

    socket.on('join:unit', (unitId: string) => {
      socket.join(`unit:${unitId}`);
    });

    socket.on('join:incident', (incidentId: string) => {
      socket.join(`incident:${incidentId}`);
    });

    socket.on('leave:unit', (unitId: string) => {
      socket.leave(`unit:${unitId}`);
    });

    socket.on('leave:incident', (incidentId: string) => {
      socket.leave(`incident:${incidentId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}
