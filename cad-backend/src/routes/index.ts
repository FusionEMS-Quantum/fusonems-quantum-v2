import { Router } from 'express';
import authRouter from './auth';
import incidentsRouter from './incidents';
import assignmentsRouter from './assignments';
import unitsRouter from './units';
import timelineRouter from './timeline';
import billingRouter from './billing';

const router = Router();

// Mount all route modules
router.use('/auth', authRouter);
router.use('/incidents', incidentsRouter);
router.use('/assignments', assignmentsRouter);
router.use('/units', unitsRouter);
router.use('/timeline', timelineRouter);
router.use('/billing', billingRouter);

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

export default router;
