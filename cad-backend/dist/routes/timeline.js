"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const TimelineController_1 = require("../controllers/TimelineController");
const router = (0, express_1.Router)();
const controller = new TimelineController_1.TimelineController();
// GET /api/v1/timeline/:id/timeline - Get incident timeline
router.get('/:id/timeline', (req, res) => controller.getTimeline(req, res));
// POST /api/v1/timeline/:id/status - Update incident status
router.post('/:id/status', (req, res) => controller.updateStatus(req, res));
// POST /api/v1/timeline/:id/acknowledge - Acknowledge incident
router.post('/:id/acknowledge', (req, res) => controller.acknowledge(req, res));
exports.default = router;
//# sourceMappingURL=timeline.js.map