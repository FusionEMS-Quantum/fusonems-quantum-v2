import { Router } from 'express';
import { AssignmentsController } from '../controllers/AssignmentsController';

const router = Router();
const controller = new AssignmentsController();

// POST /api/v1/assignments/recommend - Get unit recommendations for incident
router.post('/recommend', (req, res) => controller.recommend(req, res));

// POST /api/v1/assignments/assign - Assign unit to incident
router.post('/assign', (req, res) => controller.assign(req, res));

export default router;
