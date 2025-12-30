
import {
  Incident,
  ValidationInput,
  ValidationContext,
  ValidationResult,
} from '@/lib/types';

export const validateIncident = (
  input: ValidationInput,
  context: ValidationContext
): ValidationResult => {

  const {
    rep,
    type,
    comment,
    isPunitive,
    requiresComment,
  } = input;

  const {
    canEditForDate,
    isFutureDate,
    isRepWorking,
    incidentsOnDate,
    leaveStatus,
  } = context;

  if (!canEditForDate) {
    return { isValid: false, code: 'MONTH_CLOSED' };
  }

  if (requiresComment && !comment.trim()) {
    return { isValid: false, code: 'COMMENT_REQUIRED_FOR_VARIABLE_POINTS' };
  }

  if (isPunitive && isFutureDate) {
    return { isValid: false, code: 'FUTURE_DATE_NOT_ALLOWED' };
  }

  if (leaveStatus.onLeave) {
    return {
      isValid: false,
      code: leaveStatus.type === 'Licencia'
        ? 'REP_ON_LICENSE'
        : 'REP_ON_VACATION',
    };
  }

  const existingIncidentsForRep = incidentsOnDate.filter(
    inc => inc.repId === rep.id
  );

  const hasAbsence = existingIncidentsForRep.some(inc => inc.tipo === 'Ausencia');
  const hasTardanza = existingIncidentsForRep.some(inc => inc.tipo === 'Tardanza');

  if (type === 'Tardanza' && hasTardanza) {
    return { isValid: false, code: 'DUPLICATE_TARDANZA' };
  }
  
  if (type === 'Ausencia') {
    if (hasAbsence) {
      return { isValid: false, code: 'DUPLICATE_AUSENCIA' };
    }
    if (existingIncidentsForRep.length > 0) {
      return { isValid: false, code: 'CONFLICTS_WITH_AUSENCIA' };
    }
  } else if (isPunitive && hasAbsence) {
    // Cannot add any other punitive incident if an absence already exists.
    return { isValid: false, code: 'CONFLICTS_WITH_AUSENCIA' };
  }

  if (isPunitive && !isRepWorking) {
    return { isValid: false, code: 'REP_NOT_SCHEDULED' };
  }

  return { isValid: true };
};
