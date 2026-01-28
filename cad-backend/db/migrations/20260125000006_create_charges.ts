import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('charges', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('incident_id').notNullable().unique();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    
    // Base Charges
    table.decimal('base_ambulance_fee', 10, 2);
    table.decimal('mileage_miles', 8, 2);
    table.decimal('mileage_rate_per_mile', 8, 2);
    table.decimal('mileage_charge', 10, 2);
    
    // Specialty Surcharges
    table.decimal('emt_paramedic_surcharge', 10, 2);
    table.decimal('cct_service_surcharge', 10, 2);
    table.decimal('bariatric_surcharge', 10, 2);
    table.decimal('hems_charge', 10, 2);
    table.decimal('night_surcharge', 10, 2);
    table.decimal('holiday_surcharge', 10, 2);
    table.decimal('mutual_aid_fee', 10, 2);
    
    // Time-Based Charges
    table.integer('transport_duration_minutes');
    table.decimal('hourly_rate', 10, 2);
    table.decimal('time_based_charge', 10, 2);
    
    // Procedure Codes
    table.jsonb('procedures');
    
    // Total Calculation
    table.decimal('subtotal', 10, 2);
    
    // Insurance & Patient Responsibility
    table.jsonb('insurance_primary');
    table.jsonb('insurance_secondary');
    table.decimal('allowed_amount', 10, 2);
    table.decimal('patient_responsibility', 10, 2);
    table.decimal('insurance_payment_expected', 10, 2);
    
    // Telnyx Communication Costs
    table.decimal('telnyx_voice_call_minutes', 10, 2);
    table.decimal('telnyx_voice_call_cost', 10, 2);
    table.integer('telnyx_sms_count');
    table.decimal('telnyx_sms_cost', 10, 2);
    
    // Final Total
    table.decimal('total_charge', 10, 2);
    
    // Claim & Status
    table.string('claim_id', 100);
    table.string('claim_status', 50);
    table.string('billing_status', 50);
    
    table.uuid('organization_id').notNullable();
    table.boolean('locked').defaultTo(false);
    
    // Indexes
    table.index(['organization_id', 'created_at']);
    table.index('claim_status');
    
    // Foreign Keys
    table.foreign('incident_id').references('incidents.id');
    table.foreign('organization_id').references('organizations.id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('charges');
}
