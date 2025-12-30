import { describe, it, expect } from 'vitest';
import { validateIncident } from '../incidentRules';
import { baseRep } from './helpers';
import type { ValidationContext, ValidationInput } from '@/lib/types';

describe('incidentRules', () => {

  it('rejects a punitive incident on a future date', () => {
    const input: ValidationInput = {
      rep: baseRep,
      type: 'Error',
      date: '2025-01-01' as any,
      comment: 'Test comment',
      isPunitive: true,
      requiresComment: false,
    };
    
    const context: ValidationContext = {
      canEditForDate: true,
      isFutureDate: true,
      isToday: false,
      isRepWorking: true,
      incidentsOnDate: [],
      leaveStatus: { onLeave: false, type: null },
    };

    const result = validateIncident(input, context);

    expect(result).toEqual({
      isValid: false,
      code: 'FUTURE_DATE_NOT_ALLOWED',
    });
  });

  it('rejects another punitive incident if an "Ausencia" already exists (CONFLICTS_WITH_AUSENCIA)', () => {
    const input: ValidationInput = {
      rep: baseRep,
      type: 'Tardanza', // Attempting to add a tardiness
      date: '2024-05-20' as any,
      comment: '',
      isPunitive: true,
      requiresComment: false,
    };

    const context: ValidationContext = {
      canEditForDate: true,
      isFutureDate: false,
      isToday: true,
      isRepWorking: true,
      incidentsOnDate: [
        { 
          id: 'inc1' as any, 
          repId: baseRep.id, 
          tipo: 'Ausencia',
          fecha: '2024-05-20' as any,
          puntos: 6,
          comentario: '',
          status: 'active',
          created_by: 'Supervisor',
          timestampRegistro: Date.now()
        }
      ],
      leaveStatus: { onLeave: false, type: null },
    };

    const result = validateIncident(input, context);

    expect(result).toEqual({
      isValid: false,
      code: 'CONFLICTS_WITH_AUSENCIA',
    });
  });

  it('rejects an "Ausencia" if other incidents already exist (CONFLICTS_WITH_AUSENCIA)', () => {
    const input: ValidationInput = {
      rep: baseRep,
      type: 'Ausencia', // Attempting to add an absence
      date: '2024-05-20' as any,
      comment: '',
      isPunitive: true,
      requiresComment: false,
    };

    const context: ValidationContext = {
      canEditForDate: true,
      isFutureDate: false,
      isToday: true,
      isRepWorking: true,
      incidentsOnDate: [
        { 
          id: 'inc1' as any, 
          repId: baseRep.id, 
          tipo: 'Tardanza',
          fecha: '2024-05-20' as any,
          puntos: 2,
          comentario: '',
          status: 'active',
          created_by: 'Supervisor',
          timestampRegistro: Date.now()
        }
      ],
      leaveStatus: { onLeave: false, type: null },
    };

    const result = validateIncident(input, context);

    expect(result).toEqual({
      isValid: false,
      code: 'CONFLICTS_WITH_AUSENCIA',
    });
  });

  it('rejects a duplicate "Ausencia" if one already exists (DUPLICATE_AUSENCIA)', () => {
    const input: ValidationInput = {
      rep: baseRep,
      type: 'Ausencia', // Attempting to add another absence
      date: '2024-05-20' as any,
      comment: '',
      isPunitive: true,
      requiresComment: false,
    };

    const context: ValidationContext = {
      canEditForDate: true,
      isFutureDate: false,
      isToday: true,
      isRepWorking: true,
      incidentsOnDate: [
        { 
          id: 'inc1' as any, 
          repId: baseRep.id, 
          tipo: 'Ausencia',
          fecha: '2024-05-20' as any,
          puntos: 6,
          comentario: 'First absence',
          status: 'active',
          created_by: 'Supervisor',
          timestampRegistro: Date.now()
        }
      ],
      leaveStatus: { onLeave: false, type: null },
    };

    const result = validateIncident(input, context);

    expect(result).toEqual({
      isValid: false,
      code: 'DUPLICATE_AUSENCIA',
    });
  });

});
