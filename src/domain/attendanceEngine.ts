
import type {
  DailyAssignment,
  AttendanceContext,
} from '@/lib/types';

/**
 * Determines the final work assignment for a representative on a specific day
 * by applying a strict hierarchy of rules. This is a pure function.
 *
 * Hierarchy of Rules (from highest to lowest priority):
 * 1. License: Absolute override. Representative is not working.
 * 2. Shift Changes: Explicit commitment to work. Overrides vacations.
 * 3. Vacation: If no shift change overrides it, the representative is not working.
 * 4. Weekly Override: Manual override by a supervisor for the week.
 * 5. Base Schedule: The representative's default schedule (day off, mixed shift, base shift).
 *
 * @param context - The pre-filtered attendance context for a single rep on a single day.
 * @returns A DailyAssignment object describing the rep's status for the day.
 */
export const getRepDailyAssignment = (
  context: AttendanceContext
): DailyAssignment => {
  const {
    rep,
    dayName,
    repLicenses,
    repVacations,
    shiftChangesForDate,
    weeklyOverrideForRep,
  } = context;

  // 1. License Check (Highest Priority)
  if (repLicenses.length > 0) {
    return {
      kind: 'ON_LICENSE',
      worksDay: false,
      worksNight: false,
    };
  }

  // 2. Shift Change Check (Overrides Vacation)
  // If the rep is only giving away a shift (fromId) and not receiving one,
  // this does not constitute a working commitment. The logic proceeds.
  const isWorkingShiftChange = shiftChangesForDate.find(
    (sc) => sc.toId === rep.id
  );

  if (isWorkingShiftChange) {
    // PROVISIONAL RULE: For 'cover', 'swap', and 'double' we assume availability for both shifts
    // as the specific shift is not yet modeled in the ShiftChange object.
    return {
        kind: 'SHIFT_CHANGE',
        changeType: isWorkingShiftChange.tipo,
        from: isWorkingShiftChange.fromId,
        to: isWorkingShiftChange.toId,
        worksDay: true,
        worksNight: true,
    };
  }

  // 3. Vacation Check
  if (repVacations.length > 0) {
    return {
      kind: 'ON_VACATION',
      worksDay: false,
      worksNight: false,
    };
  }

  // 4. Weekly Override Check
  const override = weeklyOverrideForRep?.[dayName];
   if (override === true) {
    // Explicit override to force a work day, assumes full availability as per final decision.
    return {
        kind: 'WORKING',
        worksDay: true,
        worksNight: true,
    };
  }
  if (override === false) {
    return {
        kind: 'FREE_DAY_OVERRIDE',
        worksDay: false,
        worksNight: false,
    };
  }
  
  // 5. Base Schedule Logic
  // 5a. Scheduled Day Off
  if (rep.diaLibre === dayName) {
    return {
      kind: 'SCHEDULED_DAY_OFF',
      worksDay: false,
      worksNight: false,
    };
  }

  // 5b. Mixed Shift Logic
  if (rep.esMixto) {
    const isWeekendMixto =
      rep.tipoMixto === 'finDeSemana' &&
      (dayName === 'viernes' || dayName === 'sabado' || dayName === 'domingo');
    const isWeekMixto =
      rep.tipoMixto === 'semana' &&
      (dayName === 'lunes' ||
        dayName === 'martes' ||
        dayName === 'miercoles' ||
        dayName === 'jueves');

    if (isWeekendMixto || isWeekMixto) {
      return {
        kind: 'WORKING',
        worksDay: true,
        worksNight: true,
      };
    }
  }

  // 5c. Base Shift (Default Case)
  return {
    kind: 'WORKING',
    worksDay: rep.turnoBase === 'Día',
    worksNight: rep.turnoBase === 'Noche',
  };
};
