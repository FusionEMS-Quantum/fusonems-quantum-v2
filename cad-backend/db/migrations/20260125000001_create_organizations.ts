import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('organizations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    
    // Organization Details
    table.string('name', 255).unique().notNullable();
    table.string('organization_type', 50);
    table.string('timezone', 50).defaultTo('America/New_York');
    
    // Configuration
    table.time('quiet_hours_start');
    table.time('quiet_hours_end');
    table.boolean('suppress_alerts_quiet_hours').defaultTo(true);
    table.boolean('training_mode').defaultTo(false);
    
    // NEMSIS Compliance
    table.string('nemsis_version', 20).defaultTo('3.5');
    
    // Integration API Keys (encrypted)
    table.string('telnyx_api_key_encrypted', 500);
    table.string('metriport_api_key_encrypted', 500);
    table.string('transportlink_api_key_encrypted', 500);
    
    // Feature Flags
    table.boolean('enable_hems').defaultTo(true);
    table.boolean('enable_cct').defaultTo(true);
    table.boolean('enable_bariatric').defaultTo(true);
    table.boolean('enable_ai_recommendations').defaultTo(true);
    table.boolean('enable_repeat_patient_detection').defaultTo(true);
    
    // Billing Configuration
    table.decimal('base_ambulance_rate', 10, 2).defaultTo(450);
    table.decimal('mileage_rate', 8, 2).defaultTo(12);
    table.decimal('paramedic_surcharge', 10, 2).defaultTo(75);
    table.decimal('cct_surcharge', 10, 2).defaultTo(200);
    table.decimal('bariatric_surcharge', 10, 2).defaultTo(150);
    table.decimal('hems_charge', 10, 2).defaultTo(2500);
    
    // Performance Thresholds
    table.integer('escalation_unassigned_minutes').defaultTo(30);
    table.integer('escalation_at_facility_minutes').defaultTo(45);
    
    table.boolean('active').defaultTo(true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('organizations');
}
