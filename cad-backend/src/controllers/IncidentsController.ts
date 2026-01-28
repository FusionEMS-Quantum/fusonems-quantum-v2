import { Request, Response } from 'express';
import { db } from '../config/database';
import { CreateIncidentRequest, UpdateIncidentRequest, Incident } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class IncidentsController {
  async create(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateIncidentRequest = req.body;

      // Validate required fields
      if (!data.patient_first_name || !data.patient_last_name) {
        res.status(400).json({ error: 'Patient name is required' });
        return;
      }

      if (!data.transport_type || !data.origin_facility_id || !data.destination_facility_id) {
        res.status(400).json({ error: 'Transport type, origin, and destination are required' });
        return;
      }

      if (!data.organization_id) {
        res.status(400).json({ error: 'Organization ID is required' });
        return;
      }

      // Generate incident number
      const incidentNumber = await this.generateIncidentNumber(data.organization_id);

      // Create incident
      const [incident] = await db('incidents')
        .insert({
          incident_number: incidentNumber,
          patient_first_name: data.patient_first_name,
          patient_last_name: data.patient_last_name,
          patient_dob: data.patient_dob,
          patient_age: data.patient_age,
          patient_sex: data.patient_sex,
          patient_weight_lbs: data.patient_weight_lbs,
          chief_complaint: data.chief_complaint,
          diagnosis: data.diagnosis,
          acuity_level: data.acuity_level,
          current_vitals: data.current_vitals ? JSON.stringify(data.current_vitals) : null,
          transport_type: data.transport_type,
          origin_facility_id: data.origin_facility_id,
          origin_facility_name: data.origin_facility_name,
          origin_address: data.origin_address,
          destination_facility_id: data.destination_facility_id,
          destination_facility_name: data.destination_facility_name,
          destination_address: data.destination_address,
          requested_eta: data.requested_eta,
          medical_necessity_reason: data.medical_necessity_reason,
          physician_order_ref: data.physician_order_ref,
          ordering_physician_name: data.ordering_physician_name,
          ordering_physician_credentials: data.ordering_physician_credentials,
          insurance_primary: data.insurance_primary ? JSON.stringify(data.insurance_primary) : null,
          insurance_secondary: data.insurance_secondary ? JSON.stringify(data.insurance_secondary) : null,
          crew_requirements: data.crew_requirements ? JSON.stringify(data.crew_requirements) : null,
          special_instructions: data.special_instructions,
          status: 'pending',
          organization_id: data.organization_id,
          created_by_user_id: data.created_by_user_id,
          time_incident_created: db.fn.now(),
        })
        .returning('*');

      // Create timeline event
      await db('timeline_events').insert({
        incident_id: incident.id,
        event_type: 'incident_created',
        event_timestamp: db.fn.now(),
        triggered_by: 'system',
        triggered_by_user_id: data.created_by_user_id,
        event_description: 'Incident created',
        organization_id: data.organization_id,
      });

      res.status(201).json(incident);
    } catch (error) {
      console.error('Error creating incident:', error);
      res.status(500).json({ error: 'Failed to create incident', message: (error as Error).message });
    }
  }

  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { status, organization_id } = req.query;

      let query = db('incidents')
        .select('*')
        .orderBy('created_at', 'desc');

      if (status) {
        query = query.where({ status: status as string });
      }

      if (organization_id) {
        query = query.where({ organization_id: organization_id as string });
      }

      const incidents = await query;

      res.json(incidents);
    } catch (error) {
      console.error('Error fetching incidents:', error);
      res.status(500).json({ error: 'Failed to fetch incidents', message: (error as Error).message });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ error: 'Incident ID is required' });
        return;
      }

      const incident = await db('incidents')
        .where({ id })
        .first();

      if (!incident) {
        res.status(404).json({ error: 'Incident not found' });
        return;
      }

      res.json(incident);
    } catch (error) {
      console.error('Error fetching incident:', error);
      res.status(500).json({ error: 'Failed to fetch incident', message: (error as Error).message });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data: UpdateIncidentRequest = req.body;

      if (!id) {
        res.status(400).json({ error: 'Incident ID is required' });
        return;
      }

      // Check if incident exists and is not locked
      const existing = await db('incidents')
        .where({ id })
        .first();

      if (!existing) {
        res.status(404).json({ error: 'Incident not found' });
        return;
      }

      if (existing.locked) {
        res.status(403).json({ error: 'Incident is locked and cannot be modified' });
        return;
      }

      // Prepare update data
      const updateData: any = {
        updated_at: db.fn.now(),
      };

      // Add only provided fields
      if (data.patient_first_name !== undefined) updateData.patient_first_name = data.patient_first_name;
      if (data.patient_last_name !== undefined) updateData.patient_last_name = data.patient_last_name;
      if (data.patient_dob !== undefined) updateData.patient_dob = data.patient_dob;
      if (data.patient_age !== undefined) updateData.patient_age = data.patient_age;
      if (data.patient_sex !== undefined) updateData.patient_sex = data.patient_sex;
      if (data.patient_weight_lbs !== undefined) updateData.patient_weight_lbs = data.patient_weight_lbs;
      if (data.chief_complaint !== undefined) updateData.chief_complaint = data.chief_complaint;
      if (data.diagnosis !== undefined) updateData.diagnosis = data.diagnosis;
      if (data.acuity_level !== undefined) updateData.acuity_level = data.acuity_level;
      if (data.current_vitals !== undefined) updateData.current_vitals = JSON.stringify(data.current_vitals);
      if (data.transport_type !== undefined) updateData.transport_type = data.transport_type;
      if (data.origin_facility_id !== undefined) updateData.origin_facility_id = data.origin_facility_id;
      if (data.origin_facility_name !== undefined) updateData.origin_facility_name = data.origin_facility_name;
      if (data.origin_address !== undefined) updateData.origin_address = data.origin_address;
      if (data.destination_facility_id !== undefined) updateData.destination_facility_id = data.destination_facility_id;
      if (data.destination_facility_name !== undefined) updateData.destination_facility_name = data.destination_facility_name;
      if (data.destination_address !== undefined) updateData.destination_address = data.destination_address;
      if (data.requested_eta !== undefined) updateData.requested_eta = data.requested_eta;
      if (data.medical_necessity_reason !== undefined) updateData.medical_necessity_reason = data.medical_necessity_reason;
      if (data.physician_order_ref !== undefined) updateData.physician_order_ref = data.physician_order_ref;
      if (data.ordering_physician_name !== undefined) updateData.ordering_physician_name = data.ordering_physician_name;
      if (data.ordering_physician_credentials !== undefined) updateData.ordering_physician_credentials = data.ordering_physician_credentials;
      if (data.insurance_primary !== undefined) updateData.insurance_primary = JSON.stringify(data.insurance_primary);
      if (data.insurance_secondary !== undefined) updateData.insurance_secondary = JSON.stringify(data.insurance_secondary);
      if (data.crew_requirements !== undefined) updateData.crew_requirements = JSON.stringify(data.crew_requirements);
      if (data.special_instructions !== undefined) updateData.special_instructions = data.special_instructions;
      if (data.status !== undefined) {
        updateData.status = data.status;
        updateData.status_updated_at = db.fn.now();
      }

      // Update incident
      const [updated] = await db('incidents')
        .where({ id })
        .update(updateData)
        .returning('*');

      // Create timeline event
      await db('timeline_events').insert({
        incident_id: id,
        event_type: 'incident_updated',
        event_timestamp: db.fn.now(),
        triggered_by: 'user',
        event_description: 'Incident updated',
        organization_id: existing.organization_id,
      });

      res.json(updated);
    } catch (error) {
      console.error('Error updating incident:', error);
      res.status(500).json({ error: 'Failed to update incident', message: (error as Error).message });
    }
  }

  async complete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ error: 'Incident ID is required' });
        return;
      }

      // Check if incident exists
      const existing = await db('incidents')
        .where({ id })
        .first();

      if (!existing) {
        res.status(404).json({ error: 'Incident not found' });
        return;
      }

      if (existing.locked) {
        res.status(403).json({ error: 'Incident is already locked' });
        return;
      }

      // Mark as completed and lock
      const [updated] = await db('incidents')
        .where({ id })
        .update({
          status: 'completed',
          status_updated_at: db.fn.now(),
          time_completed: db.fn.now(),
          locked: true,
          updated_at: db.fn.now(),
        })
        .returning('*');

      // Create timeline event
      await db('timeline_events').insert({
        incident_id: id,
        event_type: 'incident_completed',
        event_timestamp: db.fn.now(),
        triggered_by: 'system',
        event_description: 'Incident marked as completed and locked',
        organization_id: existing.organization_id,
        is_immutable: true,
      });

      // Update assigned unit if exists
      if (existing.assigned_unit_id) {
        await db('units')
          .where({ id: existing.assigned_unit_id })
          .update({
            status: 'available',
            current_incident_id: null,
            last_incident_id: id,
            incidents_completed_today: db.raw('incidents_completed_today + 1'),
            total_incidents_completed: db.raw('total_incidents_completed + 1'),
            updated_at: db.fn.now(),
          });
      }

      res.json(updated);
    } catch (error) {
      console.error('Error completing incident:', error);
      res.status(500).json({ error: 'Failed to complete incident', message: (error as Error).message });
    }
  }

  private async generateIncidentNumber(organizationId: string): Promise<string> {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    // Get count of incidents today for this organization
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

    const count = await db('incidents')
      .where({ organization_id: organizationId })
      .whereBetween('created_at', [startOfDay, endOfDay])
      .count('id as count')
      .first();

    const sequence = ((count?.count as number || 0) + 1).toString().padStart(4, '0');

    return `INC-${year}${month}${day}-${sequence}`;
  }
}
