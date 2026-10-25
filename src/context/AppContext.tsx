import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User,
  Warehouse,
  Item,
  StockRecord,
  Inspection,
  FormTemplate,
  FormSubmission,
  WeeklyReview,
  Document as DocumentType,
  DashboardSummary,
  DashboardCharts
} from '../types';
import { api } from '../services/api';

interface AppContextType {
  // Setup & Auth
  hasAdmin: boolean | null;
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshHealth: () => Promise<void>;
  refreshUser: () => Promise<void>;

  // Selected warehouse scope
  selectedWarehouseId: string;
  setSelectedWarehouseId: (id: string) => void;

  // Master & Transaction Data
  warehouses: Warehouse[];
  items: Item[];
  stockRecords: StockRecord[];
  inspections: Inspection[];
  formTemplates: FormTemplate[];
  formSubmissions: FormSubmission[];
  weeklyReviews: WeeklyReview[];
  documents: DocumentType[];
  dashboardSummary: DashboardSummary | null;
  dashboardCharts: DashboardCharts | null;

  // Data Refreshers
  refreshAll: () => Promise<void>;
  refreshWarehouses: () => Promise<void>;
  refreshItems: () => Promise<void>;
  refreshStock: () => Promise<void>;
  refreshInspections: () => Promise<void>;
  refreshForms: () => Promise<void>;
  refreshWeeklyReviews: () => Promise<void>;
  refreshDashboard: () => Promise<void>;
  refreshDocuments: () => Promise<void>;

  // Roles convenience
  isAdmin: boolean;
  isManager: boolean;
  isInspector: boolean;
  isViewer: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('ALL');

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [stockRecords, setStockRecords] = useState<StockRecord[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([]);
  const [formSubmissions, setFormSubmissions] = useState<FormSubmission[]>([]);
  const [weeklyReviews, setWeeklyReviews] = useState<WeeklyReview[]>([]);
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  const [dashboardCharts, setDashboardCharts] = useState<DashboardCharts | null>(null);

  const refreshHealth = useCallback(async () => {
    try {
      const res = await api.getHealth();
      setHasAdmin(res.hasAdmin);
    } catch (err) {
      console.error('Health check failed:', err);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.getMe();
      setCurrentUser(res.user);
    } catch (_) {
      setCurrentUser(null);
    }
  }, []);

  const refreshWarehouses = useCallback(async () => {
    try {
      const res = await api.getWarehouses();
      setWarehouses(res.warehouses);
    } catch (err) {
      console.error('Error fetching warehouses:', err);
    }
  }, []);

  const refreshItems = useCallback(async () => {
    try {
      const res = await api.getItems();
      setItems(res.items);
    } catch (err) {
      console.error('Error fetching items:', err);
    }
  }, []);

  const refreshStock = useCallback(async () => {
    try {
      const res = await api.getStock();
      setStockRecords(res.stockRecords);
    } catch (err) {
      console.error('Error fetching stock:', err);
    }
  }, []);

  const refreshInspections = useCallback(async () => {
    try {
      const res = await api.getInspections();
      setInspections(res.inspections);
    } catch (err) {
      console.error('Error fetching inspections:', err);
    }
  }, []);

  const refreshForms = useCallback(async () => {
    try {
      const [tplRes, subRes] = await Promise.all([
        api.getFormTemplates(),
        api.getFormSubmissions()
      ]);
      setFormTemplates(tplRes.templates);
      setFormSubmissions(subRes.submissions);
    } catch (err) {
      console.error('Error fetching form data:', err);
    }
  }, []);

  const refreshWeeklyReviews = useCallback(async () => {
    try {
      const res = await api.getWeeklyReviews();
      setWeeklyReviews(res.weeklyReviews);
    } catch (err) {
      console.error('Error fetching weekly reviews:', err);
    }
  }, []);

  const refreshDashboard = useCallback(async () => {
    try {
      const [sumRes, chRes] = await Promise.all([
        api.getDashboardSummary(),
        api.getDashboardCharts()
      ]);
      setDashboardSummary(sumRes);
      setDashboardCharts(chRes);
    } catch (err) {
      console.error('Error fetching dashboard metrics:', err);
    }
  }, []);

  const refreshDocuments = useCallback(async () => {
    try {
      const res = await api.getDocuments();
      setDocuments(res.documents);
    } catch (err) {
      console.error('Error fetching documents:', err);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.allSettled([
      refreshWarehouses(),
      refreshItems(),
      refreshStock(),
      refreshInspections(),
      refreshForms(),
      refreshWeeklyReviews(),
      refreshDashboard(),
      refreshDocuments()
    ]);
  }, [
    refreshWarehouses,
    refreshItems,
    refreshStock,
    refreshInspections,
    refreshForms,
    refreshWeeklyReviews,
    refreshDashboard,
    refreshDocuments
  ]);

  // Initial load
  useEffect(() => {
    async function init() {
      setIsLoading(true);
      try {
        const healthRes = await api.getHealth();
        setHasAdmin(healthRes.hasAdmin);

        if (healthRes.hasAdmin) {
          try {
            const meRes = await api.getMe();
            setCurrentUser(meRes.user);
          } catch (_) {
            setCurrentUser(null);
          }
        }
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  // When user logs in or changes, load app data
  useEffect(() => {
    if (currentUser) {
      refreshAll();
    }
  }, [currentUser, refreshAll]);

  const login = async (email: string, pass: string) => {
    const res = await api.login({ email, password: pass });
    setCurrentUser(res.user);
    await refreshAll();
  };

  const logout = async () => {
    await api.logout();
    setCurrentUser(null);
  };

  const role = currentUser?.role;
  const isAdmin = role === 'ADMIN';
  const isManager = role === 'WAREHOUSE_MANAGER';
  const isInspector = role === 'TECHNICAL_INSPECTOR';
  const isViewer = role === 'VIEWER';

  return (
    <AppContext.Provider
      value={{
        hasAdmin,
        currentUser,
        isAuthenticated: !!currentUser,
        isLoading,
        login,
        logout,
        refreshHealth,
        refreshUser,
        selectedWarehouseId,
        setSelectedWarehouseId,
        warehouses,
        items,
        stockRecords,
        inspections,
        formTemplates,
        formSubmissions,
        weeklyReviews,
        documents,
        dashboardSummary,
        dashboardCharts,
        refreshAll,
        refreshWarehouses,
        refreshItems,
        refreshStock,
        refreshInspections,
        refreshForms,
        refreshWeeklyReviews,
        refreshDashboard,
        refreshDocuments,
        isAdmin,
        isManager,
        isInspector,
        isViewer
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
