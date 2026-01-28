"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = __importDefault(require("./auth"));
const incidents_1 = __importDefault(require("./incidents"));
const assignments_1 = __importDefault(require("./assignments"));
const units_1 = __importDefault(require("./units"));
const timeline_1 = __importDefault(require("./timeline"));
const billing_1 = __importDefault(require("./billing"));
const router = (0, express_1.Router)();
// Mount all route modules
router.use('/auth', auth_1.default);
router.use('/incidents', incidents_1.default);
router.use('/assignments', assignments_1.default);
router.use('/units', units_1.default);
router.use('/timeline', timeline_1.default);
router.use('/billing', billing_1.default);
// API info endpoint
router.get('/', (req, res) => {
    res.json({
        name: 'CAD Backend API',
        version: '1.0.0',
        description: 'Interfacility CAD System - REST API',
        endpoints: {
            incidents: {
                create: 'POST /api/v1/incidents',
                getById: 'GET /api/v1/incidents/:id',
                update: 'PUT /api/v1/incidents/:id',
                complete: 'POST /api/v1/incidents/:id/complete',
            },
            assignments: {
                recommend: 'POST /api/v1/assignments/recommend',
                assign: 'POST /api/v1/assignments/assign',
            },
            units: {
                getAvailable: 'GET /api/v1/units',
            },
            timeline: {
                getTimeline: 'GET /api/v1/timeline/:id/timeline',
                updateStatus: 'POST /api/v1/timeline/:id/status',
                acknowledge: 'POST /api/v1/timeline/:id/acknowledge',
            },
            billing: {
                estimateCharges: 'GET /api/v1/billing/:id/charges/estimate',
                finalizeCharges: 'POST /api/v1/billing/:id/charges/finalize',
            },
        },
    });
});
exports.default = router;
//# sourceMappingURL=index.js.map