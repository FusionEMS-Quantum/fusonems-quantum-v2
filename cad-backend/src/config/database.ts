import knex, { Knex } from 'knex';
import { config } from '../config';

const knexConfig: Knex.Config = {
  client: 'postgresql',
  connection: config.database.url,
  pool: config.database.pool,
  migrations: {
    directory: './db/migrations',
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: './db/seeds',
  },
};

export const db = knex(knexConfig);

export default knexConfig;
