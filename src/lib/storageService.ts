
"use client";

import {
  type Representative,
  type IncidentsByDate,
  type LicensesByRep,
  type VacationsByRep,
  type ShiftChangesByDate,
  type WeeklyOverrides,
  type MonthConfig,
  type AuditLogEntry,
  type Role,
} from './types';

const STORAGE_VERSION = 4;
const STORAGE_KEY_PREFIX = `control_asistencia_v${STORAGE_VERSION}`;

interface AppData {
  reps: Representative[];
  incidencias: IncidentsByDate;
  licenses: LicensesByRep;
  vacations: VacationsByRep;
  shiftChanges: ShiftChangesByDate;
  weeklyOverrides: WeeklyOverrides;
  monthConfigs: Record<string, MonthConfig>;
  auditLog: AuditLogEntry[];
  activeRole: Role;
}

const getInitialData = (): AppData => ({
  reps: [],
  incidencias: {},
  licenses: {},
  vacations: {},
  shiftChanges: {},
  weeklyOverrides: {},
  monthConfigs: {},
  auditLog: [],
  activeRole: 'Supervisor',
});

const migrateV3ToV4 = () => {
    console.log('Running migration from v3 to v4...');
    try {
        const rawReps = localStorage.getItem('reps_v3');
        if (rawReps) {
            const repsV3 = JSON.parse(rawReps);
            const repsV4 = repsV3.map((rep: any) => {
                const isMixto = rep.turno === 'Mixto';
                return {
                    ...rep,
                    turnoBase: isMixto ? 'Día' : rep.turno,
                    esMixto: isMixto,
                    tipoMixto: isMixto ? 'semana' : null, // Default a semana
                    diaLibre: 'domingo' // Default a domingo
                };
            });
            localStorage.setItem(`${STORAGE_KEY_PREFIX}_reps`, JSON.stringify(repsV4));
            console.log('Reps migrated to v4.');
        }

        // Migrate other keys by just renaming them
        ['incidencias', 'licenses', 'vacations', 'shiftChanges', 'weeklyOverrides', 'monthConfigs', 'auditLog', 'activeRole'].forEach(key => {
            const oldKey = `${key}_v3`;
            const newKey = `${STORAGE_KEY_PREFIX}_${key}`;
            const data = localStorage.getItem(oldKey);
            if (data) {
                localStorage.setItem(newKey, data);
                localStorage.removeItem(oldKey);
                console.log(`Key '${oldKey}' migrated to '${newKey}'.`);
            }
        });

    } catch (e) {
        console.error("Failed to run migration from v3 to v4", e);
    }
};


const migrateStorageIfNeeded = () => {
  const currentVersion = Number(localStorage.getItem('storage_version') || 0);

  if (currentVersion >= STORAGE_VERSION) return;

  if (currentVersion < 4) {
    migrateV3ToV4();
  }
  // Add other migrations here if needed in the future

  localStorage.setItem('storage_version', String(STORAGE_VERSION));
};


export const loadDataFromStorage = (): AppData => {
  migrateStorageIfNeeded();
  const initialData = getInitialData();
  
  const data: AppData = Object.keys(initialData).reduce((acc, key) => {
    const savedValue = localStorage.getItem(`${STORAGE_KEY_PREFIX}_${key}`);
    if (savedValue) {
      try {
        (acc as any)[key] = JSON.parse(savedValue);
      } catch (e) {
        console.error(`Failed to parse ${key} from localStorage`, e);
        (acc as any)[key] = (initialData as any)[key];
      }
    }
    return acc;
  }, { ...initialData }) as AppData;

  return data;
};

export const saveDataToStorage = (data: Partial<AppData>) => {
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}_${key}`, JSON.stringify(value));
    }
  });
};

    