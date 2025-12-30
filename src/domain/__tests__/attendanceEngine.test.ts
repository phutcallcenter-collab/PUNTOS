import { describe, it, expect } from 'vitest';
import { getRepDailyAssignment } from '../attendanceEngine';
import { baseRep } from './helpers';
import type { AttendanceContext, Representative } from '@/lib/types';

describe('attendanceEngine', () => {
    
  it('Rule 1: returns ON_LICENSE even if other rules apply', () => {
    const context: AttendanceContext = {
      rep: baseRep,
      dayName: 'lunes',
      repLicenses: [{ id: 'l1' as any, repId: baseRep.id, inicio: '2024-01-01' as any, fin: '2024-01-01' as any, created_at: 'z' as any }],
      repVacations: [{ id: 'v1' as any, repId: baseRep.id, inicio: 'x' as any, fin: 'y' as any, created_at: 'z' as any }],
      shiftChangesForDate: [{
        id: 's1' as any,
        fecha: '2024-01-01' as any,
        tipo: 'cover',
        fromId: null,
        toId: baseRep.id,
        estado: 'active',
        created_by: 'Supervisor',
        created_at: 'x' as any,
        comentario: null,
      }],
      weeklyOverrideForRep: { lunes: true },
    };

    const result = getRepDailyAssignment(context);

    expect(result).toEqual({
      kind: 'ON_LICENSE',
      worksDay: false,
      worksNight: false,
    });
  });

  it('Rule 2: shift change (cover) as toId makes the rep work, overriding vacation', () => {
    const context: AttendanceContext = {
        rep: baseRep,
        dayName: 'lunes',
        repLicenses: [],
        repVacations: [{ id: 'v1' as any, repId: baseRep.id, inicio: 'x' as any, fin: 'y' as any, created_at: 'z' as any }],
        shiftChangesForDate: [{
          id: 's1' as any,
          fecha: '2024-01-01' as any,
          tipo: 'cover',
          fromId: 'rep-2' as any,
          toId: baseRep.id,
          estado: 'active',
          created_by: 'Supervisor',
          created_at: 'x' as any,
          comentario: null,
        }],
        weeklyOverrideForRep: undefined,
    };
    
    const result = getRepDailyAssignment(context);

    expect(result.kind).toBe('SHIFT_CHANGE');
    expect(result.worksDay).toBe(true);
    expect(result.worksNight).toBe(true);
  });

  it('Rule 3: shift change as fromId only does not constitute a work commitment', () => {
    // This tests that giving away a shift makes the rep fall through to the next rule (base schedule).
    // As baseRep works on lunes, the shift change correctly removes them from duty.
    // The engine's job is not to return FREE, but to ignore the shift change as a working commitment.
    const context: AttendanceContext = {
      rep: baseRep, // Base rep works 'Día' on 'lunes'
      dayName: 'lunes',
      repLicenses: [],
      repVacations: [],
      shiftChangesForDate: [{
        id: 's1' as any,
        fecha: 'x' as any,
        tipo: 'cover',
        fromId: baseRep.id,
        toId: 'otro-rep' as any,
        estado: 'active',
        created_by: 'Supervisor',
        created_at: 'x' as any,
        comentario: null,
      }],
      weeklyOverrideForRep: undefined,
    };
  
    const result = getRepDailyAssignment(context);
    expect(result.kind).not.toBe('SHIFT_CHANGE');
    // It should evaluate to FREE because the shift was given away
    expect(result.worksDay).toBe(false);
    expect(result.worksNight).toBe(false);
  });

  it('Rule 4: returns ON_VACATION when no higher priority rule applies', () => {
    const context: AttendanceContext = {
      rep: baseRep,
      dayName: 'lunes',
      repLicenses: [],
      repVacations: [{ id: 'v1' as any, repId: baseRep.id, inicio: 'x' as any, fin: 'y' as any, created_at: 'z' as any }],
      shiftChangesForDate: [],
      weeklyOverrideForRep: undefined,
    };

    const result = getRepDailyAssignment(context);
    expect(result.kind).toBe('ON_VACATION');
  });

  it('Rule 5: weekly override (true) forces working on a base day off', () => {
    const repWithDayOff = { ...baseRep, diaLibre: 'lunes' } as Representative;
    const context: AttendanceContext = {
        rep: repWithDayOff,
        dayName: 'lunes',
        repLicenses: [],
        repVacations: [],
        shiftChangesForDate: [],
        weeklyOverrideForRep: { lunes: true },
    };
    const result = getRepDailyAssignment(context);
    expect(result).toEqual({
      kind: 'WORKING',
      worksDay: true,
      worksNight: true,
    });
  });

  it('Rule 6: weekly override (false) forces a free day on a base work day', () => {
    const context: AttendanceContext = {
      rep: baseRep, // Works lunes on base schedule
      dayName: 'lunes',
      repLicenses: [],
      repVacations: [],
      shiftChangesForDate: [],
      weeklyOverrideForRep: { lunes: false },
    };
    const result = getRepDailyAssignment(context);
    expect(result).toEqual({
      kind: 'FREE_DAY_OVERRIDE',
      worksDay: false,
      worksNight: false,
    });
  });

  it('Rule 7: respects the scheduled day off when no overrides apply', () => {
    const repOnDayOff: Representative = { ...baseRep, diaLibre: 'lunes' };
    const context: AttendanceContext = {
      rep: repOnDayOff,
      dayName: 'lunes',
      repLicenses: [],
      repVacations: [],
      shiftChangesForDate: [],
      weeklyOverrideForRep: undefined,
    };

    const result = getRepDailyAssignment(context);
    expect(result.kind).toBe('SCHEDULED_DAY_OFF');
  });

  it('Rule 8: assigns double shift for a "semana" mixto rep on a weekday', () => {
    const mixtoRep: Representative = {
      ...baseRep,
      esMixto: true,
      tipoMixto: 'semana',
    };
    const context: AttendanceContext = {
      rep: mixtoRep,
      dayName: 'martes', // A weekday
      repLicenses: [],
      repVacations: [],
      shiftChangesForDate: [],
      weeklyOverrideForRep: undefined,
    };
    const result = getRepDailyAssignment(context);
    expect(result.kind).toBe('WORKING');
    expect(result.worksDay).toBe(true);
    expect(result.worksNight).toBe(true);
  });

   it('Rule 9: assigns double shift for a "finDeSemana" mixto rep on a weekend day', () => {
    const mixtoRep: Representative = {
      ...baseRep,
      esMixto: true,
      tipoMixto: 'finDeSemana',
    };
    const context: AttendanceContext = {
      rep: mixtoRep,
      dayName: 'sabado', // A weekend day for the mixto
      repLicenses: [],
      repVacations: [],
      shiftChangesForDate: [],
      weeklyOverrideForRep: undefined,
    };
    const result = getRepDailyAssignment(context);
    expect(result.kind).toBe('WORKING');
    expect(result.worksDay).toBe(true);
    expect(result.worksNight).toBe(true);
  });

  it('Rule 10: assigns single base shift for a "semana" mixto rep on a weekend', () => {
    const mixtoRep: Representative = {
      ...baseRep,
      turnoBase: 'Noche',
      esMixto: true,
      tipoMixto: 'semana',
    };
    const context: AttendanceContext = {
      rep: mixtoRep,
      dayName: 'sabado', // A weekend day (not in their mixto schedule)
      repLicenses: [],
      repVacations: [],
      shiftChangesForDate: [],
      weeklyOverrideForRep: undefined,
    };
    const result = getRepDailyAssignment(context);
    expect(result.kind).toBe('WORKING');
    expect(result.worksDay).toBe(false);
    expect(result.worksNight).toBe(true);
  });

  it('Rule 11: assigns single base shift (Día) for a non-mixto rep', () => {
    const context: AttendanceContext = {
      rep: baseRep, // turnoBase: 'Día'
      dayName: 'martes',
      repLicenses: [],
      repVacations: [],
      shiftChangesForDate: [],
      weeklyOverrideForRep: undefined,
    };
    const result = getRepDailyAssignment(context);
    expect(result.kind).toBe('WORKING');
    expect(result.worksDay).toBe(true);
    expect(result.worksNight).toBe(false);
  });

  it('Rule 12: assigns single base shift (Noche) for a non-mixto rep', () => {
    const nightRep: Representative = { ...baseRep, turnoBase: 'Noche' };
    const context: AttendanceContext = {
      rep: nightRep,
      dayName: 'miercoles',
      repLicenses: [],
      repVacations: [],
      shiftChangesForDate: [],
      weeklyOverrideForRep: undefined,
    };
    const result = getRepDailyAssignment(context);
    expect(result.kind).toBe('WORKING');
    expect(result.worksDay).toBe(false);
    expect(result.worksNight).toBe(true);
  });

});
