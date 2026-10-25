import {
  User,
  Warehouse,
  Item,
  StockRecord,
  StockLedger,
  Inspection,
  FormTemplate,
  FormSubmission,
  WeeklyReview,
  Document as DocumentType,
  AuditLog,
  Setting,
  DashboardSummary,
  DashboardCharts
} from '../types';

const TOKEN_KEY = 'atsi_auth_token';

export const getAuthToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setAuthToken = (token: string): void => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (e) {
    console.error('Failed to store auth token:', e);
  }
};

export const removeAuthToken = (): void => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (e) {
    console.error('Failed to remove auth token:', e);
  }
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Inject Bearer Authorization header for cross-origin iframe security
  const token = getAuthToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
    credentials: 'include' // Also send cookies when supported
  });

  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson && errJson.error) {
        errorMsg = errJson.error;
      }
    } catch (_) {
      // ignore
    }

    if (response.status === 401 && endpoint !== '/auth/login') {
      removeAuthToken();
    }

    throw new Error(errorMsg);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // System Health & Setup
  getHealth: () => request<{ status: string; timestamp: string; hasAdmin: boolean }>('/health'),
  setupAdmin: async (data: { name: string; email: string; password: string; phone?: string }) => {
    const res = await request<{ message: string; token: string; user: User }>('/auth/setup-admin', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (res.token) {
      setAuthToken(res.token);
    }
    return res;
  },

  // Auth
  login: async (data: { email: string; password: string }) => {
    const res = await request<{ message: string; token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (res.token) {
      setAuthToken(res.token);
    }
    return res;
  },
  logout: async () => {
    try {
      await request<{ message: string }>('/auth/logout', {
        method: 'POST'
      });
    } catch (_) {
      // ignore
    } finally {
      removeAuthToken();
    }
  },
  getMe: () => request<{ user: User }>('/auth/me'),
  getEnvCredentials: () =>
    request<{
      admin: { role: string; title: string; name: string; email: string; password: string; phone: string; description: string };
      manager: { role: string; title: string; name: string; email: string; password: string; phone: string; description: string };
      inspector: { role: string; title: string; name: string; email: string; password: string; phone: string; description: string };
      viewer: { role: string; title: string; name: string; email: string; password: string; phone: string; description: string };
    }>('/auth/credentials-info'),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Users (Admin Only)
  getUsers: () => request<{ users: User[] }>('/users'),
  createUser: (data: any) =>
    request<{ message: string; user: User }>('/users', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateUser: (id: string, data: any) =>
    request<{ message: string }> (`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),
  deleteUser: (id: string) =>
    request<{ message: string }>(`/users/${id}`, {
      method: 'DELETE'
    }),

  // Warehouses
  getWarehouses: () => request<{ warehouses: Warehouse[] }>('/warehouses'),
  getWarehouse: (id: string) => request<{ warehouse: Warehouse }>(`/warehouses/${id}`),
  createWarehouse: (data: any) =>
    request<{ message: string; id: string }>('/warehouses', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateWarehouse: (id: string, data: any) =>
    request<{ message: string }>(`/warehouses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),
  deleteWarehouse: (id: string) =>
    request<{ message: string }>(`/warehouses/${id}`, {
      method: 'DELETE'
    }),

  // Items
  getItems: (query?: { search?: string; category?: string; type?: string; status?: string }) => {
    const params = new URLSearchParams(query as any);
    return request<{ items: Item[] }>(`/items?${params.toString()}`);
  },
  createItem: (data: any) =>
    request<{ message: string; id: string }>('/items', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateItem: (id: string, data: any) =>
    request<{ message: string }>(`/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),
  deleteItem: (id: string) =>
    request<{ message: string }>(`/items/${id}`, {
      method: 'DELETE'
    }),

  // Stock
  getStock: (query?: { warehouseId?: string; itemId?: string; status?: string; search?: string }) => {
    const params = new URLSearchParams(query as any);
    return request<{ stockRecords: StockRecord[] }>(`/stock?${params.toString()}`);
  },
  createStockInward: (data: any) =>
    request<{ message: string; id: string }>('/stock', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  createStock: (data: any) =>
    request<{ message: string; id: string }>('/stock', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateStock: (id: string, data: any) =>
    request<{ message: string }>(`/stock/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),
  getStockLedger: () => request<{ ledgerEntries: StockLedger[] }>('/stock/ledger'),

  // Inspections
  getInspections: (query?: { warehouseId?: string; status?: string; inspectionType?: string; search?: string }) => {
    const params = new URLSearchParams(query as any);
    return request<{ inspections: Inspection[] }>(`/inspections?${params.toString()}`);
  },
  getInspection: (id: string) => request<{ inspection: Inspection }>(`/inspections/${id}`),
  createInspection: (data: any) =>
    request<{ message: string; id: string; inspectionNumber: string }>('/inspections', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  submitInspection: (id: string) =>
    request<{ message: string }>(`/inspections/${id}/submit`, {
      method: 'PATCH'
    }),
  approveInspection: (id: string, remarks: string) =>
    request<{ message: string }>(`/inspections/${id}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ remarks })
    }),
  rejectInspection: (id: string, remarks: string) =>
    request<{ message: string }>(`/inspections/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ remarks })
    }),
  overrideInspection: (id: string, data: any) =>
    request<{ message: string }>(`/inspections/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),

  // Form Templates & Submissions
  getFormTemplates: () => request<{ templates: FormTemplate[] }>('/forms/templates'),
  getFormTemplate: (id: string) => request<{ template: FormTemplate }>(`/forms/templates/${id}`),
  getFormSubmissions: (query?: { formTemplateId?: string; warehouseId?: string; status?: string }) => {
    const params = new URLSearchParams(query as any);
    return request<{ submissions: FormSubmission[] }>(`/forms/submissions?${params.toString()}`);
  },
  getFormSubmission: (id: string) => request<{ submission: FormSubmission }>(`/forms/submissions/${id}`),
  createFormSubmission: (data: any) =>
    request<{ message: string; id: string; submissionNumber: string }>('/forms/submissions', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  submitForm: (id: string) =>
    request<{ message: string }>(`/forms/submissions/${id}/submit`, {
      method: 'PATCH'
    }),
  approveForm: (id: string, remarks: string) =>
    request<{ message: string }>(`/forms/submissions/${id}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ remarks })
    }),
  rejectForm: (id: string, remarks: string) =>
    request<{ message: string }>(`/forms/submissions/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ remarks })
    }),

  // Weekly Reviews
  getWeeklyReviews: () => request<{ weeklyReviews: WeeklyReview[] }>('/weekly-reviews'),
  createWeeklyReview: (data: any) =>
    request<{ message: string; id: string; reviewNumber: string }>('/weekly-reviews', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  submitWeeklyReview: (id: string) =>
    request<{ message: string }>(`/weekly-reviews/${id}/submit`, {
      method: 'PATCH'
    }),
  approveWeeklyReview: (id: string, remarks: string) =>
    request<{ message: string }>(`/weekly-reviews/${id}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ remarks })
    }),

  // Documents
  getDocuments: (query?: { entityType?: string; entityId?: string }) => {
    const params = new URLSearchParams(query as any);
    return request<{ documents: DocumentType[] }>(`/documents?${params.toString()}`);
  },
  uploadDocument: (formData: FormData) =>
    request<{ message: string; document: DocumentType }>('/documents/upload', {
      method: 'POST',
      body: formData
    }),
  deleteDocument: (id: string) =>
    request<{ message: string }>(`/documents/${id}`, {
      method: 'DELETE'
    }),

  // Reports
  getAppendixA: (warehouseId?: string) => {
    const qs = warehouseId ? `?warehouseId=${warehouseId}` : '';
    return request<{ reportTitle: string; generatedAt: string; records: any[] }>(`/reports/appendix-a${qs}`);
  },
  getAppendixB: (warehouseId?: string) => {
    const qs = warehouseId ? `?warehouseId=${warehouseId}` : '';
    return request<{ reportTitle: string; generatedAt: string; records: any[] }>(`/reports/appendix-b${qs}`);
  },
  getExportUrl: (type: 'appendix-a' | 'appendix-b' | 'stock' | 'inspections' | 'ledger', warehouseId?: string) => {
    const token = getAuthToken();
    const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
    const qs = warehouseId ? `&warehouseId=${encodeURIComponent(warehouseId)}` : '';
    return `/api/reports/export?type=${type}${qs}${tokenParam}`;
  },
  getDocumentDownloadUrl: (id: string) => {
    const token = getAuthToken();
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
    return `/api/documents/${id}/download${tokenParam}`;
  },

  // Dashboard
  getDashboardSummary: () => request<DashboardSummary>('/dashboard/summary'),
  getDashboardCharts: () => request<DashboardCharts>('/dashboard/charts'),

  // Audit Logs (Admin)
  getAuditLogs: (query?: { action?: string; entityType?: string; search?: string }) => {
    const params = new URLSearchParams(query as any);
    return request<{ logs: AuditLog[] }>(`/audit-logs?${params.toString()}`);
  },

  // Settings
  getSettings: () => request<{ settings: Setting[] }>('/settings'),
  saveSettings: (settings: { key: string; value: string }[]) =>
    request<{ message: string }>('/settings', {
      method: 'PATCH',
      body: JSON.stringify({ settings })
    })
};
