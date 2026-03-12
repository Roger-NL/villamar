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
    CheckCircle, Clock, Timer, Bell, Plus, Trash2, Send
} from 'lucide-react';
import { getRealScheduleData } from '@/data/mockData';

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
        swapRequests,
        activeSessions,
        isHydrated,
        getTotalHours,
        dailyPlans,
        dailyAnnouncements,
        addDailyAnnouncement,
        removeDailyAnnouncement
    } = useData();

    const [newAnnouncement, setNewAnnouncement] = useState('');
    const [announcementSeverity, setAnnouncementSeverity] = useState('normal');
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

    // Filtrar funcionários para excluir administradores da lista (excepto Roger)
    const validTeamEmployees = employees.filter(emp => !emp.isAdmin || emp.name.toLowerCase().includes('roger'));

    const presentCount = validTeamEmployees.filter(emp => activeSessions[emp.id]).length;
    const absentCount = validTeamEmployees.length - presentCount;
    const pendingSwaps = swapRequests.filter(r => r.status === 'pending').length;

    // Calcular progresso baseado nos Planos Diários de hoje
    const today = new Date();
    const tzOffset = today.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, 10);
    const dayPlan = dailyPlans[localISOTime];
    const nightPlan = dailyPlans[`${localISOTime}_NIGHT`];

    let totalTasks = 0;
    let completedTasks = 0;

    const countTasks = (plan) => {
        if (!plan || !plan.publishedAt || !plan.assignments) return;
        const taskKeys = Object.keys(plan.assignments);
        totalTasks += taskKeys.length;
        taskKeys.forEach(taskId => {
            if (plan.statuses?.[taskId]?.completed) {
                completedTasks++;
            }
        });
    };

    countTasks(dayPlan);
    countTasks(nightPlan);

    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Obter dados reais da escala para o dia de hoje
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-indexed, Março = 2
    const currentDayIndex = today.getDate() - 1; // 0-indexed, dia 3 = 2

    // Fallback import for now, better to get it from DataContext or mockData directly if available
    // For MVP we can just import it at top of file, but let's assume it's available or we rewrite logic

    // We already have mockEmployees inside employees list, but let's just use a simpler check for MVP avoiding full circular deps
    // Removed duplicate import of getRealScheduleData as it's now at the top of the file.
    const scheduleData = getRealScheduleData(currentYear, currentMonth);

    // Function to check if employee is scheduled today
    const isScheduledToday = (empId) => {
        if (!scheduleData) return false;

        for (const section of scheduleData.sections) {
            const empFromSchedule = section.employees.find((e) => {
                // Try to match by ID based on order or name if possible. 
                // Since getRealScheduleData doesn't expose ID directly, we map by name
                const eName = e.name.toLowerCase().split(' ')[0];
                const empName = employees.find(x => x.id === empId)?.name.toLowerCase().split(' ')[0];
                return eName === empName;
            });

            if (empFromSchedule) {
                const shiftCode = empFromSchedule.days[currentDayIndex];
                return shiftCode !== null && shiftCode !== undefined && shiftCode !== '';
            }
        }
        return false;
    };


    // Funcionários ordenados: Marta, Vera, Joao no topo, depois em serviço
    const sortedEmployees = [...validTeamEmployees].sort((a, b) => {
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

    const handleAddAnnouncement = async () => {
        if (!newAnnouncement.trim()) return;
        await addDailyAnnouncement(newAnnouncement.trim(), currentUser?.name?.split(' ')[0] || 'Admin', announcementSeverity);
        setNewAnnouncement('');
        setAnnouncementSeverity('normal');
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
                                <h2>Equipa (Escalados Hoje)</h2>
                                {presentCount > 0 && <div className={styles.dot}></div>}
                            </div>
                            <div className={styles.teamGrid}>
                                {sortedEmployees
                                    .filter(emp => activeSessions[emp.id] || isScheduledToday(emp.id))
                                    .slice(0, 10)
                                    .map(emp => {
                                        const isActive = !!activeSessions[emp.id];
                                        const elapsed = getElapsedTime(emp.id);

                                        return (
                                            <div key={emp.id} className={`${styles.teamMember} ${isActive ? styles.active : ''}`} style={{ background: isActive ? '#F8FAFC' : '#FFFFFF', padding: '12px', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', border: '1px solid #E2E8F0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', opacity: isActive ? 1 : 0.6 }}>
                                                <div className={styles.avatarWrapper} style={{ position: 'relative' }}>
                                                    <Avatar name={emp.name} size="lg" status={isActive ? 'online' : 'offline'} />
                                                </div>
                                                <span className={styles.memberName} style={{ fontWeight: '600', color: '#1E293B', fontSize: '0.95rem' }}>{emp.name.split(' ')[0]}</span>
                                                {isActive ? (
                                                    <span className={styles.memberTimer} style={{ color: '#3B82F6', background: '#DBEAFE', padding: '4px 10px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Timer size={14} />
                                                        {formatDuration(elapsed)}
                                                    </span>
                                                ) : (
                                                    <span className={styles.memberTimer} style={{ color: '#64748B', background: '#F1F5F9', padding: '4px 10px', borderRadius: '20px', fontWeight: '600', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Clock size={14} />
                                                        Pendente
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                {sortedEmployees.filter(emp => activeSessions[emp.id] || isScheduledToday(emp.id)).length === 0 && (
                                    <div style={{ gridColumn: '1 / -1', padding: '32px 0', textAlign: 'center', color: '#94A3B8', fontSize: '0.9rem' }}>
                                        Nenhum funcionário escalado para hoje.
                                    </div>
                                )}
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

                        {/* Avisos Diários */}
                        <div className={`${styles.card} ${styles.teamSection}`} style={{ gridColumn: '1 / -1' }}>
                            <div className={styles.cardHeader}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Bell size={20} color="#0284C7" />
                                    <h2>Quadro de Avisos Diários</h2>
                                </div>
                            </div>

                            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <input
                                        type="text"
                                        placeholder="Novo aviso... (Dica: use '{nome}' para chamar pelo nome de quem está a ver)"
                                        value={newAnnouncement}
                                        onChange={(e) => setNewAnnouncement(e.target.value)}
                                        style={{ flex: '1 1 300px', padding: '12px 16px', borderRadius: '12px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '14px' }}
                                        onKeyPress={(e) => e.key === 'Enter' && handleAddAnnouncement()}
                                    />
                                    <select
                                        value={announcementSeverity}
                                        onChange={(e) => setAnnouncementSeverity(e.target.value)}
                                        style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '14px', background: '#fff', cursor: 'pointer' }}
                                    >
                                        <option value="normal">Normal (Verde)</option>
                                        <option value="grave">Grave (Amarelo)</option>
                                        <option value="gravissimo">Gravíssimo (Vermelho)</option>
                                    </select>
                                    <button
                                        onClick={handleAddAnnouncement}
                                        disabled={!newAnnouncement.trim()}
                                        style={{ background: newAnnouncement.trim() ? '#0284C7' : '#E2E8F0', color: newAnnouncement.trim() ? '#fff' : '#94A3B8', border: 'none', borderRadius: '12px', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '8px', cursor: newAnnouncement.trim() ? 'pointer' : 'default', transition: 'all 0.2s', fontWeight: 'bold' }}
                                    >
                                        <Send size={16} /> Adicionar
                                    </button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {dailyAnnouncements && dailyAnnouncements.length > 0 ? (
                                        dailyAnnouncements.map((announcement) => {
                                            const sevColors = {
                                                normal: { bg: '#F0FDF4', border: '#22C55E' },
                                                grave: { bg: '#FEFCE8', border: '#EAB308' },
                                                gravissimo: { bg: '#FEF2F2', border: '#EF4444' }
                                            };
                                            const colorInfo = sevColors[announcement.severity || 'normal'] || sevColors.normal;

                                            return (
                                                <div key={announcement.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: colorInfo.bg, padding: '12px 16px', borderRadius: '12px', borderLeft: `4px solid ${colorInfo.border}` }}>
                                                    <div>
                                                        <span style={{ fontSize: '14px', color: '#1E293B' }}>{announcement.text}</span>
                                                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>Adicionado por {announcement.authorName} • {new Date(announcement.createdAt).toLocaleString('pt-PT')}</div>
                                                    </div>
                                                    <button
                                                        onClick={() => removeDailyAnnouncement(announcement.id)}
                                                        style={{ background: '#FEE2E2', color: '#EF4444', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                        title="Apagar Aviso"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            )
                                        })
                                    ) : (
                                        <div style={{ textAlign: 'center', color: '#94A3B8', padding: '24px 0', fontSize: '14px' }}>
                                            Nenhum aviso ativo. Adicione um aviso em cima.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </main >
        </>
    );
}
