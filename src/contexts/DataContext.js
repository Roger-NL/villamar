/**
 * Data Context - Gestão centralizada de dados com persistência no Firebase (Fallback: LocalStorage)
 * Gere: Funcionários, Tarefas, Escalas, Pedidos de Troca, Notificações, Banco de Horas
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { mockEmployees as initialEmployees, mockTasks as initialTasks, mockSwapRequests as initialSwaps, taskCategories as initialTaskCategories } from '@/data/mockData';
import { db } from '@/config/firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDocs, writeBatch } from 'firebase/firestore';

const DataContext = createContext();

// Chaves do localStorage fallback
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
    const [timeRecords, setTimeRecords] = useState([]);
    const [activeSessions, setActiveSessions] = useState({});
    const [savedSchedules, setSavedSchedules] = useState({});
    const [isHydrated, setIsHydrated] = useState(false);

    // Initial Sync from LocalStorage or Firebase
    useEffect(() => {
        if (!db && typeof window !== 'undefined') {
            // FIREBASE NOT CONFIGURED: LOCALSTORAGE FALLBACK
            const savedEmployees = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
            const savedTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
            const savedSwaps = localStorage.getItem(STORAGE_KEYS.SWAPS);
            const savedNotifications = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
            const savedTimeRecords = localStorage.getItem(STORAGE_KEYS.TIME_RECORDS);
            const savedActiveSessions = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSIONS);
            const savedSchedulesData = localStorage.getItem(STORAGE_KEYS.SCHEDULES);

            let loadedEmployees = savedEmployees ? JSON.parse(savedEmployees) : initialEmployees;
            if (savedEmployees) {
                const existingIds = new Set(loadedEmployees.map(e => e.id));
                const newEmployees = initialEmployees.filter(e => !existingIds.has(e.id));
                if (newEmployees.length > 0) loadedEmployees = [...loadedEmployees, ...newEmployees];
                const adminsToUpdate = [13, 14, 15];
                loadedEmployees = loadedEmployees.map(emp => {
                    if (adminsToUpdate.includes(emp.id)) {
                        const original = initialEmployees.find(e => e.id === emp.id);
                        if (original) return { ...emp, role: original.role, name: original.name };
                    }
                    return emp;
                });
                loadedEmployees = loadedEmployees.filter(emp => ![7, 8, 10, 12].includes(emp.id));
            }

            setEmployees(loadedEmployees);
            setTasks(savedTasks ? JSON.parse(savedTasks) : initialTasks);
            setSwapRequests(savedSwaps ? JSON.parse(savedSwaps) : initialSwaps);
            setNotifications(savedNotifications ? JSON.parse(savedNotifications) : []);
            setTimeRecords(savedTimeRecords ? JSON.parse(savedTimeRecords) : []);
            setActiveSessions(savedActiveSessions ? JSON.parse(savedActiveSessions) : {});
            setSavedSchedules(savedSchedulesData ? JSON.parse(savedSchedulesData) : {});
            setIsHydrated(true);
        } else if (db) {
            // WITH FIREBASE
            const unsubEmployees = onSnapshot(collection(db, 'employees'), (snapshot) => {
                const items = snapshot.docs.map(doc => doc.data());
                // Seed if empty
                if (items.length === 0) { seedCollection('employees', initialEmployees); }
                else setEmployees(items);
            });
            const unsubTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
                const items = snapshot.docs.map(doc => doc.data());
                if (items.length === 0) seedCollection('tasks', initialTasks);
                else setTasks(items);
            });
            const unsubSwaps = onSnapshot(collection(db, 'swapRequests'), (snapshot) => {
                const items = snapshot.docs.map(doc => doc.data());
                if (items.length === 0 && initialSwaps.length > 0) seedCollection('swapRequests', initialSwaps);
                else setSwapRequests(items);
            });
            const unsubNotifications = onSnapshot(collection(db, 'notifications'), (snapshot) => {
                setNotifications(snapshot.docs.map(doc => doc.data()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
            });
            const unsubTimeRecords = onSnapshot(collection(db, 'timeRecords'), (snapshot) => {
                setTimeRecords(snapshot.docs.map(doc => doc.data()));
            });
            const unsubActiveSessions = onSnapshot(collection(db, 'activeSessions'), (snapshot) => {
                const sessions = {};
                snapshot.docs.forEach(doc => { sessions[doc.id] = doc.data(); });
                setActiveSessions(sessions);
            });
            const unsubSchedules = onSnapshot(collection(db, 'schedules'), (snapshot) => {
                const schedules = {};
                snapshot.docs.forEach(doc => { schedules[doc.id] = doc.data(); });
                setSavedSchedules(schedules);
            });

            setIsHydrated(true);

            return () => {
                unsubEmployees();
                unsubTasks();
                unsubSwaps();
                unsubNotifications();
                unsubTimeRecords();
                unsubActiveSessions();
                unsubSchedules();
            };
        }
    }, []);

    // Helper para DB Write (Firebase fallback to LocalStorage)
    const writeDB = async (collectionName, docId, data, isMerge = true) => {
        if (db) {
            const docRef = doc(db, collectionName, docId.toString());
            await setDoc(docRef, data, { merge: isMerge });
        } else {
            // Fallbacks logic are handled in the specific useEffect hooks below
        }
    };

    const deleteDB = async (collectionName, docId) => {
        if (db) {
            await deleteDoc(doc(db, collectionName, docId.toString()));
        }
    };

    const seedCollection = async (collectionName, items) => {
        if (!db) return;
        const batch = writeBatch(db);
        items.forEach(item => {
            const docRef = doc(db, collectionName, item.id.toString());
            batch.set(docRef, item);
        });
        await batch.commit();
    };

    // Keep Local Storage active ONLY if no DB
    useEffect(() => {
        if (!db && isHydrated && typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
            localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
            localStorage.setItem(STORAGE_KEYS.SWAPS, JSON.stringify(swapRequests));
            localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
            localStorage.setItem(STORAGE_KEYS.TIME_RECORDS, JSON.stringify(timeRecords));
            localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSIONS, JSON.stringify(activeSessions));
            localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(savedSchedules));
        }
    }, [employees, tasks, swapRequests, notifications, timeRecords, activeSessions, savedSchedules, isHydrated]);


    // === TIME TRACKING / BANCO DE HORAS ===
    const clockIn = useCallback(async (employeeId) => {
        const now = new Date().toISOString();
        const sessionData = { startTime: now, employeeId };

        if (!db) {
            setActiveSessions(prev => ({ ...prev, [employeeId]: sessionData }));
            setEmployees(prev => prev.map(emp => emp.id === employeeId ? { ...emp, status: 'present', clockIn: now } : emp));
        } else {
            await writeDB('activeSessions', employeeId, sessionData);
            await writeDB('employees', employeeId, { status: 'present', clockIn: now });
        }

        const emp = employees.find(e => e.id === employeeId);
        addNotification({
            type: 'clock_in', title: 'Entrada Registada', message: `${emp?.name || 'Funcionário'} registou entrada.`, forAdmin: true,
        });
    }, [employees, activeSessions]); // activeSessions included so fallback works

    const clockOut = useCallback(async (employeeId) => {
        const session = activeSessions[employeeId];
        if (!session) return null;

        const now = new Date();
        const startTime = new Date(session.startTime);
        const durationMs = now - startTime;
        const durationMinutes = Math.floor(durationMs / 60000);

        const record = {
            id: Date.now(),
            employeeId,
            date: now.toISOString().split('T')[0],
            startTime: session.startTime,
            endTime: now.toISOString(),
            durationMinutes,
        };

        if (!db) {
            setTimeRecords(prev => [...prev, record]);
            setActiveSessions(prev => { const newSessions = { ...prev }; delete newSessions[employeeId]; return newSessions; });
            setEmployees(prev => prev.map(emp => emp.id === employeeId ? { ...emp, status: 'absent', clockIn: null, clockOut: now.toISOString() } : emp));
        } else {
            await writeDB('timeRecords', record.id, record);
            await deleteDB('activeSessions', employeeId);
            await writeDB('employees', employeeId, { status: 'absent', clockIn: null, clockOut: now.toISOString() });
        }

        const emp = employees.find(e => e.id === employeeId);
        addNotification({
            type: 'clock_out', title: 'Saída Registada', message: `${emp?.name || 'Funcionário'} trabalhou ${formatDuration(durationMinutes)}.`, forAdmin: true,
        });

        return record;
    }, [activeSessions, employees]);

    const isEmployeeClockedIn = (employeeId) => !!activeSessions[employeeId];
    const getActiveSession = (employeeId) => activeSessions[employeeId] || null;
    const getAllActiveSessions = () => Object.values(activeSessions);

    const getTotalHours = (employeeId) => {
        const records = timeRecords.filter(r => r.employeeId === employeeId);
        const totalMinutes = records.reduce((sum, r) => sum + r.durationMinutes, 0);
        return { totalMinutes, hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60, formatted: formatDuration(totalMinutes) };
    };

    const getTimeRecords = (employeeId) => timeRecords.filter(r => r.employeeId === employeeId);

    // === NOTIFICATIONS ===
    const addNotification = useCallback(async (notification) => {
        const newNotif = { id: Date.now(), ...notification, read: false, createdAt: new Date().toISOString() };
        if (!db) setNotifications(prev => [newNotif, ...prev]);
        else await writeDB('notifications', newNotif.id, newNotif);
        return newNotif;
    }, []);

    const markNotificationRead = async (id) => {
        if (!db) setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        else await writeDB('notifications', id, { read: true });
    };

    const markAllNotificationsRead = async () => {
        if (!db) setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        else {
            notifications.forEach(async n => {
                if (!n.read) await writeDB('notifications', n.id, { read: true });
            });
        }
    };

    const clearNotifications = async () => {
        if (!db) setNotifications([]);
        else {
            notifications.forEach(async n => { await deleteDB('notifications', n.id); });
        }
    };

    const getUnreadCount = () => notifications.filter(n => !n.read).length;

    // === EMPLOYEES CRUD ===
    const addEmployee = async (employee) => {
        const pin = Math.floor(1000 + Math.random() * 9000).toString();
        const newEmployee = { ...employee, id: Date.now(), status: 'absent', clockIn: null, clockOut: null, pin };
        if (!db) setEmployees(prev => [...prev, newEmployee]);
        else await writeDB('employees', newEmployee.id, newEmployee);

        addNotification({ type: 'employee_added', title: 'Novo funcionário', message: `${newEmployee.name} foi adicionado à equipa.`, forAdmin: true });
        return newEmployee;
    };

    const updateEmployee = async (id, updates) => {
        if (!db) setEmployees(prev => prev.map(emp => emp.id === id ? { ...emp, ...updates } : emp));
        else await writeDB('employees', id, updates);
    };

    const removeEmployee = async (id) => {
        const emp = employees.find(e => e.id === id);
        if (!db) {
            setEmployees(prev => prev.filter(e => e.id !== id));
            setTasks(prev => prev.filter(t => t.assignedTo !== id));
        } else {
            await deleteDB('employees', id);
            tasks.filter(t => t.assignedTo === id).forEach(async t => { await deleteDB('tasks', t.id); });
        }
        if (emp) addNotification({ type: 'employee_removed', title: 'Funcionário removido', message: `${emp.name} foi removido da equipa.`, forAdmin: true });
    };

    const getEmployeeById = (id) => employees.find(emp => emp.id === id);

    // === TASKS CRUD ===
    const addTask = async (task) => {
        const newTask = { ...task, id: Date.now(), completed: false, photo: null, createdAt: new Date().toISOString() };
        if (!db) setTasks(prev => [...prev, newTask]);
        else await writeDB('tasks', newTask.id, newTask);

        if (task.assignedTo) {
            const emp = employees.find(e => e.id === task.assignedTo);
            addNotification({ type: 'task_assigned', title: 'Nova tarefa', message: `Tarefa "${newTask.title}" atribuída a ${emp?.name || 'funcionário'}.`, forEmployee: task.assignedTo, forAdmin: true });
        }
        return newTask;
    };

    const updateTask = async (id, updates) => {
        if (!db) setTasks(prev => prev.map(task => task.id === id ? { ...task, ...updates } : task));
        else await writeDB('tasks', id, updates);
    };

    const removeTask = async (id) => {
        if (!db) setTasks(prev => prev.filter(task => task.id !== id));
        else await deleteDB('tasks', id);
    };

    const toggleTaskComplete = async (id) => {
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        if (!db) setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
        else await writeDB('tasks', id, { completed: !task.completed });

        addNotification({ type: 'task_completed', title: task.completed ? 'Tarefa reaberta' : 'Tarefa concluída', message: `"${task.title}" foi ${task.completed ? 'reaberta' : 'concluída'}.`, forAdmin: true });
    };

    const getTasksByEmployee = (employeeId) => tasks.filter(task => task.assignedTo === employeeId || !task.assignedTo);
    const getTasksByDate = (dateStr) => tasks.filter(task => task.date === dateStr);

    // === SWAP REQUESTS ===
    const addSwapRequest = async (request) => {
        const newRequest = { ...request, id: Date.now(), status: 'pending', createdAt: new Date().toISOString() };
        if (!db) setSwapRequests(prev => [...prev, newRequest]);
        else await writeDB('swapRequests', newRequest.id, newRequest);

        addNotification({ type: 'swap_request', title: 'Pedido de Troca', message: `${request.requestor} solicitou troca de turno com ${request.swapWith}.`, forAdmin: true });
        return newRequest;
    };

    const approveSwapRequest = async (id) => {
        const request = swapRequests.find(r => r.id === id);
        if (!request) return;

        if (!db) setSwapRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r));
        else await writeDB('swapRequests', id, { status: 'approved' });

        const date = new Date(request.date);
        const year = date.getFullYear();
        const month = date.getMonth();
        const key = `${year}-${String(month + 1).padStart(2, '0')}`;

        const current = savedSchedules[key];
        if (current) {
            const requestorSchedule = current.schedules[request.requestorId]?.[request.date];
            const swapWithSchedule = current.schedules[request.swapWithId]?.[request.date];

            if (requestorSchedule && swapWithSchedule) {
                const updatedSchedules = {
                    ...current.schedules,
                    [request.requestorId]: { ...current.schedules[request.requestorId], [request.date]: { ...swapWithSchedule } },
                    [request.swapWithId]: { ...current.schedules[request.swapWithId], [request.date]: { ...requestorSchedule } }
                };
                const newScheduleData = { ...current, schedules: updatedSchedules, lastModified: new Date().toISOString() };

                if (!db) setSavedSchedules(prev => ({ ...prev, [key]: newScheduleData }));
                else await writeDB('schedules', key, newScheduleData);
            }
        }

        addNotification({ type: 'swap_approved', title: 'Troca Aprovada ✓', message: `Troca entre ${request.requestor} e ${request.swapWith} foi aprovada. A escala foi atualizada.`, forAdmin: true, forEmployee: request.requestorId });
        addNotification({ type: 'swap_approved', title: 'Troca Aprovada ✓', message: `A sua troca com ${request.requestor} foi aprovada.`, forEmployee: request.swapWithId });
    };

    const rejectSwapRequest = async (id) => {
        const request = swapRequests.find(r => r.id === id);
        if (!request) return;

        if (!db) setSwapRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' } : r));
        else await writeDB('swapRequests', id, { status: 'rejected' });

        addNotification({ type: 'swap_rejected', title: 'Troca Rejeitada', message: `Troca entre ${request.requestor} e ${request.swapWith} foi rejeitada.`, forAdmin: true, forEmployee: request.requestorId });
    };

    const getPendingSwaps = () => swapRequests.filter(r => r.status === 'pending');

    // === SCHEDULES ===
    const saveSchedule = async (year, month, scheduleData) => {
        const key = `${year}-${String(month + 1).padStart(2, '0')}`;
        const newSchedule = { ...scheduleData, savedAt: new Date().toISOString() };
        if (!db) setSavedSchedules(prev => ({ ...prev, [key]: newSchedule }));
        else await writeDB('schedules', key, newSchedule);

        addNotification({ type: 'schedule_saved', title: 'Escala Guardada', message: `Escala de ${scheduleData.monthName} foi guardada.`, forAdmin: true });
    };

    const getScheduleForMonth = (year, month) => {
        const key = `${year}-${String(month + 1).padStart(2, '0')}`;
        return savedSchedules[key] || null;
    };

    const updateShift = async (year, month, employeeId, dateStr, newShift) => {
        const key = `${year}-${String(month + 1).padStart(2, '0')}`;
        const current = savedSchedules[key];
        if (!current) return;

        const updatedSchedules = {
            ...current.schedules,
            [employeeId]: {
                ...current.schedules[employeeId],
                [dateStr]: { shift: newShift, hours: newShift === 'Manhã' ? '8h-16:30' : newShift === 'Tarde' ? '11:30-20h' : '', isOff: newShift === 'Folga' }
            }
        };
        const newSchedule = { ...current, schedules: updatedSchedules, lastModified: new Date().toISOString() };
        if (!db) setSavedSchedules(prev => ({ ...prev, [key]: newSchedule }));
        else await writeDB('schedules', key, newSchedule);
    };

    const removeFromSchedule = async (year, month, employeeId, dateStr) => {
        const key = `${year}-${String(month + 1).padStart(2, '0')}`;
        const current = savedSchedules[key];
        if (!current || !current.schedules[employeeId]) return;

        const updatedEmpSchedule = { ...current.schedules[employeeId] };
        delete updatedEmpSchedule[dateStr];

        const newSchedule = { ...current, schedules: { ...current.schedules, [employeeId]: updatedEmpSchedule }, lastModified: new Date().toISOString() };
        if (!db) setSavedSchedules(prev => ({ ...prev, [key]: newSchedule }));
        else await writeDB('schedules', key, newSchedule);
    };

    // === RESET ===
    const resetAllData = async () => {
        if (!db) {
            setEmployees(initialEmployees);
            setTasks(initialTasks);
            setSwapRequests(initialSwaps);
            setNotifications([]);
            setTimeRecords([]);
            setActiveSessions({});
        } else {
            // Very unsafe conceptually without proper rules, but provided as feature request
            const collections = ['employees', 'tasks', 'swapRequests', 'notifications', 'timeRecords', 'activeSessions', 'schedules'];
            for (let c of collections) {
                const snapshot = await getDocs(collection(db, c));
                const batch = writeBatch(db);
                snapshot.docs.forEach(d => batch.delete(d.ref));
                await batch.commit();
            }
            await seedCollection('employees', initialEmployees);
            await seedCollection('tasks', initialTasks);
            await seedCollection('swapRequests', initialSwaps);
        }
    };

    const value = {
        employees, tasks, swapRequests, notifications, timeRecords, activeSessions, savedSchedules, isHydrated,
        addEmployee, updateEmployee, removeEmployee, getEmployeeById,
        addTask, updateTask, removeTask, toggleTaskComplete, getTasksByEmployee, getTasksByDate,
        addSwapRequest, approveSwapRequest, rejectSwapRequest, getPendingSwaps,
        addNotification, markNotificationRead, markAllNotificationsRead, clearNotifications, getUnreadCount,
        clockIn, clockOut, isEmployeeClockedIn, getActiveSession, getAllActiveSessions, getTotalHours, getTimeRecords,
        saveSchedule, getScheduleForMonth, updateShift, removeFromSchedule,
        resetAllData, taskCategories: initialTaskCategories,
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

function formatDuration(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}min`;
    return `${h}h ${m}min`;
}

export function useData() {
    const context = useContext(DataContext);
    if (!context) throw new Error('useData must be used within a DataProvider');
    return context;
}

export default DataContext;
