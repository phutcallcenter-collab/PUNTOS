import { describe, it, expect } from 'vitest';
import { calculatePoints } from '@/domain/pointsCalculator';

describe('pointsCalculator', () => {
  it('returns 0 for non-punitive incidents regardless of other flags', () => {
    const result = calculatePoints({
      basePoints: 3,
      incidentType: 'Ausencia',
      isWeekend: true,
      isPunitive: false,
      isVariable: false,
    });

    expect(result).toBe(0);
  });

  it('returns basePoints immediately for variable points, ignoring all other rules', () => {
    const result = calculatePoints({
      basePoints: 7,
      incidentType: 'OtroPuntos',
      isWeekend: true,
      isPunitive: true,
      isVariable: true,
    });

    expect(result).toBe(7);
  });

  it('calculates weekday points without any multiplier', () => {
    const result = calculatePoints({
      basePoints: 2,
      incidentType: 'Tardanza',
      isWeekend: false,
      isPunitive: true,
      isVariable: false,
    });

    expect(result).toBe(2);
  });

  it('multiplies Ausencia points on weekend', () => {
    const result = calculatePoints({
      basePoints: 3,
      incidentType: 'Ausencia',
      isWeekend: true,
      isPunitive: true,
      isVariable: false,
    });

    expect(result).toBe(6); // multiplicador x2
  });

  it('multiplies Tardanza points on weekend', () => {
    const result = calculatePoints({
      basePoints: 1, // Base points for Tardanza on weekday
      incidentType: 'Tardanza',
      isWeekend: true,
      isPunitive: true,
      isVariable: false,
    });

    expect(result).toBe(2); // multiplicador x2
  });

  it('does NOT multiply Error points on weekend', () => {
    const result = calculatePoints({
      basePoints: 2,
      incidentType: 'Error',
      isWeekend: true,
      isPunitive: true,
      isVariable: false,
    });

    expect(result).toBe(2);
  });

  it('handles zero base points safely', () => {
    const result = calculatePoints({
      basePoints: 0,
      incidentType: 'Error',
      isWeekend: true,
      isPunitive: true,
      isVariable: false,
    });

    expect(result).toBe(0);
  });
});
