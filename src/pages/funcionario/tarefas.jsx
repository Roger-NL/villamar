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
import { mockCurrentUser, taskCategories } from '@/data/mockData';
import { ClipboardList, CheckCircle, Clock, AlertTriangle, Check, Users } from 'lucide-react';

export default function TarefasPage() {
    const { isAdmin, toggleMode, currentUser } = useApp();
    const { tasks, toggleTaskComplete, employees, isHydrated } = useData();
    const [filter, setFilter] = useState('all');
    const [showColleagueTasks, setShowColleagueTasks] = useState(false);

    // Separar tarefas: minhas vs. colegas
    const { myTasks, colleagueTasks } = useMemo(() => {
        const mine = tasks.filter(t => t.assignedTo === currentUser.id || !t.assignedTo);
        const colleagues = tasks.filter(t => t.assignedTo && t.assignedTo !== currentUser.id);
        return { myTasks: mine, colleagueTasks: colleagues };
    }, [tasks, currentUser.id]);

    // Aplicar filtro às minhas tarefas
    const filteredMyTasks = myTasks.filter(task => {
        if (filter === 'pending') return !task.completed;
        if (filter === 'completed') return task.completed;
        return true;
    });

    const completedCount = myTasks.filter(t => t.completed).length;
    const pendingCount = myTasks.filter(t => !t.completed).length;
    const highPriorityCount = myTasks.filter(t => t.priority === 'high' && !t.completed).length;

    const getEmployeeName = (id) => {
        const emp = employees.find(e => e.id === id);
        return emp ? emp.name : 'Desconhecido';
    };

    if (!isHydrated) {
        return <div>A carregar...</div>;
    }

    return (
        <>
            <Head>
                <title>Minhas Tarefas - Villa Mar</title>
            </Head>

            <Header
                user={mockCurrentUser}
                isAdmin={isAdmin}
                onModeSwitch={toggleMode}
            />
            <Sidebar isAdmin={false} />
            <BottomNav isAdmin={false} />

            <main className={dashStyles.main}>
                <div className={dashStyles.container}>
                    <section className={dashStyles.greeting}>
                        <div className={dashStyles.greetingText}>
                            <span className={dashStyles.greetingLine}>
                                <ClipboardList size={20} />
                                Minhas Tarefas
                            </span>
                            <p className={dashStyles.greetingSubtext}>
                                {completedCount} de {myTasks.length} concluídas hoje
                            </p>
                        </div>
                    </section>

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
                        <Card padding="sm" className={styles.statCard}>
                            <AlertTriangle size={18} className={`${styles.statIcon} ${styles.warningIcon}`} />
                            <span className={styles.statNumber}>{highPriorityCount}</span>
                            <span className={styles.statLabel}>Urgentes</span>
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
                                <p>Nenhuma tarefa encontrada</p>
                            </Card>
                        ) : (
                            filteredMyTasks.map(task => (
                                <div
                                    key={task.id}
                                    className={`${styles.taskItem} ${task.completed ? styles.completed : ''}`}
                                    onClick={() => toggleTaskComplete(task.id)}
                                >
                                    <div className={styles.taskCheckbox}>
                                        {task.completed && <Check size={16} />}
                                    </div>
                                    <div className={styles.taskInfo}>
                                        <span className={styles.taskTitle}>{task.title}</span>
                                        <div className={styles.taskMeta}>
                                            <span className={styles.taskTime}>
                                                <Clock size={12} />
                                                {task.time}
                                            </span>
                                            {taskCategories[task.category] && (
                                                <span
                                                    className={styles.taskCategory}
                                                    style={{
                                                        background: taskCategories[task.category].color + '20',
                                                        color: taskCategories[task.category].color
                                                    }}
                                                >
                                                    {taskCategories[task.category].emoji} {taskCategories[task.category].label}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* COLLEAGUE TASKS SECTION */}
                    {colleagueTasks.length > 0 && (
                        <div className={styles.colleagueSection}>
                            <button
                                className={styles.colleagueToggle}
                                onClick={() => setShowColleagueTasks(!showColleagueTasks)}
                            >
                                <Users size={18} />
                                <span>Tarefas dos Colegas ({colleagueTasks.length})</span>
                                <span className={styles.toggleIcon}>{showColleagueTasks ? '−' : '+'}</span>
                            </button>

                            {showColleagueTasks && (
                                <div className={styles.colleagueTasks}>
                                    {colleagueTasks.map(task => (
                                        <div
                                            key={task.id}
                                            className={`${styles.taskItem} ${styles.colleagueTask} ${task.completed ? styles.completed : ''}`}
                                        >
                                            <div className={styles.taskCheckbox}>
                                                {task.completed && <Check size={16} />}
                                            </div>
                                            <div className={styles.taskInfo}>
                                                <span className={styles.taskTitle}>{task.title}</span>
                                                <div className={styles.taskMeta}>
                                                    <span className={styles.taskTime}>
                                                        <Clock size={12} />
                                                        {task.time}
                                                    </span>
                                                    <span className={styles.assignedTo}>
                                                        → {getEmployeeName(task.assignedTo)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Photo Tip */}
                    <Card padding="md" variant="outline" className={styles.tip}>
                        <p>📸 <strong>Dica:</strong> Pode marcar tarefas como concluídas tocando nelas.</p>
                    </Card>
                </div>
            </main>
        </>
    );
}
