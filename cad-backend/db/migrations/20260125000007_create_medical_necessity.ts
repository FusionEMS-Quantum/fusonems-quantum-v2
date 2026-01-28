import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('medical_necessity_evidence', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('incident_id').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    
    table.string('transport_type', 50).notNullable();
    
    // IFT Evidence
    table.text('ift_justification');
    
    // CCT Evidence
    table.string('cct_physician_order_ref', 50);
    table.string('cct_physician_name', 255);
    table.string('cct_physician_credentials', 50);
    table.jsonb('cct_hemodynamic_issues');
    table.jsonb('cct_interventions');
    table.jsonb('cct_complex_diagnosis');
    
    // Bariatric Evidence
    table.integer('bariatric_weight_lbs');
    table.text('bariatric_mobility_issues');
    table.jsonb('bariatric_equipment_required');
    
    // HEMS Evidence
    table.decimal('hems_distance_miles', 8, 2);
    table.integer('hems_ground_eta_minutes');
    table.integer('hems_air_eta_minutes');
    table.integer('hems_time_saved_minutes');
    table.text('hems_acuity_justification');
    table.jsonb('hems_weather_conditions');
    table.boolean('hems_weather_suitable');
    table.string('hems_medical_justification_code', 50);
    
    table.text('justification_narrative');
    table.uuid('organization_id').notNullable();
    table.boolean('is_approved').defaultTo(true);
    
    table.index('incident_id');
    table.foreign('incident_id').references('incidents.id');
    table.foreign('organization_id').references('organizations.id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('medical_necessity_evidence');
}
