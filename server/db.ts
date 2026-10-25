import 'dotenv/config';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.resolve('data');
const UPLOADS_DIR = path.resolve('uploads');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'awcms.db');
export const db = new DatabaseSync(DB_PATH);

// Enable WAL mode & foreign keys
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'VIEWER',
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    assigned_warehouse_ids TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS warehouses (
    id TEXT PRIMARY KEY,
    warehouse_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'COMMON',
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pincode TEXT NOT NULL,
    contact_person TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS warehouse_assignments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    warehouse_id TEXT NOT NULL,
    UNIQUE(user_id, warehouse_id)
  );

  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    item_code TEXT UNIQUE NOT NULL,
    item_name TEXT NOT NULL,
    category TEXT NOT NULL,
    sub_category TEXT,
    type TEXT NOT NULL DEFAULT 'AMMUNITION',
    unit TEXT NOT NULL DEFAULT 'ROUNDS',
    batch_number TEXT,
    serial_number_tracking INTEGER NOT NULL DEFAULT 0,
    minimum_stock_level REAL NOT NULL DEFAULT 0,
    maximum_stock_level REAL NOT NULL DEFAULT 10000,
    unit_cost REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'INR',
    shelf_life_months INTEGER,
    storage_conditions TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS stock_records (
    id TEXT PRIMARY KEY,
    warehouse_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    batch_number TEXT NOT NULL,
    serial_number TEXT,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL DEFAULT 'ROUNDS',
    unit_cost REAL NOT NULL DEFAULT 0,
    total_value REAL NOT NULL DEFAULT 0,
    storage_location TEXT NOT NULL,
    storage_condition TEXT NOT NULL,
    date_of_receipt TEXT NOT NULL,
    last_inspection_date TEXT,
    next_inspection_due_date TEXT,
    status TEXT NOT NULL DEFAULT 'IN_STOCK',
    remarks TEXT,
    created_by_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS stock_ledgers (
    id TEXT PRIMARY KEY,
    warehouse_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    stock_record_id TEXT,
    transaction_type TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit_cost REAL NOT NULL DEFAULT 0,
    total_value REAL NOT NULL DEFAULT 0,
    batch_number TEXT,
    serial_number TEXT,
    balance_after_transaction REAL NOT NULL,
    remarks TEXT,
    created_by_id TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS inspections (
    id TEXT PRIMARY KEY,
    inspection_number TEXT UNIQUE NOT NULL,
    warehouse_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    stock_record_id TEXT,
    inspection_type TEXT NOT NULL DEFAULT 'ROUTINE',
    inspection_date TEXT NOT NULL,
    inspector_id TEXT NOT NULL,
    form_type TEXT NOT NULL DEFAULT 'AMMUNITION_INSPECTION_FORM',
    quantity_inspected REAL NOT NULL DEFAULT 0,
    quantity_passed REAL NOT NULL DEFAULT 0,
    quantity_failed REAL NOT NULL DEFAULT 0,
    quantity_quarantined REAL NOT NULL DEFAULT 0,
    overall_result TEXT NOT NULL DEFAULT 'PASS',
    findings TEXT,
    recommendations TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    approved_by_id TEXT,
    approved_at TEXT,
    rejection_reason TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS inspection_parameters (
    id TEXT PRIMARY KEY,
    inspection_id TEXT NOT NULL,
    parameter_name TEXT NOT NULL,
    expected_value TEXT NOT NULL,
    observed_value TEXT NOT NULL,
    result TEXT NOT NULL DEFAULT 'PASS',
    remarks TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS inspection_serials (
    id TEXT PRIMARY KEY,
    inspection_id TEXT NOT NULL,
    serial_number TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 1,
    condition TEXT NOT NULL DEFAULT 'Serviceable',
    result TEXT NOT NULL DEFAULT 'PASS',
    remarks TEXT
  );

  CREATE TABLE IF NOT EXISTS form_templates (
    id TEXT PRIMARY KEY,
    form_code TEXT UNIQUE NOT NULL,
    form_name TEXT NOT NULL,
    form_version TEXT NOT NULL DEFAULT '1.0',
    form_type TEXT NOT NULL DEFAULT 'TECHNICAL',
    description TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    requires_approval INTEGER NOT NULL DEFAULT 1,
    approval_levels INTEGER NOT NULL DEFAULT 1,
    allowed_roles TEXT NOT NULL DEFAULT '["ADMIN","TECHNICAL_INSPECTOR"]',
    applicable_warehouse_ids TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS form_fields (
    id TEXT PRIMARY KEY,
    form_template_id TEXT NOT NULL,
    field_key TEXT NOT NULL,
    field_label TEXT NOT NULL,
    field_type TEXT NOT NULL DEFAULT 'TEXT',
    required INTEGER NOT NULL DEFAULT 0,
    default_value TEXT,
    options TEXT NOT NULL DEFAULT '[]',
    validation_rules TEXT NOT NULL DEFAULT '{}',
    display_order INTEGER NOT NULL DEFAULT 0,
    is_conditional INTEGER NOT NULL DEFAULT 0,
    conditional_logic TEXT NOT NULL DEFAULT '{}'
  );

  CREATE TABLE IF NOT EXISTS form_submissions (
    id TEXT PRIMARY KEY,
    form_template_id TEXT NOT NULL,
    form_number TEXT UNIQUE NOT NULL,
    warehouse_id TEXT NOT NULL,
    item_id TEXT,
    stock_record_id TEXT,
    inspection_id TEXT,
    submitted_by_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    form_data TEXT NOT NULL DEFAULT '{}',
    current_approval_level INTEGER NOT NULL DEFAULT 1,
    submitted_at TEXT,
    approved_at TEXT,
    remarks TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS form_approvals (
    id TEXT PRIMARY KEY,
    form_submission_id TEXT NOT NULL,
    approval_level INTEGER NOT NULL DEFAULT 1,
    approver_id TEXT NOT NULL,
    action TEXT NOT NULL DEFAULT 'APPROVED',
    remarks TEXT NOT NULL,
    action_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS weekly_reviews (
    id TEXT PRIMARY KEY,
    review_number TEXT UNIQUE NOT NULL,
    warehouse_id TEXT NOT NULL,
    week_start_date TEXT NOT NULL,
    week_end_date TEXT NOT NULL,
    review_type TEXT NOT NULL DEFAULT 'AMMUNITION_STORAGE',
    total_records_reviewed INTEGER NOT NULL DEFAULT 0,
    pending_inspections INTEGER NOT NULL DEFAULT 0,
    completed_inspections INTEGER NOT NULL DEFAULT 0,
    approved_inspections INTEGER NOT NULL DEFAULT 0,
    rejected_inspections INTEGER NOT NULL DEFAULT 0,
    stock_value REAL NOT NULL DEFAULT 0,
    remarks TEXT,
    prepared_by_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    approved_by_id TEXT,
    approved_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    file_url TEXT NOT NULL,
    uploaded_by_id TEXT NOT NULL,
    uploaded_at TEXT NOT NULL,
    remarks TEXT
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    before_data TEXT,
    after_data TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TEXT NOT NULL
  );

  /* ----------------------------------------------------------------
     RECEIPTS MODULE
     ---------------------------------------------------------------- */
  CREATE TABLE IF NOT EXISTS receipts (
    id TEXT PRIMARY KEY,
    receipt_number TEXT UNIQUE NOT NULL,
    warehouse_id TEXT NOT NULL,
    drs_number TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    supplier_name TEXT,
    supplier_invoice_number TEXT,
    receipt_date TEXT NOT NULL,
    total_items INTEGER NOT NULL DEFAULT 0,
    total_quantity REAL NOT NULL DEFAULT 0,
    total_value REAL NOT NULL DEFAULT 0,
    condition_check_status TEXT DEFAULT 'PENDING',
    condition_remarks TEXT,
    approved_by_id TEXT,
    approved_at TEXT,
    rejection_reason TEXT,
    submitted_at TEXT,
    submitted_by_id TEXT,
    created_by_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS receipt_items (
    id TEXT PRIMARY KEY,
    receipt_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    batch_number TEXT NOT NULL,
    serial_number TEXT,
    quantity REAL NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'ROUNDS',
    unit_cost REAL NOT NULL DEFAULT 0,
    total_value REAL NOT NULL DEFAULT 0,
    storage_location TEXT,
    storage_condition TEXT,
    date_of_receipt TEXT,
    next_inspection_due_date TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING_RECEIPT_APPROVAL',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  /* ----------------------------------------------------------------
     ISSUES MODULE
     ---------------------------------------------------------------- */
  CREATE TABLE IF NOT EXISTS issues (
    id TEXT PRIMARY KEY,
    issue_number TEXT UNIQUE NOT NULL,
    warehouse_id TEXT NOT NULL,
    drs_number TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    issue_to_name TEXT,
    issue_to_organization TEXT,
    issue_date TEXT NOT NULL,
    total_items INTEGER NOT NULL DEFAULT 0,
    total_quantity REAL NOT NULL DEFAULT 0,
    total_value REAL NOT NULL DEFAULT 0,
    approved_by_id TEXT,
    approved_at TEXT,
    rejection_reason TEXT,
    submitted_at TEXT,
    submitted_by_id TEXT,
    completed_at TEXT,
    created_by_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS issue_items (
    id TEXT PRIMARY KEY,
    issue_id TEXT NOT NULL,
    receipt_id TEXT,
    stock_record_id TEXT,
    item_id TEXT NOT NULL,
    batch_number TEXT NOT NULL,
    serial_number TEXT,
    quantity_requested REAL NOT NULL DEFAULT 0,
    quantity_approved REAL NOT NULL DEFAULT 0,
    quantity_issued REAL NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'ROUNDS',
    unit_cost REAL NOT NULL DEFAULT 0,
    total_value REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDING_ISSUE_APPROVAL',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  /* ----------------------------------------------------------------
     DRS NUMBER MODULE
     ---------------------------------------------------------------- */
  CREATE TABLE IF NOT EXISTS drs_numbers (
    id TEXT PRIMARY KEY,
    drs_number TEXT UNIQUE NOT NULL,
    warehouse_id TEXT,
    source_module TEXT DEFAULT 'MANUAL',
    linked_entity_type TEXT,
    linked_entity_id TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    cancel_reason TEXT,
    cancelled_by_id TEXT,
    cancelled_at TEXT,
    created_by_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  /* ----------------------------------------------------------------
     EXTEND STOCK LEDGER FOR RECEIPT/ISSUE LINKAGE
     ---------------------------------------------------------------- */
  -- receipt_id and issue_id columns added via migration below
`);

// Migration: add receipt_id and issue_id to stock_ledgers if missing (for existing DBs)
try {
  db.exec(`ALTER TABLE stock_ledgers ADD COLUMN receipt_id TEXT;`);
} catch (_) { /* column already exists */ }
try {
  db.exec(`ALTER TABLE stock_ledgers ADD COLUMN issue_id TEXT;`);
} catch (_) { /* column already exists */ }

// Extend EntityType enum values used elsewhere: RECEIPT, ISSUE, DRS are valid strings

// Function to log audits
export function logAudit(params: {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  beforeData?: any;
  afterData?: any;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    const id = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const stmt = db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, before_data, after_data, ip_address, user_agent, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      params.userId || null,
      params.action,
      params.entityType,
      params.entityId,
      params.beforeData ? JSON.stringify(params.beforeData) : null,
      params.afterData ? JSON.stringify(params.afterData) : null,
      params.ipAddress || '127.0.0.1',
      params.userAgent || 'Applet',
      new Date().toISOString()
    );
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

// Check if any admin exists
export function hasAdminUser(): boolean {
  const row = db.prepare("SELECT count(*) as count FROM users WHERE role = 'ADMIN'").get() as { count: number };
  return row ? row.count > 0 : false;
}

// Initialize default settings and standard form templates (Form 263, Form 270, Ammunition Form)
export function initDefaultSettingsAndTemplates() {
  const settingsCount = (db.prepare('SELECT count(*) as count FROM settings').get() as { count: number }).count;
  if (settingsCount === 0) {
    const defaultSettings = [
      { key: 'SYSTEM_NAME', value: 'Ammunition & Warehouse Compliance Management System (AWCMS)', desc: 'Official System Name' },
      { key: 'DEFENCE_ORGANIZATION', value: 'Technical Ammunition Support Group / Central Ordnance Depot', desc: 'Operating Formation' },
      { key: 'BASE_CURRENCY', value: 'INR', desc: 'Monetary base denomination' },
      { key: 'CURRENCY_SYMBOL', value: '₹', desc: 'Currency Display Glyph' },
      { key: 'AUTO_WEEKLY_REVIEW', value: 'true', desc: 'Enable automatic weekly review generation' },
      { key: 'ALLOW_OVERRIDE_WITH_REMARKS', value: 'true', desc: 'Allow Admin to override approved records with mandatory remarks' }
    ];
    const stmt = db.prepare('INSERT INTO settings (id, key, value, description, updated_at) VALUES (?, ?, ?, ?, ?)');
    for (const s of defaultSettings) {
      stmt.run(`set-${s.key.toLowerCase()}`, s.key, s.value, s.desc, new Date().toISOString());
    }
  }

  // Check form templates
  const templateCount = (db.prepare('SELECT count(*) as count FROM form_templates').get() as { count: number }).count;
  if (templateCount === 0) {
    const now = new Date().toISOString();

    // 1. Technical Inspection Form 263
    const t263Id = 'tpl-form-263';
    db.prepare(`
      INSERT INTO form_templates (id, form_code, form_name, form_version, form_type, description, status, requires_approval, approval_levels, allowed_roles, applicable_warehouse_ids, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      t263Id,
      'FORM-263',
      'Technical Inspection Form 263 (Ammunition / Explosives Acceptance & Quality Review)',
      '1.0',
      'TECHNICAL_INSPECTION_FORM_263',
      'Official Form 263 for Technical Store & Explosive Lot Surveillance, Primer Integrity, Moisture & Packaging Inspection.',
      'ACTIVE',
      1,
      1,
      JSON.stringify(['ADMIN', 'TECHNICAL_INSPECTOR']),
      JSON.stringify([]),
      now,
      now
    );

    // Fields for Form 263
    const f263Fields = [
      { key: 'consignor_source', label: 'Consignor / Manufacturing Ordnance Factory', type: 'TEXT', req: 1, order: 1 },
      { key: 'lot_batch_number', label: 'Ammunition Lot / Batch Reference', type: 'TEXT', req: 1, order: 2 },
      { key: 'year_of_manufacture', label: 'Year & Month of Manufacture', type: 'TEXT', req: 1, order: 3 },
      { key: 'packaging_seal_condition', label: 'Ammunition Box Lead Wire & Tamper Seal', type: 'SELECT', req: 1, order: 4, opts: ['Intact & Factory Crimped', 'Damaged / Broken', 'Resealed with Depot Lead', 'Missing'] },
      { key: 'humidity_indicator', label: 'Moisture / Humidity Indicator Card Reading', type: 'SELECT', req: 1, order: 5, opts: ['Deep Blue (Dry < 30% RH)', 'Lavender (Moisture Caution 40-50% RH)', 'Pink (Moisture Ingress > 60% RH - Reject)'] },
      { key: 'primer_indent_lacquer', label: 'Primer Pocket Seal & Waterproof Lacquer', type: 'SELECT', req: 1, order: 6, opts: ['Smooth & Uniform (Pass)', 'Chipped / Pitted Lacquer', 'Corrosion / Green Verdigris Detected (Fail)'] },
      { key: 'propellant_stability', label: 'Propellant Grain Condition & Odour Assessment', type: 'SELECT', req: 1, order: 7, opts: ['Normal Mild Solvent Odour (Serviceable)', 'Sour / Nitrous Fumes Detected (Quarantine Immediately)', 'Grain Disintegration / Dusting'] },
      { key: 'visual_defects', label: 'Cartridge Case Denting / Neck Split / Corrosion', type: 'TEXTAREA', req: 0, order: 8 },
      { key: 'safety_recommendation', label: 'Final Inspector Endorsement & Storage Category', type: 'SELECT', req: 1, order: 9, opts: ['Cat A - Fit for Immediate Firing & Issue', 'Cat B - Fit for Training Only', 'Cat C - Immediate Quarantine & Re-proof', 'Cat D - Unserviceable / Demolition'] }
    ];

    const fStmt = db.prepare(`
      INSERT INTO form_fields (id, form_template_id, field_key, field_label, field_type, required, default_value, options, validation_rules, display_order, is_conditional, conditional_logic)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    f263Fields.forEach((f, idx) => {
      fStmt.run(
        `ff-263-${idx + 1}`,
        t263Id,
        f.key,
        f.label,
        f.type,
        f.req,
        null,
        f.opts ? JSON.stringify(f.opts) : JSON.stringify([]),
        JSON.stringify({}),
        f.order,
        0,
        JSON.stringify({})
      );
    });

    // 2. Technical Inspection Form 270 (Proof / Chemical Stability / Firing Test)
    const t270Id = 'tpl-form-270';
    db.prepare(`
      INSERT INTO form_templates (id, form_code, form_name, form_version, form_type, description, status, requires_approval, approval_levels, allowed_roles, applicable_warehouse_ids, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      t270Id,
      'FORM-270',
      'Technical Inspection Form 270 (Periodic Proof Firing & Chemical Stability Test)',
      '1.0',
      'TECHNICAL_INSPECTION_FORM_270',
      'Prescribed Form 270 for Proof Firing, Velocity / Chamber Pressure Recording, and Chemical Stabilizer Residual Content.',
      'ACTIVE',
      1,
      1,
      JSON.stringify(['ADMIN', 'TECHNICAL_INSPECTOR']),
      JSON.stringify([]),
      now,
      now
    );

    const f270Fields = [
      { key: 'proof_firing_range', label: 'Proof Firing Range / Test Station Facility', type: 'TEXT', req: 1, order: 1 },
      { key: 'rounds_proof_fired', label: 'Total Number of Proof Rounds Fired', type: 'NUMBER', req: 1, order: 2 },
      { key: 'mean_muzzle_velocity', label: 'Observed Mean Muzzle Velocity (m/s)', type: 'NUMBER', req: 1, order: 3 },
      { key: 'velocity_standard_deviation', label: 'Velocity Standard Deviation (SD in m/s)', type: 'NUMBER', req: 1, order: 4 },
      { key: 'peak_chamber_pressure_mpa', label: 'Peak Chamber Pressure (MPa)', type: 'NUMBER', req: 1, order: 5 },
      { key: 'misfires_hangfires', label: 'Misfires / Hang-fires / Premature Bursts Recorded', type: 'NUMBER', req: 1, order: 6 },
      { key: 'stabilizer_percentage', label: 'Residual Stabilizer Content (Diphenylamine / Centralite %)', type: 'NUMBER', req: 1, order: 7 },
      { key: 'chemical_stability_class', label: 'Chemical Stability Classification', type: 'SELECT', req: 1, order: 8, opts: ['Class 1: Highly Stable (> 1.2% residual)', 'Class 2: Satisfactory (0.8% - 1.2%)', 'Class 3: Cautionary - Retest in 6 months (0.5% - 0.8%)', 'Class 4: Unstable - Issue Condemnation Order (< 0.5%)'] },
      { key: 'target_dispersion_notes', label: 'Target Grouping & Accuracy Observations', type: 'TEXTAREA', req: 0, order: 9 },
      { key: 'inspector_certificate', label: 'Ballistic Officer Recommendation & Certification', type: 'TEXTAREA', req: 1, order: 10 }
    ];

    f270Fields.forEach((f, idx) => {
      fStmt.run(
        `ff-270-${idx + 1}`,
        t270Id,
        f.key,
        f.label,
        f.type,
        f.req,
        null,
        f.opts ? JSON.stringify(f.opts) : JSON.stringify([]),
        JSON.stringify({}),
        f.order,
        0,
        JSON.stringify({})
      );
    });

    // 3. Ammunition Inspection Form (Standard Routine)
    const tAmnId = 'tpl-form-amn';
    db.prepare(`
      INSERT INTO form_templates (id, form_code, form_name, form_version, form_type, description, status, requires_approval, approval_levels, allowed_roles, applicable_warehouse_ids, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      tAmnId,
      'FORM-AMN-STD',
      'Routine Ammunition & Explosives Depot Inspection Form',
      '1.0',
      'AMMUNITION_INSPECTION_FORM',
      'Routine depot floor inspection for stock verification, seal checks, and stacking compliance.',
      'ACTIVE',
      1,
      1,
      JSON.stringify(['ADMIN', 'TECHNICAL_INSPECTOR', 'WAREHOUSE_MANAGER']),
      JSON.stringify([]),
      now,
      now
    );

    const fAmnFields = [
      { key: 'depot_bay_stack', label: 'Warehouse Bay & Stack Grid Identifier', type: 'TEXT', req: 1, order: 1 },
      { key: 'dunnage_air_circulation', label: 'Dunnage Clearance & Floor Stacking Compliance', type: 'SELECT', req: 1, order: 2, opts: ['Compliant (100mm dunnage, 0.5m wall clearance)', 'Non-compliant (Stack height exceeds ceiling safety)', 'Improper Dunnage'] },
      { key: 'exterior_box_markings', label: 'Hazard Classification & UN Class Markings Visible', type: 'SELECT', req: 1, order: 3, opts: ['Clear & Fully Legible', 'Faded / Partially Obscured', 'Missing Class 1 Hazard Diamond'] },
      { key: 'desiccant_bag_check', label: 'Silica Gel Desiccant Bag Condition', type: 'SELECT', req: 1, order: 4, opts: ['Active & Dry', 'Exhausted (Needs Replacement)', 'Not Applicable'] },
      { key: 'general_remarks', label: 'Inspectors General Observations', type: 'TEXTAREA', req: 0, order: 5 }
    ];

    fAmnFields.forEach((f, idx) => {
      fStmt.run(
        `ff-amn-${idx + 1}`,
        tAmnId,
        f.key,
        f.label,
        f.type,
        f.req,
        null,
        f.opts ? JSON.stringify(f.opts) : JSON.stringify([]),
        JSON.stringify({}),
        f.order,
        0,
        JSON.stringify({})
      );
    });
  }

  // Synchronize all credentials configured in .env file into the database
  syncCredentialsFromEnv();
}

// Synchronizes and updates user accounts from .env environment variables
export function syncCredentialsFromEnv() {
  const now = new Date().toISOString();

  // 1. Ensure default depot exists if not present
  const depotCode = process.env.DEFAULT_DEPOT_CODE || 'COD-DLH-01';
  const depotName = process.env.DEFAULT_DEPOT_NAME || 'Central Ordnance Depot Delhi - Technical Ammunition Sub-Depot';
  const depotCity = process.env.DEFAULT_DEPOT_CITY || 'New Delhi';
  const depotState = process.env.DEFAULT_DEPOT_STATE || 'Delhi';
  const depotPin = process.env.DEFAULT_DEPOT_PIN || '110010';

  let defaultDepot = db.prepare('SELECT id FROM warehouses WHERE warehouse_code = ? OR id = ?').get(depotCode, 'wh-cod-dlh-01') as { id: string } | undefined;
  if (!defaultDepot) {
    const depotId = 'wh-cod-dlh-01';
    db.prepare(`
      INSERT OR IGNORE INTO warehouses (id, warehouse_code, name, type, address, city, state, pincode, contact_person, contact_phone, status, created_at, updated_at)
      VALUES (?, ?, ?, 'TECHNICAL', 'Cantonment Area, Ring Road Depot Gate 4', ?, ?, ?, 'Commanding Officer Depot', '+91 11 2568 1234', 'ACTIVE', ?, ?)
    `).run(depotId, depotCode, depotName, depotCity, depotState, depotPin, now, now);
    defaultDepot = db.prepare('SELECT id FROM warehouses WHERE warehouse_code = ? OR id = ?').get(depotCode, depotId) as { id: string } | undefined;
  }

  // Fetch all warehouse IDs to assign to staff roles
  const allDepots = db.prepare('SELECT id FROM warehouses').all() as { id: string }[];
  const assignedWarehouseIds = allDepots.map(d => d.id);

  // 2. Synchronize credentials fetched directly from process.env
  const credentialsToSync = [
    {
      role: 'ADMIN',
      name: process.env.ADMIN_NAME || 'Col. Rajiv Sharma (Retd.)',
      email: (process.env.ADMIN_EMAIL || 'admin@defence.gov.in').trim().toLowerCase(),
      password: process.env.ADMIN_PASSWORD || 'Admin@Defence2026!',
      phone: process.env.ADMIN_PHONE || '+91 98100 12345',
      id: 'user-admin-env',
      warehouses: [] // Global access for Admin
    },
    {
      role: 'WAREHOUSE_MANAGER',
      name: process.env.MANAGER_NAME || 'Maj. Vikramaditya Rathore',
      email: (process.env.MANAGER_EMAIL || 'manager@defence.gov.in').trim().toLowerCase(),
      password: process.env.MANAGER_PASSWORD || 'Manager@Depot2026!',
      phone: process.env.MANAGER_PHONE || '+91 98200 54321',
      id: 'user-manager-env',
      warehouses: assignedWarehouseIds
    },
    {
      role: 'TECHNICAL_INSPECTOR',
      name: process.env.INSPECTOR_NAME || 'Capt. Ananya Sen (QA Ballistics)',
      email: (process.env.INSPECTOR_EMAIL || 'inspector@defence.gov.in').trim().toLowerCase(),
      password: process.env.INSPECTOR_PASSWORD || 'Inspector@QA2026!',
      phone: process.env.INSPECTOR_PHONE || '+91 98300 98765',
      id: 'user-inspector-env',
      warehouses: assignedWarehouseIds
    },
    {
      role: 'VIEWER',
      name: process.env.VIEWER_NAME || 'Subedar H. S. Rawat',
      email: (process.env.VIEWER_EMAIL || 'viewer@defence.gov.in').trim().toLowerCase(),
      password: process.env.VIEWER_PASSWORD || 'Staff@Store2026!',
      phone: process.env.VIEWER_PHONE || '+91 98400 67890',
      id: 'user-viewer-env',
      warehouses: assignedWarehouseIds
    }
  ];

  for (const cred of credentialsToSync) {
    const passwordHash = bcrypt.hashSync(cred.password, 10);
    const existing = db.prepare('SELECT id FROM users WHERE email = ? OR id = ?').get(cred.email, cred.id) as { id: string } | undefined;
    const warehouseJson = JSON.stringify(cred.warehouses);

    if (existing) {
      db.prepare(`
        UPDATE users
        SET name = ?, email = ?, password_hash = ?, phone = ?, role = ?, status = 'ACTIVE', assigned_warehouse_ids = ?, updated_at = ?
        WHERE id = ?
      `).run(cred.name, cred.email, passwordHash, cred.phone, cred.role, warehouseJson, now, existing.id);
    } else {
      db.prepare(`
        INSERT INTO users (id, name, email, password_hash, phone, role, status, assigned_warehouse_ids, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?)
      `).run(cred.id, cred.name, cred.email, passwordHash, cred.phone, cred.role, warehouseJson, now, now);
    }

    // Populate warehouse_assignments table for non-admin users
    const effectiveUserId = existing ? existing.id : cred.id;
    for (const wId of cred.warehouses) {
      db.prepare(`
        INSERT OR IGNORE INTO warehouse_assignments (id, user_id, warehouse_id)
        VALUES (?, ?, ?)
      `).run(`wa-${effectiveUserId}-${wId}`, effectiveUserId, wId);
    }
  }

  // 3. Ensure sample standard items exist if item table is empty
  const itemCount = (db.prepare('SELECT count(*) as count FROM items').get() as { count: number }).count;
  if (itemCount === 0) {
    const item1Id = 'item-556-insas';
    db.prepare(`
      INSERT INTO items (id, item_code, item_name, category, sub_category, type, unit, batch_number, serial_number_tracking, minimum_stock_level, maximum_stock_level, unit_cost, currency, shelf_life_months, storage_conditions, status, created_at, updated_at)
      VALUES (?, 'AMN-556-INSAS', 'Cartridge 5.56x45mm Ball (INSAS/NATO Spec)', 'Small Arms Ammunition', '5.56mm Family', 'AMMUNITION', 'ROUNDS', 'OFV-2025-BATCH-08', 0, 50000, 2000000, 48.50, 'INR', 120, 'Dry Air-conditioned Bunker < 65% RH', 'ACTIVE', ?, ?)
    `).run(item1Id, now, now);

    const item2Id = 'item-84mm-heat';
    db.prepare(`
      INSERT INTO items (id, item_code, item_name, category, sub_category, type, unit, batch_number, serial_number_tracking, minimum_stock_level, maximum_stock_level, unit_cost, currency, shelf_life_months, storage_conditions, status, created_at, updated_at)
      VALUES (?, 'AMN-84MM-HEAT', '84mm High Explosive Anti-Tank (HEAT 551) Round', 'Anti-Tank Ammunition', 'Carl Gustaf 84mm', 'AMMUNITION', 'ROUNDS', 'OFB-2024-LOT-44', 1, 100, 1500, 32500.00, 'INR', 84, 'Explosives Magazine Bay #4, Temperature 18-24°C', 'ACTIVE', ?, ?)
    `).run(item2Id, now, now);
  }
}

// Sequence generators
export function generateSequenceNumber(prefix: string, tableName: string, colName: string): string {
  const year = new Date().getFullYear();
  const pattern = `${prefix}-${year}-%`;
  const row = db.prepare(`SELECT count(*) as count FROM ${tableName} WHERE ${colName} LIKE ?`).get(pattern) as { count: number };
  const nextNumber = (row ? row.count : 0) + 1;
  return `${prefix}-${year}-${nextNumber.toString().padStart(6, '0')}`;
}

// When run directly as a seed script: initialize default settings, form templates, and sync env credentials
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    initDefaultSettingsAndTemplates();
    console.log('[SEED] Default settings, form templates, and credentials synchronized.');
  } catch (err) {
    console.error('[SEED] Error:', err);
    process.exit(1);
  }
}
