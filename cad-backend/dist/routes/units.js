"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const UnitsController_1 = require("../controllers/UnitsController");
const router = (0, express_1.Router)();
const controller = new UnitsController_1.UnitsController();
// GET /api/v1/units - Get units with filters
router.get('/', (req, res) => controller.getAvailable(req, res));
exports.default = router;
//# sourceMappingURL=units.js.map