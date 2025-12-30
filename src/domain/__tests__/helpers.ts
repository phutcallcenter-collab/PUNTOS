import type { Representative } from '@/lib/types';

export const baseRep: Representative = {
  id: 'rep-1' as any,
  nombre: 'Test Rep',
  turnoBase: 'Día',
  diaLibre: 'domingo',
  activo: true,
  created_at: '2024-01-01T00:00:00.000Z' as any,
  updated_at: '2024-01-01T00:00:00.000Z' as any,
  esMixto: false,
  tipoMixto: null,
};
