import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('incidents', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('incident_number', 50).unique().notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    
    // Patient Information
    table.uuid('patient_id');
    table.string('patient_first_name', 100).notNullable();
    table.string('patient_last_name', 100).notNullable();
    table.date('patient_dob');
    table.integer('patient_age');
    table.string('patient_sex', 1);
    table.integer('patient_weight_lbs');
    
    // Clinical Information
    table.string('chief_complaint', 255);
    table.string('diagnosis', 255);
    table.string('acuity_level', 10);
    table.jsonb('current_vitals');
    
    // Transport Details
    table.string('transport_type', 50).notNullable();
    table.uuid('origin_facility_id').notNullable();
    table.string('origin_facility_name', 255);
    table.string('origin_address', 255);
    table.uuid('destination_facility_id').notNullable();
    table.string('destination_facility_name', 255);
    table.string('destination_address', 255);
    table.timestamp('requested_eta');
    
    // Medical Necessity & Physician Order
    table.string('medical_necessity_reason', 500);
    table.string('physician_order_ref', 50);
    table.string('ordering_physician_name', 255);
    table.string('ordering_physician_credentials', 50);
    table.string('ordering_physician_signature_type', 20);
    table.timestamp('ordering_physician_signature_time');
    table.jsonb('cct_order_details');
    
    // Insurance & Billing
    table.jsonb('insurance_primary');
    table.jsonb('insurance_secondary');
    table.decimal('patient_responsibility', 10, 2);
    table.decimal('estimated_charge', 10, 2);
    
    // Assignment & Status
    table.uuid('assigned_unit_id');
    table.specificType('assigned_crew_ids', 'UUID[]');
    table.string('status', 50).notNullable();
    table.timestamp('status_updated_at');
    
    // Special Needs & Requirements
    table.jsonb('crew_requirements');
    table.text('special_instructions');
    table.jsonb('known_issues');
    table.boolean('repeat_patient').defaultTo(false);
    table.decimal('repeat_patient_score', 3, 1);
    
    // Timestamps (set by MDT app)
    table.timestamp('time_incident_created');
    table.timestamp('time_unit_assigned');
    table.timestamp('time_en_route');
    table.timestamp('time_at_facility');
    table.timestamp('time_transporting');
    table.timestamp('time_arrived_destination');
    table.timestamp('time_completed');
    
    // Tracking & Compliance
    table.boolean('locked').defaultTo(false);
    table.boolean('training_mode').defaultTo(false);
    table.uuid('organization_id').notNullable();
    table.uuid('created_by_user_id');
    
    // Indexes
    table.index(['organization_id', 'created_at']);
    table.index('patient_id');
    table.index('status');
    table.index('assigned_unit_id');
    
    // Foreign Keys
    table.foreign('organization_id').references('organizations.id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('incidents');
}
