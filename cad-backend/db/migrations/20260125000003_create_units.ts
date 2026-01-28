import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('units', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('unit_id_display', 50).unique().notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    
    // Unit Details
    table.string('unit_type', 50).notNullable();
    table.string('unit_name', 100);
    table.uuid('organization_id').notNullable();
    
    // Current Status
    table.string('status', 50).notNullable();
    table.specificType('current_location', 'POINT');
    table.timestamp('location_updated_at');
    
    // Assignment Tracking
    table.uuid('current_incident_id');
    table.uuid('last_incident_id');
    table.integer('incidents_completed_today').defaultTo(0);
    
    // Crew Information
    table.specificType('assigned_crew_ids', 'UUID[]');
    table.uuid('primary_paramedic_id');
    table.specificType('backup_crew_ids', 'UUID[]');
    
    // Capabilities & Credentials
    table.jsonb('capabilities');
    table.jsonb('crew_credentials');
    
    // Scheduling & Fatigue
    table.timestamp('shift_start');
    table.timestamp('shift_end');
    table.decimal('hours_worked_today', 5, 2);
    table.decimal('transport_hours_today', 5, 2);
    table.timestamp('last_break_time');
    table.string('fatigue_risk_level', 20);
    
    // Historical Performance
    table.decimal('on_time_arrival_pct', 5, 2);
    table.integer('average_response_time_min');
    table.integer('total_incidents_completed');
    table.decimal('compliance_audit_score', 5, 2);
    
    // Telnyx Integration
    table.jsonb('crew_phone_numbers');
    
    // Billing & Cost
    table.decimal('base_rate', 10, 2);
    table.jsonb('specialty_rates');
    
    // Maintenance & Status
    table.timestamp('last_maintenance');
    table.timestamp('maintenance_due_date');
    table.decimal('vehicle_fuel_level', 3, 1);
    
    // Indexes
    table.index(['organization_id', 'status']);
    table.index('current_location');
    table.index('on_time_arrival_pct');
    
    // Foreign Keys
    table.foreign('organization_id').references('organizations.id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('units');
}
