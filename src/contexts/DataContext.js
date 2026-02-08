/**
 * Data Context - Gestão centralizada de dados com persistência local
 * Gere: Funcionários, Tarefas, Escalas, Pedidos de Troca, Notificações, Banco de Horas
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { mockEmployees as initialEmployees, mockTasks as initialTasks, mockSwapRequests as initialSwaps } from '@/data/mockData';

const DataContext = createContext();

// Chaves do localStorage
const STORAGE_KEYS = {
    EMPLOYEES: 'villamar_employees',
    TASKS: 'villamar_tasks',
    SWAPS: 'villamar_swaps',
    NOTIFICATIONS: 'villamar_notifications',
    TIME_RECORDS: 'villamar_time_records',
    ACTIVE_SESSIONS: 'villamar_active_sessions',
    SCHEDULES: 'villamar_schedules',
};

export function DataProvider({ children }) {
    // Estados principais
    const [employees, setEmployees] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [swapRequests, setSwapRequests] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [timeRecords, setTimeRecords] = useState([]); // Histórico de horas
    const [activeSessions, setActiveSessions] = useState({}); // Sessões ativas { empId: { startTime, ... } }
    const [savedSchedules, setSavedSchedules] = useState({}); // Escalas salvas { 'YYYY-MM': scheduleData }
    const [isHydrated, setIsHydrated] = useState(false);

    // Hidratar dados do localStorage no cliente
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedEmployees = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
            const savedTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
            const savedSwaps = localStorage.getItem(STORAGE_KEYS.SWAPS);
            const savedNotifications = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
            const savedTimeRecords = localStorage.getItem(STORAGE_KEYS.TIME_RECORDS);
            const savedActiveSessions = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSIONS);

            setEmployees(savedEmployees ? JSON.parse(savedEmployees) : initialEmployees);
            setTasks(savedTasks ? JSON.parse(savedTasks) : initialTasks);
            setSwapRequests(savedSwaps ? JSON.parse(savedSwaps) : initialSwaps);
            setNotifications(savedNotifications ? JSON.parse(savedNotifications) : []);
            setTimeRecords(savedTimeRecords ? JSON.parse(savedTimeRecords) : []);
            setActiveSessions(savedActiveSessions ? JSON.parse(savedActiveSessions) : {});

            const savedSchedulesData = localStorage.getItem(STORAGE_KEYS.SCHEDULES);
            setSavedSchedules(savedSchedulesData ? JSON.parse(savedSchedulesData) : {});

            setIsHydrated(true);
        }
    }, []);

    // Persistir dados quando mudam
    useEffect(() => {
        if (isHydrated && typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
        }
    }, [employees, isHydrated]);

    useEffect(() => {
        if (isHydrated && typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
        }
    }, [tasks, isHydrated]);

    useEffect(() => {
        if (isHydrated && typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEYS.SWAPS, JSON.stringify(swapRequests));
        }
    }, [swapRequests, isHydrated]);

    useEffect(() => {
        if (isHydrated && typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
        }
    }, [notifications, isHydrated]);

    useEffect(() => {
        if (isHydrated && typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEYS.TIME_RECORDS, JSON.stringify(timeRecords));
        }
    }, [timeRecords, isHydrated]);

    useEffect(() => {
        if (isHydrated && typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSIONS, JSON.stringify(activeSessions));
        }
    }, [activeSessions, isHydrated]);

    useEffect(() => {
        if (isHydrated && typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(savedSchedules));
        }
    }, [savedSchedules, isHydrated]);

    // === TIME TRACKING / BANCO DE HORAS ===

    // Registar entrada
    const clockIn = useCallback((employeeId) => {
        const now = new Date().toISOString();
        setActiveSessions(prev => ({
            ...prev,
            [employeeId]: {
                startTime: now,
                employeeId,
            }
        }));

        // Atualizar status do employee
        setEmployees(prev => prev.map(emp =>
            emp.id === employeeId ? { ...emp, status: 'present', clockIn: now } : emp
        ));

        const emp = employees.find(e => e.id === employeeId);
        addNotification({
            type: 'clock_in',
            title: 'Entrada Registada',
            message: `${emp?.name || 'Funcionário'} registou entrada.`,
            forAdmin: true,
        });
    }, [employees]);

    // Registar saída
    const clockOut = useCallback((employeeId) => {
        const session = activeSessions[employeeId];
        if (!session) return null;

        const now = new Date();
        const startTime = new Date(session.startTime);
        const durationMs = now - startTime;
        const durationMinutes = Math.floor(durationMs / 60000);

        // Criar registo de horas
        const record = {
            id: Date.now(),
            employeeId,
            date: now.toISOString().split('T')[0],
            startTime: session.startTime,
            endTime: now.toISOString(),
            durationMinutes,
        };

        setTimeRecords(prev => [...prev, record]);

        // Remover sessão ativa
        setActiveSessions(prev => {
            const newSessions = { ...prev };
            delete newSessions[employeeId];
            return newSessions;
        });

        // Atualizar status do employee
        setEmployees(prev => prev.map(emp =>
            emp.id === employeeId ? { ...emp, status: 'absent', clockIn: null, clockOut: now.toISOString() } : emp
        ));

        const emp = employees.find(e => e.id === employeeId);
        addNotification({
            type: 'clock_out',
            title: 'Saída Registada',
            message: `${emp?.name || 'Funcionário'} trabalhou ${formatDuration(durationMinutes)}.`,
            forAdmin: true,
        });

        return record;
    }, [activeSessions, employees]);

    // Verificar se funcionário está em serviço
    const isEmployeeClockedIn = (employeeId) => {
        return !!activeSessions[employeeId];
    };

    // Obter sessão ativa
    const getActiveSession = (employeeId) => {
        return activeSessions[employeeId] || null;
    };

    // Obter todas as sessões ativas
    const getAllActiveSessions = () => {
        return Object.values(activeSessions);
    };

    // Calcular total de horas de um funcionário
    const getTotalHours = (employeeId) => {
        const records = timeRecords.filter(r => r.employeeId === employeeId);
        const totalMinutes = records.reduce((sum, r) => sum + r.durationMinutes, 0);
        return {
            totalMinutes,
            hours: Math.floor(totalMinutes / 60),
            minutes: totalMinutes % 60,
            formatted: formatDuration(totalMinutes),
        };
    };

    // Obter registos de um funcionário
    const getTimeRecords = (employeeId) => {
        return timeRecords.filter(r => r.employeeId === employeeId);
    };

    // === NOTIFICATIONS ===
    const addNotification = useCallback((notification) => {
        const newNotif = {
            id: Date.now(),
            ...notification,
            read: false,
            createdAt: new Date().toISOString(),
        };
        setNotifications(prev => [newNotif, ...prev]);
        return newNotif;
    }, []);

    const markNotificationRead = (id) => {
        setNotifications(prev => prev.map(n =>
            n.id === id ? { ...n, read: true } : n
        ));
    };

    const markAllNotificationsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const clearNotifications = () => {
        setNotifications([]);
    };

    const getUnreadCount = () => {
        return notifications.filter(n => !n.read).length;
    };

    // === EMPLOYEES CRUD ===
    const addEmployee = (employee) => {
        const newEmployee = {
            ...employee,
            id: Date.now(),
            status: 'absent',
            clockIn: null,
            clockOut: null,
        };
        setEmployees(prev => [...prev, newEmployee]);
        addNotification({
            type: 'employee_added',
            title: 'Novo funcionário',
            message: `${newEmployee.name} foi adicionado à equipa.`,
            forAdmin: true,
        });
        return newEmployee;
    };

    const updateEmployee = (id, updates) => {
        setEmployees(prev => prev.map(emp =>
            emp.id === id ? { ...emp, ...updates } : emp
        ));
    };

    const removeEmployee = (id) => {
        const emp = employees.find(e => e.id === id);
        setEmployees(prev => prev.filter(emp => emp.id !== id));
        setTasks(prev => prev.filter(task => task.assignedTo !== id));
        if (emp) {
            addNotification({
                type: 'employee_removed',
                title: 'Funcionário removido',
                message: `${emp.name} foi removido da equipa.`,
                forAdmin: true,
            });
        }
    };

    const getEmployeeById = (id) => {
        return employees.find(emp => emp.id === id);
    };

    // === TASKS CRUD ===
    const addTask = (task) => {
        const newTask = {
            ...task,
            id: Date.now(),
            completed: false,
            photo: null,
            createdAt: new Date().toISOString(),
        };
        setTasks(prev => [...prev, newTask]);

        if (task.assignedTo) {
            const emp = employees.find(e => e.id === task.assignedTo);
            addNotification({
                type: 'task_assigned',
                title: 'Nova tarefa',
                message: `Tarefa "${newTask.title}" atribuída a ${emp?.name || 'funcionário'}.`,
                forEmployee: task.assignedTo,
                forAdmin: true,
            });
        }
        return newTask;
    };

    const updateTask = (id, updates) => {
        setTasks(prev => prev.map(task =>
            task.id === id ? { ...task, ...updates } : task
        ));
    };

    const removeTask = (id) => {
        setTasks(prev => prev.filter(task => task.id !== id));
    };

    const toggleTaskComplete = (id) => {
        const task = tasks.find(t => t.id === id);
        setTasks(prev => prev.map(t =>
            t.id === id ? { ...t, completed: !t.completed } : t
        ));
        if (task) {
            addNotification({
                type: 'task_completed',
                title: task.completed ? 'Tarefa reaberta' : 'Tarefa concluída',
                message: `"${task.title}" foi ${task.completed ? 'reaberta' : 'concluída'}.`,
                forAdmin: true,
            });
        }
    };

    const getTasksByEmployee = (employeeId) => {
        return tasks.filter(task => task.assignedTo === employeeId || !task.assignedTo);
    };

    const getTasksByDate = (dateStr) => {
        return tasks.filter(task => task.date === dateStr);
    };

    // === SWAP REQUESTS ===
    const addSwapRequest = (request) => {
        const newRequest = {
            ...request,
            id: Date.now(),
            status: 'pending',
            createdAt: new Date().toISOString(),
        };
        setSwapRequests(prev => [...prev, newRequest]);
        addNotification({
            type: 'swap_request',
            title: 'Pedido de Troca',
            message: `${request.requestor} solicitou troca de turno com ${request.swapWith}.`,
            forAdmin: true,
        });
        return newRequest;
    };

    const approveSwapRequest = (id) => {
        const request = swapRequests.find(r => r.id === id);
        setSwapRequests(prev => prev.map(r =>
            r.id === id ? { ...r, status: 'approved' } : r
        ));

        if (request) {
            // Atualizar a escala - trocar os turnos entre os dois funcionários
            const date = new Date(request.date);
            const year = date.getFullYear();
            const month = date.getMonth();
            const key = `${year}-${String(month + 1).padStart(2, '0')}`;

            setSavedSchedules(prev => {
                const current = prev[key];
                if (!current) return prev;

                const requestorSchedule = current.schedules[request.requestorId]?.[request.date];
                const swapWithSchedule = current.schedules[request.swapWithId]?.[request.date];

                if (!requestorSchedule || !swapWithSchedule) return prev;

                // Trocar os turnos
                const updatedSchedules = {
                    ...current.schedules,
                    [request.requestorId]: {
                        ...current.schedules[request.requestorId],
                        [request.date]: { ...swapWithSchedule }
                    },
                    [request.swapWithId]: {
                        ...current.schedules[request.swapWithId],
                        [request.date]: { ...requestorSchedule }
                    }
                };

                return {
                    ...prev,
                    [key]: {
                        ...current,
                        schedules: updatedSchedules,
                        lastModified: new Date().toISOString(),
                    }
                };
            });

            addNotification({
                type: 'swap_approved',
                title: 'Troca Aprovada ✓',
                message: `Troca entre ${request.requestor} e ${request.swapWith} foi aprovada. A escala foi atualizada.`,
                forAdmin: true,
                forEmployee: request.requestorId,
            });

            addNotification({
                type: 'swap_approved',
                title: 'Troca Aprovada ✓',
                message: `A sua troca com ${request.requestor} foi aprovada.`,
                forEmployee: request.swapWithId,
            });
        }
    };

    const rejectSwapRequest = (id) => {
        const request = swapRequests.find(r => r.id === id);
        setSwapRequests(prev => prev.map(r =>
            r.id === id ? { ...r, status: 'rejected' } : r
        ));
        if (request) {
            addNotification({
                type: 'swap_rejected',
                title: 'Troca Rejeitada',
                message: `Troca entre ${request.requestor} e ${request.swapWith} foi rejeitada.`,
                forAdmin: true,
                forEmployee: request.requestorId,
            });
        }
    };

    const getPendingSwaps = () => {
        return swapRequests.filter(r => r.status === 'pending');
    };

    // === SCHEDULES ===

    // Salvar escala gerada
    const saveSchedule = useCallback((year, month, scheduleData) => {
        const key = `${year}-${String(month + 1).padStart(2, '0')}`;
        setSavedSchedules(prev => ({
            ...prev,
            [key]: {
                ...scheduleData,
                savedAt: new Date().toISOString(),
            }
        }));
        addNotification({
            type: 'schedule_saved',
            title: 'Escala Guardada',
            message: `Escala de ${scheduleData.monthName} foi guardada.`,
            forAdmin: true,
        });
    }, []);

    // Obter escala de um mês
    const getScheduleForMonth = (year, month) => {
        const key = `${year}-${String(month + 1).padStart(2, '0')}`;
        return savedSchedules[key] || null;
    };

    // Atualizar turno de um funcionário num dia específico
    const updateShift = useCallback((year, month, employeeId, dateStr, newShift) => {
        const key = `${year}-${String(month + 1).padStart(2, '0')}`;
        setSavedSchedules(prev => {
            const current = prev[key];
            if (!current) return prev;

            const updatedSchedules = {
                ...current.schedules,
                [employeeId]: {
                    ...current.schedules[employeeId],
                    [dateStr]: {
                        shift: newShift,
                        hours: newShift === 'Manhã' ? '8h-16:30' : newShift === 'Tarde' ? '11:30-20h' : '',
                        isOff: newShift === 'Folga',
                    }
                }
            };

            return {
                ...prev,
                [key]: {
                    ...current,
                    schedules: updatedSchedules,
                    lastModified: new Date().toISOString(),
                }
            };
        });
    }, []);

    // Remover funcionário de um dia da escala
    const removeFromSchedule = useCallback((year, month, employeeId, dateStr) => {
        const key = `${year}-${String(month + 1).padStart(2, '0')}`;
        setSavedSchedules(prev => {
            const current = prev[key];
            if (!current || !current.schedules[employeeId]) return prev;

            const updatedEmpSchedule = { ...current.schedules[employeeId] };
            delete updatedEmpSchedule[dateStr];

            return {
                ...prev,
                [key]: {
                    ...current,
                    schedules: {
                        ...current.schedules,
                        [employeeId]: updatedEmpSchedule,
                    },
                    lastModified: new Date().toISOString(),
                }
            };
        });
    }, []);

    // === RESET ===
    const resetAllData = () => {
        setEmployees(initialEmployees);
        setTasks(initialTasks);
        setSwapRequests(initialSwaps);
        setNotifications([]);
        setTimeRecords([]);
        setActiveSessions({});
    };

    const value = {
        // Data
        employees,
        tasks,
        swapRequests,
        notifications,
        timeRecords,
        activeSessions,
        savedSchedules,
        isHydrated,

        // Employees
        addEmployee,
        updateEmployee,
        removeEmployee,
        getEmployeeById,

        // Tasks
        addTask,
        updateTask,
        removeTask,
        toggleTaskComplete,
        getTasksByEmployee,
        getTasksByDate,

        // Swaps
        addSwapRequest,
        approveSwapRequest,
        rejectSwapRequest,
        getPendingSwaps,

        // Notifications
        addNotification,
        markNotificationRead,
        markAllNotificationsRead,
        clearNotifications,
        getUnreadCount,

        // Time Tracking
        clockIn,
        clockOut,
        isEmployeeClockedIn,
        getActiveSession,
        getAllActiveSessions,
        getTotalHours,
        getTimeRecords,

        // Schedules
        saveSchedule,
        getScheduleForMonth,
        updateShift,
        removeFromSchedule,

        // Utils
        resetAllData,
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
}

// Helper function
function formatDuration(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}min`;
    return `${h}h ${m}min`;
}

export function useData() {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
}

export default DataContext;
