import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'atsi-wms-secure-jwt-secret-key-32-chars-minimum-def';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'WAREHOUSE_MANAGER' | 'TECHNICAL_INSPECTOR' | 'VIEWER';
  status: 'ACTIVE' | 'INACTIVE';
  assignedWarehouseIds: string[];
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export function signToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      assignedWarehouseIds: user.assignedWarehouseIds
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return {
      id: decoded.id,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role,
      status: 'ACTIVE',
      assignedWarehouseIds: decoded.assignedWarehouseIds || []
    };
  } catch {
    return null;
  }
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  let token: string | undefined;

  // 1. Authorization header (Bearer token) - primary mechanism for reliable iframe operation
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.substring(7);
  }
  // 2. Cookie fallback
  if (!token && req.cookies?.token) {
    token = req.cookies.token;
  }
  // 3. Query parameter for direct download/export links (?token=...)
  if (!token && typeof req.query?.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }

  // Fetch latest active user status from database
  const userRow = db.prepare('SELECT id, name, email, role, status, assigned_warehouse_ids FROM users WHERE id = ?').get(payload.id) as any;
  if (!userRow || userRow.status !== 'ACTIVE') {
    return res.status(401).json({ error: 'User account is inactive or not found' });
  }

  req.user = {
    id: userRow.id,
    name: userRow.name,
    email: userRow.email,
    role: userRow.role,
    status: userRow.status,
    assignedWarehouseIds: JSON.parse(userRow.assigned_warehouse_ids || '[]')
  };

  next();
}

export function requireRole(allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden: requires one of roles [${allowedRoles.join(', ')}]` });
    }
    next();
  };
}

export function checkWarehouseAccess(user: AuthUser, warehouseId: string): boolean {
  if (user.role === 'ADMIN') return true;
  return user.assignedWarehouseIds.includes(warehouseId);
}
