

"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CalendarDays,
  BarChart3,
  Search,
  Upload,
  Download,
  UserPlus,
  CheckCircle,
  X,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  Info,
  XCircle,
  CalendarIcon,
  Users,
  ChevronDown,
  ChevronUp,
  Undo2,
  Eye,
  Lock,
  Unlock,
  UserCheck,
  Shield,
  FileText,
  Repeat,
  RotateCcw,
  Home,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar } from "@/components/ui/calendar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { format, addDays, eachDayOfInterval, getDay, startOfWeek, getDate, getYear, getMonth, lastDayOfMonth, differenceInDays, isWithinInterval, startOfMonth, endOfMonth, isFuture, isToday } from "date-fns"
import { es } from "date-fns/locale"
import type {
  Representative,
  Incident,
  IncidentsByDate,
  ToastMessage,
  WeeklyOverrides,
  Shift,
  DayName,
  IncidentTypeKey,
  MonthConfig,
  AuditLogEntry,
  Role,
  ShiftChange,
  ShiftChangesByDate,
  License,
  Vacation,
  LicensesByRep,
  VacationsByRep,
  MixtoType,
  RepId,
  ISODateString,
  IncidentId,
  ShiftChangeId,
  ValidationInput,
  ValidationContext,
  IncidentErrorCode,
  LeaveType,
  DailyAssignment,
  AttendanceContext,
} from "@/lib/types";
import { ALERT_THRESHOLDS, INCIDENT_ERROR_CODES, dayMapping } from '@/lib/types';
import { INCIDENT_CONFIG } from '@/lib/domain-config';
import { loadDataFromStorage, saveDataToStorage } from '@/lib/storageService';
import { 
    getRepDailyAssignment, 
    createAuditLogEntry,
    validateIncident,
    calculatePoints,
} from '@/domain';


// --- Main App Component ---
export default function AsistenciaPage() {
  // --- 1. State Declarations ---
  const [reps, setReps] = useState<Representative[]>([]);
  const [incidencias, setIncidencias] = useState<IncidentsByDate>({});
  const [licenses, setLicenses] = useState<LicensesByRep>({});
  const [vacations, setVacations] = useState<VacationsByRep>({});
  const [shiftChanges, setShiftChanges] = useState<ShiftChangesByDate>({});
  
  const [activeTab, setActiveTab] = useState('diario');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const [weeklyOverrides, setWeeklyOverrides] = useState<WeeklyOverrides>({});
  const [monthConfigs, setMonthConfigs] = useState<Record<string, MonthConfig>>({});
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [activeRole, setActiveRole] = useState<Role>('Supervisor');

  // Rep Modal State
  const [isRepModalOpen, setRepModalOpen] = useState(false);
  const [editingRepId, setEditingRepId] = useState<string | null>(null);
  const [repNombre, setRepNombre] = useState('');
  const [repTurno, setRepTurno] = useState<Shift>('Día');
  const [repDiaLibre, setRepDiaLibre] = useState<DayName>('domingo');
  const [repEsMixto, setRepEsMixto] = useState(false);
  const [repTipoMixto, setRepTipoMixto] = useState<MixtoType>('semana');

  // Shift Change Modal State
  const [isShiftChangeModalOpen, setShiftChangeModalOpen] = useState(false);
  const [shiftChangeDate, setShiftChangeDate] = useState(new Date().toISOString().slice(0, 10));
  const [shiftChangeType, setShiftChangeType] = useState<ShiftChange['tipo']>('cover');
  const [shiftChangeFrom, setShiftChangeFrom] = useState('');
  const [shiftChangeTo, setShiftChangeTo] = useState('');
  const [shiftChangeComment, setShiftChangeComment] = useState('');
  const [isResetModalOpen, setResetModalOpen] = useState(false);

  // Quick Search & Selection State
  const [quickSearch, setQuickSearch] = useState('');
  const [selectedRepIds, setSelectedRepIds] = useState<string[]>([]);
  const [bulkShift, setBulkShift] = useState<Shift>('Día');
  
  // UI Collapse State
  const [isDayShiftCollapsed, setDayShiftCollapsed] = useState(false);
  const [isNightShiftCollapsed, setNightShiftCollapsed] = useState(false);

  // Daily Log State
  const [diarioFecha, setDiarioFecha] = useState(new Date().toISOString().slice(0, 10));
  const [diarioSelectRep, setDiarioSelectRep] = useState('');
  const [diarioTipo, setDiarioTipo] = useState<IncidentTypeKey>('Tardanza');
  const [diarioPuntos, setDiarioPuntos] = useState(0);
  const [diarioComentario, setDiarioComentario] = useState('');
  const [buscarDia, setBuscarDia] = useState('');
  const [diarioLicenciaDias, setDiarioLicenciaDias] = useState(1);

  // Monthly View State
  const [mensualMes, setMensualMes] = useState(new Date().getMonth());
  const [mensualAno, setMensualAno] = useState(new Date().getFullYear());
  const [isDetailModalOpen, setDetailModalOpen] = useState(false);
  const [detailRep, setDetailRep] = useState<Representative | null>(null);
  
  // History State
  const [histSearch, setHistSearch] = useState('');
  const [histTipoFilter, setHistTipoFilter] = useState('');
  const [histResults, setHistResults] = useState<any[]>([]);
  
  // Audit Log State
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('');

  // Drag & Drop State
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartCell, setDragStartCell] = useState<{ repId: string, day: DayName } | null>(null);
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [dragAction, setDragAction] = useState<'working' | 'free' | null>(null);
  
  const days: DayName[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

  // --- 2. Callbacks and Memos ---

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToasts(toasts => [...toasts, { id: Date.now(), message, type }]);
  }, []);

  const addAuditLog = useCallback((action: AuditLogEntry['action'], meta: Record<string, any>) => {
    const newEntry = createAuditLogEntry(action, activeRole, meta);
    setAuditLog(prev => [newEntry, ...prev]);
  }, [activeRole]);

  const getWeekIdentifier = (date: Date): string => {
    const start = startOfWeek(date, { weekStartsOn: 1 }); // Monday
    return format(start, 'yyyy-MM-dd');
  };
  
  const searchHistory = useCallback(() => {
    const query = histSearch.trim().toLowerCase();
    const results: any[] = [];
    Object.entries(incidencias).forEach(([date, arr]) => {
        arr.forEach(item => {
            const rep = reps.find(r => r.id === item.repId);
            const name = rep ? rep.nombre.toLowerCase() : '';
            if (histTipoFilter && item.tipo !== histTipoFilter) return;
            if (!query || name.includes(query) || item.tipo.toLowerCase().includes(query) || (item.comentario || '').toLowerCase().includes(query) || date.includes(query)) {
                
                const dateObj = new Date(date + 'T00:00:00');
                const dayOfWeek = getDay(dateObj); // 0 for Sunday, 6 for Saturday
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;

                const points = calculatePoints({
                    basePoints: INCIDENT_CONFIG[item.tipo]?.points || 0,
                    incidentType: item.tipo,
                    isWeekend: isWeekend,
                    isPunitive: INCIDENT_CONFIG[item.tipo]?.type === 'punitive',
                    isVariable: !!INCIDENT_CONFIG[item.tipo]?.variablePoints
                });
                
                results.push({
                    date: date,
                    rep: rep ? rep.nombre : item.repId,
                    turno: rep ? rep.turnoBase : '',
                    tipo: item.tipo,
                    puntos: points,
                    ts: item.timestampRegistro,
                    id: item.id,
                    comentario: item.comentario
                });
            }
        });
    });
    setHistResults(results.sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts));
  }, [histSearch, histTipoFilter, incidencias, reps]);


  // --- 3. Effects ---

  // Load data from localStorage on initial render
  useEffect(() => {
    try {
        const data = loadDataFromStorage();
        setReps(data.reps);
        setIncidencias(data.incidencias);
        setLicenses(data.licenses);
        setVacations(data.vacations);
        setShiftChanges(data.shiftChanges);
        setWeeklyOverrides(data.weeklyOverrides);
        setMonthConfigs(data.monthConfigs);
        setAuditLog(data.auditLog);
        setActiveRole(data.activeRole);
    } catch (error) {
      console.error("Failed to load data from localStorage", error);
      showToast("No se pudieron cargar los datos guardados.", "error");
    }
  }, [showToast]);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    try {
        saveDataToStorage({
            reps,
            incidencias,
            licenses,
            vacations,
            shiftChanges,
            weeklyOverrides,
            monthConfigs,
            auditLog,
            activeRole
        });
    } catch (error) {
      console.error("Failed to save data to localStorage", error);
      showToast("Hubo un error al guardar los cambios.", "error");
    }
  }, [reps, incidencias, licenses, vacations, shiftChanges, weeklyOverrides, monthConfigs, auditLog, activeRole, showToast]);

  // Toast management
  useEffect(() => {
    if (toasts.length > 0) {
      const timer = setTimeout(() => setToasts(toasts => toasts.slice(1)), 3000);
      return () => clearTimeout(timer);
    }
  }, [toasts]);

  // Trigger history search when filters change
  useEffect(() => {
    searchHistory();
  }, [searchHistory]);

  // Drag and drop mouse up handler
  useEffect(() => {
    const handleGlobalMouseUp = () => {
        if (isDragging) {
            // This needs to be wrapped in a function to be used in the effect cleanup
            const endDrag = () => {
                if (!isDragging || selectedCells.size === 0) {
                    setIsDragging(false);
                    setDragStartCell(null);
                    setSelectedCells(new Set());
                    setDragAction(null);
                    return;
                }
        
                const weekId = getWeekIdentifier(new Date());
                const cellsToModify = Array.from(selectedCells);
                
                setWeeklyOverrides(prev => {
                    const newOverrides = JSON.parse(JSON.stringify(prev));
                    if (!newOverrides[weekId]) newOverrides[weekId] = {};
                    
                    cellsToModify.forEach(cellKey => {
                        const [repId, day] = cellKey.split('-') as [string, DayName];
                        const rep = reps.find(r => r.id === repId);
                        if (!rep) return;
                        
                        if (!newOverrides[weekId][repId]) newOverrides[weekId][repId] = {};
                        
                        if (dragAction === 'working') {
                            newOverrides[weekId][repId][day] = true;
                        } else if (dragAction === 'free') {
                            newOverrides[weekId][repId][day] = false;
                        }
                    });
                    
                    return newOverrides;
                });
        
                showToast(`${cellsToModify.length} celda(s) modificada(s)`, 'success');
                
                setIsDragging(false);
                setDragStartCell(null);
                setSelectedCells(new Set());
                setDragAction(null);
            };
            endDrag();
        }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging, selectedCells, dragAction, reps, showToast]);

  // --- 4. Event Handlers and Functions ---
  
  const canEditForDate = useCallback((date: string | Date): boolean => {
    if (activeRole === 'Gerencia') {
      return true;
    }
    
    const checkDate = new Date(date);
    const monthKey = format(checkDate, 'yyyy-MM');
    const config = monthConfigs[monthKey];

    if (!config || !config.cierre) {
      return true; // Month is not closed
    }
    
    if (!config.closedAt) return true; 

    const closedAt = new Date(config.closedAt);
    const gracePeriodEnds = addDays(closedAt, config.gracePeriodDays);
    
    return new Date() <= gracePeriodEnds;
  }, [activeRole, monthConfigs]);


  const openNewRepModal = () => {
    setEditingRepId(null);
    setRepNombre('');
    setRepTurno('Día');
    setRepDiaLibre('domingo');
    setRepEsMixto(false);
    setRepTipoMixto('semana');
    setRepModalOpen(true);
  };

  const openEditRepModal = (repId: string) => {
    const rep = reps.find(r => r.id === repId);
    if (rep) {
      setEditingRepId(rep.id);
      setRepNombre(rep.nombre);
      setRepTurno(rep.turnoBase);
      setRepDiaLibre(rep.diaLibre);
      setRepEsMixto(rep.esMixto);
      if (rep.esMixto) {
        setRepTipoMixto(rep.tipoMixto);
      }
      setRepModalOpen(true);
    }
  };

  const saveRep = () => {
    if (!repNombre.trim()) {
      showToast('El nombre es requerido', 'error');
      return;
    }

    if (editingRepId) {
      setReps(reps.map(r => {
        if (r.id === editingRepId) {
          const updatedRep: Representative = {
            ...r,
            nombre: repNombre,
            turnoBase: repTurno,
            diaLibre: repDiaLibre,
            esMixto: repEsMixto,
            tipoMixto: repEsMixto ? repTipoMixto : null,
            updated_at: new Date().toISOString() as ISODateString,
          } as Representative;
          return updatedRep;
        }
        return r;
      }));
      addAuditLog('editIncident', { repId: editingRepId, nombre: repNombre });
      showToast('Representante actualizado', 'success');
    } else {
      const now = new Date().toISOString();
      const newRep: Representative = { 
        id: `rep${Date.now().toString(36)}` as RepId, 
        nombre: repNombre, 
        turnoBase: repTurno,
        diaLibre: repDiaLibre,
        activo: true,
        created_at: now as ISODateString,
        updated_at: now as ISODateString,
        esMixto: repEsMixto,
        tipoMixto: repEsMixto ? repTipoMixto : null,
      } as Representative;
      setReps([...reps, newRep]);
      addAuditLog('createIncident', { repId: newRep.id, nombre: newRep.nombre });
      showToast('Representante agregado', 'success');
    }
    setRepModalOpen(false);
  };
  
  const deleteRep = (id: string) => {
    if (activeRole !== 'Gerencia') {
      showToast('Solo la Gerencia puede eliminar representantes.', 'error');
      return;
    }
    if (!confirm('¿Eliminar este representante y todas sus incidencias?')) return;

    setReps(reps => reps.filter(r => r.id !== id));
    setIncidencias(currentIncidencias => {
      const newIncidencias: IncidentsByDate = {};
      Object.keys(currentIncidencias).forEach(date => {
        const filtered = currentIncidencias[date as ISODateString].filter(i => i.repId !== id);
        if (filtered.length > 0) {
          newIncidencias[date as ISODateString] = filtered;
        }
      });
      return newIncidencias;
    });
    setShiftChanges(currentChanges => {
        const newChanges: ShiftChangesByDate = {};
        Object.keys(currentChanges).forEach(date => {
            const filtered = currentChanges[date as ISODateString].filter(sc => sc.fromId !== id && sc.toId !== id);
            if (filtered.length > 0) {
                newChanges[date as ISODateString] = filtered;
            }
        });
        return newChanges;
    });
    showToast('Representante eliminado', 'success');
  };

  const moveRep = (id: string, dir: number) => {
    const index = reps.findIndex(r => r.id === id);
    if (index === -1) return;
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= reps.length) return;
    const newReps = [...reps];
    [newReps[index], newReps[newIndex]] = [newReps[newIndex], newReps[index]]; // Swap
    setReps(newReps);
  };
  
  const handleRepSelection = (id: string, checked: boolean) => {
    setSelectedRepIds(prev => 
      checked 
        ? [...prev, id]
        : prev.filter(repId => repId !== id)
    );
  };

  const handleBulkShiftChange = () => {
    if (selectedRepIds.length === 0) {
      showToast('No hay representantes seleccionados', 'error');
      return;
    }
    setReps(prevReps => 
      prevReps.map(rep => 
        selectedRepIds.includes(rep.id) ? { ...rep, turnoBase: bulkShift } : rep
      )
    );
    showToast(`Se cambió el turno a ${selectedRepIds.length} representante(s)`, 'success');
    setSelectedRepIds([]);
  };

  const getRepLeaveStatus = useCallback((repId: RepId, date: Date): { onLeave: boolean, type: LeaveType | null, block?: License | Vacation } => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        return { onLeave: false, type: null };
    }

    const repLicenses = licenses[repId] || [];
    for (const license of repLicenses) {
        const start = new Date(license.inicio + 'T00:00:00');
        const end = new Date(license.fin + 'T00:00:00');
        if (isWithinInterval(date, { start, end })) {
            return { onLeave: true, type: 'Licencia', block: license };
        }
    }
    
    const repVacations = vacations[repId] || [];
    for (const vacation of repVacations) {
        const start = new Date(vacation.inicio + 'T00:00:00');
        const end = new Date(vacation.fin + 'T00:00:00');
        if (isWithinInterval(date, { start, end })) {
            return { onLeave: true, type: 'Vacaciones', block: vacation };
        }
    }

    return { onLeave: false, type: null };
  }, [licenses, vacations]);


  const memoizedGetRepDailyAssignment = useCallback((rep: Representative, date: Date): DailyAssignment => {
    const dateString = format(date, 'yyyy-MM-dd') as ISODateString;
    const context: AttendanceContext = {
        rep,
        dayName: dayMapping[getDay(date)],
        repLicenses: licenses[rep.id] || [],
        repVacations: vacations[rep.id] || [],
        shiftChangesForDate: shiftChanges[dateString] || [],
        weeklyOverrideForRep: weeklyOverrides[getWeekIdentifier(date)]?.[rep.id],
    };
    return getRepDailyAssignment(context);
  }, [reps, licenses, vacations, shiftChanges, weeklyOverrides]);


  const handleAddIncidencia = () => {
    const rep = reps.find(r => r.id === diarioSelectRep);
    if (!rep) {
      showToast('Por favor seleccione un representante.', 'error');
      return;
    }

    const checkDate = new Date(`${diarioFecha}T00:00:00`);
    const date = format(checkDate, "yyyy-MM-dd") as ISODateString;
    const selectedIncidentConcept = INCIDENT_CONFIG[diarioTipo];
    
    const assignment = memoizedGetRepDailyAssignment(rep, checkDate);
    
    const validationInput: ValidationInput = {
        rep,
        type: diarioTipo,
        date: date,
        comment: diarioComentario,
        isPunitive: selectedIncidentConcept.type === 'punitive',
        requiresComment: !!selectedIncidentConcept.variablePoints,
    };
    
    const validationContext: ValidationContext = {
      canEditForDate: canEditForDate(date),
      isFutureDate: isFuture(checkDate),
      isToday: isToday(checkDate),
      isRepWorking: assignment.worksDay || assignment.worksNight,
      incidentsOnDate: incidencias[date] || [],
      leaveStatus: {
        onLeave: assignment.kind === 'ON_LICENSE' || assignment.kind === 'ON_VACATION',
        type: assignment.kind === 'ON_LICENSE' ? 'Licencia' : assignment.kind === 'ON_VACATION' ? 'Vacaciones' : null,
      },
    };

    const validationResult = validateIncident(validationInput, validationContext);
    
    if (!validationResult.isValid) {
      const errorMessages: Record<IncidentErrorCode, string> = {
        'MONTH_CLOSED': 'No se puede registrar: El mes está cerrado.',
        'COMMENT_REQUIRED_FOR_VARIABLE_POINTS': 'Se requiere un comentario para este tipo de incidencia.',
        'FUTURE_DATE_NOT_ALLOWED': 'No se pueden registrar incidencias punitivas en fechas futuras.',
        'REP_ON_LICENSE': 'No se puede registrar: El representante está de licencia.',
        'REP_ON_VACATION': 'No se puede registrar: El representante está de vacaciones.',
        'DUPLICATE_TARDANZA': 'Ya existe una tardanza registrada para este representante en esta fecha.',
        'DUPLICATE_AUSENCIA': 'Ya existe una ausencia registrada para este representante este día.',
        'CONFLICTS_WITH_AUSENCIA': 'Conflicto: Ya existe una Ausencia registrada, no se pueden añadir otras incidencias.',
        'REP_NOT_SCHEDULED': 'El representante no estaba programado para trabajar en esta fecha.'
      };
      showToast(errorMessages[validationResult.code] || 'Error de validación desconocido.', 'error');
      return;
    }

    const now = new Date();

    if (selectedIncidentConcept.mode === 'duracion' && rep) { // Only for License
        const startDate = new Date(`${diarioFecha}T00:00:00`);
        const duration = diarioLicenciaDias;
        if (duration < 1) { 
            showToast('La duración debe ser de al menos 1 día.', 'error'); 
            return;
        }
        const endDate = addDays(startDate, duration - 1);

        const newLicense: License = {
            id: `lic-${now.getTime()}` as License['id'],
            repId: rep.id,
            inicio: format(startDate, 'yyyy-MM-dd') as ISODateString,
            fin: format(endDate, 'yyyy-MM-dd') as ISODateString,
            created_at: now.toISOString() as ISODateString,
        };

        setLicenses(prev => {
            const userLicenses = prev[rep.id] || [];
            return { ...prev, [rep.id]: [...userLicenses, newLicense] };
        });
        
        addAuditLog('createLicense', { licenseId: newLicense.id, rep: rep.nombre, inicio: newLicense.inicio, fin: newLicense.fin });
        showToast(`Licencia de ${duration} día(s) registrada.`, 'success');
        
    } else if (selectedIncidentConcept.mode === 'rango' && rep) { // Only for Vacation
      const startDate = new Date(`${diarioFecha}T00:00:00`);
      const maxVacationDays = 14;
      let workDaysCount = 0;
      let currentDate = startDate;
      let lastWorkDay = startDate;

      const monthKey = format(startDate, 'yyyy-MM');
      const nextMonthKey = format(addDays(startDate, 30), 'yyyy-MM');
      
      const holidays = [
          ...(monthConfigs[monthKey]?.feriados || []),
          ...(monthConfigs[nextMonthKey]?.feriados || [])
      ].map(d => {
            const date = new Date(getYear(startDate), getMonth(startDate), Number(d));
            return format(date, 'yyyy-MM-dd');
      });

      while (workDaysCount < maxVacationDays && differenceInDays(currentDate, startDate) < 45) { // Safety break
          const isHoliday = holidays.includes(format(currentDate, 'yyyy-MM-dd'));
          const isDayOff = dayMapping[getDay(currentDate)] === rep.diaLibre;

          if (!isHoliday && !isDayOff) {
              workDaysCount++;
              lastWorkDay = currentDate;
          }
          currentDate = addDays(currentDate, 1);
      }

      const newVacation: Vacation = {
        id: `vac-${now.getTime()}` as Vacation['id'],
        repId: rep.id,
        inicio: format(startDate, 'yyyy-MM-dd') as ISODateString,
        fin: format(lastWorkDay, 'yyyy-MM-dd') as ISODateString,
        created_at: now.toISOString() as ISODateString,
      };
      
      setVacations(prev => {
          const userVacations = prev[rep.id] || [];
          return { ...prev, [rep.id]: [...userVacations, newVacation] };
      });
      
      addAuditLog('createVacation', { vacationId: newVacation.id, rep: rep.nombre, inicio: newVacation.inicio, fin: newVacation.fin });
      showToast(`Vacaciones de ${workDaysCount} días laborables registradas.`, 'success');

    } else if(rep) { // Standard incidents
      const newIncidencias: IncidentsByDate = JSON.parse(JSON.stringify(incidencias));
      const cantidad = 1;
      const fecha = diarioFecha as ISODateString;
      if (!newIncidencias[fecha]) newIncidencias[fecha] = [];
      
      for (let i = 0; i < cantidad; i++) {
        const incidentId = `inc-${now.getTime()}-${Math.random()}-${i}` as IncidentId;
        
        const dateObj = new Date(fecha + 'T00:00:00');
        const dayOfWeek = getDay(dateObj); // 0 for Sunday, 6 for Saturday
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;

        const incidentConfig = INCIDENT_CONFIG[diarioTipo];
        const points = calculatePoints({
            basePoints: incidentConfig?.variablePoints ? diarioPuntos : (incidentConfig?.points || 0),
            incidentType: diarioTipo,
            isWeekend: isWeekend,
            isPunitive: incidentConfig?.type === 'punitive',
            isVariable: !!incidentConfig?.variablePoints,
        });

        const incident: Incident = {
          id: incidentId,
          fecha: fecha,
          repId: diarioSelectRep as RepId,
          tipo: diarioTipo,
          comentario: diarioComentario.trim(),
          puntos: points,
          timestampRegistro: now.getTime(),
          status: 'active',
          created_by: activeRole
        };
  
        newIncidencias[fecha].push(incident);
        addAuditLog('createIncident', { incidentId: incident.id, rep: rep.nombre, tipo: incident.tipo, fecha: diarioFecha });
      }
      setIncidencias(newIncidencias);
      showToast(`Incidencia registrada (${cantidad} vez/veces)`, 'success');
    }
    
    setDiarioComentario('');
    setDiarioPuntos(0);
  };

  const handleSaveShiftChange = () => {
    const fecha = shiftChangeDate as ISODateString;
    if (!fecha) { showToast('Seleccione una fecha', 'error'); return; }

    const fromRep = reps.find(r => r.id === shiftChangeFrom);
    const toRep = reps.find(r => r.id === shiftChangeTo);
    
    const checkDate = new Date(`${fecha}T00:00:00`);

    if (fromRep) {
        const fromRepOnLeave = getRepLeaveStatus(fromRep.id, checkDate).onLeave;
        if (fromRepOnLeave) {
            showToast(`No se puede registrar el cambio: ${fromRep?.nombre} está de licencia o vacaciones.`, 'error');
            return;
        }
    }
    if (toRep) {
        const toRepOnLeave = getRepLeaveStatus(toRep.id, checkDate).onLeave;
        if (toRepOnLeave) {
            showToast(`No se puede registrar el cambio: ${toRep?.nombre} está de licencia o vacaciones.`, 'error');
            return;
        }
    }
    
    if (shiftChangeType === 'cover' && (!fromRep || !toRep)) {
      showToast('Debe seleccionar quién cede y quién cubre el turno.', 'error'); return;
    }
    if (shiftChangeType === 'swap' && (!fromRep || !toRep)) {
      showToast('Debe seleccionar ambos representantes para el intercambio.', 'error'); return;
    }
    if (shiftChangeType === 'double' && !toRep) {
      showToast('Debe seleccionar quién hará el doble turno.', 'error'); return;
    }
    
    const newShiftChange: ShiftChange = {
        id: `sc-${Date.now()}` as ShiftChange['id'],
        fecha,
        tipo: shiftChangeType,
        fromId: shiftChangeFrom as RepId | null,
        toId: shiftChangeTo as RepId,
        estado: 'active',
        created_by: activeRole,
        created_at: new Date().toISOString() as ISODateString,
        comentario: shiftChangeComment,
    };

    setShiftChanges(prev => {
        const newChanges = { ...prev };
        if (!newChanges[fecha]) {
            newChanges[fecha] = [];
        }
        newChanges[fecha].push(newShiftChange);
        return newChanges;
    });

    addAuditLog('applyShiftChange', {
        id: newShiftChange.id,
        fecha,
        tipo: shiftChangeType,
        from: fromRep?.nombre,
        to: toRep?.nombre,
    });
    
    showToast('Cambio de turno registrado con éxito.', 'success');
    setShiftChangeModalOpen(false);
    setShiftChangeFrom('');
    setShiftChangeTo('');
    setShiftChangeComment('');
  };
  
    const deleteIncidencia = (date: ISODateString, incidentId: IncidentId) => {
        if (!canEditForDate(date)) {
           showToast('No se puede eliminar la incidencia: El mes está cerrado o fuera del período de gracia.', 'error');
           return;
        }

        if (activeRole !== 'Gerencia') {
            showToast('Solo la Gerencia puede eliminar incidencias.', 'error');
            return;
        }

        if (!confirm('¿Está seguro de que desea eliminar esta incidencia?')) return;
        
        const newIncidencias: IncidentsByDate = JSON.parse(JSON.stringify(incidencias));
        if (newIncidencias[date]) {
            const incidentToDelete = newIncidencias[date].find(inc => inc.id === incidentId);
            if (incidentToDelete) {
                const rep = reps.find(r => r.id === incidentToDelete.repId);
                addAuditLog('softDeleteIncident', { incidentId, rep: rep?.nombre, tipo: incidentToDelete.tipo, fecha: date });
            }
            newIncidencias[date] = newIncidencias[date].filter(inc => inc.id !== incidentId);
            if (newIncidencias[date].length === 0) {
                delete newIncidencias[date];
            }
            setIncidencias(newIncidencias);
            showToast('Incidencia eliminada correctamente', 'success');
        } else {
            showToast('No se pudo encontrar la incidencia para eliminar', 'error');
        }
    };
    
    const deleteLeaveBlock = (repId: RepId, blockId: string, type: 'license' | 'vacation') => {
        if (activeRole !== 'Gerencia') {
            showToast('Solo la Gerencia puede eliminar licencias o vacaciones.', 'error');
            return;
        }
        if (!confirm(`¿Está seguro de que desea eliminar este bloque de ${type === 'license' ? 'licencia' : 'vacaciones'}?`)) return;

        if (type === 'license') {
            setLicenses(prev => {
                const repLicenses = prev[repId] || [];
                const licenseToDelete = repLicenses.find(l => l.id === blockId);
                if (licenseToDelete) {
                    addAuditLog('deleteLicense', { licenseId: blockId, rep: reps.find(r => r.id === repId)?.nombre });
                    const newRepLicenses = repLicenses.filter(l => l.id !== blockId);
                    return { ...prev, [repId]: newRepLicenses };
                }
                return prev;
            });
            showToast('Licencia eliminada.', 'success');
        } else {
            setVacations(prev => {
                const repVacations = prev[repId] || [];
                const vacationToDelete = repVacations.find(v => v.id === blockId);
                if (vacationToDelete) {
                    addAuditLog('deleteVacation', { vacationId: blockId, rep: reps.find(r => r.id === repId)?.nombre });
                    const newRepVacations = repVacations.filter(v => v.id !== blockId);
                    return { ...prev, [repId]: newRepVacations };
                }
                return prev;
            });
            showToast('Bloque de vacaciones eliminado.', 'success');
        }
    };


  const deleteShiftChange = (date: ISODateString, shiftChangeId: ShiftChangeId) => {
      if (!canEditForDate(date)) {
          showToast('No se puede eliminar el cambio de turno: El mes está cerrado o fuera del período de gracia.', 'error');
          return;
      }
      
      if (activeRole !== 'Gerencia') {
          showToast('Solo la Gerencia puede eliminar cambios de turno.', 'error');
          return;
      }

      if (!confirm('¿Está seguro de que desea eliminar este cambio de turno?')) return;
      
      setShiftChanges(prev => {
          const newChanges = { ...prev };
          if (newChanges[date]) {
              const changeToDelete = newChanges[date].find(sc => sc.id === shiftChangeId);
              if (changeToDelete) {
                const fromRep = reps.find(r => r.id === changeToDelete.fromId);
                const toRep = reps.find(r => r.id === changeToDelete.toId);
                addAuditLog('revert', {
                  action: 'deleteShiftChange',
                  shiftChangeId,
                  fecha: date,
                  from: fromRep?.nombre,
                  to: toRep?.nombre,
                });
              }
              newChanges[date] = newChanges[date].filter(sc => sc.id !== shiftChangeId);
              if (newChanges[date].length === 0) {
                  delete newChanges[date];
              }
          }
          return newChanges;
      });
      showToast('Cambio de turno eliminado.', 'success');
  };

  const handleExport = () => {
    const dataToSave = {
        reps,
        incidencias,
        licenses,
        vacations,
        shiftChanges,
        weeklyOverrides,
        monthConfigs,
        auditLog,
        activeRole,
    };
    const data = JSON.stringify(dataToSave, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `control_asistencia_v4_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Datos exportados exitosamente', 'success');
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);
          
          setReps(data.reps || []);
          setIncidencias(data.incidencias || {});
          setLicenses(data.licenses || {});
          setVacations(data.vacations || {});
          setShiftChanges(data.shiftChanges || {});
          setWeeklyOverrides(data.weeklyOverrides || {});
          setMonthConfigs(data.monthConfigs || {});
          setAuditLog(data.auditLog || []);
          setActiveRole(data.activeRole || 'Supervisor');

          showToast('Datos importados exitosamente', 'success');
        } catch (error) {
          showToast('Archivo JSON inválido', 'error');
          console.error(error);
        }
      };
      reader.readAsText(file);
    }
  };

    const handleResetData = () => {
        setReps([]);
        setIncidencias({});
        setLicenses({});
        setVacations({});
        setShiftChanges({});
        setWeeklyOverrides({});
        setMonthConfigs({});
        setAuditLog([]);
        
        showToast('Todos los datos han sido borrados.', 'success');
        setResetModalOpen(false);
    };
  
  const toggleWorkDay = (repId: string, day: DayName) => {
    const weekId = getWeekIdentifier(new Date());
    const rep = reps.find(r => r.id === repId);
    if (!rep) return;

    setWeeklyOverrides(prev => {
        const newOverrides = JSON.parse(JSON.stringify(prev));
        if (!newOverrides[weekId]) newOverrides[weekId] = {};
        if (!newOverrides[weekId][repId]) newOverrides[weekId][repId] = {};

        const currentOverride = newOverrides[weekId][repId][day];

        if (currentOverride !== undefined) {
            delete newOverrides[weekId][repId][day];
            showToast(`Horario de ${rep.nombre} para el ${day} revertido al base.`, 'success');
        } else {
            const dayDate = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), days.indexOf(day));
            const assignment = memoizedGetRepDailyAssignment(rep, dayDate);
            const worksAnyShift = assignment.worksDay || assignment.worksNight;
            
            newOverrides[weekId][repId][day] = !worksAnyShift;
            showToast(`Horario de ${rep.nombre} para el ${day} modificado temporalmente.`, 'info');
        }

        if (Object.keys(newOverrides[weekId][repId]).length === 0) {
            delete newOverrides[weekId][repId];
        }
        if (Object.keys(newOverrides[weekId]).length === 0) {
            delete newOverrides[weekId];
        }

        return newOverrides;
    });
};


  const handleHolidaysChange = (selectedDates: Date[] | undefined) => {
      const monthKey = format(new Date(mensualAno, mensualMes), 'yyyy-MM');
      const newHolidays = selectedDates ? selectedDates.map(date => format(date, 'd')) : [];
      setMonthConfigs(prev => ({
          ...prev,
          [monthKey]: {
              ...(prev[monthKey] || { mes: monthKey, cierre: false, closedAt: null, gracePeriodDays: 5 }),
              feriados: newHolidays,
          }
      }));
  };

  const handleCloseMonth = () => {
    const monthKey = format(new Date(mensualAno, mensualMes), 'yyyy-MM');
    if (!confirm(`¿Está seguro de que desea cerrar el mes de ${format(new Date(mensualAno, mensualMes), "MMMM yyyy", { locale: es })}? Esta acción no se puede deshacer fácilmente.`)) return;

    addAuditLog('closeMonth', { month: monthKey });
    setMonthConfigs(prev => ({
      ...prev,
      [monthKey]: {
        ...(prev[monthKey] || { mes: monthKey, feriados: [], gracePeriodDays: 5 }),
        cierre: true,
        closedAt: new Date().toISOString() as ISODateString,
      }
    }));
    showToast('Mes cerrado correctamente.', 'success');
  };

    const getCellKey = (repId: string, day: DayName) => `${repId}-${day}`;

    const handleDragStart = (repId: string, day: DayName, currentState: 'working' | 'free' | 'baseFreeDay') => {
        setIsDragging(true);
        setDragStartCell({ repId, day });
        
        const targetAction = currentState === 'baseFreeDay' || currentState === 'free' ? 'working' : 'free';
        setDragAction(targetAction);
        
        const cellKey = getCellKey(repId, day);
        setSelectedCells(new Set([cellKey]));
    };

    const handleDragEnter = (repId: string, day: DayName) => {
        if (!isDragging) return;
        
        const cellKey = getCellKey(repId, day);
        setSelectedCells(prev => {
            const newSet = new Set(prev);
            newSet.add(cellKey);
            return newSet;
        });
    };

    const dailyAvailability = useMemo(() => {
        if (!diarioFecha) return { dayShift: 0, nightShift: 0 };
        const selectedDate = new Date(`${diarioFecha}T00:00:00`);
        let dayShiftCount = 0;
        let nightShiftCount = 0;

        reps.forEach(rep => {
            const assignment = memoizedGetRepDailyAssignment(rep, selectedDate);
            if(assignment.worksDay) dayShiftCount++;
            if(assignment.worksNight) nightShiftCount++;
        });
        
        return { dayShift: dayShiftCount, nightShift: nightShiftCount };
    }, [reps, diarioFecha, memoizedGetRepDailyAssignment]);

  // --- 5. Render Functions ---
  const renderToastContainer = () => (
    <div id="toastContainer" className="fixed right-5 top-5 z-[1000] space-y-2">
      {toasts.map(toast => {
        const bgColor = toast.type === 'error' ? 'linear-gradient(135deg, #ef4444, #dc2626)' 
          : toast.type === 'success' ? 'linear-gradient(135deg, #10b981, #059669)'
          : 'linear-gradient(135deg, #6366f1, #4f46e5)';
        const Icon = toast.type === 'error' ? XCircle : toast.type === 'success' ? CheckCircle : Info;

        return (
          <div key={toast.id} className="toast glass show p-3.5 rounded-xl flex gap-2.5 items-center min-w-[250px] text-white shadow-lg" style={{ background: bgColor }}>
            <Icon className="w-5 h-5" />
            <div>{toast.message}</div>
          </div>
        );
      })}
    </div>
  );

  const renderRepModal = () => {
    
    return (
        <div className={cn("modal-backdrop", isRepModalOpen ? "flex" : "hidden")}>
            <div className="glass p-6 w-[90%] max-w-[500px]">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">{editingRepId ? 'Editar' : 'Añadir'} Representante</h3>
                    <button onClick={() => setRepModalOpen(false)} className="pill p-2"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm mb-2 text-text-secondary">Nombre</label>
                        <input type="text" value={repNombre} onChange={e => setRepNombre(e.target.value)} className="w-full" placeholder="Nombre completo" />
                    </div>
                    <div>
                        <label className="block text-sm mb-2 text-text-secondary">Turno Base</label>
                        <select value={repTurno} onChange={e => setRepTurno(e.target.value as Shift)} className="w-full">
                            <option>Día</option>
                            <option>Noche</option>
                        </select>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Switch id="mixto-switch" checked={repEsMixto} onCheckedChange={setRepEsMixto} />
                        <Label htmlFor="mixto-switch">Aplica para turno Mixto (doble turno)</Label>
                    </div>

                    {repEsMixto && (
                        <div>
                            <label className="block text-sm mb-2 text-text-secondary">Días de Turno Mixto</label>
                            <select value={repTipoMixto} onChange={e => setRepTipoMixto(e.target.value as MixtoType)} className="w-full">
                                <option value="semana">Semana (Lunes a Jueves)</option>
                                <option value="finDeSemana">Fin de Semana (Viernes a Domingo)</option>
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm mb-2 text-text-secondary">Día Libre Fijo</label>
                        <select value={repDiaLibre} onChange={e => setRepDiaLibre(e.target.value as DayName)} className="w-full capitalize">
                            {days.map(day => <option key={day} value={day} className="capitalize">{day}</option>)}
                        </select>
                    </div>

                    <div className="flex gap-3 justify-end pt-4">
                        <button onClick={() => setRepModalOpen(false)} className="pill">Cancelar</button>
                        <button onClick={saveRep} className="btn-primary">Guardar</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

    const renderResetConfirmModal = () => (
        <AlertDialog open={isResetModalOpen} onOpenChange={setResetModalOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción es irreversible y borrará permanentemente todos los datos de la aplicación, incluyendo representantes, incidencias, planificaciones y configuraciones. No podrá recuperar estos datos.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Sí, borrar todo
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );

  const renderShiftChangeModal = () => {
    const availableReps = reps.filter(r => r.activo);

    return (
        <div className={cn("modal-backdrop", isShiftChangeModalOpen ? "flex" : "hidden")}>
            <div className="glass p-6 w-[90%] max-w-[600px]">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">Registrar Cambio de Turno</h3>
                    <button onClick={() => setShiftChangeModalOpen(false)} className="pill p-2"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm mb-2 text-text-secondary">Fecha del Cambio</label>
                            <input type="date" value={shiftChangeDate} onChange={(e) => setShiftChangeDate(e.target.value)} className="w-full" />
                        </div>
                        <div>
                            <label className="block text-sm mb-2 text-text-secondary">Tipo de Cambio</label>
                            <select value={shiftChangeType} onChange={e => setShiftChangeType(e.target.value as ShiftChange['tipo'])} className="w-full">
                                <option value="cover">Cobertura</option>
                                <option value="swap">Intercambio</option>
                                <option value="double">Doble Turno</option>
                            </select>
                        </div>
                    </div>
                    {shiftChangeType === 'cover' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm mb-2 text-text-secondary">Quién Cede el Turno</label>
                                <select value={shiftChangeFrom} onChange={e => setShiftChangeFrom(e.target.value)} className="w-full">
                                    <option value="">Seleccionar...</option>
                                    {availableReps.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm mb-2 text-text-secondary">Quién Cubre</label>
                                <select value={shiftChangeTo} onChange={e => setShiftChangeTo(e.target.value)} className="w-full">
                                    <option value="">Seleccionar...</option>
                                    {availableReps.filter(r => r.id !== shiftChangeFrom).map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                                </select>
                            </div>
                        </div>
                    )}
                    {shiftChangeType === 'swap' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm mb-2 text-text-secondary">Representante 1</label>
                                <select value={shiftChangeFrom} onChange={e => setShiftChangeFrom(e.target.value)} className="w-full">
                                    <option value="">Seleccionar...</option>
                                    {availableReps.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm mb-2 text-text-secondary">Representante 2</label>
                                <select value={shiftChangeTo} onChange={e => setShiftChangeTo(e.target.value)} className="w-full">
                                    <option value="">Seleccionar...</option>
                                    {availableReps.filter(r => r.id !== shiftChangeFrom).map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                                </select>
                            </div>
                        </div>
                    )}
                    {shiftChangeType === 'double' && (
                        <div>
                            <label className="block text-sm mb-2 text-text-secondary">Quién Hace Doble Turno</label>
                            <select value={shiftChangeTo} onChange={e => setShiftChangeTo(e.target.value)} className="w-full">
                                <option value="">Seleccionar...</option>
                                {availableReps.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm mb-2 text-text-secondary">Comentario (opcional)</label>
                        <input type="text" value={shiftChangeComment} onChange={e => setShiftChangeComment(e.target.value)} className="w-full" placeholder="Añadir nota..." />
                    </div>

                    <div className="flex gap-3 justify-end pt-4">
                        <button onClick={() => setShiftChangeModalOpen(false)} className="pill">Cancelar</button>
                        <button onClick={handleSaveShiftChange} className="btn-primary">Guardar Cambio</button>
                    </div>
                </div>
            </div>
        </div>
    );
  };


  const RepCard = React.memo(({ r, onSelectionChange, isSelected }: { r: Representative, onSelectionChange: (id: string, checked: boolean) => void, isSelected: boolean }) => {
    let repTurnoInfo = r.turnoBase;
    if (r.esMixto) {
      repTurnoInfo += ` (Mixto ${r.tipoMixto === 'semana' ? 'Sem' : 'FDS'})`;
    }
    
    return (
        <div key={r.id} className="glass p-3 rep-card flex items-center gap-3">
            <input 
              type="checkbox" 
              className="form-checkbox h-5 w-5 rounded text-red-600 focus:ring-red-500 border-gray-300"
              checked={isSelected}
              onChange={(e) => onSelectionChange(r.id, e.target.checked)}
            />
            <div className="flex-1">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="font-semibold">{r.nombre}</div>
                        <div className="text-xs text-text-secondary">{repTurnoInfo}</div>
                    </div>
                    <div className="flex gap-1">
                        <button onClick={() => moveRep(r.id, -1)} className="pill p-1" title="Subir"><ArrowUp className="w-3 h-3" /></button>
                        <button onClick={() => moveRep(r.id, 1)} className="pill p-1" title="Bajar"><ArrowDown className="w-3 h-3" /></button>
                    </div>
                </div>
                <div className="flex gap-2 mt-2">
                    <button onClick={() => openEditRepModal(r.id)} className="pill flex-1 text-xs"><Edit2 className="w-3 h-3 inline mr-1" /> Editar</button>
                    {activeRole === 'Gerencia' && (
                      <button onClick={() => deleteRep(r.id)} className="pill flex-1 text-xs bg-red-100 text-red-700 hover:bg-red-200"><Trash2 className="w-3 h-3 inline mr-1" /> Eliminar</button>
                    )}
                </div>
            </div>
        </div>
    );
  });
RepCard.displayName = 'RepCard';


  const renderRepList = () => {
    const filteredReps = reps.filter(r => r.nombre.toLowerCase().includes(quickSearch.toLowerCase()));
    
    const dayShiftReps = filteredReps.filter(r => r.turnoBase === 'Día' || r.esMixto);
    const nightShiftReps = filteredReps.filter(r => r.turnoBase === 'Noche' || r.esMixto);
  
    return (
      <>
        <div>
          <button onClick={() => setDayShiftCollapsed(!isDayShiftCollapsed)} className="w-full flex justify-between items-center pill mb-2">
            <span className="font-semibold">Turno Diurno ({dailyAvailability.dayShift})</span>
            {isDayShiftCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          {!isDayShiftCollapsed && (
            <div className="space-y-2">
              {dayShiftReps.map(r => <RepCard key={r.id} r={r} onSelectionChange={handleRepSelection} isSelected={selectedRepIds.includes(r.id)} />)}
            </div>
          )}
        </div>
        <div className="mt-4">
          <button onClick={() => setNightShiftCollapsed(!isNightShiftCollapsed)} className="w-full flex justify-between items-center pill mb-2">
            <span className="font-semibold">Turno Nocturno ({dailyAvailability.nightShift})</span>
            {isNightShiftCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          {!isNightShiftCollapsed && (
            <div className="space-y-2">
              {nightShiftReps.map(r => <RepCard key={r.id} r={r} onSelectionChange={handleRepSelection} isSelected={selectedRepIds.includes(r.id)} />)}
            </div>
          )}
        </div>
      </>
    );
  };

  const renderBulkActions = () => {
    if (selectedRepIds.length === 0) return null;

    return (
      <div className="fixed bottom-4 left-4 right-4 lg:left-auto lg:right-4 lg:w-auto glass p-4 z-50 flex flex-wrap items-center justify-center lg:justify-start gap-4 shadow-xl animate-slide-in-up">
        <span className="font-semibold text-sm">{selectedRepIds.length} seleccionado(s)</span>
        <select value={bulkShift} onChange={(e) => setBulkShift(e.target.value as Shift)} className="pill">
          <option>Día</option>
          <option>Noche</option>
        </select>
        <button onClick={handleBulkShiftChange} className="btn-primary">Cambiar Turno</button>
        <button onClick={() => setSelectedRepIds([])} className="pill p-2"><X className="w-5 h-5"/></button>
      </div>
    );
  }
  
  const renderDailyLog = () => {
    const fechaISO = diarioFecha as ISODateString;
    const incidenciasDelDia = incidencias[fechaISO] || [];
    const shiftChangesDelDia = shiftChanges[fechaISO] || [];
    const searchLower = buscarDia.toLowerCase();
    
    type DailyEvent = Incident | ShiftChange | { type: 'Leave', block: License | Vacation, rep: Representative };

    const allDailyEvents: DailyEvent[] = [
        ...incidenciasDelDia,
        ...shiftChangesDelDia
    ];

    reps.forEach(rep => {
        if (!diarioFecha) return;
        const checkDate = new Date(diarioFecha + 'T00:00:00');
        const leaveStatus = getRepLeaveStatus(rep.id, checkDate);
        if (leaveStatus.onLeave && leaveStatus.block) {
            allDailyEvents.push({ type: 'Leave', block: leaveStatus.block, rep });
        }
    });

    
    const byRep = allDailyEvents.reduce((acc, event) => {
        let repId: RepId | null = null;
        if ('repId' in event) { // Incident
            repId = event.repId;
        } else if ('block' in event) { // Leave
            repId = event.block.repId;
        } else if (event.tipo === 'double') { // ShiftChange
            repId = event.toId;
        } else if (event.tipo === 'cover' || event.tipo === 'swap') { // cover or swap ShiftChange
            if (event.fromId) {
                if (!acc[event.fromId]) acc[event.fromId] = [];
                acc[event.fromId].push(event);
            }
            if (event.toId) {
                if (!acc[event.toId]) acc[event.toId] = [];
                acc[event.toId].push(event);
            }
            return acc;
        }

        if (repId) {
            if (!acc[repId]) acc[repId] = [];
            acc[repId].push(event);
        }
        return acc;
    }, {} as Record<RepId, DailyEvent[]>);
    
    const selectedIncidentConcept = INCIDENT_CONFIG[diarioTipo];
    const isRangeMode = selectedIncidentConcept?.mode === 'rango';
    const isDurationMode = selectedIncidentConcept?.mode === 'duracion';
    const isVariablePointsMode = selectedIncidentConcept?.variablePoints;

    const getLeaveDurationText = (block: License | Vacation, rep: Representative) => {
        const viewDate = diarioFecha ? new Date(diarioFecha + 'T00:00:00') : new Date();
        const reingresoDate = new Date(block.fin + 'T00:00:00'); // Simplified
        let returnDate = addDays(reingresoDate, 1);
    
        const monthKey = format(new Date(block.inicio), 'yyyy-MM');
        const holidays = (monthConfigs[monthKey]?.feriados || []).map(d => format(new Date(getYear(new Date(block.inicio)), getMonth(new Date(block.inicio)), parseInt(d)), 'yyyy-MM-dd'));
    
        while(true) {
            const isHoliday = holidays.includes(format(returnDate, 'yyyy-MM-dd'));
            const isDayOff = dayMapping[getDay(returnDate)] === rep.diaLibre;
            if (!isHoliday && !isDayOff) break;
            returnDate = addDays(returnDate, 1);
        }
    
        if ('id' in block && block.id.startsWith('lic')) { // License
            const daysSoFar = differenceInDays(viewDate, new Date(block.inicio + 'T00:00:00')) + 1;
            return `Día ${daysSoFar} de ${differenceInDays(new Date(block.fin), new Date(block.inicio)) + 1} (Reingreso: ${format(returnDate, 'dd/MM/yy')})`;
        } else { // Vacation
            let workDaysTaken = 0;
            const dates = eachDayOfInterval({start: new Date(block.inicio), end: new Date(block.fin)});
            dates.forEach(d => {
                const isHoliday = holidays.includes(format(d, 'yyyy-MM-dd'));
                const isDayOff = dayMapping[getDay(d)] === rep.diaLibre;
                if(!isHoliday && !isDayOff) workDaysTaken++;
            });

            let workDaysElapsed = 0;
            const elapsedDates = eachDayOfInterval({start: new Date(block.inicio), end: viewDate});
            elapsedDates.forEach(d => {
                const isHoliday = holidays.includes(format(d, 'yyyy-MM-dd'));
                const isDayOff = dayMapping[getDay(d)] === rep.diaLibre;
                if(!isHoliday && !isDayOff) workDaysElapsed++;
            });
            return `Día laborable ${workDaysElapsed} de ${workDaysTaken} (Reingreso: ${format(returnDate, 'dd/MM/yy')})`;
        }
    };

    const handleOpenShiftChangeModal = () => {
        setShiftChangeDate(diarioFecha);
        setShiftChangeModalOpen(true);
    };

    return (
      <section id="tab-diario" className={activeTab === 'diario' ? '' : 'hidden'}>
        <div className="glass p-6">
          <h2 className="text-xl font-bold mb-4">Registro Diario de Eventos</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <div className="lg:col-span-1">
                <label className="block text-sm mb-2 text-text-secondary">Representante</label>
                <select value={diarioSelectRep} onChange={e => setDiarioSelectRep(e.target.value)} className="w-full">
                  <option value="">Seleccionar...</option>
                  {reps.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                </select>
              </div>
              <div className="lg:col-span-1">
                <label className="block text-sm mb-2 text-text-secondary">Tipo de Evento</label>
                <select value={diarioTipo} onChange={e => setDiarioTipo(e.target.value as IncidentTypeKey)} className="w-full">
                    {Object.entries(INCIDENT_CONFIG).map(([key, {label}]) => <option key={key} value={key as IncidentTypeKey}>{label}</option>)}
                </select>
              </div>
              
              {isRangeMode ? (
                <div className="lg:col-span-1">
                  <label className="block text-sm mb-2 text-text-secondary">Fecha de Inicio de Vacaciones</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !diarioFecha && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {diarioFecha ? (
                           format(new Date(diarioFecha ? diarioFecha + 'T00:00:00' : new Date()), "LLL dd, y", { locale: es })
                        ) : (
                          <span>Seleccione fecha de inicio</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="single"
                        defaultMonth={diarioFecha ? new Date(diarioFecha + 'T00:00:00') : new Date()}
                        selected={diarioFecha ? new Date(diarioFecha + 'T00:00:00') : undefined}
                        onSelect={(date) => setDiarioFecha(date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'))}
                        numberOfMonths={1}
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                   <p className="text-xs text-text-secondary mt-1">Se calcularán 14 días laborables a partir de la fecha de inicio.</p>
                </div>
              ) : isDurationMode ? (
                <div className="grid grid-cols-2 gap-4 lg:col-span-1">
                    <div>
                        <label className="block text-sm mb-2 text-text-secondary">Fecha Inicio</label>
                        <input type="date" value={diarioFecha} onChange={e => setDiarioFecha(e.target.value)} className="w-full" />
                    </div>
                    <div>
                        <label className="block text-sm mb-2 text-text-secondary">Duración (días)</label>
                        <input type="number" min="1" value={diarioLicenciaDias} onChange={(e) => setDiarioLicenciaDias(Number(e.target.value))} className="w-full" />
                    </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 lg:col-span-1">
                  <div>
                    <label className="block text-sm mb-2 text-text-secondary">Fecha</label>
                    <input type="date" value={diarioFecha} onChange={e => setDiarioFecha(e.target.value)} className="w-full" />
                  </div>
                   {isVariablePointsMode ? (
                     <div>
                        <label className="block text-sm mb-2 text-text-secondary">Puntos</label>
                        <input 
                          type="number" 
                          min="0"
                          value={diarioPuntos} 
                          onChange={e => setDiarioPuntos(parseInt(e.target.value) || 0)} 
                          className="w-full" 
                        />
                    </div>
                   ) : (
                    <div>
                        <label className="block text-sm mb-2 text-text-secondary">Cantidad</label>
                        <input 
                            type="number" 
                            min="1"
                            value="1"
                            readOnly
                            className="w-full bg-muted"
                        />
                    </div>
                   )}
                </div>
              )}
          </div>
          <div className="mb-4">
            <label className="block text-sm mb-2 text-text-secondary">Comentario (opcional)</label>
            <input type="text" value={diarioComentario} onChange={e => setDiarioComentario(e.target.value)} placeholder="Agregar nota..." className="w-full" />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAddIncidencia} className="flex-1">
              <CheckCircle className="w-5 h-5" />
              Registrar
            </Button>
            <Button onClick={handleOpenShiftChangeModal} variant="secondary" className="flex-1">
              <Repeat className="w-5 h-5" />
              Gestionar Cambios de Turno
            </Button>
          </div>
          <hr className="my-6 border-glass-border" />
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3">Resumen del Día ({diarioFecha ? format(new Date(`${diarioFecha}T00:00:00`), "eeee, dd 'de' MMMM", {locale: es}) : 'Seleccione fecha'})</h3>
              <div className="space-y-3 custom-scroll max-h-[400px] overflow-y-auto">
                <div className="stat-card mt-4">
                    <div className="text-sm mb-1 text-text-secondary">Eventos Registrados Hoy</div>
                    <div className="text-3xl font-bold">{incidenciasDelDia.length + shiftChangesDelDia.length}</div>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Eventos del Día y Búsqueda</h3>
              <input type="text" value={buscarDia} onChange={e => setBuscarDia(e.target.value)} placeholder="Buscar por nombre..." className="w-full mb-3" />
               <div className="space-y-3 custom-scroll max-h-[350px] overflow-y-auto pr-2">
                {Object.keys(byRep).length === 0 ? <p className="text-sm text-text-secondary">Sin eventos para hoy.</p> : 
                  Object.entries(byRep)
                    .filter(([repId]) => {
                        if (!searchLower) return true;
                        const r = reps.find(x => x.id === repId);
                        return r && r.nombre.toLowerCase().includes(searchLower);
                    })
                    .map(([repId, items]) => {
                    const r = reps.find(x => x.id === repId);
                    
                    const groupedIncidents = items.reduce((acc, item) => {
                        if ('repId' in item) { // Is Incident
                            if (!acc[item.tipo]) {
                                acc[item.tipo] = { count: 0, comments: [], points: 0, ids: [] };
                            }
                            acc[item.tipo].count += 1;
                            if (item.comentario) {
                                acc[item.tipo].comments.push(item.comentario);
                            }
                             const dateObj = new Date(item.fecha + 'T00:00:00');
                             const dayOfWeek = getDay(dateObj); // 0 for Sunday, 6 for Saturday
                             const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;

                            const incidentConfig = INCIDENT_CONFIG[item.tipo];
                             acc[item.tipo].points += calculatePoints({
                                basePoints: incidentConfig?.variablePoints ? item.puntos : (incidentConfig?.points || 0),
                                incidentType: item.tipo,
                                isWeekend: isWeekend,
                                isPunitive: incidentConfig?.type === 'punitive',
                                isVariable: !!incidentConfig?.variablePoints,
                            });
                            acc[item.tipo].ids.push(item.id);
                        }
                        return acc;
                    }, {} as Record<string, { count: number; comments: string[], points: number, ids: IncidentId[] }>);


                    return (
                        <div key={repId} className="glass p-3">
                            <div className="font-semibold mb-2">{r ? r.nombre : repId}</div>
                            {items.map((it, index) => {
                                if ('block' in it) { // Is Leave block
                                    const isLicense = 'id' in it.block && it.block.id.startsWith('lic');
                                    const tipoLabel = isLicense ? 'Licencia' : 'Vacaciones';
                                    const badgeInfo = isLicense ? INCIDENT_CONFIG.Licencia : INCIDENT_CONFIG.Vacaciones;
                                    
                                    const text = r ? getLeaveDurationText(it.block, r) : '';

                                    return (
                                        <div key={`${it.block.id}-${index}`} className="flex items-start gap-2 mb-2 group">
                                            <span className={`font-bold incident-badge ${badgeInfo.badge}`}>{tipoLabel}</span>
                                            <div className="flex-1 text-sm text-text-secondary">{text}</div>
                                            {(activeRole === 'Gerencia' && canEditForDate(diarioFecha)) && (
                                                <button onClick={() => deleteLeaveBlock(repId, it.block.id, isLicense ? 'license' : 'vacation')} className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    )
                                } else if (!('repId' in it)) { // Is ShiftChange
                                    let text = '';
                                    if (it.tipo === 'cover') {
                                        const from = reps.find(rep => rep.id === it.fromId)?.nombre || 'N/A';
                                        const to = reps.find(rep => rep.id === it.toId)?.nombre || 'N/A';
                                        text = repId === it.fromId ? `Cedió turno a ${to}` : `Cubrió a ${from}`;
                                    } else if (it.tipo === 'swap') {
                                        const otherId = repId === it.fromId ? it.toId : it.fromId;
                                        const other = reps.find(rep => rep.id === otherId)?.nombre || 'N/A';
                                        text = `Intercambió turno con ${other}`;
                                    } else if (it.tipo === 'double') {
                                        text = 'Hizo doble turno';
                                    }
                                    return (
                                        <div key={`sc-${it.id}`} className="flex items-start gap-2 mb-2 group">
                                            <span className={`incident-badge ${INCIDENT_CONFIG['Permiso']?.badge || ''}`}>Cambio</span>
                                            <div className="flex-1 text-sm text-text-secondary">{text}{it.comentario ? ` · ${it.comentario}`: ''}</div>
                                            {(activeRole === 'Gerencia' && canEditForDate(diarioFecha)) && (
                                                <button onClick={() => deleteShiftChange(fechaISO, it.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    )
                                }
                                return null;
                            })}
                            {Object.entries(groupedIncidents).map(([tipo, data]) => {
                                const { count, comments, points, ids } = data;
                                const tipoLabel = INCIDENT_CONFIG[tipo as IncidentTypeKey]?.label.split(' ')[0] || tipo;
                                const pointsText = points > 0 ? `(${points} pts)` : '';

                                return (
                                    <div key={tipo} className="flex items-start gap-2 mb-2 group">
                                        <span className={`incident-badge font-bold ${INCIDENT_CONFIG[tipo as IncidentTypeKey]?.badge || ''}`}>
                                            {tipoLabel} {count > 1 && `(x${count})`}
                                        </span>
                                        <div className="flex-1 text-sm text-text-secondary">
                                            {comments.join('; ')}
                                            {points > 0 && <span className="ml-2 font-bold text-destructive">{pointsText}</span>}
                                        </div>
                                        {(activeRole === 'Gerencia' && canEditForDate(diarioFecha)) && (
                                            <button onClick={() => deleteIncidencia(fechaISO, ids[0])} className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )
                  })
                }
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  };
  
    const openDetailModal = (rep: Representative) => {
        setDetailRep(rep);
        setDetailModalOpen(true);
    };

    const MonthlyDetailCalendar = ({ rep, month, year, holidays }: { rep: Representative, month: number, year: number, holidays: string[] }) => {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let firstDayOfMonth = new Date(year, month, 1).getDay(); // 0=Sun, 1=Mon...
        if (firstDayOfMonth === 0) firstDayOfMonth = 7; // Adjust Sunday to be 7
        const startOffset = firstDayOfMonth - 1;

        const allDaysInMonth = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));
        const repIncidentsThisMonth = allDaysInMonth.map(day => {
            const dateString = format(day, 'yyyy-MM-dd') as ISODateString;
            return (incidencias[dateString] || []).filter(inc => inc.repId === rep.id);
        }).flat();

        return (
            <div className="p-4">
                <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-text-secondary mb-2">
                    <div>Lun</div>
                    <div>Mar</div>
                    <div>Mié</div>
                    <div>Jue</div>
                    <div>Vie</div>
                    <div>Sáb</div>
                    <div>Dom</div>
                </div>
                <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                    {Array.from({ length: startOffset }).map((_, i) => <div key={`empty-${i}`}></div>)}
                    {allDaysInMonth.map(day => {
                        const dateString = format(day, 'yyyy-MM-dd') as ISODateString;
                        const dayIncidents = (incidencias[dateString] || []).filter(inc => inc.repId === rep.id);
                        const leaveStatus = getRepLeaveStatus(rep.id, day);
                        const dayStr = format(day, 'd');
                        const isHoliday = holidays.includes(dayStr);
                        const dayNumber = getDate(day);

                        let dayClass = "h-14 sm:h-16 lg:h-20 border rounded-md p-1.5 text-left flex flex-col";
                        let incidentBadge = null;
                        
                        if (leaveStatus.onLeave) {
                            const badgeInfo = leaveStatus.type === 'Licencia' ? INCIDENT_CONFIG.Licencia : INCIDENT_CONFIG.Vacaciones;
                            dayClass += ` ${badgeInfo.badge.replace('badge-', 'bg-opacity-20 border-opacity-40 border-')}`;
                            dayClass = dayClass.replace('bg-', 'bg-').replace('text-', 'border-').replace('100', '500');
                            incidentBadge = <span className={`incident-badge text-xs ${badgeInfo.badge}`}>{badgeInfo.label.split(' ')[0]}</span>
                        } else if (dayIncidents.length > 0) {
                            const mainIncident = dayIncidents[0]; // Show first incident for simplicity
                            const incidentInfo = INCIDENT_CONFIG[mainIncident.tipo];
                            dayClass += ` ${incidentInfo.badge.replace('badge-', 'bg-opacity-20 border-opacity-40 border-')}`;
                            dayClass = dayClass.replace('bg-', 'bg-').replace('text-', 'border-').replace('100', '500');

                            incidentBadge = <span className={`incident-badge text-xs ${incidentInfo.badge}`}>{incidentInfo.label.split(' ')[0]} {dayIncidents.length > 1 ? `(x${dayIncidents.length})` : ''}</span>
                        } else if (isHoliday) {
                            dayClass += ' bg-gray-100 dark:bg-gray-800';
                        }
                        
                        return (
                            <div key={dateString} className={cn(dayClass)}>
                                <span className="font-semibold">{dayNumber}</span>
                                <div className="mt-1 flex-grow overflow-y-auto text-xs">
                                  {incidentBadge}
                                </div>
                            </div>
                        )
                    })}
                </div>
                <div className="mt-4">
                    <h4 className="font-semibold mb-2">Resumen de Incidencias del Mes</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto custom-scroll pr-2">
                        {repIncidentsThisMonth.length > 0 ? repIncidentsThisMonth.map((inc, index) => {
                            const dateObj = new Date(inc.fecha + 'T00:00:00');
                            const dayOfWeek = getDay(dateObj);
                            const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;

                            const incidentConfig = INCIDENT_CONFIG[inc.tipo];
                            const points = calculatePoints({
                                basePoints: incidentConfig?.variablePoints ? inc.puntos : (incidentConfig?.points || 0),
                                incidentType: inc.tipo,
                                isWeekend: isWeekend,
                                isPunitive: incidentConfig?.type === 'punitive',
                                isVariable: !!incidentConfig?.variablePoints,
                            });
                          const pointsText = points > 0 ? `(${points} pts)` : '';
                          return (
                            <div key={`${inc.id}-${index}`} className="text-sm flex gap-2 items-center">
                                <span className="font-semibold">{format(new Date(inc.fecha+'T00:00:00'), "dd/MM")}:</span>
                                <span className={`incident-badge ${INCIDENT_CONFIG[inc.tipo].badge}`}>{INCIDENT_CONFIG[inc.tipo].label.split(" ")[0]}</span>
                                <span>{inc.comentario}</span>
                                {points > 0 && <span className="font-bold text-destructive">{pointsText}</span>}
                            </div>
                          )
                        }) : <p className="text-sm text-text-secondary">No hay incidencias este mes.</p>}
                    </div>
                </div>
            </div>
        )
    };

  const renderMonthlyDetailModal = () => {
    if (!isDetailModalOpen || !detailRep) return null;
    const monthKey = format(new Date(mensualAno, mensualMes), 'yyyy-MM');
    const currentMonthHolidays = monthConfigs[monthKey]?.feriados || [];

    return (
      <div className={cn("modal-backdrop", isDetailModalOpen ? "flex" : "hidden")}>
        <div className="glass p-6 w-[90%] max-w-[800px]">
          <div className="flex items-center justify-between mb-4">
            <div>
                <h3 className="text-xl font-bold">Detalle Mensual de {detailRep.nombre}</h3>
                <p className="text-sm text-text-secondary">{format(new Date(mensualAno, mensualMes), "MMMM yyyy", {locale: es})}</p>
            </div>
            <button onClick={() => setDetailModalOpen(false)} className="pill p-2"><X className="w-5 h-5" /></button>
          </div>
          <MonthlyDetailCalendar rep={detailRep} month={mensualMes} year={mensualAno} holidays={currentMonthHolidays} />
        </div>
      </div>
    );
  }

  const renderMonthlyView = () => {
    const monthIndex = mensualMes;
    const year = mensualAno;
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    
    let dailyCounts: number[] = Array(daysInMonth).fill(0);
    
    const totalsByRep = reps.reduce((acc, rep) => {
        acc[rep.id] = { Ausencia: 0, Tardanza: 0, Error: 0, Celular: 0, Otros: 0, puntos: 0 };
        return acc;
    }, {} as Record<string, { Ausencia: number, Tardanza: number, Error: number, Celular: number, Otros: number, puntos: number }>);
    
    let totalPermissions = 0;
    const repsOnVacation = new Set<string>();
    const repsOnLicense = new Set<string>();
    const monthStart = startOfMonth(new Date(year, monthIndex));
    const monthEnd = endOfMonth(new Date(year, monthIndex));

    Object.values(vacations).flat().forEach(vac => {
        const vacStart = new Date(vac.inicio + 'T00:00:00');
        const vacEnd = new Date(vac.fin + 'T00:00:00');
        if (isWithinInterval(vacStart, { start: monthStart, end: monthEnd }) || isWithinInterval(vacEnd, { start: monthStart, end: monthEnd }) || isWithinInterval(monthStart, { start: vacStart, end: vacEnd })) {
            repsOnVacation.add(vac.repId);
        }
    });

    Object.values(licenses).flat().forEach(lic => {
        const licStart = new Date(lic.inicio + 'T00:00:00');
        const licEnd = new Date(lic.fin + 'T00:00:00');
        if (isWithinInterval(licStart, { start: monthStart, end: monthEnd }) || isWithinInterval(licEnd, { start: monthStart, end: monthEnd }) || isWithinInterval(monthStart, { start: licStart, end: licEnd })) {
            repsOnLicense.add(lic.repId);
        }
    });

    Object.entries(incidencias).forEach(([date, arr]) => {
        const d = new Date(date + "T00:00:00");
        if (d.getFullYear() === year && d.getMonth() === monthIndex) {
            dailyCounts[d.getDate() - 1] += arr.length;
            
            arr.forEach(item => {
                if (!totalsByRep[item.repId]) return;
                
                if (INCIDENT_CONFIG[item.tipo].type === 'punitive') {
                    const key = item.tipo as 'Ausencia' | 'Tardanza' | 'Error' | 'Celular' | 'OtroPuntos';
                    if (key in totalsByRep[item.repId]) {
                      const castKey = key === 'OtroPuntos' ? 'Otros' : key;
                      totalsByRep[item.repId][castKey] = (totalsByRep[item.repId][castKey] || 0) + 1;
                    }
                     const dateObj = new Date(item.fecha + 'T00:00:00');
                     const dayOfWeek = getDay(dateObj); // 0 for Sunday, 6 for Saturday
                     const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;

                    const incidentConfig = INCIDENT_CONFIG[item.tipo];
                     totalsByRep[item.repId].puntos += calculatePoints({
                        basePoints: incidentConfig?.variablePoints ? item.puntos : (incidentConfig?.points || 0),
                        incidentType: item.tipo,
                        isWeekend: isWeekend,
                        isPunitive: incidentConfig?.type === 'punitive',
                        isVariable: !!incidentConfig?.variablePoints,
                    });
                }
                
                if (item.tipo === 'Permiso') totalPermissions++;
            });
        }
    });

    const chartData = dailyCounts.map((count, i) => ({ name: i + 1, Incidencias: count }));

    const alertedReps = Object.entries(totalsByRep).filter(([_, vals]) => 
      (vals.Ausencia || 0) >= ALERT_THRESHOLDS.Ausencia ||
      (vals.Error || 0) >= ALERT_THRESHOLDS.Error ||
      (vals.Tardanza || 0) >= ALERT_THRESHOLDS.Tardanza ||
      (vals.puntos || 0) >= ALERT_THRESHOLDS.Puntos
    );
    
    const monthKey = format(new Date(mensualAno, mensualMes), 'yyyy-MM');
    const config = monthConfigs[monthKey];
    const isMonthClosed = config?.cierre ?? false;
    let gracePeriodInfo = '';
    if (isMonthClosed && config.closedAt) {
        const closedDate = new Date(config.closedAt);
        const gracePeriodEndDate = addDays(closedDate, config.gracePeriodDays);
        const now = new Date();
        if (now <= gracePeriodEndDate) {
            const daysLeft = differenceInDays(gracePeriodEndDate, now);
            gracePeriodInfo = `(Período de gracia activo, ${daysLeft} día(s) restante(s))`;
        } else {
            gracePeriodInfo = '(Período de gracia finalizado)';
        }
    }
    
    const selectedHolidays = useMemo(() => {
      if (!config?.feriados) return [];
      const currentYear = getYear(new Date(mensualAno, mensualMes));
      const currentMonth = getMonth(new Date(mensualAno, mensualMes));
      
      return config.feriados.map(day => new Date(currentYear, currentMonth, parseInt(day)));
    }, [config?.feriados, mensualAno, mensualMes]);


    return (
      <section id="tab-mensual" className={activeTab === 'mensual' ? '' : 'hidden'}>
        <div className="glass p-6">
            <div className="mb-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <h2 className="text-xl font-bold">Vista Mensual</h2>
                    <div className="flex items-center gap-3">
                        <select className="pill" value={mensualMes} onChange={e => setMensualMes(Number(e.target.value))}>
                            {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((m, i) => <option key={i} value={i}>{m}</option>)}
                        </select>
                        <input type="number" className="pill w-[100px]" value={mensualAno} onChange={e => setMensualAno(Number(e.target.value))} />
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div>
                        <label className="block text-sm mb-1 text-text-secondary">Días Feriados del Mes</label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={isMonthClosed}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    <span>{selectedHolidays.length > 0 ? `${selectedHolidays.length} día(s) seleccionado(s)` : "Seleccionar feriados"}</span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="multiple"
                                    selected={selectedHolidays}
                                    onSelect={(dates) => handleHolidaysChange(dates as Date[] | undefined)}
                                    month={startOfMonth(new Date(mensualAno, mensualMes))}
                                    locale={es}
                                    disabled={isMonthClosed}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={handleCloseMonth} disabled={isMonthClosed} variant="destructive">
                            {isMonthClosed ? <Lock className="mr-2"/> : <Unlock className="mr-2"/>}
                            {isMonthClosed ? 'Mes Cerrado' : 'Cerrar Mes'}
                        </Button>
                    </div>
                </div>
                
                {isMonthClosed && <p className="w-full text-center text-sm text-yellow-500 font-semibold">{gracePeriodInfo}</p>}
            </div>

            <div className="grid lg:grid-cols-3 gap-6 mb-6">
                <div className="lg:col-span-2 glass p-4">
                    <h3 className="font-semibold mb-4">Tendencia Diaria (Total Incidencias)</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={'hsla(var(--border))'} />
                            <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                            <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}/>
                            <Bar dataKey="Incidencias" fill={'hsl(var(--destructive))'} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="glass p-4">
                    <h3 className="font-semibold mb-4">Resumen Administrativo y Alertas</h3>
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold mb-2 text-primary">Resumen Administrativo</h4>
                        <div className="flex justify-between items-center"><span className="text-sm">Personas con Vacaciones:</span><span className="font-bold text-lg text-text-secondary">{repsOnVacation.size}</span></div>
                        <div className="flex justify-between items-center"><span className="text-sm">Personas con Licencia:</span><span className="font-bold text-lg text-text-secondary">{repsOnLicense.size}</span></div>
                        <div className="flex justify-between items-center"><span className="text-sm">Total Permisos:</span><span className="font-bold text-lg text-text-secondary">{totalPermissions}</span></div>
                        
                        <h4 className="text-sm font-semibold mt-4 mb-2 text-destructive">Representantes en Alerta</h4>
                        {alertedReps.length === 0 ? <p className="text-xs text-text-secondary">No hay alertas activas</p> :
                        alertedReps.map(([repId, vals]) => {
                            const rep = reps.find(r => r.id === repId);
                            if (!rep) return null;
                            let alertReason = '';
                            if ((vals.puntos || 0) >= ALERT_THRESHOLDS.Puntos) alertReason += `Puntos: ${vals.puntos} / `;
                            if ((vals.Ausencia || 0) >= ALERT_THRESHOLDS.Ausencia) alertReason += `Ausencias: ${vals.Ausencia} / `;
                            if ((vals.Error || 0) >= ALERT_THRESHOLDS.Error) alertReason += `Errores: ${vals.Error} / `;
                            if ((vals.Tardanza || 0) >= ALERT_THRESHOLDS.Tardanza) alertReason += `Tardanzas: ${vals.Tardanza} / `;

                            return (
                                <div key={repId} className="p-2 border-destructive/50 border rounded-lg bg-destructive/10">
                                    <div className="font-semibold text-destructive">{rep.nombre}</div>
                                    <div className="text-xs text-muted-foreground">Motivo: {alertReason.slice(0, -3)}</div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
            <div className="glass p-4">
              <h3 className="font-semibold mb-4">Totales por Representante</h3>
              <div className="overflow-x-auto custom-scroll border border-border rounded-lg">
                  <table className="w-full min-w-[800px]">
                      <thead>
                          <tr>
                            <th className="w-1/3 text-left p-2">Nombre</th>
                            <th className="text-left p-2">Turno</th>
                            <th className="text-center p-2">Ausencias</th>
                            <th className="text-center p-2">Tardanzas</th>
                            <th className="text-center p-2">Errores</th>
                            <th className="text-center p-2">Puntos</th>
                            <th className="text-center p-2">Estado</th>
                            <th className="text-center p-2">Acciones</th>
                          </tr>
                      </thead>
                      <tbody>
                          {reps.length === 0 ? (
                              <tr><td colSpan={8} className="text-center text-text-secondary p-4">No hay representantes registrados</td></tr>
                          ) : (
                              reps.map((r) => {
                                  const vals = totalsByRep[r.id];
                                  if (!vals) return null;
                                  const hasAlert = (vals.Ausencia || 0) >= ALERT_THRESHOLDS.Ausencia || (vals.Error || 0) >= ALERT_THRESHOLDS.Error || (vals.Tardanza || 0) >= ALERT_THRESHOLDS.Tardanza || (vals.puntos || 0) >= ALERT_THRESHOLDS.Puntos;
                                  return (
                                      <tr key={r.id}>
                                          <td className="p-2">{r.nombre}</td>
                                          <td className="p-2">{r.turnoBase}{r.esMixto ? ' (Mixto)' : ''}</td>
                                          <td className="text-center p-2">{vals.Ausencia || 0}</td>
                                          <td className="text-center p-2">{vals.Tardanza || 0}</td>
                                          <td className="text-center p-2">{vals.Error || 0}</td>
                                          <td className={`text-center font-bold p-2`} style={{color: hasAlert ? 'hsl(var(--destructive))' : 'hsl(var(--success))'}}>{vals.puntos || 0}</td>
                                          <td className="p-2">
                                            <div className="flex justify-center">
                                                {hasAlert ? <span className="alert-badge">ALERTA</span> : <span className="text-xs text-text-secondary">OK</span>}
                                            </div>
                                          </td>
                                           <td className="text-center p-2">
                                                <Button variant="ghost" size="sm" onClick={() => openDetailModal(r)}>
                                                    <Eye className="w-4 h-4 mr-2"/>
                                                    Ver Detalles
                                                </Button>
                                          </td>
                                      </tr>
                                  )
                              })
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
        </div>
      </section>
    );
  };
  
  const renderHistory = () => {
    return (
      <section id="tab-historial" className={activeTab === 'historial' ? '' : 'hidden'}>
        <div className="glass p-6">
          <h2 className="text-xl font-bold mb-4">Búsqueda en Historial</h2>
          <div className="flex gap-3 mb-6 flex-wrap">
            <input 
              type="text"
              placeholder="Buscar por nombre, fecha (YYYY-MM-DD) o comentario..." 
              className="flex-1 min-w-[200px]"
              value={histSearch}
              onChange={e => setHistSearch(e.target.value)}
            />
            <select className="pill min-w-[150px]" value={histTipoFilter} onChange={e => setHistTipoFilter(e.target.value)}>
              <option value="">Todo Tipo</option>
              {Object.entries(INCIDENT_CONFIG).map(([key, {label}]) => <option key={key} value={key}>{label}</option>)}
            </select>
            <button onClick={() => { setHistSearch(''); setHistTipoFilter(''); }} className="pill">Limpiar</button>
          </div>
          <div className="space-y-3 custom-scroll max-h-[500px] overflow-y-auto">
            {histResults.length === 0 ? <p className="text-sm text-text-secondary">Sin resultados</p> : 
              histResults.map((r, index) => {
                  const badgeClass = INCIDENT_CONFIG[r.tipo as IncidentTypeKey]?.badge || '';
                  const tipoLabel = INCIDENT_CONFIG[r.tipo as IncidentTypeKey]?.label.split(' ')[0] || r.tipo;
                  return (
                      <div key={`${r.id}-${r.date}-${index}`} className="glass p-4">
                          <div className="flex items-start justify-between mb-2">
                              <div>
                                  <div className="font-semibold">{r.rep}</div>
                                  <div className="text-xs text-text-secondary">{r.turno}</div>
                              </div>
                              <div className="text-sm text-text-secondary">{r.date}</div>
                          </div>
                          <div className="flex items-center gap-2">
                              <span className={`incident-badge ${badgeClass}`}>{tipoLabel}</span>
                              {r.puntos > 0 && <span className="text-xs font-bold text-destructive">({r.puntos} pts)</span>}
                              {r.comentario && <span className="text-sm text-text-secondary">· {r.comentario}</span>}
                          </div>
                      </div>
                  );
              })
            }
          </div>
        </div>
      </section>
    );
  };
  
  const renderSchedule = () => {
    const weekId = getWeekIdentifier(new Date());

    const ScheduleTable = ({ repsToShow, title, shiftType }: { repsToShow: Representative[], title: string, shiftType: Shift }) => {
        if (repsToShow.length === 0) return null;
        return (
            <div className="mb-8">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold">{title}</h3>
                    <div className="text-sm text-text-secondary bg-muted px-2 py-1 rounded-md">{repsToShow.length} reps</div>
                </div>
                <div className="overflow-x-auto custom-scroll border border-border rounded-lg">
                    <table className="w-full min-w-[800px]">
                        <thead className='bg-muted/50'>
                            <tr>
                                <th className="w-1/4 text-left p-2 font-semibold">Representante</th>
                                {days.map(day => <th key={day} className="capitalize text-center p-2 font-semibold">{day.substring(0, 3)}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {repsToShow.map(rep => {
                                return (
                                    <tr key={rep.id} className='border-b last:border-b-0'>
                                        <td className="p-1 font-medium flex items-center justify-between">
                                            <span>{rep.nombre}</span>
                                        </td>
                                        {days.map(day => {
                                            if (!diarioFecha) return null;
                                            const dayDate = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), days.indexOf(day));
                                            const assignment = memoizedGetRepDailyAssignment(rep, dayDate);
                                            const worksThisShift = (shiftType === 'Día' && assignment.worksDay) || (shiftType === 'Noche' && assignment.worksNight);
                                            const weeklyOverride = weeklyOverrides[weekId]?.[rep.id]?.[day];
                                            const hasOverride = weeklyOverride !== undefined;

                                            return (
                                                <td key={day} className="text-center p-1 relative group">
                                                    <button
                                                        onClick={() => toggleWorkDay(rep.id, day)}
                                                        className={cn(
                                                            "w-full h-10 rounded-md transition-all text-white font-semibold text-xs px-1 relative",
                                                            worksThisShift 
                                                                ? 'bg-green-500 hover:bg-green-600' 
                                                                : 'bg-slate-400 hover:bg-slate-500',
                                                            hasOverride && 'ring-2 ring-blue-500 ring-offset-1 shadow-md',
                                                            'hover:scale-105'
                                                        )}
                                                        title={hasOverride 
                                                            ? `Modificado temporalmente (click para revertir)` 
                                                            : `Horario base (click para modificar)`
                                                        }
                                                    >
                                                        <span>{worksThisShift ? '✓' : '✗'}</span>
                                                        {hasOverride && (
                                                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                                                        )}
                                                    </button>
                                                </td>
                                            )
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    const dayShiftReps = reps.filter(r => r.turnoBase === 'Día' || r.esMixto);
    const nightShiftReps = reps.filter(r => r.turnoBase === 'Noche' || r.esMixto);

    return (
        <section id="tab-planificacion" className={activeTab === 'planificacion' ? '' : 'hidden'}>
            <div className="glass p-6">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <h2 className="text-xl font-bold">Planificación Semanal</h2>
                        <p className="text-sm text-text-secondary">
                            Click para modificar temporalmente el horario. Los cambios solo aplican a esta semana.
                        </p>
                    </div>
                    <Button 
                        onClick={() => {
                            if (!confirm('¿Revertir todos los cambios temporales de esta semana?')) return;
                            const weekId = getWeekIdentifier(new Date());
                            setWeeklyOverrides(prev => {
                                const newOverrides = { ...prev };
                                delete newOverrides[weekId];
                                return newOverrides;
                            });
                            showToast('Cambios revertidos', 'success');
                        }}
                        variant="outline"
                    >
                        <Undo2 className="w-4 h-4 mr-2" />
                        Revertir Cambios
                    </Button>
                </div>
                
                 <div className="glass p-4 mb-4">
                    <h4 className="font-semibold mb-3 text-sm">Leyenda:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded bg-green-500 flex items-center justify-center text-white font-bold">✓</div>
                            <span>Día laboral</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded bg-slate-400 flex items-center justify-center text-white font-bold">✗</div>
                            <span>Día libre</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded bg-green-500 ring-2 ring-blue-500 ring-offset-1 flex items-center justify-center text-white font-bold relative">
                                ✓
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
                            </div>
                            <span>Modificado temporalmente</span>
                        </div>
                    </div>
                </div>

                <ScheduleTable repsToShow={dayShiftReps} title="Turno Diurno" shiftType="Día" />
                <ScheduleTable repsToShow={nightShiftReps} title="Turno Nocturno" shiftType="Noche" />
            </div>
        </section>
    );
};

const renderAuditLog = () => {
    const filteredLog = auditLog.filter(entry => {
        const searchTerm = auditSearch.toLowerCase();
        const actionMatch = auditActionFilter ? entry.action === auditActionFilter : true;
        
        const metaValues = Object.values(entry.meta).join(' ').toLowerCase();

        const searchMatch = !searchTerm ||
            entry.action.toLowerCase().includes(searchTerm) ||
            (entry.actor && entry.actor.toLowerCase().includes(searchTerm)) ||
            metaValues.includes(searchTerm);
        
        return actionMatch && searchMatch;
    });

    const uniqueActions = [...new Set(auditLog.map(e => e.action))];

    return (
        <section id="tab-audit" className={activeTab === 'audit' ? '' : 'hidden'}>
            <div className="glass p-6">
                <h2 className="text-xl font-bold mb-4">Log de Auditoría</h2>
                <div className="flex gap-3 mb-6 flex-wrap">
                    <input
                        type="text"
                        placeholder="Buscar en el log..."
                        className="flex-1 min-w-[200px]"
                        value={auditSearch}
                        onChange={e => setAuditSearch(e.target.value)}
                    />
                    <select
                        className="pill min-w-[150px]"
                        value={auditActionFilter}
                        onChange={e => setAuditActionFilter(e.target.value)}
                    >
                        <option value="">Toda Acción</option>
                        {uniqueActions.map(action => (
                            <option key={action} value={action}>{action}</option>))}
                    </select>
                    <button onClick={() => { setAuditSearch(''); setAuditActionFilter(''); }} className="pill">Limpiar</button>
                </div>
                <div className="space-y-3 custom-scroll max-h-[60vh] overflow-y-auto">
                    {filteredLog.length === 0 ? <p className="text-sm text-text-secondary">No hay entradas en el log.</p> :
                        filteredLog.map(entry => (
                            <div key={entry.id} className="glass p-4 text-sm">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="font-semibold text-primary">{entry.action}</span> por <span className="font-semibold">{entry.actor}</span>
                                    </div>
                                    <div className="text-xs text-text-secondary">{format(new Date(entry.timestamp), "Pp", { locale: es })}</div>
                                </div>
                                <div className="text-xs text-text-secondary mt-1">
                                    <pre className="whitespace-pre-wrap font-sans bg-muted p-2 rounded-md">
                                        {JSON.stringify(entry.meta, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        ))
                    }
                </div>
            </div>
        </section>
    );
};


  // --- 6. Main Render ---
  return (
    <div>
        {renderToastContainer()}
        <header className="glass p-4 lg:p-6 mb-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold mb-2">Control de Incidencias</h1>
                <p className="text-sm text-text-secondary">
                Call Center
                </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center space-x-2">
                    <Shield className={cn("w-5 h-5", activeRole === 'Gerencia' ? 'text-red-500' : 'text-gray-400')} />
                    <Label htmlFor="role-switch" className="text-sm font-medium">
                        {activeRole}
                    </Label>
                    <Switch
                        id="role-switch"
                        checked={activeRole === 'Gerencia'}
                        onCheckedChange={(checked) => setActiveRole(checked ? 'Gerencia' : 'Supervisor')}
                    />
                </div>
                <label htmlFor="import-file" className="pill flex items-center gap-2 cursor-pointer">
                    <Upload className="w-4 h-4" />
                    Importar
                </label>
                <input type="file" id="import-file" className="hidden" accept=".json" onChange={handleImport}/>

                <button onClick={handleExport} className="pill flex items-center gap-2">
                <Download className="w-4 h-4" />
                Exportar
                </button>
                <button onClick={openNewRepModal} className="btn-primary flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Añadir Rep.
                </button>                 {activeRole === 'Gerencia' && (
                    <Button onClick={() => setResetModalOpen(true)} variant="destructive" className="flex items-center gap-2">
                        <RotateCcw className="w-4 h-4" />
                        Reiniciar Todo
                    </Button>
                )}
            </div>
            </div>
        </header>

        <nav className="flex gap-3 mb-6 flex-wrap">
            <button className={`pill tab-btn ${activeTab === 'diario' ? 'tab-active' : ''}`} onClick={() => setActiveTab('diario')}>
                <CalendarDays className="w-4 h-4 inline mr-2" /> Registro Diario
            </button>
            <button className={`pill tab-btn ${activeTab === 'planificacion' ? 'tab-active' : ''}`} onClick={() => setActiveTab('planificacion')}>
                <Users className="w-4 h-4 inline mr-2" /> Planificación
            </button>
            <button className={`pill tab-btn ${activeTab === 'mensual' ? 'tab-active' : ''}`} onClick={() => setActiveTab('mensual')}>
                <BarChart3 className="w-4 h-4 inline mr-2" /> Vista Mensual
            </button>
            <button className={`pill tab-btn ${activeTab === 'historial' ? 'tab-active' : ''}`} onClick={() => setActiveTab('historial')}>
                <Search className="w-4 h-4 inline mr-2" /> Historial
            </button>
            {activeRole === 'Gerencia' && (
              <button className={`pill tab-btn ${activeTab === 'audit' ? 'tab-active' : ''}`} onClick={() => setActiveTab('audit')}>
                  <FileText className="w-4 h-4 inline mr-2" /> Auditoría
              </button>
            )}
        </nav>

        <div className={cn(
          "grid gap-6",
          ['diario', 'planificacion'].includes(activeTab) ? "lg:grid-cols-4" : "lg:grid-cols-1"
        )}>
            {['diario', 'planificacion'].includes(activeTab) && (
              <aside className="lg:col-span-1">
                <div className="glass p-4">
                    <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-lg">Representantes</h2>
                    <span className="text-sm text-text-secondary">{reps.length}</span>
                    </div>
                    <input 
                    type="text"
                    placeholder="Buscar representante..." 
                    className="w-full mb-4"
                    value={quickSearch}
                    onChange={(e) => setQuickSearch(e.target.value)}
                    />
                    <div className="space-y-2 custom-scroll max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
                        {renderRepList()}
                    </div>
                </div>
              </aside>
            )}

            <main className={cn(['diario', 'planificacion'].includes(activeTab) ? "lg:col-span-3" : "lg:col-span-4")}>
                {renderDailyLog()}
                {renderSchedule()}
                {renderMonthlyView()}
                {renderHistory()}
                {renderAuditLog()}
            </main>
        </div>
        
        {isRepModalOpen && renderRepModal()}
        {isShiftChangeModalOpen && renderShiftChangeModal()}
        {renderBulkActions()}
        {isDetailModalOpen && renderMonthlyDetailModal()}
        {renderResetConfirmModal()}
    </div>
  );
}
