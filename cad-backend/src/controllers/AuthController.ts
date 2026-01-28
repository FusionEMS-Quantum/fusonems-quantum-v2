import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../config/database';
import { config } from '../config';

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { username, password } = req.body;

      const crew = await db('crews')
        .where({ username })
        .first();

      if (!crew) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      if (password !== crew.password_hash) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const unit = await db('units')
        .where({ id: crew.assigned_unit_id })
        .first();

      const token = jwt.sign(
        { crew_id: crew.id, unit_id: crew.assigned_unit_id },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      res.json({
        token,
        crew_id: crew.id,
        crew_name: `${crew.first_name} ${crew.last_name}`,
        unit_id: crew.assigned_unit_id,
        unit_name: unit?.name || 'Unknown',
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  }
}
