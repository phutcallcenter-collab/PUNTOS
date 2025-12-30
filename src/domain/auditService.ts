
import type { AuditLogEntry, Role } from '@/lib/types';

export const createAuditLogEntry = (action: AuditLogEntry['action'], actor: Role, meta: Record<string, any>): AuditLogEntry => {
    return {
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        action,
        actor,
        timestamp: new Date().toISOString(),
        meta,
    };
};
