import { Request, Response } from 'express';
import { db } from '../config/database';
import { StatusUpdateRequest, AcknowledgeRequest } from '../types';

export class TimelineController {
  async getTimeline(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ error: 'Incident ID is required' });
        return;
      }

      // Verify incident exists
      const incident = await db('incidents')
        .where({ id })
        .first();

      if (!incident) {
        res.status(404).json({ error: 'Incident not found' });
        return;
      }

      // Get timeline events
      const events = await db('timeline_events')
        .where({ incident_id: id })
        .orderBy('event_timestamp', 'asc')
        .select('*');

      res.json({
        incident_id: id,
        incident_number: incident.incident_number,
        events,
        count: events.length,
      });
    } catch (error) {
      console.error('Error fetching timeline:', error);
      res.status(500).json({ error: 'Failed to fetch timeline', message: (error as Error).message });
    }
  }

  async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data: StatusUpdateRequest = req.body;

      if (!id) {
        res.status(400).json({ error: 'Incident ID is required' });
        return;
      }

      if (!data.status) {
        res.status(400).json({ error: 'Status is required' });
        return;
      }

      // Verify incident exists and is not locked
      const incident = await db('incidents')
        .where({ id })
        .first();

      if (!incident) {
        res.status(404).json({ error: 'Incident not found' });
        return;
      }

      if (incident.locked) {
        res.status(403).json({ error: 'Incident is locked and cannot be modified' });
        return;
      }

      // Validate status transition
      const validStatuses = [
        'pending',
        'assigned',
        'acknowledged',
        'en_route',
        'at_facility',
        'transporting',
        'arrived_destination',
        'completed',
        'cancelled',
      ];

      if (!validStatuses.includes(data.status)) {
        res.status(400).json({ error: 'Invalid status', valid_statuses: validStatuses });
        return;
      }

      // Prepare update data
      const updateData: any = {
        status: data.status,
        status_updated_at: db.fn.now(),
        updated_at: db.fn.now(),
      };

      // Set timestamp based on status
      switch (data.status) {
        case 'en_route':
          updateData.time_en_route = db.fn.now();
          break;
        case 'at_facility':
          updateData.time_at_facility = db.fn.now();
          break;
        case 'transporting':
          updateData.time_transporting = db.fn.now();
          break;
        case 'arrived_destination':
          updateData.time_arrived_destination = db.fn.now();
          break;
        case 'completed':
          updateData.time_completed = db.fn.now();
          updateData.locked = true;
          break;
      }

      // Update incident
      const [updated] = await db('incidents')
        .where({ id })
        .update(updateData)
        .returning('*');

      // Create timeline event
      await db('timeline_events').insert({
        incident_id: id,
        event_type: `status_${data.status}`,
        event_timestamp: db.fn.now(),
        triggered_by: data.triggered_by_unit_id ? 'unit' : 'user',
        triggered_by_user_id: data.triggered_by_user_id,
        triggered_by_unit_id: data.triggered_by_unit_id,
        event_data: data.event_data ? JSON.stringify(data.event_data) : null,
        event_description: `Status changed to ${data.status}`,
        organization_id: incident.organization_id,
      });

      // Update unit status if applicable
      if (incident.assigned_unit_id) {
        const unitStatusMap: Record<string, string> = {
          assigned: 'dispatched',
          acknowledged: 'en_route_to_origin',
          en_route: 'en_route_to_origin',
          at_facility: 'at_origin',
          transporting: 'transporting',
          arrived_destination: 'at_destination',
          completed: 'available',
          cancelled: 'available',
        };

        if (unitStatusMap[data.status]) {
          await db('units')
            .where({ id: incident.assigned_unit_id })
            .update({
              status: unitStatusMap[data.status],
              updated_at: db.fn.now(),
            });
        }
      }

      res.json({
        incident: updated,
        message: `Status updated to ${data.status}`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      res.status(500).json({ error: 'Failed to update status', message: (error as Error).message });
    }
  }

  async acknowledge(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data: AcknowledgeRequest = req.body;

      if (!id) {
        res.status(400).json({ error: 'Incident ID is required' });
        return;
      }

      if (!data.unit_id) {
        res.status(400).json({ error: 'Unit ID is required' });
        return;
      }

      // Verify incident exists
      const incident = await db('incidents')
        .where({ id })
        .first();

      if (!incident) {
        res.status(404).json({ error: 'Incident not found' });
        return;
      }

      if (incident.locked) {
        res.status(403).json({ error: 'Incident is locked' });
        return;
      }

      // Verify unit is assigned to this incident
      if (incident.assigned_unit_id !== data.unit_id) {
        res.status(400).json({ error: 'Unit is not assigned to this incident' });
        return;
      }

      // Update incident status to acknowledged
      const [updated] = await db('incidents')
        .where({ id })
        .update({
          status: 'acknowledged',
          status_updated_at: db.fn.now(),
          updated_at: db.fn.now(),
        })
        .returning('*');

      // Create timeline event
      await db('timeline_events').insert({
        incident_id: id,
        event_type: 'incident_acknowledged',
        event_timestamp: db.fn.now(),
        triggered_by: 'unit',
        triggered_by_user_id: data.acknowledged_by_user_id,
        unit_id: data.unit_id,
        event_data: data.estimated_eta_minutes
          ? JSON.stringify({ estimated_eta_minutes: data.estimated_eta_minutes })
          : null,
        event_description: `Incident acknowledged by unit`,
        organization_id: incident.organization_id,
      });

      // Update unit status
      await db('units')
        .where({ id: data.unit_id })
        .update({
          status: 'en_route_to_origin',
          updated_at: db.fn.now(),
        });

      res.json({
        incident: updated,
        message: 'Incident acknowledged successfully',
        estimated_eta_minutes: data.estimated_eta_minutes,
      });
    } catch (error) {
      console.error('Error acknowledging incident:', error);
      res.status(500).json({ error: 'Failed to acknowledge incident', message: (error as Error).message });
    }
  }
}
