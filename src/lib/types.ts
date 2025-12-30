

// --- Tipos de Marca (Branded Types) para seguridad ---
export type Brand<K, T> = K & { readonly __brand: T };

export type RepId = Brand<string, 'RepId'>;
export type IncidentId = Brand<string, 'IncidentId'>;
export type ShiftChangeId = Brand<string, 'ShiftChangeId'>;
export type VacationId = Brand<string, 'VacationId'>;
export type LicenseId = Brand<string, 'LicenseId'>;
export type AuditLogId = Brand<string, 'AuditLogId'>;
export type ISODateString = Brand<string, 'ISODateString'>;

// --- Enumeraciones y Constantes del Dominio ---

export const ROLES = ['Supervisor', 'Gerencia'] as const;
export type Role = (typeof ROLES)[number];

export const SHIFTS = ['Día', 'Noche'] as const;
export type Shift = (typeof SHIFTS)[number];

export const DAY_NAMES = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const;
export type DayName = (typeof DAY_NAMES)[number];

export const MIXTO_TYPES = ['semana', 'finDeSemana'] as const;
export type MixtoType = (typeof MIXTO_TYPES)[number];

export const LEAVE_TYPES = ['Licencia', 'Vacaciones'] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

// --- Modelos de Datos (Schemas Finales) ---
export type Representative = {
  id: RepId;
  nombre: string;
  turnoBase: Shift;
  diaLibre: DayName;
  activo: boolean;
  created_at: ISODateString;
  updated_at: ISODateString;
} & (
  | { esMixto: true; tipoMixto: MixtoType; }
  | { esMixto: false; tipoMixto: null; }
);

export interface ShiftChange {
  id: ShiftChangeId;
  fecha: ISODateString; // YYYY-MM-DD
  tipo: 'swap' | 'cover' | 'double';
  fromId: RepId | null; // Quien cede. Nulo en caso de 'double'.
  toId: RepId;     // Quien cubre.
  estado: 'active' | 'cancelled';
  created_by: Role;
  created_at: ISODateString;
  comentario: string | null;
}

export interface Vacation {
  id: VacationId;
  repId: RepId;
  inicio: ISODateString;
  fin: ISODateString;
  created_at: ISODateString;
}

export interface License {
  id: LicenseId;
  repId: RepId;
  inicio: ISODateString;
  fin: ISODateString;
  created_at: ISODateString;
}

export type IncidentTypeKey =
  | 'Tardanza' | 'Ausencia' | 'Error' | 'Celular' | 'OtroPuntos'
  | 'Permiso' | 'Cumpleanos' | 'Despachado'
  | 'Licencia' | 'Vacaciones';


export interface Incident {
  id: IncidentId;
  fecha: ISODateString;
  repId: RepId;
  tipo: IncidentTypeKey;
  comentario: string | null;
  puntos: number;
  status: 'active' | 'soft-deleted';
  softDeletedBy?: {
    actor: Role;
    timestamp: ISODateString;
    reason: string;
  } | null;
  created_by: Role;
  timestampRegistro: number; // Unix Timestamp
}

export interface MonthConfig {
  mes: string; // YYYY-MM
  feriados: string[]; // Solo los días del mes, ej: ['1', '15']
  cierre: boolean;
  closedAt: ISODateString | null;
  gracePeriodDays: number;
}

export const AUDIT_ACTIONS = [
    'createIncident', 'editIncident', 'softDeleteIncident', 'hardDeleteIncident',
    'closeMonth', 'overrideClose', 'applyShiftChange', 'revert', 'other',
    'createLicense', 'deleteLicense', 'createVacation', 'deleteVacation'
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface AuditLogEntry {
  id: AuditLogId;
  action: AuditAction;
  actor: Role,
  timestamp: ISODateString;
  meta: Record<string, any>;
}

// --- Tipos de Ayuda para Estructuras de Datos y UI ---

export type IncidentsByDate = Record<ISODateString, Incident[]>;
export type LicensesByRep = Record<RepId, License[]>;
export type VacationsByRep = Record<RepId, Vacation[]>;
export type ShiftChangesByDate = Record<ISODateString, ShiftChange[]>;

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export type WeeklyOverride = Partial<Record<DayName, boolean>>;
export interface WeeklyOverrides {
  [weekId: string]: { // weekId es 'YYYY-MM-DD' del lunes
    [repId: string]: WeeklyOverride;
  };
}


// --- Resultados y Contextos del Dominio ---

export const INCIDENT_ERROR_CODES = [
  'MONTH_CLOSED',
  'FUTURE_DATE_NOT_ALLOWED',
  'REP_ON_LICENSE',
  'REP_ON_VACATION',
  'REP_NOT_SCHEDULED',
  'DUPLICATE_TARDANZA',
  'DUPLICATE_AUSENCIA',
  'CONFLICTS_WITH_AUSENCIA',
  'COMMENT_REQUIRED_FOR_VARIABLE_POINTS',
] as const;
export type IncidentErrorCode = (typeof INCIDENT_ERROR_CODES)[number];

export type ValidationResult =
  | { isValid: true }
  | { isValid: false; code: IncidentErrorCode };


export interface ValidationInput {
    rep: Representative;
    type: IncidentTypeKey;
    date: ISODateString;
    comment: string;
    isPunitive: boolean;
    requiresComment: boolean;
}

export interface ValidationContext {
    canEditForDate: boolean;
    isFutureDate: boolean;
    isToday: boolean;
    isRepWorking: boolean;
    incidentsOnDate: Incident[];
    leaveStatus: {
      onLeave: boolean;
      type: LeaveType | null;
    };
}


export type DailyAssignment = (
    | { kind: 'ON_LICENSE' }
    | { kind: 'ON_VACATION' }
    | { kind: 'SHIFT_CHANGE', changeType: ShiftChange['tipo'], from?: RepId | null, to?: RepId | null }
    | { kind: 'SCHEDULED_DAY_OFF' }
    | { kind: 'FREE_DAY_OVERRIDE' }
    | { kind: 'WORKING' }
) & { worksDay: boolean, worksNight: boolean };


export interface AttendanceContext {
    rep: Representative;
    dayName: DayName;
    repLicenses: License[];
    repVacations: Vacation[];
    shiftChangesForDate: ShiftChange[];
    weeklyOverrideForRep: WeeklyOverride | undefined;
}


// --- Constantes del Negocio ---
export const ALERT_THRESHOLDS = { Ausencia: 3, Error: 3, Tardanza: 3, Puntos: 15 };

export const dayMapping: Record<number, DayName> = { 1: 'lunes', 2: 'martes', 3: 'miercoles', 4: 'jueves', 5: 'viernes', 6: 'sabado', 0: 'domingo' };
