export type Role = 'ADMIN' | 'WAREHOUSE_MANAGER' | 'TECHNICAL_INSPECTOR' | 'VIEWER';

export type Status = 'ACTIVE' | 'INACTIVE';

export type Unit = 'ROUNDS' | 'PCS' | 'BOXES' | 'CRATES' | 'KG' | 'LTR' | 'SETS' | 'METERS';

export type WarehouseType = 'COMMON' | 'AMMUNITION' | 'TECHNICAL_STORE' | 'EXPLOSIVE_MAGAZINE';

export type ItemType = 'AMMUNITION' | 'EXPLOSIVE' | 'WEAPON_SPARES' | 'OPTICS' | 'ELECTRONICS' | 'GENERAL_STORE';

export type StockStatus = 'IN_STOCK' | 'INSPECTION_DUE' | 'QUARANTINE' | 'REJECTED' | 'ISSUED' | 'DISPOSED';

export type InspectionType = 'ROUTINE' | 'SURVEILLANCE' | 'PROOF_TEST' | 'PRE_ISSUE' | 'ANNUAL' | 'SPECIAL';

export type InspectionStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'REINSPECTION_REQUIRED' | 'CLOSED';

export type InspectionResult = 'PASS' | 'FAIL' | 'REINSPECTION_REQUIRED' | 'CONDITIONAL_PASS';

export type FormType = 'TECHNICAL_INSPECTION_FORM_263' | 'TECHNICAL_INSPECTION_FORM_270' | 'AMMUNITION_INSPECTION_FORM' | 'CUSTOM';

export type FormSubmissionStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

export type WeeklyReviewStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

export type TransactionType = 'INWARD' | 'OUTWARD' | 'ADJUSTMENT' | 'STATUS_CHANGE' | 'DISPOSAL';

export type ReceiptStatus = 'DRAFT' | 'SUBMITTED' | 'PENDING_APPROVAL' | 'APPROVED' | 'CONDITION_CHECK' | 'APPROVED_FOR_ISSUE' | 'PARTIALLY_ISSUED' | 'ISSUED' | 'CLOSED' | 'REJECTED' | 'CANCELLED';

export type IssueStatus = 'DRAFT' | 'SUBMITTED' | 'PENDING_APPROVAL' | 'APPROVED' | 'PARTIALLY_ISSUED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';

export type DRSStatus = 'ACTIVE' | 'CANCELLED';

export interface ReceiptItem {
  id: string;
  receiptId: string;
  itemId: string;
  batchNumber: string;
  serialNumber?: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalValue: number;
  storageLocation?: string;
  storageCondition?: string;
  dateOfReceipt?: string;
  nextInspectionDueDate?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Receipt {
  id: string;
  receiptNumber: string;
  warehouseId: string;
  warehouseName?: string;
  warehouseCode?: string;
  drsNumber?: string;
  status: ReceiptStatus;
  supplierName?: string;
  supplierInvoiceNumber?: string;
  receiptDate: string;
  totalItems: number;
  totalQuantity: number;
  totalValue: number;
  conditionCheckStatus?: string;
  conditionRemarks?: string;
  approvedById?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  submittedAt?: string;
  submittedById?: string;
  createdById: string;
  createdByName?: string;
  items: ReceiptItem[];
  documents?: Document[];
  createdAt: string;
  updatedAt: string;
}

export interface IssueItem {
  id: string;
  issueId: string;
  receiptId?: string;
  stockRecordId?: string;
  itemId: string;
  batchNumber: string;
  serialNumber?: string;
  quantityRequested: number;
  quantityApproved: number;
  quantityIssued: number;
  unit: string;
  unitCost: number;
  totalValue: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Issue {
  id: string;
  issueNumber: string;
  warehouseId: string;
  warehouseName?: string;
  warehouseCode?: string;
  drsNumber?: string;
  status: IssueStatus;
  issueToName?: string;
  issueToOrganization?: string;
  issueDate: string;
  totalItems: number;
  totalQuantity: number;
  totalValue: number;
  approvedById?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  submittedAt?: string;
  submittedById?: string;
  completedAt?: string;
  createdById: string;
  createdByName?: string;
  items: IssueItem[];
  documents?: Document[];
  createdAt: string;
  updatedAt: string;
}

export interface DRSNumber {
  id: string;
  drsNumber: string;
  warehouseId?: string;
  warehouseName?: string;
  warehouseCode?: string;
  sourceModule: string;
  linkedEntityType?: string;
  linkedEntityId?: string;
  status: DRSStatus;
  cancelReason?: string;
  cancelledById?: string;
  cancelledAt?: string;
  createdById: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  status: Status;
  assignedWarehouseIds: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Warehouse {
  id: string;
  warehouseCode: string;
  name: string;
  type: WarehouseType;
  address: string;
  city: string;
  state: string;
  pincode: string;
  contactPerson: string;
  contactPhone: string;
  status: Status;
  stockCount?: number;
  inspectionCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Item {
  id: string;
  itemCode: string;
  itemName: string;
  category: string;
  subCategory?: string;
  type: ItemType;
  unit: Unit;
  batchNumber?: string;
  serialNumberTracking: boolean;
  minimumStockLevel: number;
  maximumStockLevel: number;
  unitCost: number;
  currency: string;
  shelfLifeMonths?: number;
  storageConditions?: string;
  status: Status;
  createdAt?: string;
  updatedAt?: string;
}

export interface StockRecord {
  id: string;
  warehouseId: string;
  warehouseName?: string;
  warehouseCode?: string;
  itemId: string;
  itemName?: string;
  itemCode?: string;
  itemCategory?: string;
  serialNumberTracking?: boolean;
  batchNumber: string;
  serialNumber?: string;
  quantity: number;
  unit: Unit;
  unitCost: number;
  totalValue: number;
  storageLocation: string;
  storageCondition: string;
  dateOfReceipt: string;
  lastInspectionDate?: string;
  nextInspectionDueDate?: string;
  status: StockStatus;
  remarks?: string;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockLedger {
  id: string;
  warehouse_id: string;
  warehouse_name?: string;
  warehouse_code?: string;
  item_id: string;
  item_name?: string;
  item_code?: string;
  stock_record_id: string;
  transaction_type: TransactionType;
  quantity: number;
  unit_cost: number;
  total_value: number;
  batch_number?: string;
  serial_number?: string;
  balance_after_transaction: number;
  remarks?: string;
  operator_name?: string;
  created_at: string;
}

export interface InspectionParameter {
  id?: string;
  inspection_id?: string;
  parameterName: string;
  expectedValue: string;
  observedValue: string;
  result: 'PASS' | 'FAIL' | 'RECHECK';
  remarks?: string;
}

export interface InspectionSerial {
  id?: string;
  inspection_id?: string;
  serialNumber: string;
  quantity: number;
  condition: string;
  result: 'PASS' | 'FAIL' | 'RECHECK';
  remarks?: string;
}

export interface Inspection {
  id: string;
  inspection_number: string;
  warehouse_id: string;
  warehouse_name?: string;
  warehouse_code?: string;
  item_id: string;
  item_name?: string;
  item_code?: string;
  item_category?: string;
  stock_record_id?: string;
  inspection_type: InspectionType;
  inspection_date: string;
  inspector_id: string;
  inspector_name?: string;
  inspector_email?: string;
  approved_by_id?: string;
  approver_name?: string;
  approved_at?: string;
  rejection_reason?: string;
  form_type: FormType;
  quantity_inspected: number;
  quantity_passed: number;
  quantity_failed: number;
  quantity_quarantined: number;
  overall_result: InspectionResult;
  findings?: string;
  recommendations?: string;
  status: InspectionStatus;
  created_at: string;
  updated_at: string;
  parameters?: InspectionParameter[];
  serials?: InspectionSerial[];
  documents?: Document[];
}

export interface FormField {
  id: string;
  formTemplateId: string;
  field_key: string;
  field_label: string;
  field_type: 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'TEXTAREA' | 'CHECKBOX';
  required: number;
  default_value?: string;
  options?: string[];
  validationRules?: Record<string, any>;
  display_order: number;
}

export interface FormTemplate {
  id: string;
  form_code: string;
  form_name: string;
  form_version: string;
  form_type: FormType;
  description?: string;
  status: Status;
  requires_approval: number;
  approval_levels: number;
  allowedRoles: Role[];
  applicableWarehouseIds: string[];
  fields?: FormField[];
  createdAt?: string;
}

export interface FormApproval {
  id: string;
  form_submission_id: string;
  approval_level: number;
  approver_id: string;
  approver_name?: string;
  action: 'APPROVED' | 'REJECTED';
  remarks: string;
  action_at: string;
}

export interface FormSubmission {
  id: string;
  submission_number: string;
  form_template_id: string;
  form_name?: string;
  form_code?: string;
  form_type?: FormType;
  warehouse_id: string;
  warehouse_name?: string;
  warehouse_code?: string;
  item_id?: string;
  item_name?: string;
  item_code?: string;
  stock_record_id?: string;
  inspection_id?: string;
  submitted_by_id: string;
  submitter_name?: string;
  submission_date: string;
  form_data: Record<string, any>;
  status: FormSubmissionStatus;
  current_approval_level: number;
  remarks?: string;
  approvals?: FormApproval[];
  documents?: Document[];
  created_at: string;
  updated_at: string;
}

export interface WeeklyReview {
  id: string;
  review_number: string;
  warehouse_id: string;
  warehouse_name?: string;
  warehouse_code?: string;
  week_start_date: string;
  week_end_date: string;
  review_type: string;
  total_records_reviewed: number;
  pending_inspections: number;
  completed_inspections: number;
  approved_inspections: number;
  rejected_inspections: number;
  stock_value: number;
  remarks?: string;
  prepared_by_id: string;
  prepared_by_name?: string;
  approved_by_id?: string;
  approved_by_name?: string;
  approved_at?: string;
  status: WeeklyReviewStatus;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  entity_type: string;
  entity_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_path?: string;
  file_url: string;
  uploaded_by_id?: string;
  uploaded_by_name?: string;
  uploaded_at: string;
  remarks?: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before_data?: string;
  after_data?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface Setting {
  id: string;
  key: string;
  value: string;
  description?: string;
  updated_at: string;
}

export interface DashboardSummary {
  totalWarehouses: number;
  totalItems: number;
  totalStockRecords: number;
  totalQuantityInStock: number;
  totalStockValueINR: number;
  totalInspections: number;
  pendingInspections: number;
  completedInspections: number;
  approvedInspections: number;
  rejectedInspections: number;
  weeklyApprovalsPending: number;
  weeklyApprovalsCompleted: number;
  itemsRequiringReinspection: number;
  form263Submissions: number;
  form270Submissions: number;
}

export interface DashboardCharts {
  inspectionsByStatus: { status: string; count: number }[];
  stockByCategory: { name: string; value: number; totalValue: number }[];
  topWarehouses: { name: string; warehouse_code: string; totalQuantity: number; totalValue: number }[];
  weeklyStatus: { status: string; count: number }[];
}
