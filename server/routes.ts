import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { db, logAudit, hasAdminUser, generateSequenceNumber } from './db';
import { authMiddleware, requireRole, signToken, AuthRequest, checkWarehouseAccess } from './middleware';

const UPLOADS_DIR = path.resolve('uploads');
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export const apiRouter = Router();

// ==========================================
// 1. HEALTH & SETUP
// ==========================================
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    hasAdmin: hasAdminUser()
  });
});

// Credentials fetched directly from .env for display, verification, and fast login
apiRouter.get('/auth/credentials-info', (_req: Request, res: Response) => {
  res.json({
    admin: {
      role: 'ADMIN',
      title: 'Master Administrator',
      name: process.env.ADMIN_NAME || 'Col. Rajiv Sharma (Retd.)',
      email: (process.env.ADMIN_EMAIL || 'admin@defence.gov.in').trim(),
      password: process.env.ADMIN_PASSWORD || 'Admin@Defence2026!',
      phone: process.env.ADMIN_PHONE || '+91 98100 12345',
      description: 'Complete system oversight, master templates, user & audit governance'
    },
    manager: {
      role: 'WAREHOUSE_MANAGER',
      title: 'Warehouse Manager',
      name: process.env.MANAGER_NAME || 'Maj. Vikramaditya Rathore',
      email: (process.env.MANAGER_EMAIL || 'manager@defence.gov.in').trim(),
      password: process.env.MANAGER_PASSWORD || 'Manager@Depot2026!',
      phone: process.env.MANAGER_PHONE || '+91 98200 54321',
      description: 'Depot stock inwards, batch allocation, weekly review approvals'
    },
    inspector: {
      role: 'TECHNICAL_INSPECTOR',
      title: 'Technical Inspector',
      name: process.env.INSPECTOR_NAME || 'Capt. Ananya Sen (QA Ballistics)',
      email: (process.env.INSPECTOR_EMAIL || 'inspector@defence.gov.in').trim(),
      password: process.env.INSPECTOR_PASSWORD || 'Inspector@QA2026!',
      phone: process.env.INSPECTOR_PHONE || '+91 98300 98765',
      description: 'Technical inspection Form 263 / 270, proof test firing & QA'
    },
    viewer: {
      role: 'VIEWER',
      title: 'Depot Staff / Viewer',
      name: process.env.VIEWER_NAME || 'Subedar H. S. Rawat',
      email: (process.env.VIEWER_EMAIL || 'viewer@defence.gov.in').trim(),
      password: process.env.VIEWER_PASSWORD || 'Staff@Store2026!',
      phone: process.env.VIEWER_PHONE || '+91 98400 67890',
      description: 'Stock ledger verification, technical report views & downloads'
    }
  });
});

apiRouter.post('/auth/setup-admin', async (req: Request, res: Response) => {
  try {
    if (hasAdminUser()) {
      return res.status(400).json({ error: 'System already has an administrator configured. Setup is locked.' });
    }

    const { name, email, password, phone } = req.body;
    if (!name || !email || !password || password.length < 8) {
      return res.status(400).json({ error: 'Name, email, and password (minimum 8 characters) are required.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `user-admin-${Date.now()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, phone, role, status, assigned_warehouse_ids, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'ADMIN', 'ACTIVE', '[]', ?, ?)
    `).run(userId, name.trim(), email.trim().toLowerCase(), passwordHash, phone || null, now, now);

    logAudit({
      userId,
      action: 'ADMIN_SETUP',
      entityType: 'USER',
      entityId: userId,
      afterData: { name, email, role: 'ADMIN' },
      ipAddress: req.ip
    });

    const token = signToken({
      id: userId,
      name,
      email: email.trim().toLowerCase(),
      role: 'ADMIN',
      status: 'ACTIVE',
      assignedWarehouseIds: []
    });

    res.cookie('token', token, { httpOnly: true, maxAge: 86400000, sameSite: 'none', secure: true });
    res.json({
      message: 'Master Administrator created successfully.',
      token,
      user: { id: userId, name, email, role: 'ADMIN', assignedWarehouseIds: [] }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Setup failed' });
  }
});

// ==========================================
// 2. AUTHENTICATION
// ==========================================
apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase()) as any;
    if (!user || user.status !== 'ACTIVE') {
      logAudit({
        userId: user ? user.id : null,
        action: 'FAILED_LOGIN',
        entityType: 'AUTH',
        entityId: email,
        ipAddress: req.ip
      });
      return res.status(401).json({ error: 'Invalid credentials or inactive account' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      logAudit({
        userId: user.id,
        action: 'FAILED_LOGIN',
        entityType: 'AUTH',
        entityId: user.id,
        ipAddress: req.ip
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const assignedWarehouseIds = JSON.parse(user.assigned_warehouse_ids || '[]');
    const token = signToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      assignedWarehouseIds
    });

    logAudit({
      userId: user.id,
      action: 'LOGIN',
      entityType: 'AUTH',
      entityId: user.id,
      ipAddress: req.ip
    });

    res.cookie('token', token, { httpOnly: true, maxAge: 86400000, sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', secure: process.env.NODE_ENV === 'production' });
    res.json({
      message: 'Authentication successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        assignedWarehouseIds
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Login failed' });
  }
});

apiRouter.post('/auth/logout', (req: Request, res: Response) => {
  res.clearCookie('token', { sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', secure: process.env.NODE_ENV === 'production' });
  res.json({ message: 'Logged out successfully' });
});

apiRouter.get('/auth/me', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({ user: req.user });
});

apiRouter.post('/auth/change-password', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Current password and new password (min 8 chars) required' });
    }

    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user!.id) as any;
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(
      newHash,
      new Date().toISOString(),
      req.user!.id
    );

    logAudit({
      userId: req.user!.id,
      action: 'PASSWORD_CHANGE',
      entityType: 'USER',
      entityId: req.user!.id,
      ipAddress: req.ip
    });

    res.json({ message: 'Password updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. USER MANAGEMENT (Admin Only)
// ==========================================
apiRouter.get('/users', authMiddleware, requireRole(['ADMIN']), (_req: Request, res: Response) => {
  const users = db.prepare('SELECT id, name, email, phone, role, status, assigned_warehouse_ids, created_at, updated_at FROM users ORDER BY created_at DESC').all() as any[];
  const parsed = users.map(u => ({
    ...u,
    assignedWarehouseIds: JSON.parse(u.assigned_warehouse_ids || '[]')
  }));
  res.json({ users: parsed });
});

apiRouter.post('/users', authMiddleware, requireRole(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, phone, role, status, assignedWarehouseIds } = req.body;
    if (!name || !email || !password || password.length < 8) {
      return res.status(400).json({ error: 'Name, email, and password (min 8 chars) are required' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    const id = `user-${Date.now()}`;
    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();
    const whIds = JSON.stringify(assignedWarehouseIds || []);

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, phone, role, status, assigned_warehouse_ids, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name.trim(), email.trim().toLowerCase(), passwordHash, phone || null, role || 'STAFF', status || 'ACTIVE', whIds, now, now);

    logAudit({
      userId: req.user!.id,
      action: 'CREATE_USER',
      entityType: 'USER',
      entityId: id,
      afterData: { name, email, role, status, assignedWarehouseIds },
      ipAddress: req.ip
    });

    res.status(201).json({
      message: 'User created successfully',
      user: { id, name, email, phone, role, status, assignedWarehouseIds: assignedWarehouseIds || [] }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.patch('/users/:id', authMiddleware, requireRole(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, phone, role, status, assignedWarehouseIds, password } = req.body;
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    if (!existing) return res.status(404).json({ error: 'User not found' });

    let newHash = existing.password_hash;
    if (password && password.length >= 8) {
      newHash = await bcrypt.hash(password, 10);
    }

    const now = new Date().toISOString();
    const updatedWhIds = assignedWarehouseIds ? JSON.stringify(assignedWarehouseIds) : existing.assigned_warehouse_ids;

    db.prepare(`
      UPDATE users SET name = ?, email = ?, password_hash = ?, phone = ?, role = ?, status = ?, assigned_warehouse_ids = ?, updated_at = ?
      WHERE id = ?
    `).run(
      name !== undefined ? name.trim() : existing.name,
      email !== undefined ? email.trim().toLowerCase() : existing.email,
      newHash,
      phone !== undefined ? phone : existing.phone,
      role !== undefined ? role : existing.role,
      status !== undefined ? status : existing.status,
      updatedWhIds,
      now,
      id
    );

    logAudit({
      userId: req.user!.id,
      action: 'UPDATE_USER',
      entityType: 'USER',
      entityId: id,
      beforeData: existing,
      afterData: { name, email, role, status, assignedWarehouseIds },
      ipAddress: req.ip
    });

    res.json({ message: 'User updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/users/:id', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  if (id === req.user!.id) {
    return res.status(400).json({ error: 'You cannot delete your own administrative account' });
  }
  const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  db.prepare('DELETE FROM users WHERE id = ?').run(id);

  logAudit({
    userId: req.user!.id,
    action: 'DELETE_USER',
    entityType: 'USER',
    entityId: id,
    beforeData: user,
    ipAddress: req.ip
  });

  res.json({ message: 'User deleted successfully' });
});

// ==========================================
// 4. WAREHOUSES
// ==========================================
apiRouter.get('/warehouses', authMiddleware, (req: AuthRequest, res: Response) => {
  let query = 'SELECT * FROM warehouses';
  const params: any[] = [];

  if (req.user!.role !== 'ADMIN') {
    const allowed = req.user!.assignedWarehouseIds;
    if (allowed.length === 0) return res.json({ warehouses: [] });
    query += ` WHERE id IN (${allowed.map(() => '?').join(',')})`;
    params.push(...allowed);
  }
  query += ' ORDER BY warehouse_code ASC';
  const warehouses = db.prepare(query).all(...params) as any[];

  // Attach record counts
  const enriched = warehouses.map(w => {
    const stockCount = (db.prepare('SELECT count(*) as c FROM stock_records WHERE warehouse_id = ?').get(w.id) as any).c;
    const inspCount = (db.prepare('SELECT count(*) as c FROM inspections WHERE warehouse_id = ?').get(w.id) as any).c;
    return {
      id: w.id,
      warehouseCode: w.warehouse_code,
      name: w.name,
      type: w.type,
      address: w.address,
      city: w.city,
      state: w.state,
      pincode: w.pincode,
      contactPerson: w.contact_person,
      contactPhone: w.contact_phone,
      status: w.status,
      stockCount,
      inspectionCount: inspCount,
      createdAt: w.created_at,
      updatedAt: w.updated_at
    };
  });

  res.json({ warehouses: enriched });
});

apiRouter.post('/warehouses', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  try {
    const { warehouseCode, name, type, address, city, state, pincode, contactPerson, contactPhone, status } = req.body;
    if (!warehouseCode || !name) {
      return res.status(400).json({ error: 'Warehouse code and name are required' });
    }

    const existing = db.prepare('SELECT id FROM warehouses WHERE warehouse_code = ?').get(warehouseCode.trim().toUpperCase());
    if (existing) {
      return res.status(400).json({ error: 'Warehouse code already exists' });
    }

    const id = `wh-${Date.now()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO warehouses (id, warehouse_code, name, type, address, city, state, pincode, contact_person, contact_phone, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      warehouseCode.trim().toUpperCase(),
      name.trim(),
      type || 'COMMON',
      address || '',
      city || '',
      state || '',
      pincode || '',
      contactPerson || '',
      contactPhone || '',
      status || 'ACTIVE',
      now,
      now
    );

    logAudit({
      userId: req.user!.id,
      action: 'CREATE_WAREHOUSE',
      entityType: 'WAREHOUSE',
      entityId: id,
      afterData: req.body,
      ipAddress: req.ip
    });

    res.status(201).json({ message: 'Warehouse created successfully', id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/warehouses/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  if (!checkWarehouseAccess(req.user!, id)) {
    return res.status(403).json({ error: 'Access denied to this warehouse' });
  }
  const w = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(id) as any;
  if (!w) return res.status(404).json({ error: 'Warehouse not found' });
  res.json({ warehouse: w });
});

apiRouter.patch('/warehouses/:id', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(id) as any;
    if (!existing) return res.status(404).json({ error: 'Warehouse not found' });

    const { warehouseCode, name, type, address, city, state, pincode, contactPerson, contactPhone, status } = req.body;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE warehouses SET warehouse_code = ?, name = ?, type = ?, address = ?, city = ?, state = ?, pincode = ?, contact_person = ?, contact_phone = ?, status = ?, updated_at = ?
      WHERE id = ?
    `).run(
      warehouseCode !== undefined ? warehouseCode.trim().toUpperCase() : existing.warehouse_code,
      name !== undefined ? name.trim() : existing.name,
      type !== undefined ? type : existing.type,
      address !== undefined ? address : existing.address,
      city !== undefined ? city : existing.city,
      state !== undefined ? state : existing.state,
      pincode !== undefined ? pincode : existing.pincode,
      contactPerson !== undefined ? contactPerson : existing.contact_person,
      contactPhone !== undefined ? contactPhone : existing.contact_phone,
      status !== undefined ? status : existing.status,
      now,
      id
    );

    logAudit({
      userId: req.user!.id,
      action: 'UPDATE_WAREHOUSE',
      entityType: 'WAREHOUSE',
      entityId: id,
      beforeData: existing,
      afterData: req.body,
      ipAddress: req.ip
    });

    res.json({ message: 'Warehouse updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/warehouses/:id', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const stockCount = (db.prepare('SELECT count(*) as c FROM stock_records WHERE warehouse_id = ?').get(id) as any).c;
  const inspCount = (db.prepare('SELECT count(*) as c FROM inspections WHERE warehouse_id = ?').get(id) as any).c;

  if (stockCount > 0 || inspCount > 0) {
    return res.status(400).json({
      error: `Cannot delete warehouse with existing historical records (${stockCount} stock records, ${inspCount} inspections). Set status to INACTIVE instead.`
    });
  }

  db.prepare('DELETE FROM warehouses WHERE id = ?').run(id);

  logAudit({
    userId: req.user!.id,
    action: 'DELETE_WAREHOUSE',
    entityType: 'WAREHOUSE',
    entityId: id,
    ipAddress: req.ip
  });

  res.json({ message: 'Warehouse deleted successfully' });
});

// ==========================================
// 5. ITEM MASTER
// ==========================================
apiRouter.get('/items', authMiddleware, (req: Request, res: Response) => {
  const { search, category, type, status } = req.query;
  let sql = 'SELECT * FROM items WHERE 1=1';
  const params: any[] = [];

  if (search) {
    sql += ' AND (item_code LIKE ? OR item_name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (type) {
    sql += ' AND type = ?';
    params.push(type);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  sql += ' ORDER BY item_code ASC';

  const rows = db.prepare(sql).all(...params) as any[];
  const items = rows.map(r => ({
    id: r.id,
    itemCode: r.item_code,
    itemName: r.item_name,
    category: r.category,
    subCategory: r.sub_category,
    type: r.type,
    unit: r.unit,
    batchNumber: r.batch_number,
    serialNumberTracking: Boolean(r.serial_number_tracking),
    minimumStockLevel: r.minimum_stock_level,
    maximumStockLevel: r.maximum_stock_level,
    unitCost: r.unit_cost,
    currency: r.currency,
    shelfLifeMonths: r.shelf_life_months,
    storageConditions: r.storage_conditions,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }));

  res.json({ items });
});

apiRouter.post('/items', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  try {
    const {
      itemCode,
      itemName,
      category,
      subCategory,
      type,
      unit,
      batchNumber,
      serialNumberTracking,
      minimumStockLevel,
      maximumStockLevel,
      unitCost,
      currency,
      shelfLifeMonths,
      storageConditions,
      status
    } = req.body;

    if (!itemCode || !itemName || !category) {
      return res.status(400).json({ error: 'Item code, name, and category are required' });
    }

    const existing = db.prepare('SELECT id FROM items WHERE item_code = ?').get(itemCode.trim().toUpperCase());
    if (existing) {
      return res.status(400).json({ error: 'Item code already exists' });
    }

    const id = `item-${Date.now()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO items (id, item_code, item_name, category, sub_category, type, unit, batch_number, serial_number_tracking, minimum_stock_level, maximum_stock_level, unit_cost, currency, shelf_life_months, storage_conditions, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      itemCode.trim().toUpperCase(),
      itemName.trim(),
      category,
      subCategory || null,
      type || 'AMMUNITION',
      unit || 'ROUNDS',
      batchNumber || null,
      serialNumberTracking ? 1 : 0,
      Number(minimumStockLevel) || 0,
      Number(maximumStockLevel) || 10000,
      Number(unitCost) || 0,
      currency || 'INR',
      shelfLifeMonths ? Number(shelfLifeMonths) : null,
      storageConditions || null,
      status || 'ACTIVE',
      now,
      now
    );

    logAudit({
      userId: req.user!.id,
      action: 'CREATE_ITEM',
      entityType: 'ITEM',
      entityId: id,
      afterData: req.body,
      ipAddress: req.ip
    });

    res.status(201).json({ message: 'Item created successfully', id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.patch('/items/:id', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM items WHERE id = ?').get(id) as any;
    if (!existing) return res.status(404).json({ error: 'Item not found' });

    const b = req.body;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE items SET item_code = ?, item_name = ?, category = ?, sub_category = ?, type = ?, unit = ?, batch_number = ?, serial_number_tracking = ?, minimum_stock_level = ?, maximum_stock_level = ?, unit_cost = ?, currency = ?, shelf_life_months = ?, storage_conditions = ?, status = ?, updated_at = ?
      WHERE id = ?
    `).run(
      b.itemCode !== undefined ? b.itemCode.trim().toUpperCase() : existing.item_code,
      b.itemName !== undefined ? b.itemName.trim() : existing.item_name,
      b.category !== undefined ? b.category : existing.category,
      b.subCategory !== undefined ? b.subCategory : existing.sub_category,
      b.type !== undefined ? b.type : existing.type,
      b.unit !== undefined ? b.unit : existing.unit,
      b.batchNumber !== undefined ? b.batchNumber : existing.batch_number,
      b.serialNumberTracking !== undefined ? (b.serialNumberTracking ? 1 : 0) : existing.serial_number_tracking,
      b.minimumStockLevel !== undefined ? Number(b.minimumStockLevel) : existing.minimum_stock_level,
      b.maximumStockLevel !== undefined ? Number(b.maximumStockLevel) : existing.maximum_stock_level,
      b.unitCost !== undefined ? Number(b.unitCost) : existing.unit_cost,
      b.currency !== undefined ? b.currency : existing.currency,
      b.shelfLifeMonths !== undefined ? Number(b.shelfLifeMonths) : existing.shelf_life_months,
      b.storageConditions !== undefined ? b.storageConditions : existing.storage_conditions,
      b.status !== undefined ? b.status : existing.status,
      now,
      id
    );

    logAudit({
      userId: req.user!.id,
      action: 'UPDATE_ITEM',
      entityType: 'ITEM',
      entityId: id,
      beforeData: existing,
      afterData: b,
      ipAddress: req.ip
    });

    res.json({ message: 'Item updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/items/:id', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const stockCount = (db.prepare('SELECT count(*) as c FROM stock_records WHERE item_id = ?').get(id) as any).c;
  const inspCount = (db.prepare('SELECT count(*) as c FROM inspections WHERE item_id = ?').get(id) as any).c;

  if (stockCount > 0 || inspCount > 0) {
    return res.status(400).json({
      error: `Cannot delete item referenced in existing records (${stockCount} stock entries, ${inspCount} inspections). Deactivate item instead.`
    });
  }

  db.prepare('DELETE FROM items WHERE id = ?').run(id);

  logAudit({
    userId: req.user!.id,
    action: 'DELETE_ITEM',
    entityType: 'ITEM',
    entityId: id,
    ipAddress: req.ip
  });

  res.json({ message: 'Item deleted successfully' });
});

// ==========================================
// 6. STOCK & STORAGE DATA
// ==========================================
apiRouter.get('/stock', authMiddleware, (req: AuthRequest, res: Response) => {
  const { warehouseId, itemId, status, batchNumber, serialNumber, search } = req.query;
  let sql = `
    SELECT s.*, w.name as warehouse_name, w.warehouse_code, i.item_name, i.item_code, i.category as item_category, i.serial_number_tracking
    FROM stock_records s
    JOIN warehouses w ON s.warehouse_id = w.id
    JOIN items i ON s.item_id = i.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (req.user!.role !== 'ADMIN') {
    const allowed = req.user!.assignedWarehouseIds;
    if (allowed.length === 0) return res.json({ stockRecords: [] });
    sql += ` AND s.warehouse_id IN (${allowed.map(() => '?').join(',')})`;
    params.push(...allowed);
  }

  if (warehouseId) {
    sql += ' AND s.warehouse_id = ?';
    params.push(warehouseId);
  }
  if (itemId) {
    sql += ' AND s.item_id = ?';
    params.push(itemId);
  }
  if (status) {
    sql += ' AND s.status = ?';
    params.push(status);
  }
  if (batchNumber) {
    sql += ' AND s.batch_number LIKE ?';
    params.push(`%${batchNumber}%`);
  }
  if (serialNumber) {
    sql += ' AND s.serial_number LIKE ?';
    params.push(`%${serialNumber}%`);
  }
  if (search) {
    sql += ' AND (i.item_name LIKE ? OR i.item_code LIKE ? OR s.batch_number LIKE ? OR s.serial_number LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY s.created_at DESC';
  const rows = db.prepare(sql).all(...params) as any[];

  const stockRecords = rows.map(r => ({
    id: r.id,
    warehouseId: r.warehouse_id,
    warehouseName: r.warehouse_name,
    warehouseCode: r.warehouse_code,
    itemId: r.item_id,
    itemName: r.item_name,
    itemCode: r.item_code,
    itemCategory: r.item_category,
    serialNumberTracking: Boolean(r.serial_number_tracking),
    batchNumber: r.batch_number,
    serialNumber: r.serial_number,
    quantity: r.quantity,
    unit: r.unit,
    unitCost: r.unit_cost,
    totalValue: r.total_value,
    storageLocation: r.storage_location,
    storageCondition: r.storage_condition,
    dateOfReceipt: r.date_of_receipt,
    lastInspectionDate: r.last_inspection_date,
    nextInspectionDueDate: r.next_inspection_due_date,
    status: r.status,
    remarks: r.remarks,
    createdById: r.created_by_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }));

  res.json({ stockRecords });
});

apiRouter.post('/stock', authMiddleware, requireRole(['ADMIN', 'WAREHOUSE_MANAGER']), (req: AuthRequest, res: Response) => {
  try {
    const {
      warehouseId,
      itemId,
      batchNumber,
      serialNumber,
      quantity,
      unit,
      unitCost,
      storageLocation,
      storageCondition,
      dateOfReceipt,
      nextInspectionDueDate,
      remarks
    } = req.body;

    if (!warehouseId || !itemId || !batchNumber || Number(quantity) <= 0) {
      return res.status(400).json({ error: 'Warehouse, Item, Batch Number, and Quantity (> 0) are required' });
    }

    if (!checkWarehouseAccess(req.user!, warehouseId)) {
      return res.status(403).json({ error: 'You are not assigned to this warehouse facility' });
    }

    // Verify item serial tracking
    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId) as any;
    if (!item) return res.status(404).json({ error: 'Item not found' });

    if (item.serial_number_tracking && serialNumber) {
      const dup = db.prepare("SELECT id FROM stock_records WHERE warehouse_id = ? AND item_id = ? AND serial_number = ? AND status != 'DISPOSED'").get(warehouseId, itemId, serialNumber.trim());
      if (dup) {
        return res.status(400).json({ error: `Serial Number '${serialNumber}' already exists for this item in this warehouse.` });
      }
    }

    const qty = Number(quantity);
    const cost = Number(unitCost) > 0 ? Number(unitCost) : item.unit_cost;
    const totalVal = qty * cost;
    const stockId = `stk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const receiptDate = dateOfReceipt || now;

    // Insert Stock Record
    db.prepare(`
      INSERT INTO stock_records (id, warehouse_id, item_id, batch_number, serial_number, quantity, unit, unit_cost, total_value, storage_location, storage_condition, date_of_receipt, next_inspection_due_date, status, remarks, created_by_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'IN_STOCK', ?, ?, ?, ?)
    `).run(
      stockId,
      warehouseId,
      itemId,
      batchNumber.trim(),
      serialNumber ? serialNumber.trim() : null,
      qty,
      unit || item.unit,
      cost,
      totalVal,
      storageLocation || 'Bay 01 / Stack A',
      storageCondition || 'Dry Ventilated Ordnance Magazine',
      receiptDate,
      nextInspectionDueDate || null,
      remarks || 'Initial Inward Consignment',
      req.user!.id,
      now,
      now
    );

    // Calculate total balance after transaction
    const balanceRow = db.prepare("SELECT sum(quantity) as currentBalance FROM stock_records WHERE warehouse_id = ? AND item_id = ? AND status = 'IN_STOCK'").get(warehouseId, itemId) as any;
    const balanceAfter = balanceRow ? balanceRow.currentBalance : qty;

    // Insert into Stock Ledger
    const ledgerId = `led-${Date.now()}`;
    db.prepare(`
      INSERT INTO stock_ledgers (id, warehouse_id, item_id, stock_record_id, transaction_type, quantity, unit_cost, total_value, batch_number, serial_number, balance_after_transaction, remarks, created_by_id, created_at)
      VALUES (?, ?, ?, ?, 'INWARD', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      ledgerId,
      warehouseId,
      itemId,
      stockId,
      qty,
      cost,
      totalVal,
      batchNumber.trim(),
      serialNumber || null,
      balanceAfter,
      remarks || 'Stock Inward Acceptance',
      req.user!.id,
      now
    );

    logAudit({
      userId: req.user!.id,
      action: 'STOCK_INWARD',
      entityType: 'STOCK_RECORD',
      entityId: stockId,
      afterData: { warehouseId, itemId, batchNumber, serialNumber, quantity: qty, balanceAfter },
      ipAddress: req.ip
    });

    res.status(201).json({ message: 'Stock inward record created successfully', id: stockId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.patch('/stock/:id', authMiddleware, requireRole(['ADMIN', 'WAREHOUSE_MANAGER']), (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM stock_records WHERE id = ?').get(id) as any;
    if (!existing) return res.status(404).json({ error: 'Stock record not found' });

    if (!checkWarehouseAccess(req.user!, existing.warehouse_id)) {
      return res.status(403).json({ error: 'Access denied to this warehouse' });
    }

    const { status, storageLocation, storageCondition, nextInspectionDueDate, remarks, quantityAdjustment } = req.body;
    const now = new Date().toISOString();
    let newQty = existing.quantity;

    if (quantityAdjustment !== undefined && Number(quantityAdjustment) !== 0) {
      newQty = existing.quantity + Number(quantityAdjustment);
      if (newQty < 0) {
        return res.status(400).json({ error: 'Adjustment cannot result in negative stock quantity' });
      }

      // Record adjustment ledger entry
      const adjVal = Number(quantityAdjustment);
      const ledgerId = `led-adj-${Date.now()}`;
      db.prepare(`
        INSERT INTO stock_ledgers (id, warehouse_id, item_id, stock_record_id, transaction_type, quantity, unit_cost, total_value, batch_number, serial_number, balance_after_transaction, remarks, created_by_id, created_at)
        VALUES (?, ?, ?, ?, 'ADJUSTMENT', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        ledgerId,
        existing.warehouse_id,
        existing.item_id,
        id,
        adjVal,
        existing.unit_cost,
        adjVal * existing.unit_cost,
        existing.batch_number,
        existing.serial_number,
        newQty,
        remarks || 'Stock Inventory Reconciliation Adjustment',
        req.user!.id,
        now
      );
    }

    const newTotalVal = newQty * existing.unit_cost;

    db.prepare(`
      UPDATE stock_records SET quantity = ?, total_value = ?, status = ?, storage_location = ?, storage_condition = ?, next_inspection_due_date = ?, remarks = ?, updated_at = ?
      WHERE id = ?
    `).run(
      newQty,
      newTotalVal,
      status || existing.status,
      storageLocation || existing.storage_location,
      storageCondition || existing.storage_condition,
      nextInspectionDueDate !== undefined ? nextInspectionDueDate : existing.next_inspection_due_date,
      remarks || existing.remarks,
      now,
      id
    );

    logAudit({
      userId: req.user!.id,
      action: 'STOCK_UPDATE',
      entityType: 'STOCK_RECORD',
      entityId: id,
      beforeData: existing,
      afterData: req.body,
      ipAddress: req.ip
    });

    res.json({ message: 'Stock record updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/stock/ledger', authMiddleware, (req: AuthRequest, res: Response) => {
  let sql = `
    SELECT l.*, w.name as warehouse_name, w.warehouse_code, i.item_name, i.item_code, u.name as operator_name
    FROM stock_ledgers l
    JOIN warehouses w ON l.warehouse_id = w.id
    JOIN items i ON l.item_id = i.id
    LEFT JOIN users u ON l.created_by_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (req.user!.role !== 'ADMIN') {
    const allowed = req.user!.assignedWarehouseIds;
    if (allowed.length === 0) return res.json({ ledgerEntries: [] });
    sql += ` AND l.warehouse_id IN (${allowed.map(() => '?').join(',')})`;
    params.push(...allowed);
  }

  sql += ' ORDER BY l.created_at DESC LIMIT 500';
  const rows = db.prepare(sql).all(...params) as any[];

  res.json({ ledgerEntries: rows });
});

// ==========================================
// 7. AMMUNITION & STORE INSPECTIONS
// ==========================================
apiRouter.get('/inspections', authMiddleware, (req: AuthRequest, res: Response) => {
  const { warehouseId, status, inspectionType, search } = req.query;
  let sql = `
    SELECT insp.*, w.name as warehouse_name, w.warehouse_code, i.item_name, i.item_code, i.category as item_category,
           u1.name as inspector_name, u2.name as approver_name
    FROM inspections insp
    JOIN warehouses w ON insp.warehouse_id = w.id
    JOIN items i ON insp.item_id = i.id
    LEFT JOIN users u1 ON insp.inspector_id = u1.id
    LEFT JOIN users u2 ON insp.approved_by_id = u2.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (req.user!.role !== 'ADMIN') {
    const allowed = req.user!.assignedWarehouseIds;
    if (allowed.length === 0) return res.json({ inspections: [] });
    sql += ` AND insp.warehouse_id IN (${allowed.map(() => '?').join(',')})`;
    params.push(...allowed);
  }

  if (warehouseId) {
    sql += ' AND insp.warehouse_id = ?';
    params.push(warehouseId);
  }
  if (status) {
    sql += ' AND insp.status = ?';
    params.push(status);
  }
  if (inspectionType) {
    sql += ' AND insp.inspection_type = ?';
    params.push(inspectionType);
  }
  if (search) {
    sql += ' AND (insp.inspection_number LIKE ? OR i.item_name LIKE ? OR i.item_code LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY insp.created_at DESC';
  const inspections = db.prepare(sql).all(...params) as any[];

  res.json({ inspections });
});

apiRouter.post('/inspections', authMiddleware, requireRole(['ADMIN', 'TECHNICAL_INSPECTOR', 'WAREHOUSE_MANAGER']), (req: AuthRequest, res: Response) => {
  try {
    const {
      warehouseId,
      itemId,
      stockRecordId,
      inspectionType,
      inspectionDate,
      formType,
      quantityInspected,
      quantityPassed,
      quantityFailed,
      quantityQuarantined,
      overallResult,
      findings,
      recommendations,
      parameters,
      serials
    } = req.body;

    if (!warehouseId || !itemId) {
      return res.status(400).json({ error: 'Warehouse and Item are required' });
    }

    if (!checkWarehouseAccess(req.user!, warehouseId)) {
      return res.status(403).json({ error: 'Access denied to this warehouse' });
    }

    const inspNum = generateSequenceNumber('AMN-INSP', 'inspections', 'inspection_number');
    const id = `insp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO inspections (id, inspection_number, warehouse_id, item_id, stock_record_id, inspection_type, inspection_date, inspector_id, form_type, quantity_inspected, quantity_passed, quantity_failed, quantity_quarantined, overall_result, findings, recommendations, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?)
    `).run(
      id,
      inspNum,
      warehouseId,
      itemId,
      stockRecordId || null,
      inspectionType || 'ROUTINE',
      inspectionDate || now,
      req.user!.id,
      formType || 'AMMUNITION_INSPECTION_FORM',
      Number(quantityInspected) || 0,
      Number(quantityPassed) || 0,
      Number(quantityFailed) || 0,
      Number(quantityQuarantined) || 0,
      overallResult || 'PASS',
      findings || '',
      recommendations || '',
      now,
      now
    );

    // Insert parameters
    if (Array.isArray(parameters)) {
      const pStmt = db.prepare(`
        INSERT INTO inspection_parameters (id, inspection_id, parameter_name, expected_value, observed_value, result, remarks, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      parameters.forEach((p: any, idx: number) => {
        pStmt.run(
          `ip-${id}-${idx + 1}`,
          id,
          p.parameterName,
          p.expectedValue || 'Compliant',
          p.observedValue || 'Verified',
          p.result || 'PASS',
          p.remarks || null,
          now
        );
      });
    }

    // Insert serial items
    if (Array.isArray(serials)) {
      const sStmt = db.prepare(`
        INSERT INTO inspection_serials (id, inspection_id, serial_number, quantity, condition, result, remarks)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      serials.forEach((s: any, idx: number) => {
        sStmt.run(
          `is-${id}-${idx + 1}`,
          id,
          s.serialNumber,
          Number(s.quantity) || 1,
          s.condition || 'Serviceable',
          s.result || 'PASS',
          s.remarks || null
        );
      });
    }

    logAudit({
      userId: req.user!.id,
      action: 'CREATE_INSPECTION',
      entityType: 'INSPECTION',
      entityId: id,
      afterData: { inspectionNumber: inspNum, warehouseId, itemId, overallResult },
      ipAddress: req.ip
    });

    res.status(201).json({ message: 'Inspection created successfully', id, inspectionNumber: inspNum });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/inspections/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const insp = db.prepare(`
    SELECT insp.*, w.name as warehouse_name, w.warehouse_code, i.item_name, i.item_code, i.category as item_category,
           u1.name as inspector_name, u1.email as inspector_email, u2.name as approver_name
    FROM inspections insp
    JOIN warehouses w ON insp.warehouse_id = w.id
    JOIN items i ON insp.item_id = i.id
    LEFT JOIN users u1 ON insp.inspector_id = u1.id
    LEFT JOIN users u2 ON insp.approved_by_id = u2.id
    WHERE insp.id = ?
  `).get(id) as any;

  if (!insp) return res.status(404).json({ error: 'Inspection not found' });
  if (!checkWarehouseAccess(req.user!, insp.warehouse_id)) {
    return res.status(403).json({ error: 'Access denied to this warehouse' });
  }

  const parameters = db.prepare('SELECT * FROM inspection_parameters WHERE inspection_id = ?').all(id);
  const serials = db.prepare('SELECT * FROM inspection_serials WHERE inspection_id = ?').all(id);
  const documents = db.prepare("SELECT * FROM documents WHERE entity_type = 'INSPECTION' AND entity_id = ?").all(id);

  res.json({
    inspection: {
      ...insp,
      parameters,
      serials,
      documents
    }
  });
});

apiRouter.patch('/inspections/:id/submit', authMiddleware, requireRole(['ADMIN', 'TECHNICAL_INSPECTOR', 'WAREHOUSE_MANAGER']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const insp = db.prepare('SELECT * FROM inspections WHERE id = ?').get(id) as any;
  if (!insp) return res.status(404).json({ error: 'Inspection not found' });

  if (insp.status !== 'DRAFT') {
    return res.status(400).json({ error: 'Only DRAFT inspections can be submitted for review' });
  }

  const now = new Date().toISOString();
  db.prepare("UPDATE inspections SET status = 'SUBMITTED', updated_at = ? WHERE id = ?").run(now, id);

  logAudit({
    userId: req.user!.id,
    action: 'SUBMIT_INSPECTION',
    entityType: 'INSPECTION',
    entityId: id,
    ipAddress: req.ip
  });

  res.json({ message: 'Inspection submitted for approval' });
});

apiRouter.patch('/inspections/:id/approve', authMiddleware, requireRole(['ADMIN', 'WAREHOUSE_MANAGER']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { remarks } = req.body;
  if (!remarks || !remarks.trim()) {
    return res.status(400).json({ error: 'Mandatory approval remarks are required' });
  }

  const insp = db.prepare('SELECT * FROM inspections WHERE id = ?').get(id) as any;
  if (!insp) return res.status(404).json({ error: 'Inspection not found' });

  if (!checkWarehouseAccess(req.user!, insp.warehouse_id)) {
    return res.status(403).json({ error: 'Access denied to this warehouse' });
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE inspections SET status = 'APPROVED', approved_by_id = ?, approved_at = ?, recommendations = coalesce(recommendations, '') || ' [Approval Remarks: ' || ? || ']', updated_at = ?
    WHERE id = ?
  `).run(req.user!.id, now, remarks.trim(), now, id);

  // If linked to a stock record, update stock record status accordingly
  if (insp.stock_record_id) {
    let nextStockStatus = 'IN_STOCK';
    if (insp.overall_result === 'FAIL') nextStockStatus = 'REJECTED';
    else if (insp.overall_result === 'REINSPECTION_REQUIRED') nextStockStatus = 'INSPECTION_DUE';
    else if (insp.quantity_quarantined > 0) nextStockStatus = 'QUARANTINE';

    db.prepare(`
      UPDATE stock_records SET status = ?, last_inspection_date = ?, updated_at = ?
      WHERE id = ?
    `).run(nextStockStatus, insp.inspection_date, now, insp.stock_record_id);

    // Ledger entry for status change
    const ledgerId = `led-insp-${Date.now()}`;
    db.prepare(`
      INSERT INTO stock_ledgers (id, warehouse_id, item_id, stock_record_id, transaction_type, quantity, unit_cost, total_value, balance_after_transaction, remarks, created_by_id, created_at)
      VALUES (?, ?, ?, ?, 'STATUS_CHANGE', 0, 0, 0, (SELECT quantity FROM stock_records WHERE id = ?), ?, ?, ?)
    `).run(
      ledgerId,
      insp.warehouse_id,
      insp.item_id,
      insp.stock_record_id,
      insp.stock_record_id,
      `Inspection Approved (${insp.inspection_number}): Result ${insp.overall_result} -> Status ${nextStockStatus}`,
      req.user!.id,
      now
    );
  }

  logAudit({
    userId: req.user!.id,
    action: 'APPROVE_INSPECTION',
    entityType: 'INSPECTION',
    entityId: id,
    afterData: { remarks },
    ipAddress: req.ip
  });

  res.json({ message: 'Inspection approved successfully' });
});

apiRouter.patch('/inspections/:id/reject', authMiddleware, requireRole(['ADMIN', 'WAREHOUSE_MANAGER']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { remarks } = req.body;
  if (!remarks || !remarks.trim()) {
    return res.status(400).json({ error: 'Rejection reason / remarks are mandatory' });
  }

  const insp = db.prepare('SELECT * FROM inspections WHERE id = ?').get(id) as any;
  if (!insp) return res.status(404).json({ error: 'Inspection not found' });

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE inspections SET status = 'REJECTED', approved_by_id = ?, approved_at = ?, rejection_reason = ?, updated_at = ?
    WHERE id = ?
  `).run(req.user!.id, now, remarks.trim(), now, id);

  logAudit({
    userId: req.user!.id,
    action: 'REJECT_INSPECTION',
    entityType: 'INSPECTION',
    entityId: id,
    afterData: { remarks },
    ipAddress: req.ip
  });

  res.json({ message: 'Inspection rejected' });
});

// Admin override endpoint
apiRouter.patch('/inspections/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const insp = db.prepare('SELECT * FROM inspections WHERE id = ?').get(id) as any;
  if (!insp) return res.status(404).json({ error: 'Inspection not found' });

  if (insp.status === 'APPROVED' && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Approved inspections cannot be edited except by Administrator with mandatory override remarks.' });
  }

  const { overrideRemarks, findings, recommendations, overallResult } = req.body;
  if (insp.status === 'APPROVED' && (!overrideRemarks || !overrideRemarks.trim())) {
    return res.status(400).json({ error: 'Administrator override remarks are mandatory to modify an approved inspection.' });
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE inspections SET findings = ?, recommendations = ?, overall_result = ?, updated_at = ?
    WHERE id = ?
  `).run(
    findings !== undefined ? findings : insp.findings,
    recommendations !== undefined ? recommendations : insp.recommendations,
    overallResult !== undefined ? overallResult : insp.overall_result,
    now,
    id
  );

  logAudit({
    userId: req.user!.id,
    action: insp.status === 'APPROVED' ? 'ADMIN_OVERRIDE_INSPECTION' : 'UPDATE_INSPECTION',
    entityType: 'INSPECTION',
    entityId: id,
    beforeData: insp,
    afterData: req.body,
    ipAddress: req.ip
  });

  res.json({ message: 'Inspection updated successfully' });
});

// ==========================================
// 8. TECHNICAL FORM TEMPLATES & SUBMISSIONS (FORM 263, 270)
// ==========================================
apiRouter.get('/forms/templates', authMiddleware, (_req: Request, res: Response) => {
  const templates = db.prepare('SELECT * FROM form_templates ORDER BY form_code ASC').all() as any[];
  const enriched = templates.map(t => {
    const fields = db.prepare('SELECT * FROM form_fields WHERE form_template_id = ? ORDER BY display_order ASC').all(t.id) as any[];
    return {
      ...t,
      allowedRoles: JSON.parse(t.allowed_roles || '[]'),
      applicableWarehouseIds: JSON.parse(t.applicable_warehouse_ids || '[]'),
      fields: fields.map(f => ({
        ...f,
        options: JSON.parse(f.options || '[]'),
        validationRules: JSON.parse(f.validation_rules || '{}')
      }))
    };
  });
  res.json({ templates: enriched });
});

apiRouter.get('/forms/templates/:id', authMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const t = db.prepare('SELECT * FROM form_templates WHERE id = ?').get(id) as any;
  if (!t) return res.status(404).json({ error: 'Form template not found' });
  const fields = db.prepare('SELECT * FROM form_fields WHERE form_template_id = ? ORDER BY display_order ASC').all(id) as any[];
  res.json({
    template: {
      ...t,
      allowedRoles: JSON.parse(t.allowed_roles || '[]'),
      fields: fields.map(f => ({
        ...f,
        options: JSON.parse(f.options || '[]')
      }))
    }
  });
});

apiRouter.get('/forms/submissions', authMiddleware, (req: AuthRequest, res: Response) => {
  const { formTemplateId, warehouseId, status } = req.query;
  let sql = `
    SELECT sub.*, t.form_name, t.form_code, t.form_type, w.name as warehouse_name, w.warehouse_code, u.name as submitter_name
    FROM form_submissions sub
    JOIN form_templates t ON sub.form_template_id = t.id
    JOIN warehouses w ON sub.warehouse_id = w.id
    LEFT JOIN users u ON sub.submitted_by_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (req.user!.role !== 'ADMIN') {
    const allowed = req.user!.assignedWarehouseIds;
    if (allowed.length === 0) return res.json({ submissions: [] });
    sql += ` AND sub.warehouse_id IN (${allowed.map(() => '?').join(',')})`;
    params.push(...allowed);
  }

  if (formTemplateId) {
    sql += ' AND sub.form_template_id = ?';
    params.push(formTemplateId);
  }
  if (warehouseId) {
    sql += ' AND sub.warehouse_id = ?';
    params.push(warehouseId);
  }
  if (status) {
    sql += ' AND sub.status = ?';
    params.push(status);
  }

  sql += ' ORDER BY sub.created_at DESC';
  const rows = db.prepare(sql).all(...params) as any[];
  const submissions = rows.map(r => ({
    ...r,
    formData: JSON.parse(r.form_data || '{}')
  }));

  res.json({ submissions });
});

apiRouter.post('/forms/submissions', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { formTemplateId, warehouseId, itemId, stockRecordId, inspectionId, formData, remarks, submitNow } = req.body;
    if (!formTemplateId || !warehouseId) {
      return res.status(400).json({ error: 'Form template and warehouse are required' });
    }

    if (!checkWarehouseAccess(req.user!, warehouseId)) {
      return res.status(403).json({ error: 'Access denied to this warehouse' });
    }

    const template = db.prepare('SELECT form_code FROM form_templates WHERE id = ?').get(formTemplateId) as any;
    const prefix = template ? template.form_code.replace('FORM-', 'F') : 'FORM';
    const formNumber = generateSequenceNumber(prefix, 'form_submissions', 'form_number');
    const id = `fsub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const status = submitNow ? 'SUBMITTED' : 'DRAFT';

    db.prepare(`
      INSERT INTO form_submissions (id, form_template_id, form_number, warehouse_id, item_id, stock_record_id, inspection_id, submitted_by_id, status, form_data, current_approval_level, submitted_at, remarks, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
    `).run(
      id,
      formTemplateId,
      formNumber,
      warehouseId,
      itemId || null,
      stockRecordId || null,
      inspectionId || null,
      req.user!.id,
      status,
      JSON.stringify(formData || {}),
      submitNow ? now : null,
      remarks || null,
      now,
      now
    );

    logAudit({
      userId: req.user!.id,
      action: 'CREATE_FORM_SUBMISSION',
      entityType: 'FORM_SUBMISSION',
      entityId: id,
      afterData: { formNumber, template: formTemplateId, status },
      ipAddress: req.ip
    });

    res.status(201).json({ message: 'Form record created successfully', id, formNumber });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/forms/submissions/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const sub = db.prepare(`
    SELECT sub.*, t.form_name, t.form_code, t.form_type, w.name as warehouse_name, w.warehouse_code, u.name as submitter_name, u.email as submitter_email
    FROM form_submissions sub
    JOIN form_templates t ON sub.form_template_id = t.id
    JOIN warehouses w ON sub.warehouse_id = w.id
    LEFT JOIN users u ON sub.submitted_by_id = u.id
    WHERE sub.id = ?
  `).get(id) as any;

  if (!sub) return res.status(404).json({ error: 'Form submission not found' });
  if (!checkWarehouseAccess(req.user!, sub.warehouse_id)) {
    return res.status(403).json({ error: 'Access denied to this warehouse' });
  }

  const templateFields = db.prepare('SELECT * FROM form_fields WHERE form_template_id = ? ORDER BY display_order ASC').all(sub.form_template_id) as any[];
  const approvals = db.prepare(`
    SELECT a.*, u.name as approver_name
    FROM form_approvals a
    JOIN users u ON a.approver_id = u.id
    WHERE a.form_submission_id = ?
    ORDER BY a.action_at ASC
  `).all(id);

  res.json({
    submission: {
      ...sub,
      formData: JSON.parse(sub.form_data || '{}'),
      templateFields: templateFields.map(f => ({ ...f, options: JSON.parse(f.options || '[]') })),
      approvals
    }
  });
});

apiRouter.patch('/forms/submissions/:id/approve', authMiddleware, requireRole(['ADMIN', 'WAREHOUSE_MANAGER']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { remarks } = req.body;
  if (!remarks || !remarks.trim()) {
    return res.status(400).json({ error: 'Mandatory approval remarks are required' });
  }

  const sub = db.prepare('SELECT * FROM form_submissions WHERE id = ?').get(id) as any;
  if (!sub) return res.status(404).json({ error: 'Form submission not found' });

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE form_submissions SET status = 'APPROVED', approved_at = ?, remarks = coalesce(remarks, '') || ' [Approved: ' || ? || ']', updated_at = ?
    WHERE id = ?
  `).run(now, remarks.trim(), now, id);

  // Record approval audit trail
  const appId = `fapp-${Date.now()}`;
  db.prepare(`
    INSERT INTO form_approvals (id, form_submission_id, approval_level, approver_id, action, remarks, action_at, created_at)
    VALUES (?, ?, ?, ?, 'APPROVED', ?, ?, ?)
  `).run(appId, id, sub.current_approval_level, req.user!.id, remarks.trim(), now, now);

  logAudit({
    userId: req.user!.id,
    action: 'APPROVE_FORM_SUBMISSION',
    entityType: 'FORM_SUBMISSION',
    entityId: id,
    afterData: { remarks },
    ipAddress: req.ip
  });

  res.json({ message: 'Technical Form Approved successfully' });
});

apiRouter.patch('/forms/submissions/:id/reject', authMiddleware, requireRole(['ADMIN', 'WAREHOUSE_MANAGER']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { remarks } = req.body;
  if (!remarks || !remarks.trim()) {
    return res.status(400).json({ error: 'Rejection remarks are mandatory' });
  }

  const sub = db.prepare('SELECT * FROM form_submissions WHERE id = ?').get(id) as any;
  if (!sub) return res.status(404).json({ error: 'Form submission not found' });

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE form_submissions SET status = 'REJECTED', remarks = coalesce(remarks, '') || ' [Rejected: ' || ? || ']', updated_at = ?
    WHERE id = ?
  `).run(remarks.trim(), now, id);

  const appId = `fapp-${Date.now()}`;
  db.prepare(`
    INSERT INTO form_approvals (id, form_submission_id, approval_level, approver_id, action, remarks, action_at, created_at)
    VALUES (?, ?, ?, ?, 'REJECTED', ?, ?, ?)
  `).run(appId, id, sub.current_approval_level, req.user!.id, remarks.trim(), now, now);

  logAudit({
    userId: req.user!.id,
    action: 'REJECT_FORM_SUBMISSION',
    entityType: 'FORM_SUBMISSION',
    entityId: id,
    afterData: { remarks },
    ipAddress: req.ip
  });

  res.json({ message: 'Technical Form Rejected' });
});

// ==========================================
// 9. WEEKLY REVIEWS & APPROVAL WORKFLOW
// ==========================================
apiRouter.get('/weekly-reviews', authMiddleware, (req: AuthRequest, res: Response) => {
  let sql = `
    SELECT wr.*, w.name as warehouse_name, w.warehouse_code, u1.name as prepared_by_name, u2.name as approved_by_name
    FROM weekly_reviews wr
    JOIN warehouses w ON wr.warehouse_id = w.id
    LEFT JOIN users u1 ON wr.prepared_by_id = u1.id
    LEFT JOIN users u2 ON wr.approved_by_id = u2.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (req.user!.role !== 'ADMIN') {
    const allowed = req.user!.assignedWarehouseIds;
    if (allowed.length === 0) return res.json({ weeklyReviews: [] });
    sql += ` AND wr.warehouse_id IN (${allowed.map(() => '?').join(',')})`;
    params.push(...allowed);
  }

  sql += ' ORDER BY wr.week_start_date DESC';
  const weeklyReviews = db.prepare(sql).all(...params) as any[];

  res.json({ weeklyReviews });
});

apiRouter.post('/weekly-reviews', authMiddleware, requireRole(['ADMIN', 'WAREHOUSE_MANAGER']), (req: AuthRequest, res: Response) => {
  try {
    const { warehouseId, weekStartDate, weekEndDate, reviewType, remarks } = req.body;
    if (!warehouseId || !weekStartDate || !weekEndDate) {
      return res.status(400).json({ error: 'Warehouse and Week start/end dates are required' });
    }

    if (!checkWarehouseAccess(req.user!, warehouseId)) {
      return res.status(403).json({ error: 'Access denied to this warehouse' });
    }

    // Compute aggregated real numbers from database
    const pendingInsp = (db.prepare("SELECT count(*) as c FROM inspections WHERE warehouse_id = ? AND status IN ('DRAFT', 'SUBMITTED')").get(warehouseId) as any).c;
    const completedInsp = (db.prepare("SELECT count(*) as c FROM inspections WHERE warehouse_id = ? AND status IN ('APPROVED', 'CLOSED')").get(warehouseId) as any).c;
    const approvedInsp = (db.prepare("SELECT count(*) as c FROM inspections WHERE warehouse_id = ? AND status = 'APPROVED'").get(warehouseId) as any).c;
    const rejectedInsp = (db.prepare("SELECT count(*) as c FROM inspections WHERE warehouse_id = ? AND status IN ('REJECTED', 'REINSPECTION_REQUIRED')").get(warehouseId) as any).c;
    const stockVal = (db.prepare("SELECT coalesce(sum(total_value), 0) as total FROM stock_records WHERE warehouse_id = ? AND status = 'IN_STOCK'").get(warehouseId) as any).total;
    const totalRecords = (db.prepare('SELECT count(*) as c FROM stock_records WHERE warehouse_id = ?').get(warehouseId) as any).c;

    const reviewNumber = generateSequenceNumber('WR', 'weekly_reviews', 'review_number');
    const id = `wr-${Date.now()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO weekly_reviews (id, review_number, warehouse_id, week_start_date, week_end_date, review_type, total_records_reviewed, pending_inspections, completed_inspections, approved_inspections, rejected_inspections, stock_value, remarks, prepared_by_id, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?)
    `).run(
      id,
      reviewNumber,
      warehouseId,
      weekStartDate,
      weekEndDate,
      reviewType || 'AMMUNITION_STORAGE',
      totalRecords,
      pendingInsp,
      completedInsp,
      approvedInsp,
      rejectedInsp,
      stockVal,
      remarks || 'Weekly store inspection and stock reconciliation cycle.',
      req.user!.id,
      now,
      now
    );

    logAudit({
      userId: req.user!.id,
      action: 'CREATE_WEEKLY_REVIEW',
      entityType: 'WEEKLY_REVIEW',
      entityId: id,
      afterData: { reviewNumber, warehouseId, stockValue: stockVal },
      ipAddress: req.ip
    });

    res.status(201).json({ message: 'Weekly Review draft created successfully', id, reviewNumber });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.patch('/weekly-reviews/:id/submit', authMiddleware, requireRole(['ADMIN', 'WAREHOUSE_MANAGER']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const wr = db.prepare('SELECT * FROM weekly_reviews WHERE id = ?').get(id) as any;
  if (!wr) return res.status(404).json({ error: 'Weekly review not found' });

  const now = new Date().toISOString();
  db.prepare("UPDATE weekly_reviews SET status = 'SUBMITTED', updated_at = ? WHERE id = ?").run(now, id);

  logAudit({
    userId: req.user!.id,
    action: 'SUBMIT_WEEKLY_REVIEW',
    entityType: 'WEEKLY_REVIEW',
    entityId: id,
    ipAddress: req.ip
  });

  res.json({ message: 'Weekly review submitted for managerial review' });
});

apiRouter.patch('/weekly-reviews/:id/approve', authMiddleware, requireRole(['ADMIN', 'WAREHOUSE_MANAGER']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { remarks } = req.body;
  if (!remarks || !remarks.trim()) {
    return res.status(400).json({ error: 'Mandatory approval endorsement remarks required' });
  }

  const wr = db.prepare('SELECT * FROM weekly_reviews WHERE id = ?').get(id) as any;
  if (!wr) return res.status(404).json({ error: 'Weekly review not found' });

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE weekly_reviews SET status = 'APPROVED', approved_by_id = ?, approved_at = ?, remarks = coalesce(remarks, '') || ' [Officer Endorsement: ' || ? || ']', updated_at = ?
    WHERE id = ?
  `).run(req.user!.id, now, remarks.trim(), now, id);

  logAudit({
    userId: req.user!.id,
    action: 'APPROVE_WEEKLY_REVIEW',
    entityType: 'WEEKLY_REVIEW',
    entityId: id,
    afterData: { remarks },
    ipAddress: req.ip
  });

  res.json({ message: 'Weekly review endorsed and locked' });
});

// ==========================================
// 10. DOCUMENTS & ATTACHMENTS
// ==========================================
apiRouter.post('/documents/upload', authMiddleware, upload.single('file'), (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { entityType, entityId, remarks } = req.body;
    if (!entityType || !entityId) {
      return res.status(400).json({ error: 'entityType and entityId are required' });
    }

    const docId = `doc-${Date.now()}`;
    const fileUrl = `/api/documents/${docId}/download`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO documents (id, entity_type, entity_id, file_name, file_type, file_size, file_path, file_url, uploaded_by_id, uploaded_at, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      docId,
      entityType,
      entityId,
      req.file.originalname,
      req.file.mimetype,
      req.file.size,
      req.file.path,
      fileUrl,
      req.user!.id,
      now,
      remarks || null
    );

    logAudit({
      userId: req.user!.id,
      action: 'UPLOAD_DOCUMENT',
      entityType: 'DOCUMENT',
      entityId: docId,
      afterData: { fileName: req.file.originalname, fileSize: req.file.size, entityType, entityId },
      ipAddress: req.ip
    });

    res.status(201).json({
      message: 'Document uploaded successfully',
      document: {
        id: docId,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        fileUrl,
        uploadedAt: now
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/documents', authMiddleware, (req: Request, res: Response) => {
  const { entityType, entityId } = req.query;
  let sql = `
    SELECT d.*, u.name as uploaded_by_name
    FROM documents d
    LEFT JOIN users u ON d.uploaded_by_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (entityType) {
    sql += ' AND d.entity_type = ?';
    params.push(entityType);
  }
  if (entityId) {
    sql += ' AND d.entity_id = ?';
    params.push(entityId);
  }
  sql += ' ORDER BY d.uploaded_at DESC';

  const documents = db.prepare(sql).all(...params);
  res.json({ documents });
});

apiRouter.get('/documents/:id/download', authMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as any;
  if (!doc || !fs.existsSync(doc.file_path)) {
    return res.status(404).json({ error: 'File not found on storage server' });
  }
  res.download(doc.file_path, doc.file_name);
});

apiRouter.delete('/documents/:id', authMiddleware, requireRole(['ADMIN', 'WAREHOUSE_MANAGER']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as any;
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  if (fs.existsSync(doc.file_path)) {
    try { fs.unlinkSync(doc.file_path); } catch (e) { /* silent */ }
  }
  db.prepare('DELETE FROM documents WHERE id = ?').run(id);

  logAudit({
    userId: req.user!.id,
    action: 'DELETE_DOCUMENT',
    entityType: 'DOCUMENT',
    entityId: id,
    beforeData: doc,
    ipAddress: req.ip
  });

  res.json({ message: 'Document deleted successfully' });
});

// ==========================================
// 11. APPENDIX A & APPENDIX B & REPORTS
// ==========================================
apiRouter.get('/reports/appendix-a', authMiddleware, (req: AuthRequest, res: Response) => {
  const { warehouseId } = req.query;
  let sql = `
    SELECT s.*, w.name as warehouse_name, w.warehouse_code, w.type as warehouse_type,
           i.item_name, i.item_code, i.category as item_category, i.type as item_type
    FROM stock_records s
    JOIN warehouses w ON s.warehouse_id = w.id
    JOIN items i ON s.item_id = i.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (warehouseId) {
    sql += ' AND s.warehouse_id = ?';
    params.push(warehouseId);
  }
  sql += ' ORDER BY w.warehouse_code ASC, i.item_code ASC';

  const rows = db.prepare(sql).all(...params) as any[];
  res.json({
    reportTitle: 'Appendix A — Warehouse / Common-GP Stock Ledger & Condition Return',
    generatedAt: new Date().toISOString(),
    records: rows
  });
});

apiRouter.get('/reports/appendix-b', authMiddleware, (req: AuthRequest, res: Response) => {
  const { warehouseId } = req.query;
  let sql = `
    SELECT insp.*, w.name as warehouse_name, w.warehouse_code,
           i.item_name, i.item_code, i.category as item_category,
           u1.name as inspector_name, u2.name as approver_name
    FROM inspections insp
    JOIN warehouses w ON insp.warehouse_id = w.id
    JOIN items i ON insp.item_id = i.id
    LEFT JOIN users u1 ON insp.inspector_id = u1.id
    LEFT JOIN users u2 ON insp.approved_by_id = u2.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (warehouseId) {
    sql += ' AND insp.warehouse_id = ?';
    params.push(warehouseId);
  }
  sql += ' ORDER BY insp.inspection_date DESC';

  const rows = db.prepare(sql).all(...params) as any[];
  res.json({
    reportTitle: 'Appendix B — Technical Inspection & Quality Surveillance Report',
    generatedAt: new Date().toISOString(),
    records: rows
  });
});

// CSV Export route
apiRouter.get('/reports/export', authMiddleware, (req: Request, res: Response) => {
  const { type, warehouseId } = req.query;
  let csv = '';
  let filename = `report-${type || 'stock'}-${new Date().toISOString().slice(0, 10)}.csv`;

  if (type === 'appendix-a' || type === 'stock') {
    const rows = db.prepare(`
      SELECT w.name as warehouse, w.warehouse_code, i.item_code, i.item_name, i.category,
             s.batch_number, coalesce(s.serial_number, '') as serial_number, s.quantity, s.unit,
             s.unit_cost, s.total_value, s.storage_location, s.storage_condition,
             coalesce(s.last_inspection_date, '') as last_insp, coalesce(s.next_inspection_due_date, '') as next_due, s.status
      FROM stock_records s
      JOIN warehouses w ON s.warehouse_id = w.id
      JOIN items i ON s.item_id = i.id
      ORDER BY w.warehouse_code, i.item_code
    `).all() as any[];

    csv = 'Warehouse Code,Warehouse Name,Item Code,Item Name,Category,Batch Number,Serial Number,Quantity,Unit,Unit Cost (INR),Total Value (INR),Location,Storage Condition,Last Inspection,Next Due,Status\n';
    rows.forEach(r => {
      csv += `"${r.warehouse_code}","${r.warehouse}","${r.item_code}","${r.item_name}","${r.category}","${r.batch_number}","${r.serial_number}",${r.quantity},"${r.unit}",${r.unit_cost},${r.total_value},"${r.storage_location}","${r.storage_condition}","${r.last_insp}","${r.next_due}","${r.status}"\n`;
    });
  } else if (type === 'appendix-b' || type === 'inspections') {
    const rows = db.prepare(`
      SELECT insp.inspection_number, insp.inspection_date, w.name as warehouse, i.item_code, i.item_name,
             insp.inspection_type, insp.quantity_inspected, insp.quantity_passed, insp.quantity_failed,
             insp.quantity_quarantined, insp.overall_result, insp.status, u1.name as inspector, coalesce(u2.name, '') as approver
      FROM inspections insp
      JOIN warehouses w ON insp.warehouse_id = w.id
      JOIN items i ON insp.item_id = i.id
      LEFT JOIN users u1 ON insp.inspector_id = u1.id
      LEFT JOIN users u2 ON insp.approved_by_id = u2.id
      ORDER BY insp.inspection_date DESC
    `).all() as any[];

    csv = 'Inspection Number,Date,Warehouse,Item Code,Item Name,Type,Inspected,Passed,Failed,Quarantined,Result,Status,Inspector,Approver\n';
    rows.forEach(r => {
      csv += `"${r.inspection_number}","${r.inspection_date}","${r.warehouse}","${r.item_code}","${r.item_name}","${r.inspection_type}",${r.quantity_inspected},${r.quantity_passed},${r.quantity_failed},${r.quantity_quarantined},"${r.overall_result}","${r.status}","${r.inspector}","${r.approver}"\n`;
    });
  } else if (type === 'ledger') {
    const rows = db.prepare(`
      SELECT l.created_at, w.name as warehouse, i.item_code, i.item_name, l.transaction_type,
             l.quantity, l.balance_after_transaction, l.remarks
      FROM stock_ledgers l
      JOIN warehouses w ON l.warehouse_id = w.id
      JOIN items i ON l.item_id = i.id
      ORDER BY l.created_at DESC
    `).all() as any[];

    csv = 'Timestamp,Warehouse,Item Code,Item Name,Transaction Type,Quantity,Balance After,Remarks\n';
    rows.forEach(r => {
      csv += `"${r.created_at}","${r.warehouse}","${r.item_code}","${r.item_name}","${r.transaction_type}",${r.quantity},${r.balance_after_transaction},"${r.remarks || ''}"\n`;
    });
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

// ==========================================
// 12. DASHBOARD
// ==========================================
apiRouter.get('/dashboard/summary', authMiddleware, (req: AuthRequest, res: Response) => {
  let whFilter = '';
  const params: any[] = [];
  if (req.user!.role !== 'ADMIN') {
    const allowed = req.user!.assignedWarehouseIds;
    if (allowed.length === 0) {
      return res.json({
        totalWarehouses: 0,
        totalItems: 0,
        totalStockRecords: 0,
        totalQuantityInStock: 0,
        totalStockValueINR: 0,
        totalInspections: 0,
        pendingInspections: 0,
        completedInspections: 0,
        approvedInspections: 0,
        rejectedInspections: 0,
        weeklyApprovalsPending: 0,
        weeklyApprovalsCompleted: 0,
        itemsRequiringReinspection: 0,
        form263Submissions: 0,
        form270Submissions: 0
      });
    }
    whFilter = ` WHERE warehouse_id IN (${allowed.map(() => '?').join(',')})`;
    params.push(...allowed);
  }

  const totalWarehouses = (db.prepare("SELECT count(*) as c FROM warehouses WHERE status = 'ACTIVE'").get() as any).c;
  const totalItems = (db.prepare("SELECT count(*) as c FROM items WHERE status = 'ACTIVE'").get() as any).c;

  const stockAgg = db.prepare(`
    SELECT count(*) as count, coalesce(sum(quantity), 0) as qty, coalesce(sum(total_value), 0) as val
    FROM stock_records ${whFilter ? whFilter + " AND status = 'IN_STOCK'" : "WHERE status = 'IN_STOCK'"}
  `).get(...params) as any;

  const inspAgg = db.prepare(`
    SELECT
      count(*) as total,
      sum(case when status in ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW') then 1 else 0 end) as pending,
      sum(case when status in ('APPROVED', 'CLOSED') then 1 else 0 end) as completed,
      sum(case when status = 'APPROVED' then 1 else 0 end) as approved,
      sum(case when status in ('REJECTED', 'REINSPECTION_REQUIRED') then 1 else 0 end) as rejected,
      sum(case when overall_result = 'REINSPECTION_REQUIRED' or status = 'REINSPECTION_REQUIRED' then 1 else 0 end) as reinspect
    FROM inspections ${whFilter}
  `).get(...params) as any;

  const weeklyAgg = db.prepare(`
    SELECT
      sum(case when status in ('DRAFT', 'SUBMITTED') then 1 else 0 end) as pending,
      sum(case when status = 'APPROVED' then 1 else 0 end) as approved
    FROM weekly_reviews ${whFilter}
  `).get(...params) as any;

  const f263Count = (db.prepare(`
    SELECT count(*) as c FROM form_submissions s
    JOIN form_templates t ON s.form_template_id = t.id
    ${whFilter ? whFilter + " AND t.form_type = 'TECHNICAL_INSPECTION_FORM_263'" : "WHERE t.form_type = 'TECHNICAL_INSPECTION_FORM_263'"}
  `).get(...params) as any).c;

  const f270Count = (db.prepare(`
    SELECT count(*) as c FROM form_submissions s
    JOIN form_templates t ON s.form_template_id = t.id
    ${whFilter ? whFilter + " AND t.form_type = 'TECHNICAL_INSPECTION_FORM_270'" : "WHERE t.form_type = 'TECHNICAL_INSPECTION_FORM_270'"}
  `).get(...params) as any).c;

  res.json({
    totalWarehouses,
    totalItems,
    totalStockRecords: stockAgg ? stockAgg.count : 0,
    totalQuantityInStock: stockAgg ? stockAgg.qty : 0,
    totalStockValueINR: stockAgg ? stockAgg.val : 0,
    totalInspections: inspAgg ? (inspAgg.total || 0) : 0,
    pendingInspections: inspAgg ? (inspAgg.pending || 0) : 0,
    completedInspections: inspAgg ? (inspAgg.completed || 0) : 0,
    approvedInspections: inspAgg ? (inspAgg.approved || 0) : 0,
    rejectedInspections: inspAgg ? (inspAgg.rejected || 0) : 0,
    weeklyApprovalsPending: weeklyAgg ? (weeklyAgg.pending || 0) : 0,
    weeklyApprovalsCompleted: weeklyAgg ? (weeklyAgg.approved || 0) : 0,
    itemsRequiringReinspection: inspAgg ? (inspAgg.reinspect || 0) : 0,
    form263Submissions: f263Count || 0,
    form270Submissions: f270Count || 0
  });
});

apiRouter.get('/dashboard/charts', authMiddleware, (req: AuthRequest, res: Response) => {
  // Inspections by status
  const inspByStatus = db.prepare('SELECT status, count(*) as count FROM inspections GROUP BY status').all();

  // Stock by category
  const stockByCategory = db.prepare(`
    SELECT i.category as name, sum(s.quantity) as value, sum(s.total_value) as totalValue
    FROM stock_records s
    JOIN items i ON s.item_id = i.id
    GROUP BY i.category
  `).all();

  // Top warehouses by stock quantity
  const topWarehouses = db.prepare(`
    SELECT w.name, w.warehouse_code, sum(s.quantity) as totalQuantity, sum(s.total_value) as totalValue
    FROM stock_records s
    JOIN warehouses w ON s.warehouse_id = w.id
    GROUP BY w.id
    ORDER BY totalQuantity DESC
    LIMIT 6
  `).all();

  // Weekly review status breakdown
  const weeklyStatus = db.prepare('SELECT status, count(*) as count FROM weekly_reviews GROUP BY status').all();

  res.json({
    inspectionsByStatus: inspByStatus,
    stockByCategory,
    topWarehouses,
    weeklyStatus
  });
});

// ==========================================
// 13. AUDIT LOGS (Admin Only)
// ==========================================
apiRouter.get('/audit-logs', authMiddleware, requireRole(['ADMIN']), (req: Request, res: Response) => {
  const { action, entityType, search } = req.query;
  let sql = `
    SELECT a.*, u.name as user_name, u.email as user_email
    FROM audit_logs a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (action) {
    sql += ' AND a.action = ?';
    params.push(action);
  }
  if (entityType) {
    sql += ' AND a.entity_type = ?';
    params.push(entityType);
  }
  if (search) {
    sql += ' AND (a.entity_id LIKE ? OR a.action LIKE ? OR u.name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  sql += ' ORDER BY a.created_at DESC LIMIT 200';

  const logs = db.prepare(sql).all(...params) as any[];
  res.json({ logs });
});

// ==========================================
// 14. SETTINGS
// ==========================================
apiRouter.get('/settings', authMiddleware, (_req: Request, res: Response) => {
  const settings = db.prepare('SELECT * FROM settings ORDER BY key ASC').all();
  res.json({ settings });
});

apiRouter.patch('/settings', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  try {
    const { settings } = req.body;
    if (!Array.isArray(settings)) {
      return res.status(400).json({ error: 'Settings array required' });
    }
    const stmt = db.prepare('UPDATE settings SET value = ?, updated_at = ? WHERE key = ?');
    const now = new Date().toISOString();
    for (const s of settings) {
      stmt.run(s.value, now, s.key);
    }

    logAudit({
      userId: req.user!.id,
      action: 'UPDATE_SETTINGS',
      entityType: 'SETTING',
      entityId: 'SYSTEM',
      afterData: settings,
      ipAddress: req.ip
    });

    res.json({ message: 'Settings saved successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 15. RECEIPTS MODULE
// Workflow: DRAFT -> SUBMITTED -> PENDING_APPROVAL -> APPROVED -> CONDITION_CHECK
//          -> APPROVED_FOR_ISSUE -> PARTIALLY_ISSUED -> ISSUED/CLOSED -> REJECTED/CANCELLED
// ============================================================================

function generateReceiptNumber(): string {
  return generateSequenceNumber('REC', 'receipts', 'receipt_number');
}

// List receipts with search, filter, sort, pagination
apiRouter.get('/receipts', authMiddleware, (req: AuthRequest, res: Response) => {
  const { warehouseId, status, search, page, limit, sortBy, sortOrder } = req.query;
  const pageNum = Math.max(parseInt(String(page || '1')), 1);
  const limitNum = Math.min(Math.max(parseInt(String(limit || '50')), 1), 200);
  const offset = (pageNum - 1) * limitNum;

  let sql = `
    SELECT r.*, w.name as warehouse_name, w.warehouse_code,
           u1.name as created_by_name, u2.name as approved_by_name
    FROM receipts r
    JOIN warehouses w ON r.warehouse_id = w.id
    LEFT JOIN users u1 ON r.created_by_id = u1.id
    LEFT JOIN users u2 ON r.approved_by_id = u2.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (req.user!.role !== 'ADMIN') {
    const allowed = req.user!.assignedWarehouseIds;
    if (allowed.length === 0) return res.json({ receipts: [], total: 0, page: pageNum, limit: limitNum });
    sql += ` AND r.warehouse_id IN (${allowed.map(() => '?').join(',')})`;
    params.push(...allowed);
  }
  if (warehouseId) { sql += ' AND r.warehouse_id = ?'; params.push(warehouseId); }
  if (status) { sql += ' AND r.status = ?'; params.push(status); }
  if (search) {
    sql += ' AND (r.receipt_number LIKE ? OR r.supplier_name LIKE ? OR r.supplier_invoice_number LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const sortCol = sortBy === 'receipt_date' ? 'r.receipt_date' : 'r.created_at';
  const sortDir = sortOrder === 'asc' ? 'ASC' : 'DESC';
  sql += ` ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`;
  params.push(limitNum, offset);

  const countSql = sql.replace(/SELECT r\.\*[\s\S]*?FROM receipts r[\s\S]*?WHERE 1=1/, 'SELECT count(*) as c FROM receipts r WHERE 1=1');
  // Rebuild count query more simply
  let countQuery = 'SELECT count(*) as c FROM receipts r WHERE 1=1';
  const countParams: any[] = [];
  if (req.user!.role !== 'ADMIN') {
    const allowed = req.user!.assignedWarehouseIds;
    countQuery += ` AND r.warehouse_id IN (${allowed.map(() => '?').join(',')})`;
    countParams.push(...allowed);
  }
  if (warehouseId) { countQuery += ' AND r.warehouse_id = ?'; countParams.push(warehouseId); }
  if (status) { countQuery += ' AND r.status = ?'; countParams.push(status); }
  if (search) {
    countQuery += ' AND (r.receipt_number LIKE ? OR r.supplier_name LIKE ? OR r.supplier_invoice_number LIKE ?)';
    countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const totalRow = db.prepare(countQuery).get(...countParams) as { c: number };
  const receipts = db.prepare(sql).all(...params) as any[];

  res.json({
    receipts: receipts.map(r => ({
      ...r,
      drsNumber: r.drs_number,
      warehouseName: r.warehouse_name,
      warehouseCode: r.warehouse_code,
      createdByName: r.created_by_name,
      approvedByName: r.approved_by_name,
      submittedAt: r.submitted_at,
      approvedAt: r.approved_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    })),
    total: totalRow.c,
    page: pageNum,
    limit: limitNum
  });
});

apiRouter.get('/receipts/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const r = db.prepare('SELECT * FROM receipts WHERE id = ?').get(id) as any;
  if (!r) return res.status(404).json({ error: 'Receipt not found' });
  if (!checkWarehouseAccess(req.user!, r.warehouse_id)) {
    return res.status(403).json({ error: 'Access denied to this warehouse' });
  }
  const items = db.prepare('SELECT * FROM receipt_items WHERE receipt_id = ? ORDER BY created_at ASC').all(id);
  const documents = db.prepare("SELECT * FROM documents WHERE entity_type = 'RECEIPT' AND entity_id = ? ORDER BY uploaded_at DESC").all(id);
  res.json({
    receipt: {
      ...r,
      drsNumber: r.drs_number,
      items: items.map(it => ({
        ...it,
        id: it.id,
        receiptId: it.receipt_id,
        itemId: it.item_id,
        batchNumber: it.batch_number,
        serialNumber: it.serial_number,
        unitCost: it.unit_cost,
        totalValue: it.total_value,
        storageLocation: it.storage_location,
        storageCondition: it.storage_condition,
        dateOfReceipt: it.date_of_receipt,
        nextInspectionDueDate: it.next_inspection_due_date,
        createdAt: it.created_at,
        updatedAt: it.updated_at
      })),
      documents
    }
  });
});

apiRouter.post('/receipts', authMiddleware, requireRole(['ADMIN', 'WAREHOUSE_MANAGER']), (req: AuthRequest, res: Response) => {
  try {
    const {
      warehouseId, drsNumber, supplierName, supplierInvoiceNumber, receiptDate,
      items, conditionCheckStatus, conditionRemarks
    } = req.body;

    if (!warehouseId) return res.status(400).json({ error: 'Warehouse is required' });
    if (!checkWarehouseAccess(req.user!, warehouseId)) {
      return res.status(403).json({ error: 'Access denied to this warehouse' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one receipt item is required' });
    }

    const now = new Date().toISOString();
    const receiptNumber = generateReceiptNumber();
    const id = `rec-${Date.now()}`;

    let totalQty = 0, totalVal = 0;

    // Use a transaction-like approach (SQLite autocommit per statement; we do sequential inserts)
    db.prepare('BEGIN').run();

    try {
      db.prepare(`
        INSERT INTO receipts (id, receipt_number, warehouse_id, drs_number, status, supplier_name,
          supplier_invoice_number, receipt_date, total_items, total_quantity, total_value,
          condition_check_status, condition_remarks, created_by_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'DRAFT', ?, ?, ?, 0, 0, 0, ?, ?, ?, ?, ?)
      `).run(id, receiptNumber, warehouseId, drsNumber || null, supplierName || null,
        supplierInvoiceNumber || null, receiptDate || now,
        conditionCheckStatus || 'PENDING', conditionRemarks || null,
        req.user!.id, now, now);

      const itemStmt = db.prepare(`
        INSERT INTO receipt_items (id, receipt_id, item_id, batch_number, serial_number, quantity,
          unit, unit_cost, total_value, storage_location, storage_condition, date_of_receipt,
          next_inspection_due_date, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_RECEIPT_APPROVAL', ?, ?)
      `);

      for (const it of items) {
        const itemId = `ri-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const qty = Number(it.quantity) || 0;
        const cost = Number(it.unitCost) || 0;
        const val = qty * cost;
        totalQty += qty;
        totalVal += val;
        itemStmt.run(
          itemId, id, it.itemId, it.batchNumber, it.serialNumber || null,
          qty, it.unit || 'ROUNDS', cost, val,
          it.storageLocation || null, it.storageCondition || null,
          it.dateOfReceipt || receiptDate || now, it.nextInspectionDueDate || null,
          now, now
        );
      }

      db.prepare(`
        UPDATE receipts SET total_items = ?, total_quantity = ?, total_value = ?, updated_at = ?
        WHERE id = ?
      `).run(items.length, totalQty, totalVal, now, id);

      db.prepare('COMMIT').run();

      logAudit({
        userId: req.user!.id,
        action: 'CREATE_RECEIPT',
        entityType: 'RECEIPT',
        entityId: id,
        afterData: { receiptNumber, warehouseId, totalItems: items.length, totalQuantity: totalQty },
        ipAddress: req.ip
      });

      res.status(201).json({ message: 'Receipt created successfully', id, receiptNumber });
    } catch (e) {
      db.prepare('ROLLBACK').run();
      throw e;
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.patch('/receipts/:id', authMiddleware, requireRole(['ADMIN', 'WAREHOUSE_MANAGER']), (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM receipts WHERE id = ?').get(id) as any;
    if (!existing) return res.status(404).json({ error: 'Receipt not found' });
    if (!checkWarehouseAccess(req.user!, existing.warehouse_id)) {
      return res.status(403).json({ error: 'Access denied to this warehouse' });
    }
    if (existing.status !== 'DRAFT' && existing.status !== 'REJECTED') {
      return res.status(400).json({ error: 'Only DRAFT or REJECTED receipts can be edited' });
    }

    const b = req.body;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE receipts SET supplier_name = ?, supplier_invoice_number = ?, receipt_date = ?,
        condition_check_status = ?, condition_remarks = ?, updated_at = ?
      WHERE id = ?
    `).run(
      b.supplierName !== undefined ? b.supplierName : existing.supplier_name,
      b.supplierInvoiceNumber !== undefined ? b.supplierInvoiceNumber : existing.supplier_invoice_number,
      b.receiptDate !== undefined ? b.receiptDate : existing.receipt_date,
      b.conditionCheckStatus !== undefined ? b.conditionCheckStatus : existing.condition_check_status,
      b.conditionRemarks !== undefined ? b.conditionRemarks : existing.condition_remarks,
      now, id
    );

    logAudit({
      userId: req.user!.id,
      action: 'UPDATE_RECEIPT',
      entityType: 'RECEIPT',
      entityId: id,
      beforeData: existing,
      afterData: b,
      ipAddress: req.ip
    });

    res.json({ message: 'Receipt updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/receipts/:id', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM receipts WHERE id = ?').get(id) as any;
  if (!existing) return res.status(404).json({ error: 'Receipt not found' });
  if (existing.status !== 'DRAFT' && existing.status !== 'REJECTED' && existing.status !== 'CANCELLED') {
    return res.status(400).json({ error: 'Only DRAFT, REJECTED, or CANCELLED receipts can be deleted' });
  }

  db.prepare('DELETE FROM receipt_items WHERE receipt_id = ?').run(id);
  db.prepare('DELETE FROM receipts WHERE id = ?').run(id);

  logAudit({
    userId: req.user!.id,
    action: 'DELETE_RECEIPT',
    entityType: 'RECEIPT',
    entityId: id,
    beforeData: existing,
    ipAddress: req.ip
  });

  res.json({ message: 'Receipt deleted successfully' });
});

apiRouter.patch('/receipts/:id/submit', authMiddleware, requireRole(['ADMIN', 'WAREHOUSE_MANAGER']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const r = db.prepare('SELECT * FROM receipts WHERE id = ?').get(id) as any;
  if (!r) return res.status(404).json({ error: 'Receipt not found' });
  if (!checkWarehouseAccess(req.user!, r.warehouse_id)) return res.status(403).json({ error: 'Access denied' });
  if (r.status !== 'DRAFT') return res.status(400).json({ error: 'Only DRAFT receipts can be submitted' });

  const now = new Date().toISOString();
  db.prepare("UPDATE receipts SET status = 'SUBMITTED', submitted_at = ?, submitted_by_id = ?, updated_at = ? WHERE id = ?")
    .run(now, req.user!.id, now, id);

  logAudit({
    userId: req.user!.id,
    action: 'SUBMIT_RECEIPT',
    entityType: 'RECEIPT',
    entityId: id,
    ipAddress: req.ip
  });

  res.json({ message: 'Receipt submitted for approval' });
});

apiRouter.patch('/receipts/:id/approve', authMiddleware, requireRole(['ADMIN', 'WAREHOUSE_MANAGER']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { remarks } = req.body;
  if (!remarks || !remarks.trim()) return res.status(400).json({ error: 'Approval remarks are mandatory' });

  const r = db.prepare('SELECT * FROM receipts WHERE id = ?').get(id) as any;
  if (!r) return res.status(404).json({ error: 'Receipt not found' });
  if (!checkWarehouseAccess(req.user!, r.warehouse_id)) return res.status(403).json({ error: 'Access denied' });
  if (r.status !== 'SUBMITTED') return res.status(400).json({ error: 'Only SUBMITTED receipts can be approved' });

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE receipts SET status = 'APPROVED', approved_by_id = ?, approved_at = ?,
      condition_check_status = 'PENDING', updated_at = ? WHERE id = ?
  `).run(req.user!.id, now, now, id);

  logAudit({
    userId: req.user!.id,
    action: 'APPROVE_RECEIPT',
    entityType: 'RECEIPT',
    entityId: id,
    afterData: { remarks },
    ipAddress: req.ip
  });

  res.json({ message: 'Receipt approved successfully' });
});

apiRouter.patch('/receipts/:id/reject', authMiddleware, requireRole(['ADMIN', 'WAREHOUSE_MANAGER']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { remarks } = req.body;
  if (!remarks || !remarks.trim()) return res.status(400).json({ error: 'Rejection remarks are mandatory' });

  const r = db.prepare('SELECT * FROM receipts WHERE id = ?').get(id) as any;
  if (!r) return res.status(404).json({ error: 'Receipt not found' });
  if (!checkWarehouseAccess(req.user!, r.warehouse_id)) return res.status(403).json({ error: 'Access denied' });

  const now = new Date().toISOString();
  db.prepare("UPDATE receipts SET status = 'REJECTED', rejection_reason = ?, updated_at = ? WHERE id = ?")
    .run(remarks.trim(), now, id);

  logAudit({
    userId: req.user!.id,
    action: 'REJECT_RECEIPT',
    entityType: 'RECEIPT',
    entityId: id,
    afterData: { remarks },
    ipAddress: req.ip
  });

  res.json({ message: 'Receipt rejected' });
});

// ============================================================================
// 16. ISSUES MODULE
// Workflow: DRAFT -> SUBMITTED -> PENDING_APPROVAL -> APPROVED -> PARTIALLY_ISSUED -> COMPLETED
//          -> REJECTED/CANCELLED
// ============================================================================

function generateIssueNumber(): string {
  return generateSequenceNumber('ISS', 'issues', 'issue_number');
}

apiRouter.get('/issues', authMiddleware, (req: AuthRequest, res: Response) => {
  const { warehouseId, status, search, page, limit, sortBy, sortOrder } = req.query;
  const pageNum = Math.max(parseInt(String(page || '1')), 1);
  const limitNum = Math.min(Math.max(parseInt(String(limit || '50')), 1), 200);
  const offset = (pageNum - 1) * limitNum;

  let sql = `
    SELECT i.*, w.name as warehouse_name, w.warehouse_code,
           u1.name as created_by_name, u2.name as approved_by_name
    FROM issues i
    JOIN warehouses w ON i.warehouse_id = w.id
    LEFT JOIN users u1 ON i.created_by_id = u1.id
    LEFT JOIN users u2 ON i.approved_by_id = u2.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (req.user!.role !== 'ADMIN') {
    const allowed = req.user!.assignedWarehouseIds;
    if (allowed.length === 0) return res.json({ issues: [], total: 0, page: pageNum, limit: limitNum });
    sql += ` AND i.warehouse_id IN (${allowed.map(() => '?').join(',')})`;
    params.push(...allowed);
  }
  if (warehouseId) { sql += ' AND i.warehouse_id = ?'; params.push(warehouseId); }
  if (status) { sql += ' AND i.status = ?'; params.push(status); }
  if (search) {
    sql += ' AND (i.issue_number LIKE ? OR i.issue_to_name LIKE ? OR i.issue_to_organization LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const sortCol = sortBy === 'issue_date' ? 'i.issue_date' : 'i.created_at';
  const sortDir = sortOrder === 'asc' ? 'ASC' : 'DESC';
  sql += ` ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`;
  params.push(limitNum, offset);

  let countQuery = 'SELECT count(*) as c FROM issues i WHERE 1=1';
  const countParams: any[] = [];
  if (req.user!.role !== 'ADMIN') {
    const allowed = req.user!.assignedWarehouseIds;
    countQuery += ` AND i.warehouse_id IN (${allowed.map(() => '?').join(',')})`;
    countParams.push(...allowed);
  }
  if (warehouseId) { countQuery += ' AND i.warehouse_id = ?'; countParams.push(warehouseId); }
  if (status) { countQuery += ' AND i.status = ?'; countParams.push(status); }
  if (search) {
    countQuery += ' AND (i.issue_number LIKE ? OR i.issue_to_name LIKE ? OR i.issue_to_organization LIKE ?)';
    countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const totalRow = db.prepare(countQuery).get(...countParams) as { c: number };
  const issues = db.prepare(sql).all(...params) as any[];

  res.json({
    issues: issues.map(it => ({
      ...it,
      drsNumber: it.drs_number,
      warehouseName: it.warehouse_name,
      warehouseCode: it.warehouse_code,
      createdByName: it.created_by_name,
      approvedByName: it.approved_by_name,
      submittedAt: it.submitted_at,
      approvedAt: it.approved_at,
      completedAt: it.completed_at,
      createdAt: it.created_at,
      updatedAt: it.updated_at
    })),
    total: totalRow.c,
    page: pageNum,
    limit: limitNum
  });
});

apiRouter.get('/issues/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const it = db.prepare('SELECT * FROM issues WHERE id = ?').get(id) as any;
  if (!it) return res.status(404).json({ error: 'Issue not found' });
  if (!checkWarehouseAccess(req.user!, it.warehouse_id)) return res.status(403).json({ error: 'Access denied' });
  const items = db.prepare('SELECT * FROM issue_items WHERE issue_id = ? ORDER BY created_at ASC').all(id);
  const documents = db.prepare("SELECT * FROM documents WHERE entity_type = 'ISSUE' AND entity_id = ? ORDER BY uploaded_at DESC").all(id);
  res.json({
    issue: {
      ...it,
      drsNumber: it.drs_number,
      items: items.map(i => ({
        ...i,
        id: i.id,
        issueId: i.issue_id,
        receiptId: i.receipt_id,
        stockRecordId: i.stock_record_id,
        itemId: i.item_id,
        batchNumber: i.batch_number,
        serialNumber: i.serial_number,
        quantityRequested: i.quantity_requested,
        quantityApproved: i.quantity_approved,
        quantityIssued: i.quantity_issued,
        unitCost: i.unit_cost,
        totalValue: i.total_value,
        createdAt: i.created_at,
        updatedAt: i.updated_at
      })),
      documents
    }
  });
});

apiRouter.post('/issues', authMiddleware, requireRole(['ADMIN', 'WAREHOUSE_MANAGER']), (req: AuthRequest, res: Response) => {
  try {
    const { warehouseId, drsNumber, issueToName, issueToOrganization, issueDate, items } = req.body;
    if (!warehouseId) return res.status(400).json({ error: 'Warehouse is required' });
    if (!checkWarehouseAccess(req.user!, warehouseId)) return res.status(403).json({ error: 'Access denied' });
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one issue item is required' });
    }

    const now = new Date().toISOString();
    const issueNumber = generateIssueNumber();
    const id = `iss-${Date.now()}`;
    let totalQty = 0, totalVal = 0;

    db.prepare('BEGIN').run();
    try {
      db.prepare(`
        INSERT INTO issues (id, issue_number, warehouse_id, drs_number, status, issue_to_name,
          issue_to_organization, issue_date, total_items, total_quantity, total_value,
          created_by_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'DRAFT', ?, ?, ?, 0, 0, 0, ?, ?, ?)
      `).run(id, issueNumber, warehouseId, drsNumber || null, issueToName || null,
        issueToOrganization || null, issueDate || now, req.user!.id, now, now);

      const itemStmt = db.prepare(`
        INSERT INTO issue_items (id, issue_id, receipt_id, stock_record_id, item_id, batch_number,
          serial_number, quantity_requested, quantity_approved, quantity_issued, unit,
          unit_cost, total_value, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, 'PENDING_ISSUE_APPROVAL', ?, ?)
      `);

      for (const it of items) {
        const itemId = `ii-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const qty = Number(it.quantityRequested) || 0;
        const cost = Number(it.unitCost) || 0;
        const val = qty * cost;
        totalQty += qty;
        totalVal += val;
        itemStmt.run(
          itemId, id, it.receiptId || null, it.stockRecordId || null, it.itemId,
          it.batchNumber, it.serialNumber || null, qty, it.unit || 'ROUNDS', cost, val,
          now, now
        );
      }

      db.prepare(`
        UPDATE issues SET total_items = ?, total_quantity = ?, total_value = ?, updated_at = ?
        WHERE id = ?
      `).run(items.length, totalQty, totalVal, now, id);

      db.prepare('COMMIT').run();

      logAudit({
        userId: req.user!.id,
        action: 'CREATE_ISSUE',
        entityType: 'ISSUE',
        entityId: id,
        afterData: { issueNumber, warehouseId, totalItems: items.length },
        ipAddress: req.ip
      });

      res.status(201).json({ message: 'Issue created successfully', id, issueNumber });
    } catch (e) {
      db.prepare('ROLLBACK').run();
      throw e;
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.patch('/issues/:id', authMiddleware, requireRole(['ADMIN', 'WAREHOUSE_MANAGER']), (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM issues WHERE id = ?').get(id) as any;
    if (!existing) return res.status(404).json({ error: 'Issue not found' });
    if (!checkWarehouseAccess(req.user!, existing.warehouse_id)) return res.status(403).json({ error: 'Access denied' });
    if (existing.status !== 'DRAFT' && existing.status !== 'REJECTED') {
      return res.status(400).json({ error: 'Only DRAFT or REJECTED issues can be edited' });
    }

    const b = req.body;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE issues SET issue_to_name = ?, issue_to_organization = ?, issue_date = ?, updated_at = ?
      WHERE id = ?
    `).run(
      b.issueToName !== undefined ? b.issueToName : existing.issue_to_name,
      b.issueToOrganization !== undefined ? b.issueToOrganization : existing.issue_to_organization,
      b.issueDate !== undefined ? b.issueDate : existing.issue_date,
      now, id
    );

    logAudit({
      userId: req.user!.id,
      action: 'UPDATE_ISSUE',
      entityType: 'ISSUE',
      entityId: id,
      beforeData: existing,
      afterData: b,
      ipAddress: req.ip
    });

    res.json({ message: 'Issue updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/issues/:id', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM issues WHERE id = ?').get(id) as any;
  if (!existing) return res.status(404).json({ error: 'Issue not found' });
  if (existing.status !== 'DRAFT' && existing.status !== 'REJECTED' && existing.status !== 'CANCELLED') {
    return res.status(400).json({ error: 'Only DRAFT, REJECTED, or CANCELLED issues can be deleted' });
  }

  db.prepare('DELETE FROM issue_items WHERE issue_id = ?').run(id);
  db.prepare('DELETE FROM issues WHERE id = ?').run(id);

  logAudit({
    userId: req.user!.id,
    action: 'DELETE_ISSUE',
    entityType: 'ISSUE',
    entityId: id,
    beforeData: existing,
    ipAddress: req.ip
  });

  res.json({ message: 'Issue deleted successfully' });
});

apiRouter.patch('/issues/:id/submit', authMiddleware, requireRole(['ADMIN', 'WAREHOUSE_MANAGER']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const it = db.prepare('SELECT * FROM issues WHERE id = ?').get(id) as any;
  if (!it) return res.status(404).json({ error: 'Issue not found' });
  if (!checkWarehouseAccess(req.user!, it.warehouse_id)) return res.status(403).json({ error: 'Access denied' });
  if (it.status !== 'DRAFT') return res.status(400).json({ error: 'Only DRAFT issues can be submitted' });

  const now = new Date().toISOString();
  db.prepare("UPDATE issues SET status = 'SUBMITTED', submitted_at = ?, submitted_by_id = ?, updated_at = ? WHERE id = ?")
    .run(now, req.user!.id, now, id);

  logAudit({
    userId: req.user!.id,
    action: 'SUBMIT_ISSUE',
    entityType: 'ISSUE',
    entityId: id,
    ipAddress: req.ip
  });

  res.json({ message: 'Issue submitted for approval' });
});

apiRouter.patch('/issues/:id/approve', authMiddleware, requireRole(['ADMIN', 'WAREHOUSE_MANAGER']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { remarks } = req.body;
  if (!remarks || !remarks.trim()) return res.status(400).json({ error: 'Approval remarks are mandatory' });

  const it = db.prepare('SELECT * FROM issues WHERE id = ?').get(id) as any;
  if (!it) return res.status(404).json({ error: 'Issue not found' });
  if (!checkWarehouseAccess(req.user!, it.warehouse_id)) return res.status(403).json({ error: 'Access denied' });
  if (it.status !== 'SUBMITTED') return res.status(400).json({ error: 'Only SUBMITTED issues can be approved' });

  const now = new Date().toISOString();
  db.prepare("UPDATE issues SET status = 'APPROVED', approved_by_id = ?, approved_at = ?, updated_at = ? WHERE id = ?")
    .run(req.user!.id, now, now, id);

  logAudit({
    userId: req.user!.id,
    action: 'APPROVE_ISSUE',
    entityType: 'ISSUE',
    entityId: id,
    afterData: { remarks },
    ipAddress: req.ip
  });

  res.json({ message: 'Issue approved successfully' });
});

apiRouter.patch('/issues/:id/reject', authMiddleware, requireRole(['ADMIN', 'WAREHOUSE_MANAGER']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { remarks } = req.body;
  if (!remarks || !remarks.trim()) return res.status(400).json({ error: 'Rejection remarks are mandatory' });

  const it = db.prepare('SELECT * FROM issues WHERE id = ?').get(id) as any;
  if (!it) return res.status(404).json({ error: 'Issue not found' });
  if (!checkWarehouseAccess(req.user!, it.warehouse_id)) return res.status(403).json({ error: 'Access denied' });

  const now = new Date().toISOString();
  db.prepare("UPDATE issues SET status = 'REJECTED', rejection_reason = ?, updated_at = ? WHERE id = ?")
    .run(remarks.trim(), now, id);

  logAudit({
    userId: req.user!.id,
    action: 'REJECT_ISSUE',
    entityType: 'ISSUE',
    entityId: id,
    afterData: { remarks },
    ipAddress: req.ip
  });

  res.json({ message: 'Issue rejected' });
});

apiRouter.patch('/issues/:id/complete', authMiddleware, requireRole(['ADMIN', 'WAREHOUSE_MANAGER']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const it = db.prepare('SELECT * FROM issues WHERE id = ?').get(id) as any;
  if (!it) return res.status(404).json({ error: 'Issue not found' });
  if (!checkWarehouseAccess(req.user!, it.warehouse_id)) return res.status(403).json({ error: 'Access denied' });
  if (it.status !== 'APPROVED' && it.status !== 'PARTIALLY_ISSUED') {
    return res.status(400).json({ error: 'Only APPROVED or PARTIALLY_ISSUED issues can be completed' });
  }

  const now = new Date().toISOString();
  db.prepare("UPDATE issues SET status = 'COMPLETED', completed_at = ?, updated_at = ? WHERE id = ?")
    .run(now, now, id);

  // Deduct stock from stock records for issued items
  const issueItems = db.prepare('SELECT * FROM issue_items WHERE issue_id = ? AND quantity_issued > 0').all(id);
  for (const ii of issueItems) {
    if (ii.stock_record_id) {
      const sr = db.prepare('SELECT * FROM stock_records WHERE id = ?').get(ii.stock_record_id) as any;
      if (sr) {
        const qtyIssued = Number(ii.quantity_issued) || 0;
        const newQty = Math.max(0, Number(sr.quantity) - qtyIssued);
        const newStatus = newQty <= 0 ? 'ISSUED' : sr.status;
        db.prepare(`
          UPDATE stock_records SET quantity = ?, total_value = ?, status = ?, updated_at = ?
          WHERE id = ?
        `).run(newQty, newQty * sr.unit_cost, newStatus, now, ii.stock_record_id);

        // Ledger entry
        const balanceRow = db.prepare("SELECT coalesce(sum(quantity),0) as bal FROM stock_records WHERE warehouse_id = ? AND item_id = ? AND status = 'IN_STOCK'").get(sr.warehouse_id, sr.item_id) as any;
        db.prepare(`
          INSERT INTO stock_ledgers (id, warehouse_id, item_id, stock_record_id, receipt_id, issue_id,
            transaction_type, quantity, unit_cost, total_value, batch_number, serial_number,
            balance_after_transaction, remarks, created_by_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, 'OUTWARD', ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          `led-iss-${Date.now()}`, sr.warehouse_id, sr.item_id, ii.stock_record_id, null, id,
          qtyIssued, sr.unit_cost, qtyIssued * Number(sr.unit_cost),
          sr.batch_number, sr.serial_number, balanceRow ? balanceRow.bal : 0,
          `Issue against ${it.issue_number}`, req.user!.id, now
        );
      }
    }
  }

  logAudit({
    userId: req.user!.id,
    action: 'COMPLETE_ISSUE',
    entityType: 'ISSUE',
    entityId: id,
    ipAddress: req.ip
  });

  res.json({ message: 'Issue completed and stock deducted' });
});

// ============================================================================
// 17. DRS NUMBER MODULE
// ============================================================================

function generateDRSNumber(): string {
  return generateSequenceNumber('DRS', 'drs_numbers', 'drs_number');
}

apiRouter.get('/drs', authMiddleware, (req: AuthRequest, res: Response) => {
  const { warehouseId, status, search, page, limit } = req.query;
  const pageNum = Math.max(parseInt(String(page || '1')), 1);
  const limitNum = Math.min(Math.max(parseInt(String(limit || '50')), 1), 200);
  const offset = (pageNum - 1) * limitNum;

  let sql = `
    SELECT d.*, w.name as warehouse_name, w.warehouse_code, u.name as created_by_name
    FROM drs_numbers d
    LEFT JOIN warehouses w ON d.warehouse_id = w.id
    LEFT JOIN users u ON d.created_by_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (req.user!.role !== 'ADMIN') {
    const allowed = req.user!.assignedWarehouseIds;
    if (allowed.length === 0) return res.json({ drs: [], total: 0, page: pageNum, limit: limitNum });
    sql += ` AND d.warehouse_id IN (${allowed.map(() => '?').join(',')})`;
    params.push(...allowed);
  }
  if (warehouseId) { sql += ' AND d.warehouse_id = ?'; params.push(warehouseId); }
  if (status) { sql += ' AND d.status = ?'; params.push(status); }
  if (search) {
    sql += ' AND (d.drs_number LIKE ?)';
    params.push(`%${search}%`);
  }
  sql += ' ORDER BY d.created_at DESC LIMIT ? OFFSET ?';
  params.push(limitNum, offset);

  let countQuery = 'SELECT count(*) as c FROM drs_numbers d WHERE 1=1';
  const countParams: any[] = [];
  if (req.user!.role !== 'ADMIN') {
    const allowed = req.user!.assignedWarehouseIds;
    countQuery += ` AND d.warehouse_id IN (${allowed.map(() => '?').join(',')})`;
    countParams.push(...allowed);
  }
  if (warehouseId) { countQuery += ' AND d.warehouse_id = ?'; countParams.push(warehouseId); }
  if (status) { countQuery += ' AND d.status = ?'; countParams.push(status); }
  if (search) { countQuery += ' AND d.drs_number LIKE ?'; countParams.push(`%${search}%`); }

  const totalRow = db.prepare(countQuery).get(...countParams) as { c: number };
  const drs = db.prepare(sql).all(...params) as any[];

  res.json({
    drs: drs.map(d => ({
      ...d,
      warehouseName: d.warehouse_name,
      warehouseCode: d.warehouse_code,
      createdByName: d.created_by_name,
      createdAt: d.created_at,
      updatedAt: d.updated_at
    })),
    total: totalRow.c, page: pageNum, limit: limitNum
  });
});

apiRouter.post('/drs', authMiddleware, requireRole(['ADMIN', 'WAREHOUSE_MANAGER', 'TECHNICAL_INSPECTOR']), (req: AuthRequest, res: Response) => {
  try {
    const { warehouseId, drsNumber, sourceModule, linkedEntityType, linkedEntityId } = req.body;
    if (!warehouseId) return res.status(400).json({ error: 'Warehouse is required' });
    if (!checkWarehouseAccess(req.user!, warehouseId)) return res.status(403).json({ error: 'Access denied' });

    const number = drsNumber || generateDRSNumber();
    const existing = db.prepare('SELECT id FROM drs_numbers WHERE drs_number = ?').get(number);
    if (existing) return res.status(400).json({ error: 'DRS number already exists' });

    const id = `drs-${Date.now()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO drs_numbers (id, drs_number, warehouse_id, source_module, linked_entity_type,
        linked_entity_id, status, created_by_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?)
    `).run(id, number, warehouseId, sourceModule || 'MANUAL', linkedEntityType || null,
      linkedEntityId || null, req.user!.id, now, now);

    logAudit({
      userId: req.user!.id,
      action: 'CREATE_DRS',
      entityType: 'DRS',
      entityId: id,
      afterData: { drsNumber: number, warehouseId },
      ipAddress: req.ip
    });

    res.status(201).json({ message: 'DRS number created', id, drsNumber: number });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/drs/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const d = db.prepare('SELECT * FROM drs_numbers WHERE id = ?').get(id) as any;
  if (!d) return res.status(404).json({ error: 'DRS number not found' });
  if (!checkWarehouseAccess(req.user!, d.warehouse_id)) return res.status(403).json({ error: 'Access denied' });
  res.json({ drs: d });
});

apiRouter.patch('/drs/:id/cancel', authMiddleware, requireRole(['ADMIN', 'WAREHOUSE_MANAGER']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { remarks } = req.body;
  if (!remarks || !remarks.trim()) return res.status(400).json({ error: 'Cancellation remarks are mandatory' });

  const d = db.prepare('SELECT * FROM drs_numbers WHERE id = ?').get(id) as any;
  if (!d) return res.status(404).json({ error: 'DRS number not found' });
  if (!checkWarehouseAccess(req.user!, d.warehouse_id)) return res.status(403).json({ error: 'Access denied' });
  if (d.status !== 'ACTIVE') return res.status(400).json({ error: 'Only ACTIVE DRS numbers can be cancelled' });

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE drs_numbers SET status = 'CANCELLED', cancel_reason = ?, cancelled_by_id = ?,
      cancelled_at = ?, updated_at = ? WHERE id = ?
  `).run(remarks.trim(), req.user!.id, now, now, id);

  logAudit({
    userId: req.user!.id,
    action: 'CANCEL_DRS',
    entityType: 'DRS',
    entityId: id,
    afterData: { cancelReason: remarks },
    ipAddress: req.ip
  });

  res.json({ message: 'DRS number cancelled' });
});

// ============================================================================
// 18. EXTENDED REPORTS
// ============================================================================

apiRouter.get('/reports/receipt-register', authMiddleware, (req: AuthRequest, res: Response) => {
  const { warehouseId, status, fromDate, toDate, search } = req.query;
  let sql = `
    SELECT r.*, w.name as warehouse_name, w.warehouse_code, u.name as created_by_name
    FROM receipts r
    JOIN warehouses w ON r.warehouse_id = w.id
    LEFT JOIN users u ON r.created_by_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (req.user!.role !== 'ADMIN') {
    const allowed = req.user!.assignedWarehouseIds;
    if (allowed.length === 0) return res.json({ records: [] });
    sql += ` AND r.warehouse_id IN (${allowed.map(() => '?').join(',')})`;
    params.push(...allowed);
  }
  if (warehouseId) { sql += ' AND r.warehouse_id = ?'; params.push(warehouseId); }
  if (status) { sql += ' AND r.status = ?'; params.push(status); }
  if (fromDate) { sql += ' AND r.receipt_date >= ?'; params.push(fromDate); }
  if (toDate) { sql += ' AND r.receipt_date <= ?'; params.push(toDate); }
  if (search) {
    sql += ' AND (r.receipt_number LIKE ? OR r.supplier_name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  sql += ' ORDER BY r.receipt_date DESC';
  const rows = db.prepare(sql).all(...params) as any[];
  res.json({ reportTitle: 'Receipt Register', records: rows, generatedAt: new Date().toISOString() });
});

apiRouter.get('/reports/issue-register', authMiddleware, (req: AuthRequest, res: Response) => {
  const { warehouseId, status, fromDate, toDate, search } = req.query;
  let sql = `
    SELECT i.*, w.name as warehouse_name, w.warehouse_code, u.name as created_by_name
    FROM issues i
    JOIN warehouses w ON i.warehouse_id = w.id
    LEFT JOIN users u ON i.created_by_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (req.user!.role !== 'ADMIN') {
    const allowed = req.user!.assignedWarehouseIds;
    if (allowed.length === 0) return res.json({ records: [] });
    sql += ` AND i.warehouse_id IN (${allowed.map(() => '?').join(',')})`;
    params.push(...allowed);
  }
  if (warehouseId) { sql += ' AND i.warehouse_id = ?'; params.push(warehouseId); }
  if (status) { sql += ' AND i.status = ?'; params.push(status); }
  if (fromDate) { sql += ' AND i.issue_date >= ?'; params.push(fromDate); }
  if (toDate) { sql += ' AND i.issue_date <= ?'; params.push(toDate); }
  if (search) {
    sql += ' AND (i.issue_number LIKE ? OR i.issue_to_name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  sql += ' ORDER BY i.issue_date DESC';
  const rows = db.prepare(sql).all(...params) as any[];
  res.json({ reportTitle: 'Issue Register', records: rows, generatedAt: new Date().toISOString() });
});

apiRouter.get('/reports/inspection-due', authMiddleware, (req: AuthRequest, res: Response) => {
  const { warehouseId, itemId, status } = req.query;
  let sql = `
    SELECT s.*, w.name as warehouse_name, w.warehouse_code, i.item_name, i.item_code, i.category
    FROM stock_records s
    JOIN warehouses w ON s.warehouse_id = w.id
    JOIN items i ON s.item_id = i.id
    WHERE (s.next_inspection_due_date IS NOT NULL AND date(s.next_inspection_due_date) <= date('now'))
       OR s.status = 'INSPECTION_DUE'
  `;
  const params: any[] = [];
  if (req.user!.role !== 'ADMIN') {
    const allowed = req.user!.assignedWarehouseIds;
    if (allowed.length === 0) return res.json({ records: [] });
    sql += ` AND s.warehouse_id IN (${allowed.map(() => '?').join(',')})`;
    params.push(...allowed);
  }
  if (warehouseId) { sql += ' AND s.warehouse_id = ?'; params.push(warehouseId); }
  if (itemId) { sql += ' AND s.item_id = ?'; params.push(itemId); }
  if (status) { sql += ' AND s.status = ?'; params.push(status); }
  sql += ' ORDER BY s.next_inspection_due_date ASC';
  const rows = db.prepare(sql).all(...params) as any[];
  res.json({ reportTitle: 'Inspection Due Report', records: rows, generatedAt: new Date().toISOString() });
});

apiRouter.get('/reports/overdue-inspections', authMiddleware, (req: AuthRequest, res: Response) => {
  const { warehouseId } = req.query;
  let sql = `
    SELECT s.*, w.name as warehouse_name, w.warehouse_code, i.item_name, i.item_code
    FROM stock_records s
    JOIN warehouses w ON s.warehouse_id = w.id
    JOIN items i ON s.item_id = i.id
    WHERE s.next_inspection_due_date IS NOT NULL AND date(s.next_inspection_due_date) < date('now')
  `;
  const params: any[] = [];
  if (req.user!.role !== 'ADMIN') {
    const allowed = req.user!.assignedWarehouseIds;
    if (allowed.length === 0) return res.json({ records: [] });
    sql += ` AND s.warehouse_id IN (${allowed.map(() => '?').join(',')})`;
    params.push(...allowed);
  }
  if (warehouseId) { sql += ' AND s.warehouse_id = ?'; params.push(warehouseId); }
  sql += ' ORDER BY s.next_inspection_due_date ASC';
  const rows = db.prepare(sql).all(...params) as any[];
  res.json({ reportTitle: 'Overdue Inspection Report', records: rows, generatedAt: new Date().toISOString() });
});

apiRouter.get('/reports/rejected-reinspection', authMiddleware, (req: AuthRequest, res: Response) => {
  const { warehouseId, itemId } = req.query;
  let sql = `
    SELECT insp.*, w.name as warehouse_name, w.warehouse_code, i.item_name, i.item_code
    FROM inspections insp
    JOIN warehouses w ON insp.warehouse_id = w.id
    JOIN items i ON insp.item_id = i.id
    WHERE insp.status IN ('REJECTED', 'REINSPECTION_REQUIRED')
  `;
  const params: any[] = [];
  if (req.user!.role !== 'ADMIN') {
    const allowed = req.user!.assignedWarehouseIds;
    if (allowed.length === 0) return res.json({ records: [] });
    sql += ` AND insp.warehouse_id IN (${allowed.map(() => '?').join(',')})`;
    params.push(...allowed);
  }
  if (warehouseId) { sql += ' AND insp.warehouse_id = ?'; params.push(warehouseId); }
  if (itemId) { sql += ' AND insp.item_id = ?'; params.push(itemId); }
  sql += ' ORDER BY insp.updated_at DESC';
  const rows = db.prepare(sql).all(...params) as any[];
  res.json({ reportTitle: 'Rejected / Reinspection Report', records: rows, generatedAt: new Date().toISOString() });
});

apiRouter.get('/reports/ammo-inspection', authMiddleware, (req: AuthRequest, res: Response) => {
  const { warehouseId, status, fromDate, toDate } = req.query;
  let sql = `
    SELECT insp.*, w.name as warehouse_name, w.warehouse_code, i.item_name, i.item_code,
           u1.name as inspector_name, u2.name as approver_name
    FROM inspections insp
    JOIN warehouses w ON insp.warehouse_id = w.id
    JOIN items i ON insp.item_id = i.id
    LEFT JOIN users u1 ON insp.inspector_id = u1.id
    LEFT JOIN users u2 ON insp.approved_by_id = u2.id
    WHERE insp.form_type = 'AMMUNITION_INSPECTION_FORM'
  `;
  const params: any[] = [];
  if (req.user!.role !== 'ADMIN') {
    const allowed = req.user!.assignedWarehouseIds;
    if (allowed.length === 0) return res.json({ records: [] });
    sql += ` AND insp.warehouse_id IN (${allowed.map(() => '?').join(',')})`;
    params.push(...allowed);
  }
  if (warehouseId) { sql += ' AND insp.warehouse_id = ?'; params.push(warehouseId); }
  if (status) { sql += ' AND insp.status = ?'; params.push(status); }
  if (fromDate) { sql += ' AND insp.inspection_date >= ?'; params.push(fromDate); }
  if (toDate) { sql += ' AND insp.inspection_date <= ?'; params.push(toDate); }
  sql += ' ORDER BY insp.inspection_date DESC';
  const rows = db.prepare(sql).all(...params) as any[];
  res.json({ reportTitle: 'Ammunition Inspection Report', records: rows, generatedAt: new Date().toISOString() });
});

apiRouter.get('/reports/tech-inspection', authMiddleware, (req: AuthRequest, res: Response) => {
  const { warehouseId, status, fromDate, toDate } = req.query;
  let sql = `
    SELECT insp.*, w.name as warehouse_name, w.warehouse_code, i.item_name, i.item_code,
           u1.name as inspector_name, u2.name as approver_name
    FROM inspections insp
    JOIN warehouses w ON insp.warehouse_id = w.id
    JOIN items i ON insp.item_id = i.id
    LEFT JOIN users u1 ON insp.inspector_id = u1.id
    LEFT JOIN users u2 ON insp.approved_by_id = u2.id
    WHERE insp.form_type IN ('TECHNICAL_INSPECTION_FORM_263', 'TECHNICAL_INSPECTION_FORM_270')
  `;
  const params: any[] = [];
  if (req.user!.role !== 'ADMIN') {
    const allowed = req.user!.assignedWarehouseIds;
    if (allowed.length === 0) return res.json({ records: [] });
    sql += ` AND insp.warehouse_id IN (${allowed.map(() => '?').join(',')})`;
    params.push(...allowed);
  }
  if (warehouseId) { sql += ' AND insp.warehouse_id = ?'; params.push(warehouseId); }
  if (status) { sql += ' AND insp.status = ?'; params.push(status); }
  if (fromDate) { sql += ' AND insp.inspection_date >= ?'; params.push(fromDate); }
  if (toDate) { sql += ' AND insp.inspection_date <= ?'; params.push(toDate); }
  sql += ' ORDER BY insp.inspection_date DESC';
  const rows = db.prepare(sql).all(...params) as any[];
  res.json({ reportTitle: 'Technical Inspection Report', records: rows, generatedAt: new Date().toISOString() });
});

apiRouter.get('/reports/form-263-register', authMiddleware, (req: AuthRequest, res: Response) => {
  const { warehouseId, status } = req.query;
  let sql = `
    SELECT sub.*, t.form_name, t.form_code, w.name as warehouse_name, w.warehouse_code,
           u.name as submitter_name
    FROM form_submissions sub
    JOIN form_templates t ON sub.form_template_id = t.id
    JOIN warehouses w ON sub.warehouse_id = w.id
    LEFT JOIN users u ON sub.submitted_by_id = u.id
    WHERE t.form_type = 'TECHNICAL_INSPECTION_FORM_263'
  `;
  const params: any[] = [];
  if (req.user!.role !== 'ADMIN') {
    const allowed = req.user!.assignedWarehouseIds;
    if (allowed.length === 0) return res.json({ records: [] });
    sql += ` AND sub.warehouse_id IN (${allowed.map(() => '?').join(',')})`;
    params.push(...allowed);
  }
  if (warehouseId) { sql += ' AND sub.warehouse_id = ?'; params.push(warehouseId); }
  if (status) { sql += ' AND sub.status = ?'; params.push(status); }
  sql += ' ORDER BY sub.created_at DESC';
  const rows = db.prepare(sql).all(...params) as any[];
  res.json({ reportTitle: 'Form 263 Register', records: rows, generatedAt: new Date().toISOString() });
});

apiRouter.get('/reports/form-270-register', authMiddleware, (req: AuthRequest, res: Response) => {
  const { warehouseId, status } = req.query;
  let sql = `
    SELECT sub.*, t.form_name, t.form_code, w.name as warehouse_name, w.warehouse_code,
           u.name as submitter_name
    FROM form_submissions sub
    JOIN form_templates t ON sub.form_template_id = t.id
    JOIN warehouses w ON sub.warehouse_id = w.id
    LEFT JOIN users u ON sub.submitted_by_id = u.id
    WHERE t.form_type = 'TECHNICAL_INSPECTION_FORM_270'
  `;
  const params: any[] = [];
  if (req.user!.role !== 'ADMIN') {
    const allowed = req.user!.assignedWarehouseIds;
    if (allowed.length === 0) return res.json({ records: [] });
    sql += ` AND sub.warehouse_id IN (${allowed.map(() => '?').join(',')})`;
    params.push(...allowed);
  }
  if (warehouseId) { sql += ' AND sub.warehouse_id = ?'; params.push(warehouseId); }
  if (status) { sql += ' AND sub.status = ?'; params.push(status); }
  sql += ' ORDER BY sub.created_at DESC';
  const rows = db.prepare(sql).all(...params) as any[];
  res.json({ reportTitle: 'Form 270 Register', records: rows, generatedAt: new Date().toISOString() });
});

apiRouter.get('/reports/form-submission-register', authMiddleware, (req: AuthRequest, res: Response) => {
  const { warehouseId, formType, status } = req.query;
  let sql = `
    SELECT sub.*, t.form_name, t.form_code, t.form_type, w.name as warehouse_name,
           w.warehouse_code, u.name as submitter_name
    FROM form_submissions sub
    JOIN form_templates t ON sub.form_template_id = t.id
    JOIN warehouses w ON sub.warehouse_id = w.id
    LEFT JOIN users u ON sub.submitted_by_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (req.user!.role !== 'ADMIN') {
    const allowed = req.user!.assignedWarehouseIds;
    if (allowed.length === 0) return res.json({ records: [] });
    sql += ` AND sub.warehouse_id IN (${allowed.map(() => '?').join(',')})`;
    params.push(...allowed);
  }
  if (warehouseId) { sql += ' AND sub.warehouse_id = ?'; params.push(warehouseId); }
  if (formType) { sql += ' AND t.form_type = ?'; params.push(formType); }
  if (status) { sql += ' AND sub.status = ?'; params.push(status); }
  sql += ' ORDER BY sub.created_at DESC';
  const rows = db.prepare(sql).all(...params) as any[];
  res.json({ reportTitle: 'Form Submission Register', records: rows, generatedAt: new Date().toISOString() });
});

apiRouter.get('/reports/weekly-approval', authMiddleware, (req: AuthRequest, res: Response) => {
  const { warehouseId, status } = req.query;
  let sql = `
    SELECT wr.*, w.name as warehouse_name, w.warehouse_code,
           u1.name as prepared_by_name, u2.name as approved_by_name
    FROM weekly_reviews wr
    JOIN warehouses w ON wr.warehouse_id = w.id
    LEFT JOIN users u1 ON wr.prepared_by_id = u1.id
    LEFT JOIN users u2 ON wr.approved_by_id = u2.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (req.user!.role !== 'ADMIN') {
    const allowed = req.user!.assignedWarehouseIds;
    if (allowed.length === 0) return res.json({ records: [] });
    sql += ` AND wr.warehouse_id IN (${allowed.map(() => '?').join(',')})`;
    params.push(...allowed);
  }
  if (warehouseId) { sql += ' AND wr.warehouse_id = ?'; params.push(warehouseId); }
  if (status) { sql += ' AND wr.status = ?'; params.push(status); }
  sql += ' ORDER BY wr.week_start_date DESC';
  const rows = db.prepare(sql).all(...params) as any[];
  res.json({ reportTitle: 'Weekly Approval Report', records: rows, generatedAt: new Date().toISOString() });
});

apiRouter.get('/reports/drs-register', authMiddleware, (req: AuthRequest, res: Response) => {
  const { warehouseId, status } = req.query;
  let sql = `
    SELECT d.*, w.name as warehouse_name, w.warehouse_code, u.name as created_by_name
    FROM drs_numbers d
    LEFT JOIN warehouses w ON d.warehouse_id = w.id
    LEFT JOIN users u ON d.created_by_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (req.user!.role !== 'ADMIN') {
    const allowed = req.user!.assignedWarehouseIds;
    if (allowed.length === 0) return res.json({ records: [] });
    sql += ` AND d.warehouse_id IN (${allowed.map(() => '?').join(',')})`;
    params.push(...allowed);
  }
  if (warehouseId) { sql += ' AND d.warehouse_id = ?'; params.push(warehouseId); }
  if (status) { sql += ' AND d.status = ?'; params.push(status); }
  sql += ' ORDER BY d.created_at DESC';
  const rows = db.prepare(sql).all(...params) as any[];
  res.json({ reportTitle: 'DRS Register', records: rows, generatedAt: new Date().toISOString() });
});

apiRouter.get('/reports/document-register', authMiddleware, (req: AuthRequest, res: Response) => {
  const { entityType, warehouseId } = req.query;
  let sql = `
    SELECT d.*, u.name as uploaded_by_name
    FROM documents d
    LEFT JOIN users u ON d.uploaded_by_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (entityType) { sql += ' AND d.entity_type = ?'; params.push(entityType); }
  sql += ' ORDER BY d.uploaded_at DESC';
  const rows = db.prepare(sql).all(...params) as any[];
  res.json({ reportTitle: 'Document Register', records: rows, generatedAt: new Date().toISOString() });
});

apiRouter.get('/reports/user-activity', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { fromDate, toDate, userId } = req.query;
  let sql = `
    SELECT a.*, u.name as user_name, u.email as user_email, u.role as user_role
    FROM audit_logs a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (userId) { sql += ' AND a.user_id = ?'; params.push(userId); }
  if (fromDate) { sql += ' AND a.created_at >= ?'; params.push(fromDate); }
  if (toDate) { sql += ' AND a.created_at <= ?'; params.push(toDate); }
  sql += ' ORDER BY a.created_at DESC LIMIT 500';
  const rows = db.prepare(sql).all(...params) as any[];
  res.json({ reportTitle: 'User Activity Report', records: rows, generatedAt: new Date().toISOString() });
});

apiRouter.get('/reports/audit-trail', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { entityType, entityId, action, fromDate, toDate } = req.query;
  let sql = `
    SELECT a.*, u.name as user_name, u.email as user_email
    FROM audit_logs a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (entityType) { sql += ' AND a.entity_type = ?'; params.push(entityType); }
  if (entityId) { sql += ' AND a.entity_id = ?'; params.push(entityId); }
  if (action) { sql += ' AND a.action = ?'; params.push(action); }
  if (fromDate) { sql += ' AND a.created_at >= ?'; params.push(fromDate); }
  if (toDate) { sql += ' AND a.created_at <= ?'; params.push(toDate); }
  sql += ' ORDER BY a.created_at DESC LIMIT 500';
  const rows = db.prepare(sql).all(...params) as any[];
  res.json({ reportTitle: 'Audit Trail Report', records: rows, generatedAt: new Date().toISOString() });
});

// ============================================================================
// 19. ENHANCED EXPORT (CSV for all report types)
// ============================================================================

apiRouter.get('/reports/export', authMiddleware, (req: Request, res: Response) => {
  const { type, warehouseId, fromDate, toDate, status, search } = req.query;
  let csv = '';
  let filename = `report-${type || 'stock'}-${new Date().toISOString().slice(0, 10)}.csv`;

  const esc = (v: any) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  try {
    if (type === 'appendix-a' || type === 'stock') {
      const rows = db.prepare(`
        SELECT w.warehouse_code, w.name as warehouse, i.item_code, i.item_name, i.category,
               s.batch_number, coalesce(s.serial_number,'') as serial_number, s.quantity, s.unit,
               s.unit_cost, s.total_value, s.storage_location, s.storage_condition,
               coalesce(s.last_inspection_date,'') as last_insp, coalesce(s.next_inspection_due_date,'') as next_due,
               s.status, s.remarks
        FROM stock_records s
        JOIN warehouses w ON s.warehouse_id = w.id
        JOIN items i ON s.item_id = i.id
        WHERE 1=1
      `).all() as any[];
      csv = 'Warehouse Code,Warehouse,Item Code,Item Name,Category,Batch,Serial,Quantity,Unit,Unit Cost,Total Value,Location,Condition,Last Insp,Next Due,Status,Remarks\n';
      rows.forEach(r => csv += `${esc(r.warehouse_code)},${esc(r.warehouse)},${esc(r.item_code)},${esc(r.item_name)},${esc(r.category)},${esc(r.batch_number)},${esc(r.serial_number)},${r.quantity},${esc(r.unit)},${r.unit_cost},${r.total_value},${esc(r.storage_location)},${esc(r.storage_condition)},${esc(r.last_insp)},${esc(r.next_due)},${esc(r.status)},${esc(r.remarks)}\n`);
    } else if (type === 'appendix-b' || type === 'inspections') {
      const rows = db.prepare(`
        SELECT insp.inspection_number, insp.inspection_date, w.warehouse_code, w.name as warehouse,
               i.item_code, i.item_name, insp.inspection_type, insp.quantity_inspected,
               insp.quantity_passed, insp.quantity_failed, insp.quantity_quarantined,
               insp.overall_result, insp.status, insp.findings, insp.recommendations,
               u1.name as inspector, u2.name as approver
        FROM inspections insp
        JOIN warehouses w ON insp.warehouse_id = w.id
        JOIN items i ON insp.item_id = i.id
        LEFT JOIN users u1 ON insp.inspector_id = u1.id
        LEFT JOIN users u2 ON insp.approved_by_id = u2.id
        ORDER BY insp.inspection_date DESC
      `).all() as any[];
      csv = 'Inspection Number,Date,Warehouse Code,Warehouse,Item Code,Item Name,Type,Inspected,Passed,Failed,Quarantined,Result,Status,Findings,Recommendations,Inspector,Approver\n';
      rows.forEach(r => csv += `${esc(r.inspection_number)},${esc(r.inspection_date)},${esc(r.warehouse_code)},${esc(r.warehouse)},${esc(r.item_code)},${esc(r.item_name)},${esc(r.inspection_type)},${r.quantity_inspected},${r.quantity_passed},${r.quantity_failed},${r.quantity_quarantined},${esc(r.overall_result)},${esc(r.status)},${esc(r.findings)},${esc(r.recommendations)},${esc(r.inspector)},${esc(r.approver)}\n`);
    } else if (type === 'ledger') {
      const rows = db.prepare(`
        SELECT l.created_at, w.warehouse_code, i.item_code, i.item_name, l.transaction_type,
               l.quantity, l.balance_after_transaction, l.remarks
        FROM stock_ledgers l
        JOIN warehouses w ON l.warehouse_id = w.id
        JOIN items i ON l.item_id = i.id
        ORDER BY l.created_at DESC
      `).all() as any[];
      csv = 'Timestamp,Warehouse Code,Item Code,Item Name,Transaction Type,Quantity,Balance After,Remarks\n';
      rows.forEach(r => csv += `${esc(r.created_at)},${esc(r.warehouse_code)},${esc(r.item_code)},${esc(r.item_name)},${esc(r.transaction_type)},${r.quantity},${r.balance_after_transaction},${esc(r.remarks)}\n`);
    } else if (type === 'receipts') {
      const rows = db.prepare(`
        SELECT r.receipt_number, w.warehouse_code, r.supplier_name, r.supplier_invoice_number,
               r.receipt_date, r.status, r.total_items, r.total_quantity, r.total_value, r.drs_number
        FROM receipts r JOIN warehouses w ON r.warehouse_id = w.id ORDER BY r.receipt_date DESC
      `).all() as any[];
      csv = 'Receipt Number,Warehouse,Supplier,Invoice Number,Date,Status,Items,Quantity,Value,DRS Number\n';
      rows.forEach(r => csv += `${esc(r.receipt_number)},${esc(r.warehouse_code)},${esc(r.supplier_name)},${esc(r.supplier_invoice_number)},${esc(r.receipt_date)},${esc(r.status)},${r.total_items},${r.total_quantity},${r.total_value},${esc(r.drs_number)}\n`);
    } else if (type === 'issues') {
      const rows = db.prepare(`
        SELECT i.issue_number, w.warehouse_code, i.issue_to_name, i.issue_date, i.status,
               i.total_items, i.total_quantity, i.total_value, i.drs_number
        FROM issues i JOIN warehouses w ON i.warehouse_id = w.id ORDER BY i.issue_date DESC
      `).all() as any[];
      csv = 'Issue Number,Warehouse,Issue To,Date,Status,Items,Quantity,Value,DRS Number\n';
      rows.forEach(r => csv += `${esc(r.issue_number)},${esc(r.warehouse_code)},${esc(r.issue_to_name)},${esc(r.issue_date)},${esc(r.status)},${r.total_items},${r.total_quantity},${r.total_value},${esc(r.drs_number)}\n`);
    } else if (type === 'drs') {
      const rows = db.prepare(`
        SELECT d.drs_number, w.warehouse_code, d.source_module, d.status, d.created_at,
               d.cancel_reason
        FROM drs_numbers d LEFT JOIN warehouses w ON d.warehouse_id = w.id ORDER BY d.created_at DESC
      `).all() as any[];
      csv = 'DRS Number,Warehouse,Source,Status,Created At,Cancel Reason\n';
      rows.forEach(r => csv += `${esc(r.drs_number)},${esc(r.warehouse_code)},${esc(r.source_module)},${esc(r.status)},${esc(r.created_at)},${esc(r.cancel_reason)}\n`);
    } else {
      res.status(400).json({ error: 'Invalid export type' });
      return;
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 19b. CSV IMPORT ENDPOINTS
// Allows organizations to import their dataset from CSV/SQL-exported files
// ============================================================================

apiRouter.post('/import/stock', authMiddleware, requireRole(['ADMIN', 'WAREHOUSE_MANAGER']), upload.single('file'), (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file uploaded' });
    }

    const csvContent = fs.readFileSync(req.file.path, 'utf-8');
    const lines = csvContent.split('\n').filter((l: string) => l.trim());
    if (lines.length < 2) {
      return res.status(400).json({ error: 'CSV file must contain a header row and at least one data row' });
    }

    const headers = lines[0].split(',').map((h: string) => h.trim().replace(/"/g, ''));
    const required = ['warehouse_code', 'item_code', 'batch_number', 'quantity'];
    for (const r of required) {
      if (!headers.includes(r)) {
        return res.status(400).json({ error: `Missing required column: ${r}` });
      }
    }

    let imported = 0;
    const errors: string[] = [];
    const now = new Date().toISOString();

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v: string) => v.trim().replace(/"/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || ''; });

      try {
        const warehouse = db.prepare('SELECT id FROM warehouses WHERE warehouse_code = ?').get(row.warehouse_code) as any;
        if (!warehouse) { errors.push(`Row ${i + 1}: Warehouse ${row.warehouse_code} not found`); continue; }
        if (!checkWarehouseAccess(req.user!, warehouse.id)) { errors.push(`Row ${i + 1}: No access to warehouse ${row.warehouse_code}`); continue; }

        const item = db.prepare('SELECT id, unit_cost, unit FROM items WHERE item_code = ?').get(row.item_code) as any;
        if (!item) { errors.push(`Row ${i + 1}: Item ${row.item_code} not found`); continue; }

        const quantity = Number(row.quantity);
        if (!quantity || quantity <= 0) { errors.push(`Row ${i + 1}: Invalid quantity`); continue; }

        const serialNumber = row.serial_number || null;
        if (item.serial_number_tracking && serialNumber) {
          const dup = db.prepare("SELECT id FROM stock_records WHERE warehouse_id = ? AND item_id = ? AND serial_number = ? AND status != 'DISPOSED'").get(warehouse.id, item.id, serialNumber);
          if (dup) { errors.push(`Row ${i + 1}: Duplicate serial number ${serialNumber}`); continue; }
        }

        const stockId = `stk-import-${Date.now()}-${i}`;
        const unitCost = Number(row.unit_cost) || item.unit_cost;
        const totalValue = quantity * unitCost;

        db.prepare(`
          INSERT INTO stock_records (id, warehouse_id, item_id, batch_number, serial_number, quantity, unit, unit_cost, total_value, storage_location, storage_condition, date_of_receipt, status, remarks, created_by_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'IN_STOCK', ?, ?, ?, ?)
        `).run(
          stockId, warehouse.id, item.id, row.batch_number, serialNumber,
          quantity, row.unit || item.unit, unitCost, totalValue,
          row.storage_location || 'Import', row.storage_condition || 'Imported',
          row.date_of_receipt || now, 'Imported via CSV', req.user!.id, now, now
        );

        // Ledger entry
        const balanceRow = db.prepare("SELECT coalesce(sum(quantity),0) as bal FROM stock_records WHERE warehouse_id = ? AND item_id = ? AND status = 'IN_STOCK'").get(warehouse.id, item.id) as any;
        const ledgerId = `led-import-${Date.now()}-${i}`;
        db.prepare(`
          INSERT INTO stock_ledgers (id, warehouse_id, item_id, stock_record_id, transaction_type, quantity, unit_cost, total_value, batch_number, serial_number, balance_after_transaction, remarks, created_by_id, created_at)
          VALUES (?, ?, ?, ?, 'INWARD', ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          ledgerId, warehouse.id, item.id, stockId, 'INWARD', quantity, unitCost, totalValue,
          row.batch_number, serialNumber, balanceRow ? balanceRow.bal : quantity,
          'Imported via CSV', req.user!.id, now
        );

        imported++;
      } catch (e: any) {
        errors.push(`Row ${i + 1}: ${e.message}`);
      }
    }

    // Clean up uploaded file
    try { fs.unlinkSync(req.file.path); } catch (_) { /* silent */ }

    logAudit({
      userId: req.user!.id,
      action: 'IMPORT_STOCK_CSV',
      entityType: 'STOCK_RECORD',
      entityId: 'BATCH',
      afterData: { imported, errors: errors.length, file: req.file.originalname },
      ipAddress: req.ip
    });

    res.json({ message: `Stock import completed. ${imported} record(s) imported.`, imported, errors });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/import/items', authMiddleware, requireRole(['ADMIN']), upload.single('file'), (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file uploaded' });
    }

    const csvContent = fs.readFileSync(req.file.path, 'utf-8');
    const lines = csvContent.split('\n').filter((l: string) => l.trim());
    if (lines.length < 2) {
      return res.status(400).json({ error: 'CSV file must contain a header row and at least one data row' });
    }

    const headers = lines[0].split(',').map((h: string) => h.trim().replace(/"/g, ''));
    const required = ['item_code', 'item_name', 'category'];
    for (const r of required) {
      if (!headers.includes(r)) {
        return res.status(400).json({ error: `Missing required column: ${r}` });
      }
    }

    let imported = 0;
    const errors: string[] = [];
    const now = new Date().toISOString();

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v: string) => v.trim().replace(/"/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || ''; });

      try {
        const existing = db.prepare('SELECT id FROM items WHERE item_code = ?').get(row.item_code.trim().toUpperCase());
        if (existing) { errors.push(`Row ${i + 1}: Item code ${row.item_code} already exists`); continue; }

        const id = `item-import-${Date.now()}-${i}`;
        db.prepare(`
          INSERT INTO items (id, item_code, item_name, category, sub_category, type, unit, batch_number, serial_number_tracking, minimum_stock_level, maximum_stock_level, unit_cost, currency, shelf_life_months, storage_conditions, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id, row.item_code.trim().toUpperCase(), row.item_name.trim(),
          row.category.trim(), row.sub_category || null, row.type || 'AMMUNITION',
          row.unit || 'ROUNDS', row.batch_number || null,
          row.serial_number_tracking === 'true' ? 1 : 0,
          Number(row.minimum_stock_level) || 0, Number(row.maximum_stock_level) || 10000,
          Number(row.unit_cost) || 0, row.currency || 'INR',
          row.shelf_life_months ? Number(row.shelf_life_months) : null,
          row.storage_conditions || null, 'ACTIVE', now, now
        );
        imported++;
      } catch (e: any) {
        errors.push(`Row ${i + 1}: ${e.message}`);
      }
    }

    try { fs.unlinkSync(req.file.path); } catch (_) { /* silent */ }

    logAudit({
      userId: req.user!.id,
      action: 'IMPORT_ITEMS_CSV',
      entityType: 'ITEM',
      entityId: 'BATCH',
      afterData: { imported, errors: errors.length, file: req.file.originalname },
      ipAddress: req.ip
    });

    res.json({ message: `Item import completed. ${imported} record(s) imported.`, imported, errors });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 20. PDF GENERATION ENDPOINTS
// ============================================================================

function buildPDFHeader(title: string, generatedBy: string): string {
  const now = new Date().toLocaleString();
  return `
    <html><head><style>
      @page { size: A4; margin: 2cm; @bottom-center { content: "AWCMS - Page " counter(page) " of " counter(pages); font-size: 8pt; color: #666; } }
      body { font-family: 'Segoe UI', sans-serif; font-size: 9pt; color: #333; }
      .header { border-bottom: 3px solid #1e405f; padding-bottom: 10px; margin-bottom: 20px; }
      .title { font-size: 16pt; font-weight: bold; color: #1e405f; margin: 0; }
      .subtitle { font-size: 9pt; color: #666; margin: 4px 0; }
      .meta { font-size: 8pt; color: #666; margin-top: 10px; border-top: 1px solid #ccc; padding-top: 5px; }
      table { border-collapse: collapse; width: 100%; font-size: 8pt; }
      th { background: #1e405f; color: #fff; padding: 6px; text-align: left; border: 1px solid #999; }
      td { padding: 5px; border: 1px solid #ccc; }
      .tr-head { background: #f2f2f2; }
      .badge { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 7pt; font-weight: bold; }
    </style></head>
    <body>
      <div class="header">
        <h1 class="title">Ammunition & Warehouse Compliance Management System (AWCMS)</h1>
        <div class="subtitle">${title}</div>
        <div class="meta">Generated: ${now} | Generated by: ${generatedBy}</div>
      </div>
  `;
}

function buildPDFFooter(): string {
  return `</body></html>`;
}

apiRouter.get('/inspections/:id/pdf', authMiddleware, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const insp = db.prepare(`
    SELECT insp.*, w.name as warehouse_name, w.warehouse_code, i.item_name, i.item_code,
           u1.name as inspector_name, u2.name as approver_name
    FROM inspections insp
    JOIN warehouses w ON insp.warehouse_id = w.id
    JOIN items i ON insp.item_id = i.id
    LEFT JOIN users u1 ON insp.inspector_id = u1.id
    LEFT JOIN users u2 ON insp.approved_by_id = u2.id
    WHERE insp.id = ?
  `).get(id) as any;
  if (!insp) return res.status(404).json({ error: 'Inspection not found' });
  if (!checkWarehouseAccess(req.user!, insp.warehouse_id)) return res.status(403).json({ error: 'Access denied' });

  const params = db.prepare('SELECT * FROM inspection_parameters WHERE inspection_id = ?').all(id);
  const serials = db.prepare('SELECT * FROM inspection_serials WHERE inspection_id = ?').all(id);
  const generatedBy = req.user ? `${req.user.name} (${req.user.role})` : 'System';

  let html = buildPDFHeader('Inspection Report', generatedBy);
  html += `
    <table>
      <tr><th>Inspection Number</th><td>${insp.inspection_number}</td>
          <th>Inspection Date</th><td>${insp.inspection_date}</td></tr>
      <tr><th>Warehouse</th><td>${insp.warehouse_code} - ${insp.warehouse_name}</td>
          <th>Item</th><td>${insp.item_code} - ${insp.item_name}</td></tr>
      <tr><th>Inspector</th><td>${insp.inspector_name}</td>
          <th>Approver</th><td>${insp.approver_name || 'Pending'}</td></tr>
      <tr><th>Type</th><td>${insp.inspection_type}</td>
          <th>Status</th><td><span class="badge">${insp.status}</span></td></tr>
      <tr><th>Qty Inspected</th><td>${insp.quantity_inspected}</td>
          <th>Qty Passed</th><td>${insp.quantity_passed}</td></tr>
      <tr><th>Qty Failed</th><td>${insp.quantity_failed}</td>
          <th>Qty Quarantined</th><td>${insp.quantity_quarantined}</td></tr>
      <tr><th>Overall Result</th><td>${insp.overall_result}</td>
          <th>Form Type</th><td>${insp.form_type}</td></tr>
    </table>
    <h3>Findings</h3><p>${insp.findings || 'None recorded'}</p>
    <h3>Recommendations</h3><p>${insp.recommendations || 'None recorded'}</p>
    <h3>Inspection Parameters</h3>
    <table><tr><th>Parameter</th><th>Expected</th><th>Observed</th><th>Result</th></tr>
    ${params.map(p => `<tr><td>${p.parameter_name}</td><td>${p.expected_value}</td><td>${p.observed_value}</td><td>${p.result}</td></tr>`).join('')}
    </table>
    <h3>Serial-wise Results</h3>
    <table><tr><th>Serial Number</th><th>Qty</th><th>Condition</th><th>Result</th></tr>
    ${serials.map(s => `<tr><td>${s.serial_number}</td><td>${s.quantity}</td><td>${s.condition}</td><td>${s.result}</td></tr>`).join('')}
    </table>
  `;
  html += buildPDFFooter();

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="inspection-${insp.inspection_number}.pdf"`);
  // Send HTML for client-side PDF rendering (print to PDF)
  res.send(html);
});

apiRouter.get('/forms/submissions/:id/pdf', authMiddleware, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const sub = db.prepare(`
    SELECT sub.*, t.form_name, t.form_code, t.form_type, w.name as warehouse_name,
           w.warehouse_code, u.name as submitter_name
    FROM form_submissions sub
    JOIN form_templates t ON sub.form_template_id = t.id
    JOIN warehouses w ON sub.warehouse_id = w.id
    LEFT JOIN users u ON sub.submitted_by_id = u.id
    WHERE sub.id = ?
  `).get(id) as any;
  if (!sub) return res.status(404).json({ error: 'Form submission not found' });
  if (!checkWarehouseAccess(req.user!, sub.warehouse_id)) return res.status(403).json({ error: 'Access denied' });

  const fields = db.prepare('SELECT * FROM form_fields WHERE form_template_id = ? ORDER BY display_order ASC').all(sub.form_template_id) as any[];
  const formData = JSON.parse(sub.form_data || '{}');
  const generatedBy = req.user ? `${req.user.name} (${req.user.role})` : 'System';

  let html = buildPDFHeader(`Technical Form: ${sub.form_code}`, generatedBy);
  html += `
    <table>
      <tr><th>Form Number</th><td>${sub.form_number}</td><th>Status</th><td>${sub.status}</td></tr>
      <tr><th>Warehouse</th><td>${sub.warehouse_code} - ${sub.warehouse_name}</td>
          <th>Submitted By</th><td>${sub.submitter_name}</td></tr>
      <tr><th>Form Type</th><td>${sub.form_type}</td><th>Submitted At</th><td>${sub.submitted_at}</td></tr>
    </table>
    <h3>Form Data</h3>
    <table><tr><th>Field</th><th>Value</th></tr>
    ${fields.map(f => {
      const val = formData[f.field_key] !== undefined ? formData[f.field_key] : (f.default_value || '');
      return `<tr><td>${f.field_label}</td><td>${escHtml(val)}</td></tr>`;
    }).join('')}
    </table>
    ${sub.remarks ? `<h3>Remarks</h3><p>${escHtml(sub.remarks)}</p>` : ''}
  `;
  html += buildPDFFooter();

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="form-${sub.form_number}.pdf"`);
  res.send(html);
});

apiRouter.get('/weekly-reviews/:id/pdf', authMiddleware, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const wr = db.prepare(`
    SELECT wr.*, w.name as warehouse_name, w.warehouse_code,
           u1.name as prepared_by_name, u2.name as approved_by_name
    FROM weekly_reviews wr
    JOIN warehouses w ON wr.warehouse_id = w.id
    LEFT JOIN users u1 ON wr.prepared_by_id = u1.id
    LEFT JOIN users u2 ON wr.approved_by_id = u2.id
    WHERE wr.id = ?
  `).get(id) as any;
  if (!wr) return res.status(404).json({ error: 'Weekly review not found' });
  if (!checkWarehouseAccess(req.user!, wr.warehouse_id)) return res.status(403).json({ error: 'Access denied' });

  const generatedBy = req.user ? `${req.user.name} (${req.user.role})` : 'System';

  let html = buildPDFHeader('Weekly Review Report', generatedBy);
  html += `
    <table>
      <tr><th>Review Number</th><td>${wr.review_number}</td><th>Status</th><td>${wr.status}</td></tr>
      <tr><th>Warehouse</th><td>${wr.warehouse_code} - ${wr.warehouse_name}</td>
          <th>Prepared By</th><td>${wr.prepared_by_name}</td></tr>
      <tr><th>Week Start</th><td>${wr.week_start_date}</td>
          <th>Week End</th><td>${wr.week_end_date}</td></tr>
      <tr><th>Review Type</th><td>${wr.review_type}</td>
          <th>Approved By</th><td>${wr.approved_by_name || 'Pending'}</td></tr>
      <tr><th>Total Records Reviewed</th><td>${wr.total_records_reviewed}</td>
          <th>Stock Value</th><td>${wr.stock_value}</td></tr>
      <tr><th>Pending Inspections</th><td>${wr.pending_inspections}</td>
          <th>Completed Inspections</th><td>${wr.completed_inspections}</td></tr>
      <tr><th>Approved Inspections</th><td>${wr.approved_inspections}</td>
          <th>Rejected Inspections</th><td>${wr.rejected_inspections}</td></tr>
    </table>
    ${wr.remarks ? `<h3>Remarks</h3><p>${escHtml(wr.remarks)}</p>` : ''}
  `;
  html += buildPDFFooter();

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="weekly-review-${wr.review_number}.pdf"`);
  res.send(html);
});

function escHtml(v: any): string {
  if (v === null || v === undefined) return '';
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ============================================================================
// 21. DASHBOARD EXTENDED METRICS
// ============================================================================

apiRouter.get('/dashboard/summary-extended', authMiddleware, (req: AuthRequest, res: Response) => {
  let whFilter = '';
  const params: any[] = [];
  if (req.user!.role !== 'ADMIN') {
    const allowed = req.user!.assignedWarehouseIds;
    if (allowed.length === 0) {
      return res.json({
        totalWarehouses: 0, totalUsers: 0, totalItems: 0, totalStockRecords: 0,
        totalReceipts: 0, totalIssues: 0, totalInspections: 0, pendingInspections: 0,
        completedInspections: 0, approvedInspections: 0, rejectedInspections: 0,
        pendingWeeklyApprovals: 0, completedWeeklyApprovals: 0, stockValue: 0,
        lowStockItems: 0, inspectionDueItems: 0, overdueInspections: 0,
        pendingForm263: 0, pendingForm270: 0
      });
    }
    whFilter = ` WHERE warehouse_id IN (${allowed.map(() => '?').join(',')})`;
    params.push(...allowed);
  }

  const totalWarehouses = (db.prepare("SELECT count(*) as c FROM warehouses").get() as any).c;
  const totalUsers = (db.prepare("SELECT count(*) as c FROM users").get() as any).c;
  const totalItems = (db.prepare("SELECT count(*) as c FROM items WHERE status = 'ACTIVE'").get() as any).c;
  const totalReceipts = (db.prepare("SELECT count(*) as c FROM receipts").get() as any).c;
  const totalIssues = (db.prepare("SELECT count(*) as c FROM issues").get() as any).c;

  const stockAgg = db.prepare(`
    SELECT count(*) as count, coalesce(sum(quantity),0) as qty, coalesce(sum(total_value),0) as val
    FROM stock_records ${whFilter ? whFilter.replace('WHERE','AND') : "WHERE status = 'IN_STOCK'"}
  `).get(...params) as any;

  const inspAgg = db.prepare(`
    SELECT count(*) as total,
      sum(case when status in ('DRAFT','SUBMITTED','UNDER_REVIEW') then 1 else 0 end) as pending,
      sum(case when status in ('APPROVED','CLOSED') then 1 else 0 end) as completed,
      sum(case when status = 'APPROVED' then 1 else 0 end) as approved,
      sum(case when status in ('REJECTED','REINSPECTION_REQUIRED') then 1 else 0 end) as rejected
    FROM inspections ${whFilter}
  `).get(...params) as any;

  const weeklyAgg = db.prepare(`
    SELECT sum(case when status in ('DRAFT','SUBMITTED') then 1 else 0 end) as pending,
           sum(case when status = 'APPROVED' then 1 else 0 end) as approved
    FROM weekly_reviews ${whFilter}
  `).get(...params) as any;

  const lowStock = db.prepare(`
    SELECT count(*) as c FROM stock_records s
    JOIN items i ON s.item_id = i.id
    ${whFilter ? whFilter.replace('WHERE','AND') : ''}
    ${whFilter ? ' AND' : ' WHERE'} s.quantity <= i.minimum_stock_level
  `).get(...params) as any;

  const inspDue = db.prepare(`
    SELECT count(*) as c FROM stock_records
    ${whFilter ? whFilter.replace('WHERE','AND') : ''}
    ${whFilter ? ' AND' : ' WHERE'} next_inspection_due_date IS NOT NULL
      AND date(next_inspection_due_date) <= date('now', '+30 days')
  `).get(...params) as any;

  const overdue = db.prepare(`
    SELECT count(*) as c FROM stock_records
    ${whFilter ? whFilter.replace('WHERE','AND') : ''}
    ${whFilter ? ' AND' : ' WHERE'} next_inspection_due_date IS NOT NULL
      AND date(next_inspection_due_date) < date('now')
  `).get(...params) as any;

  const f263Pending = (db.prepare(`
    SELECT count(*) as c FROM form_submissions s
    JOIN form_templates t ON s.form_template_id = t.id
    ${whFilter ? whFilter.replace('WHERE','AND') : ''}
    ${whFilter ? ' AND' : ' WHERE'} t.form_type = 'TECHNICAL_INSPECTION_FORM_263'
      AND s.status IN ('DRAFT','SUBMITTED','UNDER_REVIEW')
  `).get(...params) as any).c;

  const f270Pending = (db.prepare(`
    SELECT count(*) as c FROM form_submissions s
    JOIN form_templates t ON s.form_template_id = t.id
    ${whFilter ? whFilter.replace('WHERE','AND') : ''}
    ${whFilter ? ' AND' : ' WHERE'} t.form_type = 'TECHNICAL_INSPECTION_FORM_270'
      AND s.status IN ('DRAFT','SUBMITTED','UNDER_REVIEW')
  `).get(...params) as any).c;

  res.json({
    totalWarehouses, totalUsers, totalItems,
    totalStockRecords: stockAgg ? stockAgg.count : 0,
    totalReceipts, totalIssues,
    totalInspections: inspAgg ? inspAgg.total : 0,
    pendingInspections: inspAgg ? inspAgg.pending : 0,
    completedInspections: inspAgg ? inspAgg.completed : 0,
    approvedInspections: inspAgg ? inspAgg.approved : 0,
    rejectedInspections: inspAgg ? inspAgg.rejected : 0,
    pendingWeeklyApprovals: weeklyAgg ? weeklyAgg.pending : 0,
    completedWeeklyApprovals: weeklyAgg ? weeklyAgg.approved : 0,
    stockValue: stockAgg ? stockAgg.val : 0,
    lowStockItems: lowStock ? lowStock.c : 0,
    inspectionDueItems: inspDue ? inspDue.c : 0,
    overdueInspections: overdue ? overdue.c : 0,
    pendingForm263: f263Pending, pendingForm270: f270Pending
  });
});

apiRouter.get('/dashboard/charts-extended', authMiddleware, (req: AuthRequest, res: Response) => {
  let whFilter = '';
  const params: any[] = [];
  if (req.user!.role !== 'ADMIN') {
    const allowed = req.user!.assignedWarehouseIds;
    if (allowed.length === 0) {
      return res.json({
        inspectionsByStatus: [], inspectionsByWarehouse: [], inspectionsByMonth: [],
        stockByCategory: [], form263Vs270: [], weeklyApprovalStatus: [], warehouseStockSummary: []
      });
    }
    whFilter = ` WHERE warehouse_id IN (${allowed.map(() => '?').join(',')})`;
    params.push(...allowed);
  }

  const inspectionsByStatus = db.prepare(`SELECT status, count(*) as count FROM inspections ${whFilter} GROUP BY status`).all(...params);
  const inspectionsByWarehouse = db.prepare(`
    SELECT w.warehouse_code as warehouse, count(*) as count
    FROM inspections i JOIN warehouses w ON i.warehouse_id = w.id ${whFilter ? whFilter.replace('WHERE','AND') : ''}
    GROUP BY w.id
  `).all(...params);
  const inspectionsByMonth = db.prepare(`
    SELECT strftime('%Y-%m', inspection_date) as month, count(*) as count
    FROM inspections ${whFilter} GROUP BY month ORDER BY month
  `).all(...params);
  const stockByCategory = db.prepare(`
    SELECT i.category as name, sum(s.quantity) as value, sum(s.total_value) as totalValue
    FROM stock_records s JOIN items i ON s.item_id = i.id
    ${whFilter ? whFilter.replace('WHERE','AND') : "WHERE s.status = 'IN_STOCK'"}
    GROUP BY i.category
  `).all(...params);
  const form263Vs270 = db.prepare(`
    SELECT t.form_type as formType, count(*) as count
    FROM form_submissions s JOIN form_templates t ON s.form_template_id = t.id
    ${whFilter ? whFilter.replace('WHERE','AND') : ''}
    GROUP BY t.form_type
  `).all(...params);
  const weeklyApprovalStatus = db.prepare(`SELECT status, count(*) as count FROM weekly_reviews ${whFilter} GROUP BY status`).all(...params);
  const warehouseStockSummary = db.prepare(`
    SELECT w.warehouse_code as warehouse, w.name, count(s.id) as recordCount,
           coalesce(sum(s.total_value),0) as stockValue
    FROM warehouses w LEFT JOIN stock_records s ON s.warehouse_id = w.id AND s.status = 'IN_STOCK'
    ${whFilter ? whFilter.replace('WHERE','AND') : ''}
    GROUP BY w.id
  `).all(...params);

  res.json({
    inspectionsByStatus, inspectionsByWarehouse, inspectionsByMonth,
    stockByCategory, form263Vs270, weeklyApprovalStatus, warehouseStockSummary
  });
});
