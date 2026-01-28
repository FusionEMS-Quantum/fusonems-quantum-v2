"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const knex_1 = __importDefault(require("knex"));
const config_1 = require("../config");
const knexConfig = {
    client: 'postgresql',
    connection: config_1.config.database.url,
    pool: config_1.config.database.pool,
    migrations: {
        directory: './db/migrations',
        tableName: 'knex_migrations',
    },
    seeds: {
        directory: './db/seeds',
    },
};
exports.db = (0, knex_1.default)(knexConfig);
exports.default = knexConfig;
//# sourceMappingURL=database.js.map