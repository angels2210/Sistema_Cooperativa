
import React, { createContext, useContext, useEffect, useCallback, ReactNode, useState } from 'react';
import { AuditLog, User, AppError } from '../types';
import { apiFetch } from '../utils/api';
import { useAuth } from './AuthContext';

interface SystemContextType {
    auditLog: AuditLog[];
    appErrors: AppError[];
    logAction: (user: User, actionType: string, details: string, targetId?: string) => void;
    setAppErrors: React.Dispatch<React.SetStateAction<AppError[]>>;
}

const SystemContext = createContext<SystemContextType | undefined>(undefined);

export const SystemProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { isAuthenticated } = useAuth();
    const [auditLog, setAuditLog] = useState<AuditLog[]>([]);
    const [appErrors, setAppErrors] = useState<AppError[]>([]);

    useEffect(() => {
        const fetchLogs = async () => {
            if (isAuthenticated) {
                try {
                    const logs = await apiFetch<AuditLog[]>('/audit-logs');
                    setAuditLog(logs);
                } catch (error) {
                    console.error("Failed to fetch audit logs", error);
                }
            } else {
                setAuditLog([]); // Clear logs on logout
            }
        };
        fetchLogs();
    }, [isAuthenticated]);

    const logAction = useCallback(async (user: User, actionType: string, details: string, targetId?: string) => {
        if (!user) return;
        const newLogEntry: Omit<AuditLog, 'id'> = {
            timestamp: new Date().toISOString(),
            userId: user.id,
            userName: user.name,
            action: actionType,
            details: details,
            targetId: targetId
        };
        
        try {
            const savedLog = await apiFetch<AuditLog>('/audit-logs', {
                method: 'POST',
                body: JSON.stringify(newLogEntry),
            });
            setAuditLog(prev => [savedLog, ...prev]);
        } catch (error) {
            console.error("Failed to save audit log to server:", error);
        }
    }, []);

    useEffect(() => {
        const handleError = (message: Event | string, source?: string, lineno?: number, colno?: number, error?: Error) => {
            const newError: AppError = {
                id: `err-${Date.now()}`,
                message: typeof message === 'string' ? message : (message as ErrorEvent).message,
                source: source || 'unknown',
                lineno: lineno || 0,
                colno: colno || 0,
                error: error ? error.stack || error.toString() : 'N/A',
                timestamp: new Date().toISOString(),
            };
            setAppErrors(prev => [newError, ...prev.slice(0, 99)]);
        };
        window.onerror = handleError;
        return () => { window.onerror = null; };
    }, [setAppErrors]);

    return (
        <SystemContext.Provider value={{ auditLog, appErrors, logAction, setAppErrors }}>
            {children}
        </SystemContext.Provider>
    );
};

export const useSystem = (): SystemContextType => {
    const context = useContext(SystemContext);
    if (!context) {
        throw new Error('useSystem must be used within a SystemProvider');
    }
    return context;
};