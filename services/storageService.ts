
import { Project, Transaction, Employee, AppNotification, CandidateApplication } from '../types';

const KEYS = {
  PROJECTS: 'mys_projects',
  TRANSACTIONS: 'mys_transactions',
  EMPLOYEES: 'mys_employees',
  NOTIFICATIONS: 'mys_notifications',
  ADMIN_PASS: 'mys_admin_pass',
  APPLICATIONS: 'mys_applications'
};

export const storageService = {
  getProjects: (): Project[] => JSON.parse(localStorage.getItem(KEYS.PROJECTS) || '[]'),
  saveProject: (p: Project) => {
    const projects = storageService.getProjects();
    const existing = projects.findIndex(item => item.id === p.id);
    if (existing >= 0) projects[existing] = p;
    else projects.push(p);
    localStorage.setItem(KEYS.PROJECTS, JSON.stringify(projects));
  },
  deleteProject: (id: string) => {
    const projects = storageService.getProjects().filter(p => p.id !== id);
    localStorage.setItem(KEYS.PROJECTS, JSON.stringify(projects));
    // Also cleanup associated transactions if needed, but for now we keep history
  },

  getTransactions: (): Transaction[] => JSON.parse(localStorage.getItem(KEYS.TRANSACTIONS) || '[]'),
  saveTransaction: (t: Transaction) => {
    const txs = storageService.getTransactions();
    txs.push(t);
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(txs));
  },

  getEmployees: (): Employee[] => JSON.parse(localStorage.getItem(KEYS.EMPLOYEES) || '[]'),
  saveEmployee: (e: Employee) => {
    const list = storageService.getEmployees();
    const existing = list.findIndex(item => item.id === e.id);
    if (existing >= 0) list[existing] = e;
    else list.push(e);
    localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(list));
  },

  getApplications: (): CandidateApplication[] => JSON.parse(localStorage.getItem(KEYS.APPLICATIONS) || '[]'),
  saveApplication: (a: CandidateApplication) => {
    const list = storageService.getApplications();
    list.push(a);
    localStorage.setItem(KEYS.APPLICATIONS, JSON.stringify(list));
  },
  updateApplicationStatus: (id: string, status: 'ACCEPTED' | 'REJECTED') => {
    const list = storageService.getApplications();
    const idx = list.findIndex(a => a.id === id);
    if (idx >= 0) {
      list[idx].status = status;
      localStorage.setItem(KEYS.APPLICATIONS, JSON.stringify(list));
    }
  },

  getNotifications: (): AppNotification[] => JSON.parse(localStorage.getItem(KEYS.NOTIFICATIONS) || '[]'),
  addNotification: (n: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    const list = storageService.getNotifications();
    list.unshift({
      ...n,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      read: false
    });
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(list.slice(0, 50)));
  },
  markNotificationsRead: () => {
    const list = storageService.getNotifications().map(n => ({ ...n, read: true }));
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(list));
  },

  getAdminPass: (): string => localStorage.getItem(KEYS.ADMIN_PASS) || 'admin123',
  setAdminPass: (pass: string) => localStorage.setItem(KEYS.ADMIN_PASS, pass),

  generateWorkerId: () => {
    const count = storageService.getEmployees().length + 1;
    const year = new Date().getFullYear();
    return `MS-${year}-${count.toString().padStart(3, '0')}`;
  },

  clear: () => localStorage.clear()
};
