"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AssignmentsController_1 = require("../controllers/AssignmentsController");
const router = (0, express_1.Router)();
const controller = new AssignmentsController_1.AssignmentsController();
// POST /api/v1/assignments/recommend - Get unit recommendations for incident
router.post('/recommend', (req, res) => controller.recommend(req, res));
// POST /api/v1/assignments/assign - Assign unit to incident
router.post('/assign', (req, res) => controller.assign(req, res));
exports.default = router;
//# sourceMappingURL=assignments.js.map