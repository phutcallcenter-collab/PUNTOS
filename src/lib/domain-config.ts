import type { IncidentTypeKey } from './types';

type IncidentConfig = {
    [key in IncidentTypeKey]: {
        label: string;
        type: 'punitive' | 'info';
        badge: string;
        mode: 'cantidad' | 'rango' | 'duracion';
        points: number; // Puntos base para día de semana (L-J)
        variablePoints?: boolean;
    }
};

export const INCIDENT_CONFIG: IncidentConfig = {
  // Punitivas
  Tardanza: { label: 'Tardanza', type: 'punitive', badge: 'badge-tardanza', mode: 'cantidad', points: 2 },
  Ausencia: { label: 'Ausencia', type: 'punitive', badge: 'badge-ausencia', mode: 'cantidad', points: 3 },
  Error: { label: 'Error', type: 'punitive', badge: 'badge-error', mode: 'cantidad', points: 2 },
  Celular: { label: 'Celular', type: 'punitive', badge: 'badge-celular', mode: 'cantidad', points: 5 },
  OtroPuntos: { label: 'Otro (Puntos)', type: 'punitive', badge: 'badge-otro-puntos', mode: 'cantidad', points: 0, variablePoints: true },
  
  // Informativas
  Permiso: { label: 'Permiso', type: 'info', badge: 'badge-permiso', mode: 'cantidad', points: 0 },
  Cumpleanos: { label: 'Cumpleaños', type: 'info', badge: 'badge-cumpleanos', mode: 'cantidad', points: 0 },
  Despachado: { label: 'Despachado', type: 'info', badge: 'badge-despachado', mode: 'cantidad', points: 0 },

  // Tipos especiales que se manejan como bloques de estado
  Licencia: { label: 'Licencia', type: 'info', badge: 'badge-licencia', mode: 'duracion', points: 0 },
  Vacaciones: { label: 'Vacaciones', type: 'info', badge: 'badge-vacaciones', mode: 'rango', points: 0 },
};
