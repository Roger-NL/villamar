import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '@/styles/Dashboard.module.css';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import { useApp } from '../_app';
import { useData } from '@/contexts/DataContext';
import { mockSchedule } from '@/data/mockData';
import { planoDiarioTemplate, planoDiarioNoturnoTemplate } from '@/data/planoDiarioTemplate';
import {
    LogIn, LogOut, Calendar, CheckCircle, Clock,
    ListChecks, ArrowRight, Timer, TrendingUp
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
        dailyPlans
    } = useData();

    const [elapsedTime, setElapsedTime] = useState(0);

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

    if (currentUser) {
        const myTasks = [];

        const processTemplate = (template, plan, planKey) => {
            if (!plan || !plan.publishedAt) return;
            template.blocks.forEach(block => {
                if (block.type === 'group_assignment') {
                    block.columns.forEach((colName, colIdx) => {
                        const taskId = `${block.id}_${colIdx}`;
                        const assignedEmpId = plan.assignments?.[taskId];
                        if (assignedEmpId && assignedEmpId.toString() === currentUser?.id?.toString()) {
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
                        if (assignedEmpId && assignedEmpId.toString() === currentUser?.id?.toString()) {
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
    const nextDayOff = mockSchedule.currentWeek.find(d => d.isDayOff) ||
        mockSchedule.nextWeek.find(d => d.isDayOff);

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

    if (!isHydrated) {
        return <div className={styles.loading}>A carregar...</div>;
    }

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
                        <p>Bom turno! ☀️</p>
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
                                <>
                                    <div className={styles.timerDisplay}>
                                        <Timer size={24} />
                                        <span className={styles.timerValue}>{formatDuration(elapsedTime)}</span>
                                    </div>
                                    <div className={styles.clockStatus}>Em serviço</div>
                                </>
                            ) : (
                                <div className={styles.clockStatus}>Fora de serviço</div>
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

                        {/* Widget 2: Total Hours */}
                        <div className={styles.widget}>
                            <div className={styles.widgetHeader}>
                                <TrendingUp className={styles.widgetIcon} size={20} />
                                <span>Banco de Horas</span>
                            </div>
                            <div className={styles.metricBig}>{totalHours.hours || 0}h</div>
                            <div className={styles.metricLabel}>{totalHours.minutes || 0} minutos</div>
                        </div>

                        {/* Widget 3: Tasks (Medium) */}
                        <div className={styles.widget} onClick={() => router.push('/funcionario/tarefas')} style={{ cursor: 'pointer' }}>
                            <div className={styles.widgetHeader}>
                                <ListChecks className={styles.widgetIcon} size={20} />
                                <span>Próx. Tarefa</span>
                            </div>
                            <div className={styles.metricBig} style={{ fontSize: nextTaskInfo ? '1.2rem' : '2rem', lineHeight: '1.2', marginTop: '8px' }}>
                                {nextTaskInfo || pendingTasks}
                            </div>
                            <div className={styles.metricLabel}>{nextTaskInfo ? `${pendingTasks} na fila` : 'Pendentes'}</div>
                            <div className={styles.widgetArrow}>
                                <ArrowRight size={16} />
                            </div>
                        </div>

                        {/* Widget 4: Next Off (Medium) */}
                        <div className={styles.widget} onClick={() => router.push('/funcionario/escala')}>
                            <div className={styles.widgetHeader}>
                                <Calendar className={styles.widgetIcon} size={20} />
                                <span>Escala</span>
                            </div>
                            <div className={styles.metricBig}>{nextDayOff?.day?.split(' ')[0]}</div>
                            <div className={styles.metricLabel}>Próx. Folga</div>
                        </div>

                        {/* Widget 5: Schedule Strip (Wide) */}
                        <div className={`${styles.widget} ${styles.wideWidget}`}>
                            <div className={styles.widgetHeader}>
                                <span>Esta Semana</span>
                            </div>
                            <div className={styles.scheduleStrip}>
                                {mockSchedule.currentWeek.map((day, i) => {
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
