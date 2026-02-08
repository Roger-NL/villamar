import Head from 'next/head';
import { useState } from 'react';
import styles from '@/styles/AdminPages.module.css';
import formStyles from '@/styles/Forms.module.css';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import Avatar from '@/components/ui/Avatar';
import { useApp } from '../_app';
import { useData } from '@/contexts/DataContext';
import { mockCurrentUser, taskCategories } from '@/data/mockData';
import { ClipboardList, Check, Clock, Plus, X, Trash2, User } from 'lucide-react';

export default function AdminTarefasPage() {
    const { isAdmin, toggleMode } = useApp();
    const { tasks, employees, addTask, toggleTaskComplete, removeTask, isHydrated } = useData();
    const [filter, setFilter] = useState('all');
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        time: '09:00',
        category: 'cuidados',
        assignedTo: '',
        description: '',
    });

    const filteredTasks = filter === 'all'
        ? tasks
        : filter === 'completed'
            ? tasks.filter(t => t.completed)
            : tasks.filter(t => !t.completed);

    const completedCount = tasks.filter(t => t.completed).length;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (formData.title.trim()) {
            addTask({
                title: formData.title.trim(),
                time: formData.time,
                category: formData.category,
                assignedTo: formData.assignedTo ? parseInt(formData.assignedTo) : null,
                description: formData.description,
                priority: 'normal',
                date: new Date().toISOString().split('T')[0],
            });
            setFormData({ title: '', time: '09:00', category: 'cuidados', assignedTo: '', description: '' });
            setShowForm(false);
        }
    };

    const getEmployeeName = (id) => {
        const emp = employees.find(e => e.id === id);
        return emp ? emp.name : 'Não atribuído';
    };

    if (!isHydrated) {
        return <div>A carregar...</div>;
    }

    return (
        <>
            <Head>
                <title>Tarefas - Admin Villa Mar</title>
            </Head>

            <Header user={mockCurrentUser} isAdmin={isAdmin} onModeSwitch={toggleMode} />
            <Sidebar isAdmin={true} />
            <BottomNav isAdmin={true} />

            <main className={styles.main}>
                <div className={styles.container}>
                    <div className={styles.pageHeader}>
                        <h1 className={styles.pageTitle}>
                            <ClipboardList size={28} />
                            Tarefas
                        </h1>
                        <button className={styles.addButton} onClick={() => setShowForm(true)}>
                            <Plus size={20} />
                            Nova
                        </button>
                    </div>

                    {/* Add Task Modal */}
                    {showForm && (
                        <div className={formStyles.modalBackdrop} onClick={() => setShowForm(false)}>
                            <div className={formStyles.modal} onClick={e => e.stopPropagation()}>
                                <div className={formStyles.modalHeader}>
                                    <h2><ClipboardList size={24} /> Nova Tarefa</h2>
                                    <button className={formStyles.closeBtn} onClick={() => setShowForm(false)}>
                                        <X size={24} />
                                    </button>
                                </div>
                                <form onSubmit={handleSubmit}>
                                    <div className={formStyles.formGroup}>
                                        <label>Título</label>
                                        <input
                                            type="text"
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                            placeholder="Ex: Levante - Maria"
                                            autoFocus
                                            required
                                        />
                                    </div>
                                    <div className={formStyles.formGroup}>
                                        <label>Hora</label>
                                        <input
                                            type="time"
                                            value={formData.time}
                                            onChange={e => setFormData({ ...formData, time: e.target.value })}
                                        />
                                    </div>
                                    <div className={formStyles.formGroup}>
                                        <label>Categoria</label>
                                        <select
                                            value={formData.category}
                                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        >
                                            {Object.entries(taskCategories).map(([key, cat]) => (
                                                <option key={key} value={key}>{cat.emoji} {cat.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className={formStyles.formGroup}>
                                        <label>Atribuir a</label>
                                        <select
                                            value={formData.assignedTo}
                                            onChange={e => setFormData({ ...formData, assignedTo: e.target.value })}
                                        >
                                            <option value="">Nenhum (todos)</option>
                                            {employees.map(emp => (
                                                <option key={emp.id} value={emp.id}>{emp.name} - {emp.role}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className={formStyles.formGroup}>
                                        <label>Descrição (opcional)</label>
                                        <textarea
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Detalhes adicionais..."
                                        />
                                    </div>
                                    <div className={formStyles.formActions}>
                                        <button type="button" className={formStyles.cancelBtn} onClick={() => setShowForm(false)}>
                                            Cancelar
                                        </button>
                                        <button type="submit" className={formStyles.submitBtn}>
                                            <Plus size={18} />
                                            Criar Tarefa
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Progress */}
                    <div className={styles.progressSection}>
                        <div className={styles.progressBar}>
                            <div
                                className={styles.progressFill}
                                style={{ width: `${tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0}%` }}
                            ></div>
                        </div>
                        <span className={styles.progressText}>
                            {completedCount}/{tasks.length} concluídas
                        </span>
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

                    {/* Task List */}
                    <div className={styles.taskList}>
                        {filteredTasks.map(task => (
                            <div
                                key={task.id}
                                className={`${styles.taskCard} ${task.completed ? styles.completed : ''}`}
                            >
                                <div
                                    className={styles.taskCheckbox}
                                    onClick={() => toggleTaskComplete(task.id)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {task.completed ? <Check size={18} /> : null}
                                </div>
                                <div className={styles.taskContent}>
                                    <span className={styles.taskTitle}>{task.title}</span>
                                    <div className={styles.taskMeta}>
                                        <span className={styles.taskTime}>
                                            <Clock size={14} />
                                            {task.time}
                                        </span>
                                        {task.assignedTo && (
                                            <span className={styles.taskTime}>
                                                <User size={14} />
                                                {getEmployeeName(task.assignedTo)}
                                            </span>
                                        )}
                                        <span
                                            className={styles.taskCategory}
                                            style={{
                                                background: (taskCategories[task.category]?.color || '#999') + '20',
                                                color: taskCategories[task.category]?.color || '#999'
                                            }}
                                        >
                                            {taskCategories[task.category]?.emoji} {taskCategories[task.category]?.label || task.category}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    className={`${styles.actionIcon} ${styles.danger}`}
                                    onClick={() => removeTask(task.id)}
                                    title="Remover"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {filteredTasks.length === 0 && (
                        <div className={formStyles.emptyState}>
                            <ClipboardList size={48} />
                            <h3>Sem tarefas</h3>
                            <p>Clique em "Nova" para criar a primeira tarefa.</p>
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}
