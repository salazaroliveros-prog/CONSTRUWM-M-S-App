
export type AppView = 'LOGIN' | 'DASHBOARD' | 'INICIO' | 'PROYECTOS' | 'PRESUPUESTOS' | 'SEGUIMIENTO' | 'COMPRAS' | 'RRHH' | 'FINANZAS' | 'WORKER_PORTAL' | 'REPORTES' | 'IMAGE_EDITOR';

export interface Project {
  id: string;
  name: string;
  clientName: string;
  landArea: number;
  constructionArea: number;
  location: string;
  needsProgram: string;
  status: 'PENDING' | 'ACTIVE' | 'ARCHIVED' | 'PAUSED' | 'STOPPED' | 'EXECUTED' | 'PRELIMINARY';
  startDate: string;
  typology: 'RESIDENCIAL' | 'COMERCIAL' | 'INDUSTRIAL' | 'CIVIL' | 'PUBLICA';
  coverType: string;
  estimatedDays?: number;
  aiJustification?: string;
  budgetTotal?: number;
}

/* Added BudgetItem interface to fix the import error in PresupuestosView.tsx */
export interface BudgetItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  total: number;
}

export interface Transaction {
  id: string;
  projectId: string;
  type: 'INCOME' | 'EXPENSE';
  description: string;
  quantity: number;
  unit: string;
  cost: number;
  category: string;
  date: string;
  month: string;
  provider?: string;
  rentalStart?: string;
  rentalEnd?: string;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  lat: number;
  lng: number;
  method: 'SELF' | 'EMERGENCY';
}

export interface Employee {
  id: string;
  workerId: string;
  name: string;
  address: string;
  phone: string;
  dpi: string;
  position: string;
  salary: number;
  experience: string;
  status: 'ACTIVE' | 'INACTIVE' | 'FIRED';
  attendanceStatus?: 'IN' | 'OUT' | 'ABSENT';
  lastAttendance?: AttendanceRecord;
  attendanceHistory: AttendanceRecord[];
  hiringDate: string;
  isContractAccepted: boolean;
}

export interface CandidateApplication {
  id: string;
  name: string;
  phone: string;
  dpi: string;
  experience: string;
  positionApplied: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  timestamp: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'CRITICAL';
  timestamp: string;
  read: boolean;
}
