import { Router } from 'express';
import { TimelineController } from '../controllers/TimelineController';

const router = Router();
const controller = new TimelineController();

// GET /api/v1/timeline/:id/timeline - Get incident timeline
router.get('/:id/timeline', (req, res) => controller.getTimeline(req, res));

// POST /api/v1/timeline/:id/status - Update incident status
router.post('/:id/status', (req, res) => controller.updateStatus(req, res));

// POST /api/v1/timeline/:id/acknowledge - Acknowledge incident
router.post('/:id/acknowledge', (req, res) => controller.acknowledge(req, res));

export default router;
