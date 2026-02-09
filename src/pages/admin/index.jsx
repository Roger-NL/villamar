import Head from 'next/head';
import { useState, useEffect } from 'react';
import styles from '@/styles/Admin.module.css';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import { useApp } from '../_app';
import { useData } from '@/contexts/DataContext';
import Avatar from '@/components/ui/Avatar';
import {
    Users, UserCheck, UserX, ArrowLeftRight,
    CheckCircle, Clock, Timer
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

export default function AdminDashboard() {
    const { isAdmin, toggleMode, currentUser } = useApp();
    const {
        employees,
        tasks,
        swapRequests,
        activeSessions,
        isHydrated,
        getTotalHours
    } = useData();

    const [, setTick] = useState(0); // Para forçar re-render do timer

    // Atualizar timers a cada segundo
    useEffect(() => {
        const interval = setInterval(() => {
            setTick(t => t + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    if (!isHydrated) {
        return <div className={styles.loading}>A carregar...</div>;
    }

    const presentCount = Object.keys(activeSessions).length;
    const absentCount = employees.length - presentCount;
    const pendingSwaps = swapRequests.filter(r => r.status === 'pending').length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const totalTasks = tasks.length;
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Funcionários ordenados: Marta, Vera, Joao no topo, depois em serviço
    const sortedEmployees = [...employees].sort((a, b) => {
        const priorityList = ['marta', 'vera', 'joao', 'joão'];

        const getPriority = (name) => {
            const lower = name.toLowerCase();
            const idx = priorityList.findIndex(p => lower.includes(p));
            return idx !== -1 ? idx : Infinity;
        };

        const pA = getPriority(a.name);
        const pB = getPriority(b.name);

        if (pA !== pB) return pA - pB;

        // Se não forem prioritários (ou tiverem mesma prioridade - improvável para nomes únicos), ordenar por status
        const aActive = !!activeSessions[a.id];
        const bActive = !!activeSessions[b.id];
        return (bActive ? 1 : 0) - (aActive ? 1 : 0);
    });

    // Calcular tempo decorrido para um funcionário
    const getElapsedTime = (empId) => {
        const session = activeSessions[empId];
        if (!session) return null;
        const startTime = new Date(session.startTime).getTime();
        return Date.now() - startTime;
    };

    return (
        <>
            <Head>
                <title>Admin Dashboard</title>
            </Head>

            <Header user={currentUser} isAdmin={isAdmin} onModeSwitch={toggleMode} />
            <Sidebar isAdmin={true} />
            <BottomNav isAdmin={true} />

            <main className={styles.main}>
                <div className={styles.container}>
                    <div className={styles.header}>
                        <h1>Visão Geral</h1>
                        <p className={styles.date}>{new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                    </div>

                    <div className={styles.bentoGrid}>

                        {/* Stat 1: Present */}
                        <div className={styles.statCard}>
                            <div className={styles.statIconContainer} style={{ background: '#E8F5E9', color: '#34C759' }}>
                                <UserCheck size={24} />
                            </div>
                            <div className={styles.statValue}>{presentCount}</div>
                            <div className={styles.statLabel}>Em Serviço</div>
                        </div>

                        {/* Stat 2: Absent */}
                        <div className={styles.statCard}>
                            <div className={styles.statIconContainer} style={{ background: '#FFEBEE', color: '#FF3B30' }}>
                                <UserX size={24} />
                            </div>
                            <div className={styles.statValue}>{absentCount}</div>
                            <div className={styles.statLabel}>Fora</div>
                        </div>

                        {/* Stat 3: Swaps */}
                        <div className={styles.statCard}>
                            <div className={styles.statIconContainer} style={{ background: '#FFF3E0', color: '#FF9500' }}>
                                <ArrowLeftRight size={24} />
                            </div>
                            <div className={styles.statValue}>{pendingSwaps}</div>
                            <div className={styles.statLabel}>Trocas</div>
                        </div>

                        {/* Stat 4: Tasks Progress */}
                        <div className={styles.statCard}>
                            <div className={styles.statIconContainer} style={{ background: '#E3F2FD', color: '#0071E3' }}>
                                <CheckCircle size={24} />
                            </div>
                            <div className={styles.statValue}>{Math.round(progress)}%</div>
                            <div className={styles.statLabel}>Tarefas</div>
                        </div>

                        {/* Team Grid (Wide) */}
                        <div className={`${styles.card} ${styles.teamSection}`}>
                            <div className={styles.cardHeader}>
                                <h2>Equipa</h2>
                                {presentCount > 0 && <div className={styles.dot}></div>}
                            </div>
                            <div className={styles.teamGrid}>
                                {sortedEmployees.slice(0, 6).map(emp => {
                                    const isActive = !!activeSessions[emp.id];
                                    const elapsed = getElapsedTime(emp.id);
                                    const totalHours = getTotalHours(emp.id);

                                    return (
                                        <div key={emp.id} className={`${styles.teamMember} ${isActive ? styles.active : ''}`}>
                                            <div className={styles.avatarWrapper}>
                                                <Avatar name={emp.name} size="md" status={isActive ? 'online' : 'offline'} />
                                            </div>
                                            <span className={styles.memberName}>{emp.name.split(' ')[0]}</span>
                                            {isActive ? (
                                                <span className={styles.memberTimer}>
                                                    <Timer size={12} />
                                                    {formatDuration(elapsed)}
                                                </span>
                                            ) : (
                                                <span className={styles.memberHours}>
                                                    {totalHours.hours}h {totalHours.minutes}m
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Swaps List (Tall) */}
                        <div className={`${styles.card} ${styles.swapsSection}`}>
                            <div className={styles.cardHeader}>
                                <h2>Pedidos Pendentes</h2>
                            </div>
                            <div className={styles.swapList}>
                                {swapRequests.filter(r => r.status === 'pending').map(req => (
                                    <div key={req.id} className={styles.swapItem}>
                                        <Avatar name={req.requestor} size="sm" />
                                        <div className={styles.swapInfo}>
                                            <span className={styles.swapName}>{req.requestor.split(' ')[0]}</span>
                                            <span className={styles.swapDate}>{req.targetDate}</span>
                                        </div>
                                        <div className={styles.swapArrow}>
                                            <ArrowLeftRight size={14} />
                                        </div>
                                    </div>
                                ))}
                                {pendingSwaps === 0 && (
                                    <div className={styles.emptySwaps}>Sem pedidos pendentes</div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </>
    );
}
