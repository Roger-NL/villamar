import Head from 'next/head';
import { useState, useMemo } from 'react';
import styles from '@/styles/Tasks.module.css';
import dashStyles from '@/styles/Dashboard.module.css';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import Card from '@/components/ui/Card';
import { useApp } from '../_app';
import { useData } from '@/contexts/DataContext';
import { planoDiarioTemplate, planoDiarioNoturnoTemplate } from '@/data/planoDiarioTemplate';
import { ClipboardList, CheckCircle, Clock, Check, Users, AlertCircle } from 'lucide-react';

export default function TarefasPage() {
    const { isAdmin, toggleMode, currentUser } = useApp();
    const { dailyPlans, toggleDailyTaskComplete, isHydrated } = useData();
    const [filter, setFilter] = useState('all');

    const tzOffset = (new Date()).getTimezoneOffset() * 60000;
    const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, 10);
    const selectedDate = localISOTime;

    const dayPlan = dailyPlans[selectedDate];
    const nightPlan = dailyPlans[`${selectedDate}_NIGHT`];
    const isPublished = (dayPlan && dayPlan.publishedAt) || (nightPlan && nightPlan.publishedAt);

    // Filter tasks from the template based on assignments
    const myTasks = useMemo(() => {
        const tasks = [];

        const processTemplate = (template, plan, planKey) => {
            if (!plan || !plan.publishedAt) return;
            template.blocks.forEach(block => {
                if (block.type === 'group_assignment') {
                    block.columns.forEach((colName, colIdx) => {
                        const taskId = `${block.id}_${colIdx}`;
                        const assignedEmpId = plan.assignments?.[taskId];
                        if (assignedEmpId && assignedEmpId.toString() === currentUser?.id?.toString()) {
                            const status = plan.statuses?.[taskId] || {};
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
                                    const resStatus = plan.residentStatuses?.[`${block.id}:${r}`];
                                    return resStatus ? `${customName} (${resStatus})` : customName;
                                });

                                tasks.push({
                                    id: taskId,
                                    label: `${block.name} — ${block.columns[colIdx]} (${formattedResidents.join(', ')})`,
                                    blockName: template.name === 'Plano Individual de trabalho Noturno' ? 'Noturno' : block.name,
                                    time: 'Turno',
                                    completed: !!status.completed,
                                    completedAt: status.completedAt,
                                    planKey: planKey
                                });
                            }
                        }
                    });
                } else if (block.items) {
                    block.items.forEach(item => {
                        const assignedEmpId = plan.assignments?.[item.id];
                        if (assignedEmpId && assignedEmpId.toString() === currentUser?.id?.toString()) {
                            const status = plan.statuses?.[item.id] || {};
                            const customLabel = plan.customLabels?.[item.id] || item.label;
                            tasks.push({
                                ...item,
                                label: customLabel,
                                blockName: template.name === 'Plano Individual de trabalho Noturno' ? 'Noturno' : block.name,
                                time: item.time || block.time || 'Diário',
                                completed: !!status.completed,
                                completedAt: status.completedAt,
                                planKey: planKey
                            });
                        }
                    });
                }
            });
        };

        processTemplate(planoDiarioTemplate, dayPlan, selectedDate);
        processTemplate(planoDiarioNoturnoTemplate, nightPlan, `${selectedDate}_NIGHT`);

        return tasks;
    }, [dayPlan, nightPlan, currentUser]);

    const filteredMyTasks = myTasks.filter(task => {
        if (filter === 'pending') return !task.completed;
        if (filter === 'completed') return task.completed;
        return true;
    });

    const completedCount = myTasks.filter(t => t.completed).length;
    const pendingCount = myTasks.filter(t => !t.completed).length;

    const handleToggleComplete = (planKey, taskId) => {
        toggleDailyTaskComplete(planKey, taskId, currentUser?.id);
    };

    if (!isHydrated) {
        return <div style={{ padding: '2rem' }}>A carregar...</div>;
    }

    return (
        <>
            <Head>
                <title>Minhas Tarefas - Villa Mar</title>
            </Head>

            <Header user={currentUser} isAdmin={isAdmin} onModeSwitch={toggleMode} />
            <Sidebar isAdmin={false} />
            <BottomNav isAdmin={false} />

            <main className={dashStyles.main}>
                <div className={dashStyles.container}>
                    <section className={dashStyles.greeting}>
                        <div className={dashStyles.greetingText}>
                            <span className={dashStyles.greetingLine}>
                                <ClipboardList size={20} />
                                Minhas Tarefas do Dia
                            </span>
                            <p className={dashStyles.greetingSubtext}>
                                {isPublished
                                    ? `${completedCount} de ${myTasks.length} concluídas hoje`
                                    : 'A aguardar publicação do plano diário.'}
                            </p>
                        </div>
                    </section>

                    {!isPublished ? (
                        <Card padding="lg" variant="outline" style={{ textAlign: 'center', marginTop: '2rem', color: '#64748b' }}>
                            <Clock size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                            <h3>Plano em Elaboração</h3>
                            <p>O plano de trabalho diário ainda não foi publicado pela coordenação.</p>
                        </Card>
                    ) : (
                        <>
                            {/* Stats */}
                            <div className={styles.statsRow}>
                                <Card padding="sm" className={styles.statCard}>
                                    <Clock size={18} className={styles.statIcon} />
                                    <span className={styles.statNumber}>{pendingCount}</span>
                                    <span className={styles.statLabel}>Pendentes</span>
                                </Card>
                                <Card padding="sm" className={styles.statCard}>
                                    <CheckCircle size={18} className={`${styles.statIcon} ${styles.successIcon}`} />
                                    <span className={styles.statNumber}>{completedCount}</span>
                                    <span className={styles.statLabel}>Concluídas</span>
                                </Card>
                            </div>

                            {/* Filters */}
                            <div className={styles.filters}>
                                <button
                                    className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
                                    onClick={() => setFilter('all')}
                                >
                                    Todas
                                </button>
                                <button
                                    className={`${styles.filterBtn} ${filter === 'pending' ? styles.active : ''}`}
                                    onClick={() => setFilter('pending')}
                                >
                                    Pendentes
                                </button>
                                <button
                                    className={`${styles.filterBtn} ${filter === 'completed' ? styles.active : ''}`}
                                    onClick={() => setFilter('completed')}
                                >
                                    Concluídas
                                </button>
                            </div>

                            {/* MY TASKS */}
                            <div className={styles.taskList}>
                                {filteredMyTasks.length === 0 ? (
                                    <Card padding="lg" className={styles.emptyCard}>
                                        <CheckCircle size={32} />
                                        <p>{filter === 'all' ? 'Não tens tarefas atribuídas para hoje.' : 'Nenhuma tarefa encontrada neste filtro.'}</p>
                                    </Card>
                                ) : (
                                    filteredMyTasks.map(task => (
                                        <div
                                            key={task.id}
                                            className={`${styles.taskItem} ${task.completed ? styles.completed : ''}`}
                                            onClick={() => handleToggleComplete(task.planKey, task.id)}
                                        >
                                            <div className={styles.taskCheckbox}>
                                                {task.completed && <Check size={16} />}
                                            </div>
                                            <div className={styles.taskInfo}>
                                                <span className={styles.taskTitle}>
                                                    {task.label}
                                                </span>
                                                <div className={styles.taskMeta}>
                                                    <span className={styles.taskCategory} style={{ background: '#f1f5f9', color: '#475569' }}>
                                                        {task.blockName}
                                                    </span>
                                                    <span className={styles.taskTime}>
                                                        <Clock size={12} />
                                                        {task.time}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <Card padding="md" variant="outline" className={styles.tip}>
                                <p>📸 <strong>Dica:</strong> Toque nas tarefas para marcá-las como concluídas.</p>
                            </Card>
                        </>
                    )}
                </div>
            </main>
        </>
    );
}
