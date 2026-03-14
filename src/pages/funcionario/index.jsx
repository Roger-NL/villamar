import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '@/styles/Dashboard.module.css';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import { useApp } from '../_app';
import { useData } from '@/contexts/DataContext';
import { planoDiarioTemplate, planoDiarioNoturnoTemplate } from '@/data/planoDiarioTemplate';
import {
    LogIn, LogOut, Calendar, CheckCircle, Clock,
    ListChecks, Timer, Sun, Users, Coffee, Bell, ChevronDown, ChevronUp
} from 'lucide-react';

// Formatar duração
function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n) => n.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export default function FuncionarioDashboard() {
    const router = useRouter();
    const { isAdmin, toggleMode, currentUser } = useApp();
    const {
        clockIn,
        clockOut,
        isEmployeeClockedIn,
        getActiveSession,
        getTotalHours,
        isHydrated,
        dailyPlans,
        getScheduleForMonth,
        employees,
        dailyAnnouncements
    } = useData();

    const [elapsedTime, setElapsedTime] = useState(0);
    const [showAllTasks, setShowAllTasks] = useState(false);
    const [showAllColleaguesToday, setShowAllColleaguesToday] = useState(false);
    const [showAllColleaguesTomorrow, setShowAllColleaguesTomorrow] = useState(false);
    const [showAllDaysOff, setShowAllDaysOff] = useState(false);

    const isClockedIn = isHydrated && currentUser ? isEmployeeClockedIn(currentUser.id) : false;
    const activeSession = isHydrated && currentUser ? getActiveSession(currentUser.id) : null;
    const totalHours = isHydrated && currentUser ? getTotalHours(currentUser.id) : { formatted: '0h 0min' };

    // Timer ao vivo
    useEffect(() => {
        if (!isClockedIn || !activeSession) {
            setElapsedTime(0);
            return;
        }

        const startTime = new Date(activeSession.startTime).getTime();

        const updateTimer = () => {
            const now = Date.now();
            setElapsedTime(now - startTime);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [isClockedIn, activeSession]);

    // Calculate pending tasks from daily plans
    const tzOffset = (new Date()).getTimezoneOffset() * 60000;
    const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, 10);
    const dayPlan = dailyPlans[localISOTime];
    const nightPlan = dailyPlans[`${localISOTime}_NIGHT`];

    let pendingTasks = 0;
    let nextTaskInfo = null;
    let myTasks = [];

    if (currentUser) {
        const processTemplate = (template, plan, planKey) => {
            if (!plan || !plan.publishedAt) return;
            template.blocks.forEach(block => {
                if (block.type === 'group_assignment') {
                    block.columns.forEach((colName, colIdx) => {
                        const taskId = `${block.id}_${colIdx}`;
                        const assignedEmpId = plan.assignments?.[taskId];
                        const isAssigned = Array.isArray(assignedEmpId)
                            ? assignedEmpId.some(id => id.toString() === currentUser?.id?.toString())
                            : (assignedEmpId && assignedEmpId.toString() === currentUser?.id?.toString());
                        if (isAssigned) {
                            const status = plan.statuses?.[taskId] || {};
                            if (!status.completed) {
                                pendingTasks++;
                                let residentList = [];
                                if (plan.groupResidents && plan.groupResidents[block.id] && plan.groupResidents[block.id][colIdx]) {
                                    residentList = plan.groupResidents[block.id][colIdx];
                                } else if (block.predefinedColumns) {
                                    residentList = block.predefinedColumns[colIdx] || [];
                                } else if (block.residents) {
                                    residentList = block.residents;
                                }

                                if (residentList.length > 0) {
                                    const formattedResidents = residentList.map(r => {
                                        const customName = plan.customResidentNames?.[r] || r;
                                        return customName;
                                    });
                                    myTasks.push({ label: `${block.name} — ${colName} (${formattedResidents.join(', ')})` });
                                }
                            }
                        }
                    });
                } else if (block.items) {
                    block.items.forEach(item => {
                        const assignedEmpId = plan.assignments?.[item.id];
                        const isAssigned = Array.isArray(assignedEmpId)
                            ? assignedEmpId.some(id => id.toString() === currentUser?.id?.toString())
                            : (assignedEmpId && assignedEmpId.toString() === currentUser?.id?.toString());
                        if (isAssigned) {
                            const status = plan.statuses?.[item.id] || {};
                            if (!status.completed) {
                                pendingTasks++;
                                const customLabel = plan.customLabels?.[item.id] || item.label;
                                myTasks.push({ label: customLabel });
                            }
                        }
                    });
                }
            });
        };

        processTemplate(planoDiarioTemplate, dayPlan, localISOTime);
        processTemplate(planoDiarioNoturnoTemplate, nightPlan, `${localISOTime}_NIGHT`);

        if (myTasks.length > 0) {
            // First pending task
            const firstTask = myTasks[0];
            let displayLabel = firstTask.label;

            // Format label identically to Tasks screen if it has dashes
            if (displayLabel.includes(' — ')) {
                displayLabel = displayLabel.split(' — ')[0]; // We just show the main action in the dash
            } else if (displayLabel.includes('_')) {
                // Fallback if we only have the ID
                displayLabel = "Tarefa Pendente";
            }
            nextTaskInfo = displayLabel;
        }
    }
    let nextDaysOff = [];
    let currentWeekDisplay = [];
    let colleaguesToday = [];
    let colleaguesTomorrow = [];

    if (isHydrated && currentUser) {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();

        const scheduleData = getScheduleForMonth(currentYear, currentMonth);
        const nextMonthScheduleDate = new Date();
        nextMonthScheduleDate.setMonth(currentMonth + 1);
        const nextScheduleData = getScheduleForMonth(nextMonthScheduleDate.getFullYear(), nextMonthScheduleDate.getMonth());

        // Calculate Esta Semana (next 7 days starting from today)
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() + i);
            const y = d.getFullYear();
            const m = d.getMonth();
            const dateStr = d.toISOString().slice(0, 10);

            let sched = null;
            if (scheduleData && y === scheduleData.year && m === scheduleData.month) {
                sched = scheduleData.schedules[currentUser.id]?.[dateStr];
            } else if (nextScheduleData && y === nextScheduleData.year && m === nextScheduleData.month) {
                sched = nextScheduleData.schedules[currentUser.id]?.[dateStr];
            }

            const isOff = !sched || sched.isOff || sched.shift === 'Folga' || sched.shift === 'Férias' || sched.shift === 'Licença';
            const dayNamesShort = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

            currentWeekDisplay.push({
                date: dateStr,
                day: dayNamesShort[d.getDay()],
                isToday: i === 0,
                shift: sched ? sched.shift : 'Folga',
                isDayOff: isOff
            });
        }

        // Find next day off (up to 30 days ahead)
        for (let i = 0; i < 30; i++) {
            const d = new Date();
            d.setDate(d.getDate() + i);
            const dateStr = d.toISOString().slice(0, 10);
            let schedDay = currentWeekDisplay.find(c => c.date === dateStr);
            let isOff = false;

            if (schedDay) {
                isOff = schedDay.isDayOff;
            } else {
                const y = d.getFullYear();
                const m = d.getMonth();
                let sched = null;
                if (scheduleData && y === scheduleData.year && m === scheduleData.month) {
                    sched = scheduleData.schedules[currentUser.id]?.[dateStr];
                } else if (nextScheduleData && y === nextScheduleData.year && m === nextScheduleData.month) {
                    sched = nextScheduleData.schedules[currentUser.id]?.[dateStr];
                }
                isOff = !sched || sched.isOff || sched.shift === 'Folga' || sched.shift === 'Férias' || sched.shift === 'Licença';
            }

            if (isOff && i > 0) {
                const dayNamesShort = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                nextDaysOff.push(`${dayNamesShort[d.getDay()]} ${d.getDate()}`);
                if (nextDaysOff.length >= 2) {
                    break;
                }
            }
        }

        const isWorkingShift = (sched) => sched && !sched.isOff && sched.shift !== 'Folga' && sched.shift !== 'Férias' && sched.shift !== 'Licença';
        const getScheduleForDate = (employeeId, dateStr) => {
            const dateObj = new Date(`${dateStr}T12:00:00`);
            const year = dateObj.getFullYear();
            const month = dateObj.getMonth();

            if (scheduleData && year === scheduleData.year && month === scheduleData.month) {
                return scheduleData.schedules[employeeId]?.[dateStr] || null;
            }

            if (nextScheduleData && year === nextScheduleData.year && month === nextScheduleData.month) {
                return nextScheduleData.schedules[employeeId]?.[dateStr] || null;
            }

            return null;
        };

        const getWorkingColleaguesForDate = (dateStr) => employees
            .filter((emp) => {
                if (emp.id === currentUser.id) return false;
                if (emp.role?.toLowerCase().includes('cozinha') || emp.name?.toLowerCase().includes('cozinha')) return false;
                return isWorkingShift(getScheduleForDate(emp.id, dateStr));
            })
            .map((emp) => {
                const empSched = getScheduleForDate(emp.id, dateStr);
                return {
                    name: emp.name.split(' ')[0],
                    rawCode: empSched?.rawCode || empSched?.shift || ''
                };
            });

        // Calculate colleagues working today
        const todayStr = new Date().toISOString().slice(0, 10);
        colleaguesToday = getWorkingColleaguesForDate(todayStr);

        // Calculate colleagues working tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().slice(0, 10);
        colleaguesTomorrow = getWorkingColleaguesForDate(tomorrowStr);
    }

    const handleClockIn = () => {
        if (currentUser) {
            clockIn(currentUser.id);
        }
    };

    const handleClockOut = () => {
        if (currentUser) {
            clockOut(currentUser.id);
        }
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) {
            return 'Bom dia! ☀️';
        } else if (hour >= 12 && hour < 19) {
            return 'Boa tarde! 🌇';
        } else {
            return 'Boa noite! 🌙';
        }
    };

    if (!isHydrated) {
        return <div className={styles.loading}>A carregar...</div>;
    }

    const visibleTasks = showAllTasks ? myTasks : myTasks.slice(0, 2);
    const visibleColleaguesToday = showAllColleaguesToday ? colleaguesToday : colleaguesToday.slice(0, 2);
    const visibleColleaguesTomorrow = showAllColleaguesTomorrow ? colleaguesTomorrow : colleaguesTomorrow.slice(0, 2);
    const visibleDaysOff = showAllDaysOff ? nextDaysOff : nextDaysOff.slice(0, 2);
    const myTodayDisplay = currentWeekDisplay.find(d => d.isToday) || currentWeekDisplay[0];
    const shiftHours = myTodayDisplay?.shift === 'Noite' ? 12 : 8;
    const progressPercent = Math.min((elapsedTime / (shiftHours * 3600 * 1000)) * 100, 100);

    return (
        <>
            <Head>
                <title>Minha Área</title>
            </Head>

            <Header user={currentUser} isAdmin={isAdmin} onModeSwitch={toggleMode} />
            <Sidebar isAdmin={false} />
            <BottomNav isAdmin={false} />

            <main className={styles.main}>
                <div className={styles.container}>
                    <div className={styles.welcomeSection}>
                        <h1>Olá, {currentUser?.name?.split(' ')[0] || 'Utilizador'}</h1>
                        <p>{myTodayDisplay?.isDayOff ? 'Aproveite a sua folga hoje.' : getGreeting()}</p>
                    </div>

                    {/* Bento Grid Layout */}
                    <div className={styles.bentoGrid}>

                        {/* Widget 1: Clock In/Out (Large) */}
                        <div className={`${styles.widget} ${styles.clockWidget}`}>
                            <div className={styles.widgetHeader}>
                                <Clock className={styles.widgetIcon} size={20} />
                                <span>Ponto</span>
                            </div>

                            {isClockedIn ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                                    {/* Esquerda: Ponto */}
                                    <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div className={styles.timerDisplay} style={{ marginBottom: 0 }}>
                                            <Timer size={24} />
                                            <span className={styles.timerValue}>{formatDuration(elapsedTime)}</span>
                                        </div>

                                        <div style={{ padding: '0 4px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginBottom: '4px', fontWeight: '500' }}>
                                                <span>Em serviço ({shiftHours}h)</span>
                                                <span>{Math.round(progressPercent)}%</span>
                                            </div>
                                            <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                                <div style={{
                                                    height: '100%',
                                                    background: `hsl(${120 - (progressPercent * 1.2)}, 80%, 45%)`, // de 120 (Verde) até 0 (Vermelho)
                                                    width: `${progressPercent}%`,
                                                    transition: 'width 1s linear, background-color 1s ease'
                                                }} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Direita: Avisos */}
                                    <div style={{ flex: '1 1 250px', maxHeight: '220px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '12px', display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                                            <Bell size={16} color="#0284c7" />
                                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Avisos Diários</span>
                                        </div>
                                        {dailyAnnouncements && dailyAnnouncements.length > 0 ? (
                                            <div style={{ margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
                                                {dailyAnnouncements.map((announcement, idx) => {
                                                    const sevColors = {
                                                        normal: { bg: '#F0FDF4', border: '#22C55E' },
                                                        grave: { bg: '#FEFCE8', border: '#EAB308' },
                                                        gravissimo: { bg: '#FEF2F2', border: '#EF4444' }
                                                    };
                                                    const colorInfo = sevColors[announcement.severity || 'normal'] || sevColors.normal;

                                                    return (
                                                        <div key={idx} style={{
                                                            lineHeight: '1.4',
                                                            fontWeight: '500',
                                                            fontSize: '14px',
                                                            color: '#1e293b',
                                                            background: colorInfo.bg,
                                                            borderLeft: `4px solid ${colorInfo.border}`,
                                                            padding: '10px 12px',
                                                            borderRadius: '8px',
                                                            display: 'flex',
                                                            alignItems: 'center'
                                                        }}>
                                                            {announcement.text.replace('{nome}', currentUser?.name?.split(' ')[0] || '')}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        ) : (
                                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <span style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center' }}>Sem avisos hoje. Bom turno!</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                                    <div className={styles.clockStatus} style={{ flex: '1 1 200px', display: 'flex', alignItems: 'center', margin: 0 }}>
                                        Fora de serviço
                                    </div>
                                    <div style={{ flex: '1 1 250px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <span style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>Inicie o turno para ver os avisos da equipa</span>
                                    </div>
                                </div>
                            )}

                            <button
                                className={`${styles.clockButton} ${isClockedIn ? styles.stop : styles.start}`}
                                onClick={isClockedIn ? handleClockOut : handleClockIn}
                            >
                                {isClockedIn ? (
                                    <><LogOut size={18} /> Registar Saída</>
                                ) : (
                                    <><LogIn size={18} /> Registar Entrada</>
                                )}
                            </button>
                        </div>

                        {/* Widget 2: Colegas em Turno */}
                        <div className={styles.widget}>
                            <div className={styles.widgetHeader}>
                                <Users className={styles.widgetIcon} size={20} />
                                <span>Colegas Hoje <span style={{ fontWeight: 400, color: '#94a3b8' }}>({currentWeekDisplay[0]?.date.split('-').slice(1).reverse().join('/')})</span></span>
                                {colleaguesToday.length > 2 && (
                                    <button
                                        type="button"
                                        className={styles.inlineExpandButton}
                                        onClick={() => setShowAllColleaguesToday((prev) => !prev)}
                                    >
                                        {showAllColleaguesToday ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    </button>
                                )}
                            </div>
                            <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {colleaguesToday.length > 0 ? visibleColleaguesToday.map((c, i) => (
                                    <span key={i} style={{ background: '#f1f5f9', color: '#334155', padding: '2px 6px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '500' }}>
                                        {c.name} <span style={{ color: '#0077b6', fontWeight: 'bold' }}>({c.rawCode})</span>
                                    </span>
                                )) : (
                                    <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Nenhum colega em serviço hoje.</span>
                                )}
                            </div>
                            <button type="button" className={styles.widgetMiniLink} onClick={() => router.push('/funcionario/escala')}>
                                Ver escala
                            </button>
                        </div>

                        {/* Widget 3: Tasks (Medium) */}
                        <div className={styles.widget}>
                            <div className={styles.widgetHeader}>
                                <ListChecks className={styles.widgetIcon} size={20} />
                                <span>Próx. Tarefa</span>
                                {myTasks.length > 2 && (
                                    <button
                                        type="button"
                                        className={styles.inlineExpandButton}
                                        onClick={() => setShowAllTasks((prev) => !prev)}
                                    >
                                        {showAllTasks ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    </button>
                                )}
                            </div>
                            <div className={styles.metricBig} style={{ fontSize: nextTaskInfo ? '1.1rem' : '1.8rem', lineHeight: '1.2', marginTop: '8px' }}>
                                {nextTaskInfo || pendingTasks}
                            </div>
                            <div className={styles.metricLabel}>{nextTaskInfo ? `${pendingTasks} na fila` : 'Pendentes'}</div>
                            {visibleTasks.length > 1 && (
                                <div className={styles.compactList}>
                                    {visibleTasks.slice(1).map((task, index) => (
                                        <div key={`${task.label}-${index}`} className={styles.compactListItem}>
                                            {task.label.split(' — ')[0]}
                                        </div>
                                    ))}
                                </div>
                            )}
                            <button type="button" className={styles.widgetMiniLink} onClick={() => router.push('/funcionario/tarefas')}>
                                Ver tarefas
                            </button>
                        </div>

                        {/* Widget 4: Next Off (Medium) */}
                        <div className={styles.widget}>
                            <div className={styles.widgetHeader}>
                                <Calendar className={styles.widgetIcon} size={20} />
                                <span style={{ textTransform: 'uppercase' }}>Próximas Folgas</span>
                                {nextDaysOff.length > 2 && (
                                    <button
                                        type="button"
                                        className={styles.inlineExpandButton}
                                        onClick={() => setShowAllDaysOff((prev) => !prev)}
                                    >
                                        {showAllDaysOff ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    </button>
                                )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
                                {visibleDaysOff.length > 0 ? visibleDaysOff.map((folga, idx) => (
                                    <div key={idx} style={{
                                        display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc',
                                        padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                    }}>
                                        <div style={{ background: '#dcfce7', color: '#15803d', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Coffee size={16} />
                                        </div>
                                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#334155', letterSpacing: '-0.5px' }}>
                                            {folga}
                                        </div>
                                    </div>
                                )) : (
                                    <span style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center' }}>Sem folgas à vista</span>
                                )}
                            </div>
                            <button type="button" className={styles.widgetMiniLink} onClick={() => router.push('/funcionario/escala')}>
                                Ver escala
                            </button>
                        </div>

                        {/* Widget Amanhã (Medium) */}
                        <div className={styles.widget}>
                            <div className={styles.widgetHeader}>
                                <Sun className={styles.widgetIcon} size={20} />
                                <span>Amanhã</span>
                                {colleaguesTomorrow.length > 2 && !currentWeekDisplay[1]?.isDayOff && (
                                    <button
                                        type="button"
                                        className={styles.inlineExpandButton}
                                        onClick={() => setShowAllColleaguesTomorrow((prev) => !prev)}
                                    >
                                        {showAllColleaguesTomorrow ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    </button>
                                )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                <div style={{ marginBottom: '8px' }}>
                                    <div className={styles.metricLabel} style={{ marginBottom: '2px', fontSize: '12px' }}>O MEU TURNO</div>
                                    <div className={styles.metricBig} style={{ fontSize: currentWeekDisplay[1]?.shift?.length > 8 ? '22px' : '28px', color: '#0f172a' }}>
                                        {currentWeekDisplay[1]?.shift || '-'}
                                    </div>
                                </div>

                                <div style={{ borderTop: '1px solid #e2e8f0', margin: '4px 0 8px 0' }}></div>

                                <div style={{ flex: 1, overflowY: 'auto' }}>
                                    <div className={styles.metricLabel} style={{ marginBottom: '6px', fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        {currentWeekDisplay[1]?.isDayOff ? '---' :
                                            <>COLEGAS AMANHÃ <span style={{ fontWeight: 400, opacity: 0.7 }}>({currentWeekDisplay[1]?.date.split('-').slice(1).reverse().join('/')})</span></>
                                        }
                                    </div>

                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                        {currentWeekDisplay[1]?.isDayOff ? (
                                            <span style={{ color: '#15803d', fontSize: '0.85rem', fontWeight: '500' }}>Dia de Descanso 🎉</span>
                                        ) : (
                                            colleaguesTomorrow.length > 0 ? visibleColleaguesTomorrow.map((c, i) => (
                                                <span key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', padding: '2px 6px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '500' }}>
                                                    {c.name} <span style={{ color: '#0077b6' }}>({c.rawCode})</span>
                                                </span>
                                            )) : (
                                                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Nenhum colega da sua área.</span>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button type="button" className={styles.widgetMiniLink} onClick={() => router.push('/funcionario/escala')}>
                                Ver escala
                            </button>
                        </div>

                        {/* Widget 5: Schedule Strip (Wide) */}
                        <div className={`${styles.widget} ${styles.wideWidget}`}>
                            <div className={styles.widgetHeader}>
                                <span>Esta Semana</span>
                            </div>
                            <div className={styles.scheduleStrip}>
                                {currentWeekDisplay.map((day, i) => {
                                    const dateNum = day.date.split('-')[2];
                                    return (
                                        <div key={i} className={`${styles.dayItem} ${day.isToday ? styles.today : ''}`}>
                                            <span className={styles.dayName}>{day.day}</span>
                                            <span className={styles.dayDate}>{dateNum}</span>
                                            <div className={`
                                                ${styles.shiftBadge} 
                                                ${day.shift === 'Folga' ? styles.shiftOff : ''}
                                                ${day.shift === 'Manhã' ? styles.shiftDay : ''}
                                                ${day.shift === 'Tarde' ? styles.shiftNight : ''}
                                                ${day.shift === 'Noite' ? styles.shiftNight : ''}
                                            `}>
                                                {day.shift === 'Folga' ? 'Folga' : day.shift}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </>
    );
}
