import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('crews', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    
    // Personal Info
    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();
    table.string('email', 255).unique();
    table.string('phone_number', 20);
    
    // Credentials & Certifications
    table.string('emt_level', 50);
    table.jsonb('certifications');
    table.jsonb('certification_expiry');
    
    // Scope of Practice
    table.boolean('can_do_cct').defaultTo(false);
    table.boolean('can_handle_ventilator').defaultTo(false);
    table.boolean('can_handle_bariatric').defaultTo(false);
    table.specificType('specialty_skills', 'TEXT[]');
    
    // Current Assignment
    table.uuid('assigned_unit_id');
    table.uuid('current_incident_id');
    
    // Shift & Fatigue
    table.timestamp('current_shift_start');
    table.timestamp('current_shift_end');
    table.decimal('hours_worked_today', 5, 2);
    table.decimal('transport_hours_today', 5, 2);
    table.timestamp('last_break_time');
    
    // Performance & History
    table.bigInteger('total_incidents').defaultTo(0);
    table.decimal('on_time_rate', 5, 2);
    table.integer('compliance_violations').defaultTo(0);
    table.jsonb('known_issues');
    
    // Organization
    table.uuid('organization_id').notNullable();
    
    // Indexes
    table.index(['organization_id', 'emt_level']);
    
    // Foreign Keys
    table.foreign('organization_id').references('organizations.id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('crews');
}
