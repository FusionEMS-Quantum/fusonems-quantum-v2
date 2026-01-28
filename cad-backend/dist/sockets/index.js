"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSocketHandlers = setupSocketHandlers;
const database_1 = require("../config/database");
function setupSocketHandlers(io) {
    io.on('connection', (socket) => {
        console.log(`Socket connected: ${socket.id}`);
        socket.on('unit:location', async (data) => {
            try {
                await (0, database_1.db)('units')
                    .where({ id: data.unitId })
                    .update({
                    current_location: database_1.db.raw(`ST_SetSRID(ST_MakePoint(?, ?), 4326)`, [data.location.coordinates[0], data.location.coordinates[1]]),
                    heading: data.heading,
                    speed: data.speed,
                    updated_at: database_1.db.fn.now(),
                });
                io.emit('unit:location:updated', {
                    unitId: data.unitId,
                    location: data.location,
                    heading: data.heading,
                    speed: data.speed,
                });
            }
            catch (error) {
                console.error('Error updating unit location:', error);
            }
        });
        socket.on('unit:status', async (data) => {
            try {
                await (0, database_1.db)('units')
                    .where({ id: data.unitId })
                    .update({
                    status: data.status,
                    current_incident_id: data.incidentId || null,
                    updated_at: database_1.db.fn.now(),
                });
                await (0, database_1.db)('timeline_events').insert({
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
            }
            catch (error) {
                console.error('Error updating unit status:', error);
            }
        });
        socket.on('incident:status', async (data) => {
            try {
                await (0, database_1.db)('incidents')
                    .where({ id: data.incidentId })
                    .update({
                    status: data.status,
                    updated_at: database_1.db.fn.now(),
                });
                await (0, database_1.db)('timeline_events').insert({
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
            }
            catch (error) {
                console.error('Error updating incident status:', error);
            }
        });
        socket.on('incident:timestamp', async (data) => {
            try {
                const updateData = {
                    [data.field]: data.timestamp,
                    updated_at: database_1.db.fn.now(),
                };
                if (data.location) {
                    updateData[`${data.field}_location`] = database_1.db.raw(`ST_SetSRID(ST_MakePoint(?, ?), 4326)`, [
                        data.location.coordinates[0],
                        data.location.coordinates[1]
                    ]);
                }
                await (0, database_1.db)('incidents')
                    .where({ id: data.incidentId })
                    .update(updateData);
                await (0, database_1.db)('timeline_events').insert({
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
            }
            catch (error) {
                console.error('Error recording timestamp:', error);
            }
        });
        socket.on('incident:created', (data) => {
            io.emit('incident:new', data);
        });
        socket.on('assignment:sent', (data) => {
            io.to(`unit:${data.unitId}`).emit('assignment:received', data);
        });
        socket.on('join:unit', (unitId) => {
            socket.join(`unit:${unitId}`);
        });
        socket.on('join:incident', (incidentId) => {
            socket.join(`incident:${incidentId}`);
        });
        socket.on('leave:unit', (unitId) => {
            socket.leave(`unit:${unitId}`);
        });
        socket.on('leave:incident', (incidentId) => {
            socket.leave(`incident:${incidentId}`);
        });
        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.id}`);
        });
    });
}
//# sourceMappingURL=index.js.map