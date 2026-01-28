import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('timeline_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('incident_id').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    
    // Event Details
    table.string('event_type', 100).notNullable();
    table.timestamp('event_timestamp').notNullable();
    
    // Actor Information
    table.string('triggered_by', 50);
    table.uuid('triggered_by_user_id');
    table.uuid('triggered_by_unit_id');
    
    // Event Content
    table.jsonb('event_data');
    table.text('event_description');
    
    // Related Records
    table.uuid('unit_id');
    table.uuid('crew_id');
    
    // Compliance & Audit
    table.uuid('organization_id').notNullable();
    table.boolean('is_immutable').defaultTo(false);
    
    // Indexes
    table.index(['incident_id', 'created_at']);
    table.index(['event_type', 'created_at']);
    
    // Foreign Keys
    table.foreign('incident_id').references('incidents.id');
    table.foreign('organization_id').references('organizations.id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('timeline_events');
}
