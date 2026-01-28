import { Router } from 'express';
import { UnitsController } from '../controllers/UnitsController';

const router = Router();
const controller = new UnitsController();

// GET /api/v1/units - Get units with filters
router.get('/', (req, res) => controller.getAvailable(req, res));

export default router;
