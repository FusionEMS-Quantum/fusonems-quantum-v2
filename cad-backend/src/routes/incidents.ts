import { Router } from 'express';
import { IncidentsController } from '../controllers/IncidentsController';

const router = Router();
const controller = new IncidentsController();

// GET /api/v1/incidents - Get all incidents
router.get('/', (req, res) => controller.getAll(req, res));

// POST /api/v1/incidents - Create new incident
router.post('/', (req, res) => controller.create(req, res));

// GET /api/v1/incidents/:id - Get incident by ID
router.get('/:id', (req, res) => controller.getById(req, res));

// PUT /api/v1/incidents/:id - Update incident
router.put('/:id', (req, res) => controller.update(req, res));

// POST /api/v1/incidents/:id/complete - Mark incident as complete
router.post('/:id/complete', (req, res) => controller.complete(req, res));

export default router;
