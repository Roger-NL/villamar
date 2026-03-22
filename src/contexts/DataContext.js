/**
 * Data Context - Gestão centralizada de dados com persistência no Firebase (Fallback: LocalStorage)
 * Gere: Funcionários, Tarefas, Escalas, Pedidos de Troca, Notificações, Banco de Horas
 */
import { createContext, useContext, useState, useEffect, useCallback, startTransition } from 'react';
import { mockEmployees as initialEmployees, mockTasks as initialTasks, mockSwapRequests as initialSwaps, taskCategories as initialTaskCategories, getPrebuiltSchedule } from '@/data/mockData';
import { db } from '@/config/firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDocs, writeBatch } from 'firebase/firestore';

const DataContext = createContext();

// Chaves do localStorage fallback
const STORAGE_KEYS = {
    EMPLOYEES: 'villamar_employees',
    EMPLOYEES_CACHE: 'villamar_employees_cache',
    TASKS: 'villamar_tasks',
    SWAPS: 'villamar_swaps',
    TIME_RECORDS: 'villamar_time_records',
    ACTIVE_SESSIONS: 'villamar_active_sessions',
    SCHEDULES: 'villamar_schedules',
    INVENTORY: 'villamar_inventory',
    INSULIN_PATIENTS: 'villamar_insulin_patients',
    INSULIN_LOGS: 'villamar_insulin_logs',
    MEDICAL_NOTES: 'villamar_medical_notes',
    DAILY_PLANS: 'villamar_daily_plans',
    DAILY_ANNOUNCEMENTS: 'villamar_daily_announcements',
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
    const [leaves, setLeaves] = useState([]); // Férias e Licenças
    const [inventoryItems, setInventoryItems] = useState([]); // Estoque
    const [insulinPatients, setInsulinPatients] = useState([]); // Utentes com controlo de insulina
    const [insulinLogs, setInsulinLogs] = useState([]); // Registos de insulina
    const [medicalNotes, setMedicalNotes] = useState([]); // Ocorrências e observações médicas
    const [diaperPatients, setDiaperPatients] = useState([]); // Utentes e as suas fraldas
    const [diaperLogs, setDiaperLogs] = useState([]); // Histórico de reposições
    const [dailyPlans, setDailyPlans] = useState({}); // Planos Diários de Tarefas (Assignments + Status)
    const [dailyAnnouncements, setDailyAnnouncements] = useState([]); // Avisos Diários
    const [isHydrated, setIsHydrated] = useState(false);

    const readEmployeesCache = () => {
        if (typeof window === 'undefined') return [];
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.EMPLOYEES_CACHE);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    };

    const writeEmployeesCache = (items = []) => {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem(STORAGE_KEYS.EMPLOYEES_CACHE, JSON.stringify(items));
        } catch {
            // Ignore cache write issues (private mode / storage limit)
        }
    };

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
            const savedInsulinPatients = localStorage.getItem(STORAGE_KEYS.INSULIN_PATIENTS);
            const savedInsulinLogs = localStorage.getItem(STORAGE_KEYS.INSULIN_LOGS);
            const savedMedicalNotes = localStorage.getItem(STORAGE_KEYS.MEDICAL_NOTES);
            const savedDailyPlans = localStorage.getItem(STORAGE_KEYS.DAILY_PLANS);
            const savedDailyAnnouncements = localStorage.getItem(STORAGE_KEYS.DAILY_ANNOUNCEMENTS);

            let loadedEmployees = savedEmployees ? JSON.parse(savedEmployees) : initialEmployees;
            if (savedEmployees) {
                // Adicionar novos funcionários do mockData que ainda não existem
                const existingIds = new Set(loadedEmployees.map(e => e.id));
                const newEmployees = initialEmployees.filter(e => !existingIds.has(e.id));
                if (newEmployees.length > 0) loadedEmployees = [...loadedEmployees, ...newEmployees];
                // Atualizar nome/cargo de todos os funcionários para refletir mockData atualizado
                loadedEmployees = loadedEmployees.map(emp => {
                    const original = initialEmployees.find(e => e.id === emp.id);
                    if (original) return { ...emp, role: original.role, name: original.name, isAdmin: original.isAdmin };
                    return emp;
                });
                // Remover funcionários que já não existem no mockData
                const validIds = new Set(initialEmployees.map(e => e.id));
                loadedEmployees = loadedEmployees.filter(emp => validIds.has(emp.id));
            }

            const savedLeaves = localStorage.getItem('leaves');
            startTransition(() => {
                setEmployees(loadedEmployees);
                setTasks(savedTasks ? JSON.parse(savedTasks) : initialTasks);
                setSwapRequests(savedSwaps ? JSON.parse(savedSwaps) : initialSwaps);
                setNotifications(savedNotifications ? JSON.parse(savedNotifications) : []);
                setTimeRecords(savedTimeRecords ? JSON.parse(savedTimeRecords) : []);
                setActiveSessions(savedActiveSessions ? JSON.parse(savedActiveSessions) : {});
                setSavedSchedules(savedSchedulesData ? JSON.parse(savedSchedulesData) : {});
                setLeaves(savedLeaves ? JSON.parse(savedLeaves) : []);
                setInsulinPatients(savedInsulinPatients ? JSON.parse(savedInsulinPatients) : []);
                setInsulinLogs(savedInsulinLogs ? JSON.parse(savedInsulinLogs) : []);
                setMedicalNotes(savedMedicalNotes ? JSON.parse(savedMedicalNotes) : []);
                setDailyPlans(savedDailyPlans ? JSON.parse(savedDailyPlans) : {});
                setDailyAnnouncements(savedDailyAnnouncements ? JSON.parse(savedDailyAnnouncements) : []);
                setIsHydrated(true);
            });
        } else if (db) {
            // WITH FIREBASE
            const unsubEmployees = onSnapshot(
                collection(db, 'employees'),
                (snapshot) => {
                    let items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

                    // Resolver o problema de duas contas do "Roger":
                    // Se existe uma conta do Firebase Auth para o Roger, remover o mock (Id 9)
                    const firebaseRoger = items.find(e => e.name?.toLowerCase().includes('roger') && e.id !== 9 && e.id !== '9');
                    if (firebaseRoger) {
                        items = items.filter(e => !(e.name?.toLowerCase().includes('roger') && (e.id === 9 || e.id === '9')));
                    }

                    setEmployees(items);
                    writeEmployeesCache(items);
                },
                (error) => {
                    console.error('Falha ao carregar funcionários do Firebase:', error);
                    const cachedEmployees = readEmployeesCache();
                    if (cachedEmployees.length > 0) {
                        setEmployees(cachedEmployees);
                    }
                }
            );
            const unsubTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
                const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                setTasks(items);
            });
            const unsubSwaps = onSnapshot(collection(db, 'swapRequests'), (snapshot) => {
                const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                setSwapRequests(items);
            });
            const unsubNotifications = onSnapshot(collection(db, 'notifications'), (snapshot) => {
                setNotifications(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
            });
            const unsubTimeRecords = onSnapshot(collection(db, 'timeRecords'), (snapshot) => {
                setTimeRecords(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
            });
            const unsubActiveSessions = onSnapshot(collection(db, 'activeSessions'), (snapshot) => {
                const sessions = {};
                snapshot.docs.forEach(doc => { sessions[doc.id] = { ...doc.data(), id: doc.id }; });
                setActiveSessions(sessions);
            });
            const unsubSchedules = onSnapshot(collection(db, 'schedules'), (snapshot) => {
                const schedules = {};
                snapshot.docs.forEach(doc => { schedules[doc.id] = { ...doc.data(), id: doc.id }; });
                setSavedSchedules(schedules);
            });
            const unsubLeaves = onSnapshot(collection(db, 'leaves'), (snapshot) => {
                setLeaves(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
            });
            const unsubInventory = onSnapshot(collection(db, 'inventoryItems'), (snapshot) => {
                setInventoryItems(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
            });
            const unsubInsulinPatients = onSnapshot(collection(db, 'insulinPatients'), (snapshot) => {
                setInsulinPatients(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
            });
            const unsubInsulinLogs = onSnapshot(collection(db, 'insulinLogs'), (snapshot) => {
                setInsulinLogs(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
            });
            const unsubMedicalNotes = onSnapshot(collection(db, 'medicalNotes'), (snapshot) => {
                setMedicalNotes(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
            });
            const unsubDiaperPatients = onSnapshot(collection(db, 'diaperPatients'), (snapshot) => {
                setDiaperPatients(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
            });
            const unsubDiaperLogs = onSnapshot(collection(db, 'diaperLogs'), (snapshot) => {
                setDiaperLogs(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
            });
            const unsubDailyPlans = onSnapshot(collection(db, 'dailyPlans'), (snapshot) => {
                const plans = {};
                snapshot.docs.forEach(doc => { plans[doc.id] = { ...doc.data(), id: doc.id }; });
                setDailyPlans(plans);
            });
            const unsubDailyAnnouncements = onSnapshot(collection(db, 'dailyAnnouncements'), (snapshot) => {
                setDailyAnnouncements(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
            });

            startTransition(() => {
                setIsHydrated(true);
            });

            return () => {
                unsubEmployees();
                unsubTasks();
                unsubSwaps();
                unsubNotifications();
                unsubActiveSessions();
                unsubSchedules();
                unsubLeaves();
                unsubInventory();
                unsubInsulinPatients();
                unsubInsulinLogs();
                unsubMedicalNotes();
                unsubDiaperPatients();
                unsubDiaperLogs();
                unsubDailyPlans();
                unsubDailyAnnouncements();
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
            localStorage.setItem(STORAGE_KEYS.INSULIN_PATIENTS, JSON.stringify(insulinPatients));
            localStorage.setItem(STORAGE_KEYS.INSULIN_LOGS, JSON.stringify(insulinLogs));
            localStorage.setItem(STORAGE_KEYS.MEDICAL_NOTES, JSON.stringify(medicalNotes));
            localStorage.setItem(STORAGE_KEYS.DAILY_PLANS, JSON.stringify(dailyPlans));
            localStorage.setItem(STORAGE_KEYS.DAILY_ANNOUNCEMENTS, JSON.stringify(dailyAnnouncements));
        }
    }, [employees, tasks, swapRequests, notifications, timeRecords, activeSessions, savedSchedules, insulinPatients, insulinLogs, medicalNotes, dailyPlans, dailyAnnouncements, isHydrated]);

    // === NOTIFICATIONS ===
    const addNotification = useCallback(async (notification) => {
        const newNotif = { id: Date.now(), ...notification, readBy: [], createdAt: new Date().toISOString() };
        if (!db) setNotifications(prev => [newNotif, ...prev]);
        else await writeDB('notifications', newNotif.id, newNotif);
        return newNotif;
    }, []);

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
    }, [employees, addNotification]);

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
    }, [activeSessions, employees, addNotification]);

    const isEmployeeClockedIn = (employeeId) => !!activeSessions[employeeId];
    const getActiveSession = (employeeId) => activeSessions[employeeId] || null;
    const getAllActiveSessions = () => Object.values(activeSessions);

    const getTotalHours = (employeeId) => {
        const records = timeRecords.filter(r => r.employeeId === employeeId);
        const totalMinutes = records.reduce((sum, r) => sum + r.durationMinutes, 0);
        return { totalMinutes, hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60, formatted: formatDuration(totalMinutes) };
    };

    const getTimeRecords = (employeeId) => timeRecords.filter(r => r.employeeId === employeeId);

    const markNotificationRead = async (id, userId) => {
        if (!userId) return;
        const notif = notifications.find(n => n.id === id);
        if (!notif) return;
        const readBy = notif.readBy || [];
        if (!readBy.includes(userId)) {
            const updatedReadBy = [...readBy, userId];
            if (!db) setNotifications(prev => prev.map(n => n.id === id ? { ...n, readBy: updatedReadBy } : n));
            else Object.assign(notif, { readBy: updatedReadBy }), await writeDB('notifications', id, { readBy: updatedReadBy });
        }
    };

    const markAllNotificationsRead = async (userId) => {
        if (!userId) return;
        if (!db) {
            setNotifications(prev => prev.map(n => {
                const readBy = n.readBy || [];
                return readBy.includes(userId) ? n : { ...n, readBy: [...readBy, userId] };
            }));
        } else {
            notifications.forEach(async n => {
                const readBy = n.readBy || [];
                if (!readBy.includes(userId)) {
                    await writeDB('notifications', n.id, { readBy: [...readBy, userId] }, true);
                }
            });
        }
    };

    const clearNotifications = async () => {
        if (!db) setNotifications([]);
        else {
            notifications.forEach(async n => { await deleteDB('notifications', n.id); });
        }
    };

    const getUnreadCount = (userId) => {
        if (!userId) return 0;
        return notifications.filter(n => !(n.readBy || []).includes(userId)).length;
    };

    // === EMPLOYEES CRUD ===
    const addEmployee = async (employee) => {
        const pin = employee.pin || Math.floor(1000 + Math.random() * 9000).toString();
        const newEmployee = { ...employee, id: employee.id || Date.now(), status: 'absent', clockIn: null, clockOut: null, pin };
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

    const removeSwapRequest = async (id) => {
        if (!db) setSwapRequests(prev => prev.filter(r => r.id !== id));
        else await deleteDB('swapRequests', id);
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
        // Retorna escala guardada, ou escala real pré-construída do Excel, ou null
        let schedule = savedSchedules[key] || getPrebuiltSchedule(year, month) || null;

        // Mapear escala do Roger (ID 9 fake) para o Roger real (Firebase UID)
        if (schedule && schedule.schedules) {
            const firebaseRoger = employees?.find(e => e.name?.toLowerCase().includes('roger') && e.id !== 9 && e.id !== '9');
            if (firebaseRoger && schedule.schedules[9] && !schedule.schedules[firebaseRoger.id]) {
                schedule = {
                    ...schedule,
                    schedules: {
                        ...schedule.schedules,
                        [firebaseRoger.id]: schedule.schedules[9]
                    }
                };
            }
        }

        return schedule;
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
    const resetData = async (selectedCollections = []) => {
        if (!db) {
            if (selectedCollections.includes('tasks')) setTasks(initialTasks || []);
            if (selectedCollections.includes('swapRequests')) setSwapRequests(initialSwaps || []);
            if (selectedCollections.includes('notifications')) setNotifications([]);
            if (selectedCollections.includes('timeRecords')) {
                setTimeRecords([]);
                setActiveSessions({});
            }
            if (selectedCollections.includes('employees')) setEmployees(initialEmployees || []);
            if (selectedCollections.includes('leaves')) setLeaves([]);
            if (selectedCollections.includes('inventoryItems')) setInventoryItems([]);
            if (selectedCollections.includes('diaperPatients')) setDiaperPatients([]);
            if (selectedCollections.includes('diaperLogs')) setDiaperLogs([]);
            if (selectedCollections.includes('schedules')) setSavedSchedules({});
            if (selectedCollections.includes('dailyPlans')) setDailyPlans({});
        } else {
            // Se incluir funcionários, removemos a proteção mas avisamos no UI
            for (let c of selectedCollections) {
                // Caso especial para Presenças (duas coleções)
                if (c === 'timeRecords') {
                    const snapshotP = await getDocs(collection(db, 'timeRecords'));
                    const batchP = writeBatch(db);
                    snapshotP.docs.forEach(d => batchP.delete(d.ref));
                    await batchP.commit();

                    const snapshotS = await getDocs(collection(db, 'activeSessions'));
                    const batchS = writeBatch(db);
                    snapshotS.docs.forEach(d => batchS.delete(d.ref));
                    await batchS.commit();
                    continue;
                }

                const snapshot = await getDocs(collection(db, c));
                const batch = writeBatch(db);
                snapshot.docs.forEach(d => batch.delete(d.ref));
                await batch.commit();

                // Re-semear se necessário
                if (c === 'tasks' && initialTasks?.length > 0) await seedCollection('tasks', initialTasks);
                if (c === 'swapRequests' && initialSwaps?.length > 0) await seedCollection('swapRequests', initialSwaps);
                // NOTA: Employees não re-semeamos automaticamente aqui para evitar duplicar admins se não for limpo da auth
            }
        }
    };

    // === FÉRIAS E LICENÇAS ===
    const addLeave = useCallback(async (leave) => {
        const newLeave = { id: Date.now(), ...leave };
        if (!db) setLeaves(prev => [...prev, newLeave]);
        else await writeDB('leaves', newLeave.id, newLeave);
    }, [db]);

    const deleteLeave = useCallback(async (id) => {
        if (!db) setLeaves(prev => prev.filter(l => l.id !== id));
        else await deleteDB('leaves', id);
    }, [db]);

    // === ESTOQUE ===
    const addInventoryItem = useCallback(async (item) => {
        const newItem = { id: Date.now().toString() + Math.random().toString().slice(2, 6), ...item, createdAt: new Date().toISOString() };
        if (!db) setInventoryItems(prev => [...prev, newItem]);
        else await writeDB('inventoryItems', newItem.id, newItem);
    }, [db]);

    const updateInventoryItem = useCallback(async (id, updates) => {
        if (!db) {
            setInventoryItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
        } else {
            await writeDB('inventoryItems', id, updates, true);
        }
    }, [db]);

    const deleteInventoryItem = useCallback(async (id) => {
        if (!db) setInventoryItems(prev => prev.filter(i => i.id !== id));
        else await deleteDB('inventoryItems', id);
    }, [db]);

    // === INSULINA ===
    const addInsulinPatient = useCallback(async (patient) => {
        const newPatient = {
            id: patient.id || Date.now().toString() + Math.random().toString().slice(2, 6),
            active: true,
            createdAt: new Date().toISOString(),
            ...patient,
        };
        if (!db) setInsulinPatients(prev => [...prev, newPatient]);
        else await writeDB('insulinPatients', newPatient.id, newPatient);
        return newPatient;
    }, [db]);

    const updateInsulinPatient = useCallback(async (id, updates) => {
        if (!db) {
            setInsulinPatients(prev => prev.map(patient => patient.id === id ? { ...patient, ...updates } : patient));
        } else {
            await writeDB('insulinPatients', id, updates, true);
        }
    }, [db]);

    const deleteInsulinPatient = useCallback(async (id) => {
        if (!db) setInsulinPatients(prev => prev.filter(patient => patient.id !== id));
        else await deleteDB('insulinPatients', id);
    }, [db]);

    const addInsulinLog = useCallback(async (log) => {
        const newLog = {
            id: Date.now().toString() + Math.random().toString().slice(2, 6),
            timestamp: new Date().toISOString(),
            ...log,
        };
        if (!db) setInsulinLogs(prev => [...prev, newLog]);
        else await writeDB('insulinLogs', newLog.id, newLog);
        return newLog;
    }, [db]);

    const addMedicalNote = useCallback(async (note) => {
        const newNote = {
            id: Date.now().toString() + Math.random().toString().slice(2, 6),
            timestamp: new Date().toISOString(),
            ...note,
        };
        if (!db) setMedicalNotes(prev => [...prev, newNote]);
        else await writeDB('medicalNotes', newNote.id, newNote);
        return newNote;
    }, [db]);

    const updateMedicalNote = useCallback(async (id, updates) => {
        if (!db) {
            setMedicalNotes(prev => prev.map(note => note.id === id ? { ...note, ...updates } : note));
        } else {
            await writeDB('medicalNotes', id, updates, true);
        }
    }, [db]);

    // === FRALDAS (Pacientes e Logs) ===
    const addDiaperPatient = useCallback(async (patient) => {
        const newPatient = { id: Date.now().toString() + Math.random().toString().slice(2, 6), ...patient, createdAt: new Date().toISOString() };
        if (!db) setDiaperPatients(prev => [...prev, newPatient]);
        else await writeDB('diaperPatients', newPatient.id, newPatient);
    }, [db]);

    const updateDiaperPatient = useCallback(async (id, updates) => {
        if (!db) {
            setDiaperPatients(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
        } else {
            await writeDB('diaperPatients', id, updates, true);
        }
    }, [db]);

    const deleteDiaperPatient = useCallback(async (id) => {
        if (!db) setDiaperPatients(prev => prev.filter(p => p.id !== id));
        else await deleteDB('diaperPatients', id);
    }, [db]);

    const addDiaperLog = useCallback(async (log) => {
        const newLog = { id: Date.now().toString() + Math.random().toString().slice(2, 6), ...log, timestamp: new Date().toISOString() };
        if (!db) setDiaperLogs(prev => [...prev, newLog]);
        else await writeDB('diaperLogs', newLog.id, newLog);
    }, [db]);

    const updateDiaperLog = useCallback(async (id, updates) => {
        if (!db) {
            setDiaperLogs(prev => prev.map(log => log.id === id ? { ...log, ...updates } : log));
        } else {
            await writeDB('diaperLogs', id, updates, true);
        }
    }, [db]);

    const deleteDiaperLog = useCallback(async (id) => {
        if (!db) setDiaperLogs(prev => prev.filter(l => l.id !== id));
        else await deleteDB('diaperLogs', id);
    }, [db]);

    // === PLANO DIÁRIO DE TAREFAS ===
    const updateDailyPlan = useCallback(async (dateStr, assignments, customLabels = {}, groupResidents = {}, residentStatuses = {}, customResidentNames = {}) => {
        const plan = dailyPlans[dateStr] || { id: dateStr, date: dateStr, assignments: {}, statuses: {}, customLabels: {}, groupResidents: {}, residentStatuses: {}, customResidentNames: {}, publishedAt: null };
        const newPlan = { ...plan, assignments, customLabels, groupResidents, residentStatuses, customResidentNames };

        if (!db) setDailyPlans(prev => ({ ...prev, [dateStr]: newPlan }));
        else await writeDB('dailyPlans', dateStr, newPlan);
    }, [db, dailyPlans]);

    const publishDailyPlan = useCallback(async (dateStr) => {
        const plan = dailyPlans[dateStr] || { id: dateStr, date: dateStr, assignments: {}, statuses: {} };
        const newPlan = { ...plan, publishedAt: new Date().toISOString() };

        if (!db) setDailyPlans(prev => ({ ...prev, [dateStr]: newPlan }));
        else await writeDB('dailyPlans', dateStr, newPlan);

        addNotification({
            type: 'daily_plan_published',
            title: 'Novo Plano Diário',
            message: `Plano Diário para ${dateStr} foi publicado.`,
            forAdmin: false // General notification
        });
    }, [db, dailyPlans, addNotification]);

    const toggleDailyTaskComplete = useCallback(async (dateStr, taskId, employeeId) => {
        const plan = dailyPlans[dateStr] || { id: dateStr, date: dateStr, assignments: {}, statuses: {}, publishedAt: null };
        const currentStatus = plan.statuses[taskId];

        const newStatuses = { ...plan.statuses };
        if (currentStatus?.completed) {
            delete newStatuses[taskId]; // Uncomplete
        } else {
            newStatuses[taskId] = { completed: true, completedAt: new Date().toISOString(), completedBy: employeeId };
        }

        const newPlan = { ...plan, statuses: newStatuses };

        if (!db) setDailyPlans(prev => ({ ...prev, [dateStr]: newPlan }));
        else await writeDB('dailyPlans', dateStr, newPlan);
    }, [db, dailyPlans]);

    // === AVISOS DIÁRIOS ===
    const addDailyAnnouncement = useCallback(async (text, authorName, severity = 'normal') => {
        const newAnnouncement = { id: Date.now().toString() + Math.random().toString().slice(2, 6), text, authorName, severity, createdAt: new Date().toISOString() };
        if (!db) setDailyAnnouncements(prev => [newAnnouncement, ...prev]);
        else await writeDB('dailyAnnouncements', newAnnouncement.id, newAnnouncement);
    }, [db]);

    const removeDailyAnnouncement = useCallback(async (id) => {
        if (!db) setDailyAnnouncements(prev => prev.filter(a => a.id !== id));
        else await deleteDB('dailyAnnouncements', id);
    }, [db]);

    const value = {
        employees, tasks, swapRequests, notifications, timeRecords, activeSessions, savedSchedules, isHydrated, leaves, inventoryItems,
        insulinPatients, insulinLogs, medicalNotes, diaperPatients, diaperLogs, dailyPlans, dailyAnnouncements,
        addEmployee, updateEmployee, removeEmployee, getEmployeeById,
        addTask, updateTask, removeTask, toggleTaskComplete, getTasksByEmployee, getTasksByDate,
        addSwapRequest, approveSwapRequest, rejectSwapRequest, removeSwapRequest, getPendingSwaps,
        addNotification, markNotificationRead, markAllNotificationsRead, clearNotifications, getUnreadCount,
        clockIn, clockOut, isEmployeeClockedIn, getActiveSession, getAllActiveSessions, getTotalHours, getTimeRecords,
        saveSchedule, getScheduleForMonth, updateShift, removeFromSchedule,
        resetData, taskCategories: initialTaskCategories,
        addLeave, deleteLeave,
        addInventoryItem, updateInventoryItem, deleteInventoryItem,
        addInsulinPatient, updateInsulinPatient, deleteInsulinPatient, addInsulinLog, addMedicalNote, updateMedicalNote,
        addDiaperPatient, updateDiaperPatient, deleteDiaperPatient,
        addDiaperLog, updateDiaperLog, deleteDiaperLog,
        updateDailyPlan, publishDailyPlan, toggleDailyTaskComplete,
        addDailyAnnouncement, removeDailyAnnouncement
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
