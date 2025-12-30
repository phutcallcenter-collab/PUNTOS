import type { IncidentTypeKey } from "@/lib/types";

type PointsInput = {
    basePoints: number;
    incidentType: IncidentTypeKey;
    isWeekend: boolean;
    isPunitive: boolean;
    isVariable: boolean;
};

/**
 * Calculates points for an incident based on a set of pure, explicit rules.
 * This function is deterministic and has no external dependencies.
 *
 * @param input - An object containing all necessary facts for the calculation.
 * @returns The calculated points as a number.
 */
export const calculatePoints = (input: PointsInput): number => {
    const { basePoints, incidentType, isWeekend, isPunitive, isVariable } = input;

    // Rule 1: Non-punitive incidents are always worth 0 points.
    if (!isPunitive) {
        return 0;
    }

    // Rule 2: Incidents with variable points return the base points directly.
    if (isVariable) {
        return basePoints;
    }
    
    // Rule 3: Weekend multiplier applies only to specific incident types.
    if (isWeekend) {
        if (incidentType === 'Ausencia' || incidentType === 'Tardanza') {
            return basePoints * 2;
        }
    }

    // Rule 4: Default case for weekdays or non-multiplying weekend incidents.
    return basePoints;
};
