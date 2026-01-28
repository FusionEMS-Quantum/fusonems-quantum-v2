"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../config/database");
const config_1 = require("../config");
class AuthController {
    static async login(req, res) {
        try {
            const { username, password } = req.body;
            const crew = await (0, database_1.db)('crews')
                .where({ username })
                .first();
            if (!crew) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }
            if (password !== crew.password_hash) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }
            const unit = await (0, database_1.db)('units')
                .where({ id: crew.assigned_unit_id })
                .first();
            const token = jsonwebtoken_1.default.sign({ crew_id: crew.id, unit_id: crew.assigned_unit_id }, config_1.config.jwt.secret, { expiresIn: config_1.config.jwt.expiresIn });
            res.json({
                token,
                crew_id: crew.id,
                crew_name: `${crew.first_name} ${crew.last_name}`,
                unit_id: crew.assigned_unit_id,
                unit_name: unit?.name || 'Unknown',
            });
        }
        catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ message: 'Login failed' });
        }
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=AuthController.js.map