# Ammunition & Warehouse Compliance Management System (AWCMS)

**Short name:** AWCMS

A production-ready, role-based, warehouse-based access control system for managing ammunition and technical store inspection, receipt, issue, and compliance documentation in ordnance depots and warehouses.

---

## 1. Project Description

AWCMS is an internal operational system for managing the full lifecycle of ammunition and technical store inventory. It supports warehouse master data, item/store master, stock and storage tracking, serial-number and batch tracking, receipt and issue workflows, DRS (Defence Requisition Slip) number management, ammunition inspection, Technical Inspection Forms 263 and 270, custom official forms, weekly review/approval, Appendix A and Appendix B reports, document upload with PDF preview/download, reports with CSV/PDF export, and comprehensive audit logging.

The system enforces role-based and warehouse-based access control at both the UI and API levels. All data is stored in a local SQLite database (PostgreSQL-compatible schema available via Prisma) with optional PostgreSQL support.

---

## 2. Real-Life Purpose

AWCMS is designed for real operational use in defence ordnance depots, technical ammunition support groups, central ordnance depots, and warehouse compliance environments. It provides:

- **Stock accountability**: Track every round, lot, and serial number from receipt to issue or disposal.
- **Inspection compliance**: Conduct and document routine, technical, and proof inspections with Form 263 / 270 workflows.
- **Regulatory reporting**: Generate Appendix A (stock ledger) and Appendix B (inspection) reports for official submissions.
- **Audit integrity**: Immutable audit logs for every login, data change, approval, export, and admin override.
- **Access control**: Role-based (ADMIN, WAREHOUSE_MANAGER, TECHNICAL_INSPECTOR, STAFF/VIEWER) and warehouse-scoped permissions.

---

## 3. Complete Feature List

| Module | Features |
|--------|----------|
| **Authentication** | Login, logout, session protection, password change, profile, first-time admin setup, strong password validation, rate limiting on login, audit logging for login/logout/failed login |
| **Dashboard** | Real database metrics (warehouses, users, items, stock, receipts, issues, inspections, weekly approvals, stock value, low stock, overdue inspections), charts (inspections by status/warehouse/month, stock by category, Form 263 vs 270, weekly approval status, warehouse stock summary), role-scoped data |
| **Warehouse Master** | Create, edit, view, activate/deactivate, warehouse-wise dashboard/stock/inspection reports, user-warehouse assignment, deletion prevention if dependent records exist |
| **Item / Store Master** | Create/edit/view items, search/filter, item-wise stock report, serial-number tracking, batch tracking, unit cost/total value, min/max stock levels, storage conditions, deletion prevention if used |
| **Stock & Storage** | Stock inward, adjustment, issue linkage, warehouse/item/batch/serial search, inspection-due tracking, stock ledger, negative stock prevention, duplicate serial prevention |
| **Receipt Workflow** | DRAFT → SUBMITTED → PENDING_APPROVAL → APPROVED → CONDITION_CHECK → APPROVED_FOR_ISSUE → PARTIALLY_ISSUED → ISSUED/CLOSED → REJECTED/CANCELLED, multi-item receipts, approval/rejection, PDF/print view, over-issue prevention |
| **Issue Workflow** | DRAFT → SUBMITTED → PENDING_APPROVAL → APPROVED → PARTIALLY_ISSUED → COMPLETED → REJECTED/CANCELLED, issue against approved receipts, stock deduction after approved issue, ledger entries |
| **DRS Number** | Auto-generate unique DRS numbers, manual entry, link to receipt/issue, search, DRS register report, cancel with remarks, duplicate prevention |
| **Ammunition Inspection** | DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → REJECTED → REINSPECTION_REQUIRED → CLOSED, parameters, serial-wise results, document upload, submit/approve/reject/reinspect, stock status update, admin override with remarks |
| **Form 263 / 270** | Template builder, dynamic fields, required validation, conditional fields, file upload, save draft, submit, approval workflow, status timeline, PDF, print, CSV export, version retention |
| **Custom Forms** | Admin-created form templates with dynamic fields and approval workflows |
| **Weekly Review** | Manual or automatic creation, warehouse selection, week dates, inspection/stock summaries, submit/approve/reject, lock on approval, PDF/CSV export |
| **Appendix A** | Warehouse/Common-GP stock report with filters, search, sort, pagination, CSV/PDF export, official print header |
| **Appendix B** | Inspection/Technical review report with filters, search, sort, pagination, CSV/PDF export, official print header |
| **Documents** | Upload (PDF, JPG, PNG, DOCX, XLSX, max 10 MB), type/size validation, secure storage, link to entities, preview, download, delete, document register |
| **Reports** | 20+ reports, all filterable/exportable/permission-aware, date-range/warehouse/status/item/user filters, CSV and PDF export |
| **Audit Logs** | Complete audit trail for all sensitive actions, admin view with filters/search/pagination/before-after details |
| **Settings** | System configuration management (Admin only) |

---

## 4. User Roles and Permission Matrix

| Role | Description | Permissions |
|------|-------------|-------------|
| **ADMIN** | Full system access | All modules, all warehouses, user management, master data, settings, audit logs, override approvals with remarks |
| **WAREHOUSE_MANAGER** | Assigned warehouse management | Create/update receipts, stock, inspections, weekly reviews for assigned warehouses; approve weekly records; upload documents; no user management or master data deletion |
| **TECHNICAL_INSPECTOR** | Inspection and forms | Create/update inspection records, Forms 263/270, record findings/serials/recommendations, submit for approval; cannot delete approved records |
| **STAFF / VIEWER** | View-only | View assigned warehouse/inspection data, download reports/documents; no create, approve, or delete |

---

## 5. Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS, Vite, Lucide React
- **Backend:** Express.js, Node.js
- **Database:** SQLite (default), PostgreSQL-compatible via Prisma ORM
- **Authentication:** JWT + HTTP-only secure session cookies, bcrypt password hashing
- **Validation:** Zod
- **Forms:** React Hook Form
- **Charts:** Recharts / custom SVG
- **Dates:** date-fns
- **PDF:** HTML-to-PDF print rendering (browser print-to-PDF)
- **File Storage:** Local secure file system (uploads/)

---

## 6. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (React SPA)                      │
│  • App Router (single-page)                                 │
│  • Role-based sidebar navigation                            │
│  • API service layer (JWT Bearer auth)                      │
│  • PDF preview (iframe print-to-PDF)                        │
└─────────────────────────────────────────────────────────────┘
                              │ HTTP/JSON + JWT
┌─────────────────────────────────────────────────────────────┐
│                      Express API Server                     │
│  • /api/auth — login, logout, me, change-password, setup    │
│  • /api/users, /api/warehouses, /api/items                  │
│  • /api/stock, /api/receipts, /api/issues, /api/drs         │
│  • /api/inspections, /api/forms, /api/weekly-reviews        │
│  • /api/documents, /api/reports, /api/dashboard, /api/audit│
│  • Role + warehouse middleware on every route               │
└─────────────────────────────────────────────────────────────┘
                              │ SQL (parameterized)
┌─────────────────────────────────────────────────────────────┐
│                     Database (SQLite)                       │
│  • users, warehouses, items, stock_records, stock_ledgers   │
│  • receipts, receipt_items, issues, issue_items             │
│  • drs_numbers, inspections, form_templates, form_fields    │
│  • form_submissions, form_approvals, weekly_reviews         │
│  • documents, audit_logs, settings                          │
└─────────────────────────────────────────────────────────────┘
                              │ Local filesystem
┌─────────────────────────────────────────────────────────────┐
│                     Uploads Directory                       │
│  • Secure file storage (./uploads)                          │
│  • Type and size validation                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Folder Structure

```
AWCMS/
├── .env                          # Environment variables (local)
├── .env.example                  # Environment template
├── README.md                     # This file
├── package.json                  # Node.js dependencies & scripts
├── server.ts                     # Express server entry point
├── tsconfig.json                 # TypeScript config
├── vite.config.ts                # Vite build config
├── prisma/
│   └── schema.prisma             # Prisma schema (PostgreSQL-compatible)
├── server/
│   ├── db.ts                     # SQLite database layer + audit logging
│   ├── middleware.ts             # JWT auth, role checking, warehouse access
│   └── routes.ts                 # All API routes
├── src/
│   ├── App.tsx                   # Root application component
│   ├── main.tsx                  # React entry point
│   ├── index.css                 # Tailwind CSS styles
│   ├── context/AppContext.tsx    # React context (state + API wrappers)
│   ├── services/api.ts           # API client service
│   ├── types/index.ts            # TypeScript type definitions
│   ├── components/
│   │   ├── layout/AppSidebar.tsx     # Sidebar navigation (role-filtered)
│   │   ├── layout/AppHeader.tsx      # Top header with app branding
│   │   ├── common/StatusBadge.tsx    # Status color badges
│   │   └── charts/DashboardCharts.tsx # Dashboard charts
│   └── views/
│       ├── LoginView.tsx
│       ├── SetupAdminView.tsx
│       ├── DashboardView.tsx
│       ├── StockView.tsx
│       ├── ReceiptsView.tsx
│       ├── IssuesView.tsx
│       ├── InspectionsView.tsx
│       ├── InspectionDetailView.tsx
│       ├── FormsView.tsx
│       ├── WeeklyReviewsView.tsx
│       ├── AppendixReportsView.tsx
│       ├── ItemsView.tsx
│       ├── WarehousesView.tsx
│       ├── DRSView.tsx
│       ├── DocumentsView.tsx
│       ├── UsersView.tsx
│       ├── AuditLogsView.tsx
│       ├── SettingsView.tsx
│       ├── ProfileView.tsx
│       ├── NotFoundView.tsx
│       └── ForbiddenView.tsx
├── uploads/                      # Local secure file storage
├── data/                         # SQLite database files
└── dist/                         # Production build output
```

---

## 8. Prerequisites

- Node.js 18+ (recommended 20+)
- npm (comes with Node.js)
- For PostgreSQL (optional): PostgreSQL server and a created database

---

## 9. Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (default 3000) | No |
| `NODE_ENV` | `development` or `production` | No |
| `APP_URL` | Base URL of the application | No |
| `APP_NAME` | Display name: "Ammunition & Warehouse Compliance Management System" | No |
| `APP_SHORT_NAME` | Short name: "AWCMS" | No |
| `DATABASE_URL` | SQLite file path or PostgreSQL connection string | Yes |
| `NEXTAUTH_URL` | Auth callback URL | Yes |
| `NEXTAUTH_SECRET` | Session signing secret (min 32 chars) | Yes |
| `JWT_SECRET` | JWT access token secret (min 32 chars) | Yes |
| `UPLOAD_DIR` | Local directory for file uploads | No |
| `MAX_FILE_SIZE_MB` | Max upload size in MB (default 10) | No |
| `ALLOWED_FILE_TYPES` | Comma-separated allowed MIME types | No |
| `LOGIN_RATE_LIMIT_MAX` | Max login attempts per window | No |
| `LOGIN_RATE_LIMIT_WINDOW_MS` | Rate limit window in ms | No |
| `ADMIN_*` / `MANAGER_*` / `INSPECTOR_*` / `VIEWER_*` | Default credentials (optional, setup screen preferred) | No |
| `DEFAULT_DEPOT_*` | Default warehouse on first boot | No |

---

## 10. Local Installation Steps

```bash
# 1. Clone or open the project folder
cd path/to/AWCMS

# 2. Install dependencies
npm install

# 3. Copy environment template
cp .env.example .env

# 4. Edit .env with your configuration (especially DATABASE_URL, JWT_SECRET, NEXTAUTH_SECRET)

# 5. Initialize the database
npx prisma migrate dev --name init

# 6. Start the development server
npm run dev
```

The application will be available at `http://localhost:3000`.

---

## 11. Database Setup

The system uses SQLite by default. The database file is created at `./data/awcms.db` (or the path specified in `DATABASE_URL`).

```bash
# Create/initialize database tables
npx prisma migrate dev --name init

# For production deployment
npx prisma migrate deploy
```

If you want to use PostgreSQL instead of SQLite, update `DATABASE_URL` in `.env` to a PostgreSQL connection string and ensure the Prisma schema is compatible.

---

## 12. First-Time Admin Setup

On first launch, if no administrator exists in the database:

1. The application shows the **Setup Admin** screen.
2. Enter admin name, email, password (minimum 8 characters), and phone.
3. Submit to create the master administrator account.
4. The setup screen is automatically disabled after the first admin is created.
5. The admin is logged in and redirected to the dashboard.

If you pre-configure `ADMIN_*` environment variables, they may be synchronized on startup, but the interactive setup screen is the recommended method for production.

---

## 13. Optional Seed Command

A seed script is available for loading reference/master data only (units, roles, default inspection parameters, form categories, settings). It does **not** create fake users, receipts, issues, inspections, or stock records.

```bash
npm run db:seed
```

> **Warning:** The seed script must not be used in production. It is for reference/master data and development testing only.

---

## 14. Development Command

```bash
npm run dev
```

Starts the Express server with Vite middleware on `http://localhost:3000`.

---

## 15. Production Build Command

```bash
# Build the frontend for production
npm run build

# Start the production server
npm run start
```

The production server serves static assets from `dist/` and handles all API routes. The build output is placed in the `dist/` directory.

---

## 16. Production Deployment Notes

1. **Set `NODE_ENV=production`** in `.env`.
2. **Generate strong secrets:** `NEXTAUTH_SECRET` and `JWT_SECRET` (use `openssl rand -base64 32`).
3. **Use HTTPS:** Ensure the application is served over HTTPS in production. Secure cookies require HTTPS.
4. **Database:** For production, consider using PostgreSQL instead of SQLite for concurrent access. Update `DATABASE_URL` accordingly.
5. **Run migrations:** `npx prisma migrate deploy`
6. **First admin:** Use the setup screen to create the first administrator. Do not hardcode admin credentials in production `.env`.
7. **File storage:** The `./uploads` directory must be writable and backed up regularly.
8. **Reverse proxy:** Deploy behind a reverse proxy (nginx, Apache) for SSL termination and load balancing.
9. **Backups:** Regularly back up the SQLite database file and the `./uploads` directory.

---

## 17. API Documentation

All API endpoints are under `/api` and require authentication (JWT Bearer token or HTTP-only cookie) unless noted.

### Auth
| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| POST | `/api/auth/login` | Authenticate user | Public |
| POST | `/api/auth/logout` | Logout and clear session | Authenticated |
| GET | `/api/auth/me` | Get current user | Authenticated |
| POST | `/api/auth/change-password` | Change password | Authenticated |
| POST | `/api/auth/setup-admin` | Create first admin | No admin exists |

### Users (Admin only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List users |
| POST | `/api/users` | Create user |
| PATCH | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |

### Warehouses
| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/api/warehouses` | List warehouses (role-scoped) | All |
| POST | `/api/warehouses` | Create warehouse | ADMIN |
| GET | `/api/warehouses/:id` | Get warehouse | All (scoped) |
| PATCH | `/api/warehouses/:id` | Update warehouse | ADMIN |
| DELETE | `/api/warehouses/:id` | Delete warehouse | ADMIN (if no dependents) |

### Items
| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/api/items` | List items (search/filter) | All |
| POST | `/api/items` | Create item | ADMIN |
| GET | `/api/items/:id` | Get item | All |
| PATCH | `/api/items/:id` | Update item | ADMIN |
| DELETE | `/api/items/:id` | Delete item | ADMIN (if no dependents) |

### Stock
| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/api/stock` | List stock records (search/filter/paginate) | All (scoped) |
| POST | `/api/stock` | Create stock inward | ADMIN, WAREHOUSE_MANAGER |
| GET | `/api/stock/:id` | Get stock record | All (scoped) |
| PATCH | `/api/stock/:id` | Update/adjust stock | ADMIN, WAREHOUSE_MANAGER |
| GET | `/api/stock/ledger` | Stock ledger entries | All (scoped) |

### Receipts
| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/api/receipts` | List receipts (search/filter/paginate) | All (scoped) |
| POST | `/api/receipts` | Create receipt | ADMIN, WAREHOUSE_MANAGER |
| GET | `/api/receipts/:id` | Get receipt | All (scoped) |
| PATCH | `/api/receipts/:id` | Update receipt | ADMIN, WAREHOUSE_MANAGER |
| DELETE | `/api/receipts/:id` | Delete receipt | ADMIN (DRAFT/REJECTED/CANCELLED only) |
| PATCH | `/api/receipts/:id/submit` | Submit for approval | ADMIN, WAREHOUSE_MANAGER |
| PATCH | `/api/receipts/:id/approve` | Approve receipt | ADMIN, WAREHOUSE_MANAGER |
| PATCH | `/api/receipts/:id/reject` | Reject receipt | ADMIN, WAREHOUSE_MANAGER |

### Issues
| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/api/issues` | List issues (search/filter/paginate) | All (scoped) |
| POST | `/api/issues` | Create issue | ADMIN, WAREHOUSE_MANAGER |
| GET | `/api/issues/:id` | Get issue | All (scoped) |
| PATCH | `/api/issues/:id` | Update issue | ADMIN, WAREHOUSE_MANAGER |
| DELETE | `/api/issues/:id` | Delete issue | ADMIN (DRAFT/REJECTED/CANCELLED only) |
| PATCH | `/api/issues/:id/submit` | Submit for approval | ADMIN, WAREHOUSE_MANAGER |
| PATCH | `/api/issues/:id/approve` | Approve issue | ADMIN, WAREHOUSE_MANAGER |
| PATCH | `/api/issues/:id/reject` | Reject issue | ADMIN, WAREHOUSE_MANAGER |
| PATCH | `/api/issues/:id/complete` | Complete issue (deduct stock) | ADMIN, WAREHOUSE_MANAGER |

### DRS Numbers
| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/api/drs` | List DRS numbers (search/filter/paginate) | All (scoped) |
| POST | `/api/drs` | Create DRS number | ADMIN, WAREHOUSE_MANAGER, TECHNICAL_INSPECTOR |
| GET | `/api/drs/:id` | Get DRS number | All (scoped) |
| PATCH | `/api/drs/:id/cancel` | Cancel DRS number | ADMIN, WAREHOUSE_MANAGER |

### Inspections
| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/api/inspections` | List inspections (search/filter/paginate) | All (scoped) |
| POST | `/api/inspections` | Create inspection | ADMIN, WAREHOUSE_MANAGER, TECHNICAL_INSPECTOR |
| GET | `/api/inspections/:id` | Get inspection | All (scoped) |
| PATCH | `/api/inspections/:id` | Update inspection (Admin override if approved) | ADMIN, WAREHOUSE_MANAGER, TECHNICAL_INSPECTOR |
| DELETE | `/api/inspections/:id` | Delete inspection | ADMIN, WAREHOUSE_MANAGER |
| PATCH | `/api/inspections/:id/submit` | Submit for review | ADMIN, WAREHOUSE_MANAGER, TECHNICAL_INSPECTOR |
| PATCH | `/api/inspections/:id/approve` | Approve inspection | ADMIN, WAREHOUSE_MANAGER |
| PATCH | `/api/inspections/:id/reject` | Reject inspection | ADMIN, WAREHOUSE_MANAGER |
| PATCH | `/api/inspections/:id/reinspect` | Return for reinspection | ADMIN, WAREHOUSE_MANAGER |
| GET | `/api/inspections/:id/pdf` | Get inspection PDF | All (scoped) |

### Forms (Templates & Submissions)
| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/api/forms/templates` | List form templates | All |
| POST | `/api/forms/templates` | Create form template | ADMIN |
| GET | `/api/forms/templates/:id` | Get form template | All |
| PATCH | `/api/forms/templates/:id` | Update form template | ADMIN |
| DELETE | `/api/forms/templates/:id` | Delete form template | ADMIN |
| GET | `/api/forms/submissions` | List form submissions (search/filter/paginate) | All (scoped) |
| POST | `/api/forms/submissions` | Create form submission | All (scoped) |
| GET | `/api/forms/submissions/:id` | Get form submission | All (scoped) |
| PATCH | `/api/forms/submissions/:id` | Update form submission | All (scoped) |
| PATCH | `/api/forms/submissions/:id/submit` | Submit for approval | All (scoped) |
| PATCH | `/api/forms/submissions/:id/approve` | Approve form submission | ADMIN, WAREHOUSE_MANAGER |
| PATCH | `/api/forms/submissions/:id/reject` | Reject form submission | ADMIN, WAREHOUSE_MANAGER |
| GET | `/api/forms/submissions/:id/pdf` | Get form PDF | All (scoped) |

### Weekly Reviews
| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/api/weekly-reviews` | List weekly reviews (search/filter/paginate) | All (scoped) |
| POST | `/api/weekly-reviews` | Create weekly review | ADMIN, WAREHOUSE_MANAGER |
| GET | `/api/weekly-reviews/:id` | Get weekly review | All (scoped) |
| PATCH | `/api/weekly-reviews/:id` | Update weekly review | ADMIN, WAREHOUSE_MANAGER |
| PATCH | `/api/weekly-reviews/:id/submit` | Submit for approval | ADMIN, WAREHOUSE_MANAGER |
| PATCH | `/api/weekly-reviews/:id/approve` | Approve weekly review | ADMIN, WAREHOUSE_MANAGER |
| PATCH | `/api/weekly-reviews/:id/reject` | Reject weekly review | ADMIN, WAREHOUSE_MANAGER |
| GET | `/api/weekly-reviews/:id/pdf` | Get weekly review PDF | All (scoped) |

### Documents
| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| POST | `/api/documents/upload` | Upload document | All (scoped) |
| GET | `/api/documents` | List documents | All (scoped) |
| GET | `/api/documents/:id/download` | Download document | All (scoped) |
| DELETE | `/api/documents/:id` | Delete document | ADMIN, WAREHOUSE_MANAGER |

### Reports
| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/api/reports/stock` | Stock report | All (scoped) |
| GET | `/api/reports/inspections` | Inspection report | All (scoped) |
| GET | `/api/reports/forms` | Form report | All (scoped) |
| GET | `/api/reports/weekly` | Weekly report | All (scoped) |
| GET | `/api/reports/appendix-a` | Appendix A report | All (scoped) |
| GET | `/api/reports/appendix-b` | Appendix B report | All (scoped) |
| GET | `/api/reports/receipt-register` | Receipt register | All (scoped) |
| GET | `/api/reports/issue-register` | Issue register | All (scoped) |
| GET | `/api/reports/inspection-due` | Inspection due report | All (scoped) |
| GET | `/api/reports/overdue-inspections` | Overdue inspection report | All (scoped) |
| GET | `/api/reports/rejected-reinspection` | Rejected/reinspection report | All (scoped) |
| GET | `/api/reports/ammo-inspection` | Ammunition inspection report | All (scoped) |
| GET | `/api/reports/tech-inspection` | Technical inspection report | All (scoped) |
| GET | `/api/reports/form-263-register` | Form 263 register | All (scoped) |
| GET | `/api/reports/form-270-register` | Form 270 register | All (scoped) |
| GET | `/api/reports/form-submission-register` | Form submission register | All (scoped) |
| GET | `/api/reports/weekly-approval` | Weekly approval report | All (scoped) |
| GET | `/api/reports/drs-register` | DRS register | All (scoped) |
| GET | `/api/reports/document-register` | Document register | All (scoped) |
| GET | `/api/reports/user-activity` | User activity report | ADMIN |
| GET | `/api/reports/audit-trail` | Audit trail report | ADMIN |
| GET | `/api/reports/export` | CSV export (all report types) | All (scoped) |

### Dashboard
| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/api/dashboard/summary` | Dashboard summary metrics | All (scoped) |
| GET | `/api/dashboard/charts` | Dashboard chart data | All (scoped) |

### Audit
| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/api/audit-logs` | Audit logs (filters/search/paginate) | ADMIN |

### Settings
| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/api/settings` | List settings | All |
| PATCH | `/api/settings` | Update settings | ADMIN |

### Health
| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/api/health` | Health check (includes admin existence) | Public |

All list APIs support: search, filters, sorting, pagination, authentication, authorization, Zod validation, and proper error responses.

---

## 18. Receipt and Issue Workflow

### Receipt Workflow
1. **DRAFT** — Receipt created with multiple items. Can be edited or deleted.
2. **SUBMITTED** — Submitted for approval. Cannot be edited.
3. **PENDING_APPROVAL** — Awaiting warehouse manager or admin approval.
4. **APPROVED** — Approved. Moves to condition check.
5. **CONDITION_CHECK** — Quality/condition inspection performed.
6. **APPROVED_FOR_ISSUE** — Cleared for issue.
7. **PARTIALLY_ISSUED** — Some items issued.
8. **ISSUED / CLOSED** — Fully issued and closed.
9. **REJECTED / CANCELLED** — Rejected or cancelled. Can be deleted.

### Issue Workflow
1. **DRAFT** — Issue created against approved receipts.
2. **SUBMITTED** — Submitted for approval.
3. **PENDING_APPROVAL** — Awaiting approval.
4. **APPROVED** — Approved for issue.
5. **PARTIALLY_ISSUED** — Partially issued against stock.
6. **COMPLETED** — Fully issued. Stock is deducted and ledger entries created.
7. **REJECTED / CANCELLED** — Rejected or cancelled.

Stock deduction only occurs after an issue is approved and completed. Over-issue and negative stock are prevented.

---

## 19. Ammunition Inspection Workflow

1. **DRAFT** — Inspection created with parameters and serial-number results.
2. **SUBMITTED** — Submitted for review.
3. **UNDER_REVIEW** — Under review by approver.
4. **APPROVED** — Approved. Stock status updated based on result.
5. **REJECTED** — Rejected with reason.
6. **REINSPECTION_REQUIRED** — Returned for reinspection.
7. **CLOSED** — Final state.

Admin override is permitted on approved inspections with mandatory remarks and full audit logging. Approved inspections cannot be edited by non-admin users.

---

## 20. Form 263 Workflow

Technical Inspection Form 263 (Ammunition / Explosives Acceptance & Quality Review):

1. Admin creates or uses the default Form 263 template with dynamic fields.
2. Technical Inspector or Warehouse Manager fills the form (linked to warehouse, item, stock record, or inspection).
3. Save as **DRAFT** or **SUBMIT** for approval.
4. Approver (ADMIN or WAREHOUSE_MANAGER) reviews and **approves**, **rejects**, or **returns for changes** with mandatory remarks.
5. Approved forms are locked (version retained).
6. Generate PDF or print-friendly view.
7. CSV export available from the Form 263 Register report.

---

## 21. Form 270 Workflow

Technical Inspection Form 270 (Periodic Proof Firing & Chemical Stability Test):

1. Admin creates or uses the default Form 270 template with dynamic fields (proof firing range, rounds fired, muzzle velocity, chamber pressure, stabilizer content, etc.).
2. Technical Inspector fills the form with test results.
3. Save as **DRAFT** or **SUBMIT** for approval.
4. Approver reviews and **approves**, **rejects**, or **returns for changes** with mandatory remarks.
5. Approved forms are locked with version retention.
6. Generate PDF or print-friendly view.
7. CSV export available from the Form 270 Register report.

---

## 22. Weekly Approval Workflow

1. Warehouse Manager (or Admin) creates a weekly review manually or automatically.
2. Select warehouse, week start date, and week end date.
3. System aggregates real data: inspection summary, pending/completed/rejected inspections, stock value summary.
4. Save as **DRAFT** or **SUBMIT** for approval.
5. Approver reviews and **approves** (locks the review) or **rejects** with remarks.
6. Approved weekly reviews are locked and cannot be modified.
7. Generate Weekly Approval PDF or CSV export.
8. Warehouse Managers see only their assigned warehouses.

---

## 23. Appendix A Format

**Appendix A — Warehouse / Common-GP Stock Report**

Contains:
- Warehouse name/code
- Report period
- Item name/code
- Category
- Batch number
- Serial number
- Quantity
- Unit
- Unit cost
- Total value
- Storage location
- Storage condition
- Last inspection date
- Next inspection due date
- Status
- Remarks

Supports: warehouse filter, date-range filter, item filter, status filter, search, sorting, pagination, CSV export, PDF/print export, official print header (AWCMS, report title, period, generated date, generated by, page numbers).

---

## 24. Appendix B Format

**Appendix B — Inspection / Technical Review Report**

Contains:
- Warehouse name/code
- Report period
- Inspection number
- Inspection date
- Item name/code
- Batch/lot number
- Serial number
- Quantity inspected
- Quantity passed
- Quantity failed
- Quantity quarantined
- Inspection result
- Findings
- Recommendations
- Inspector name
- Approver name
- Approval status
- Remarks

Supports: warehouse filter, date-range filter, item filter, status filter, inspection-type filter, search, sorting, pagination, CSV export, PDF/print export, official print header.

---

## 25. DRS Workflow

1. **Auto-generate:** System generates a unique DRS number (format: DRS-YYYY-NNNNNN).
2. **Manual entry:** Users can manually enter a DRS number received from the Tech module.
3. **Link:** DRS numbers can be linked to receipts or issues.
4. **Search:** Search by DRS number.
5. **Register:** DRS Register report lists all DRS numbers with status.
6. **Cancel:** Cancel a DRS number with mandatory cancellation reason.
7. **Prevention:** Duplicate DRS numbers are prevented.
8. **Display:** DRS numbers are displayed on related receipt/issue pages.

---

## 26. Document Upload and PDF Preview

- **Supported file types:** PDF, JPG, PNG, DOCX, XLSX, CSV
- **Maximum file size:** 10 MB (configurable via `MAX_FILE_SIZE_MB`)
- **Validation:** File type and size validated on upload
- **Secure storage:** Files stored in `./uploads` with safe, unique filenames
- **Linking:** Documents can be linked to stock records, inspections, forms, weekly reviews, receipts, and issues
- **PDF preview:** PDF files can be previewed inside the app (browser print-to-PDF)
- **Download:** Download any uploaded document
- **Delete:** Delete documents with permission control (ADMIN, WAREHOUSE_MANAGER)
- **Document register:** Report listing all uploaded documents

---

## 27. Report and Export Instructions

All reports support:
- Date-range filter
- Warehouse filter (role-scoped)
- Status filter
- Item filter
- User filter
- Form-type filter (where relevant)
- Search
- Sorting
- Pagination
- **CSV export:** Click the CSV download button on any report page
- **PDF/print export:** Use browser print (Ctrl+P) or the PDF endpoints for inspection, form, and weekly review documents
- **Real database data only** — no hardcoded or mock data

Reports available: Receipt Register, Issue Register, Warehouse-wise Stock, Item-wise Stock, Serial-number-wise Stock, Batch-wise Stock, Stock Ledger, Inspection-due, Overdue Inspection, Rejected/Reinspection, Ammunition Inspection, Technical Inspection, Form 263 Register, Form 270 Register, Form Submission Register, Weekly Approval, Appendix A, Appendix B, DRS Register, Document Register, User Activity, Audit Trail.

---

## 28. Audit Log Explanation

Audit logs capture:
- Login, logout, failed login attempts
- User changes (create, update, delete)
- Warehouse changes
- Item changes
- Stock changes (inward, adjustment, issue)
- Receipt changes (create, submit, approve, reject)
- Issue changes (create, submit, approve, reject, complete)
- Inspection changes (create, submit, approve, reject, override)
- Form changes (create, submit, approve, reject)
- Weekly review changes
- Document upload/download/delete
- DRS creation/cancellation
- Report export
- Admin override (with mandatory remarks)

Each audit log entry includes: user ID, action, entity type, entity ID, before/after data (JSON), IP address, user agent, and timestamp.

The Audit Logs page (Admin only) provides filters, search, pagination, and before/after change details.

---

## 29. Security Notes

- Passwords hashed with bcrypt (10 salt rounds)
- HTTP-only secure session cookies
- JWT access tokens with expiration
- Role-based API authorization on every endpoint
- Warehouse-level data authorization (non-admin users see only assigned warehouses)
- Input validation on every endpoint (Zod)
- SQL-injection-safe parameterized queries (no string interpolation in SQL)
- File-type and file-size validation on uploads
- Secure file naming and path handling
- Rate limiting on login endpoint
- Audit logging for all sensitive actions
- No secrets in client-side code
- Database transactions for multi-step operations (receipts, issues, stock)
- No negative stock; no over-issue
- No duplicate receipt, issue, inspection, form, DRS, or weekly review numbers
- Historical records preserved; unsafe deletion prevented
- `created-by`, `updated-by`, `created-at`, `updated-at` fields on all relevant tables

---

## 30. Backup and Restore Guidance

### Database Backup (SQLite)
```bash
# Copy the database file
cp data/awcms.db data/awcms.db.backup-$(date +%Y%m%d)
```

### File Storage Backup
```bash
# Copy the uploads directory
cp -r uploads uploads.backup-$(date +%Y%m%d)
```

### Restore
1. Stop the application server
2. Replace `data/awcms.db` with the backup file
3. Replace `uploads/` directory with the backup
4. Restart the server

### PostgreSQL (if used)
Use `pg_dump` and `pg_restore` for standard PostgreSQL backup/restore procedures.

---

## 31. Known Limitations

- SQLite is single-writer by default; high-concurrency production environments should use PostgreSQL.
- PDF generation uses HTML-to-print rendering (browser print-to-PDF) rather than a server-side PDF library. For production, consider integrating a library like `pdfkit` or `puppeteer`.
- Email notifications are not implemented; use the audit log and in-app notifications for operational awareness.
- Real-time updates (WebSockets) are not implemented; data is refreshed on navigation and via manual refresh.

---

## 32. Future Enhancement Suggestions

- Integrate server-side PDF generation (pdfkit/puppeteer) for true PDF files
- Add email/SMS notifications for approvals and alerts
- Add real-time updates via WebSockets
- Add barcode/QR code scanning for serial number lookup
- Add multi-warehouse transfer workflow
- Add advanced analytics and forecasting
- Add LDAP/Active Directory integration
- Add mobile app support

---

## License

Internal use only. Ammunition & Warehouse Compliance Management System (AWCMS).
