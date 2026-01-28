import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('repeat_patient_cache', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('patient_id').unique().notNullable();
    table.string('patient_name', 255);
    
    table.integer('transport_count_12m');
    table.integer('transport_count_6m');
    table.integer('transport_count_3m');
    table.date('recent_transport_date');
    
    table.jsonb('primary_diagnoses');
    table.jsonb('previous_transport_origins');
    table.jsonb('previous_transport_destinations');
    table.jsonb('known_behavioral_issues');
    table.jsonb('known_medical_issues');
    table.jsonb('known_access_issues');
    table.jsonb('crew_preferences');
    
    table.boolean('needs_case_management').defaultTo(false);
    table.date('last_case_management_referral');
    table.timestamp('last_updated').notNullable().defaultTo(knex.fn.now());
    table.uuid('last_transport_incident_id');
    table.uuid('organization_id').notNullable();
    
    table.index('patient_id');
    table.index('organization_id');
    table.foreign('organization_id').references('organizations.id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('repeat_patient_cache');
}
