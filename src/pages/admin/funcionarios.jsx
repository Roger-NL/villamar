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
import { mockCurrentUser } from '@/data/mockData';
import { Users, Plus, X, Trash2, UserPlus } from 'lucide-react';

export default function AdminFuncionariosPage() {
    const { isAdmin, toggleMode } = useApp();
    const { employees, addEmployee, removeEmployee, isHydrated } = useData();

    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ name: '', role: 'Cuidador' });
    const [confirmDelete, setConfirmDelete] = useState(null);

    const roles = ['Cuidador', 'Cuidadora', 'Auxiliar', 'Enfermeira', 'Enfermeiro', 'Médico', 'Médica'];

    const handleSubmit = (e) => {
        e.preventDefault();
        if (formData.name.trim()) {
            addEmployee({
                name: formData.name.trim(),
                role: formData.role,
                avatar: null,
            });
            setFormData({ name: '', role: 'Cuidador' });
            setShowForm(false);
        }
    };

    const handleDelete = (id) => {
        removeEmployee(id);
        setConfirmDelete(null);
    };

    if (!isHydrated) {
        return <div>A carregar...</div>;
    }

    return (
        <>
            <Head>
                <title>Funcionários - Admin Villa Mar</title>
            </Head>

            <Header user={mockCurrentUser} isAdmin={isAdmin} onModeSwitch={toggleMode} />
            <Sidebar isAdmin={true} />
            <BottomNav isAdmin={true} />

            <main className={styles.main}>
                <div className={styles.container}>
                    <div className={styles.pageHeader}>
                        <h1 className={styles.pageTitle}>
                            <Users size={28} />
                            Funcionários
                        </h1>
                        <button
                            className={styles.addButton}
                            onClick={() => setShowForm(true)}
                        >
                            <Plus size={20} />
                            Novo
                        </button>
                    </div>

                    {/* Add Form Modal */}
                    {showForm && (
                        <div className={formStyles.modalBackdrop} onClick={() => setShowForm(false)}>
                            <div className={formStyles.modal} onClick={e => e.stopPropagation()}>
                                <div className={formStyles.modalHeader}>
                                    <h2><UserPlus size={24} /> Novo Funcionário</h2>
                                    <button className={formStyles.closeBtn} onClick={() => setShowForm(false)}>
                                        <X size={24} />
                                    </button>
                                </div>
                                <form onSubmit={handleSubmit}>
                                    <div className={formStyles.formGroup}>
                                        <label>Nome Completo</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Ex: Maria Silva"
                                            autoFocus
                                            required
                                        />
                                    </div>
                                    <div className={formStyles.formGroup}>
                                        <label>Função</label>
                                        <select
                                            value={formData.role}
                                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                                        >
                                            {roles.map(role => (
                                                <option key={role} value={role}>{role}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className={formStyles.formActions}>
                                        <button type="button" className={formStyles.cancelBtn} onClick={() => setShowForm(false)}>
                                            Cancelar
                                        </button>
                                        <button type="submit" className={formStyles.submitBtn}>
                                            <UserPlus size={18} />
                                            Adicionar
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Delete Confirmation Modal */}
                    {confirmDelete && (
                        <div className={formStyles.modalBackdrop} onClick={() => setConfirmDelete(null)}>
                            <div className={formStyles.modal} onClick={e => e.stopPropagation()}>
                                <div className={formStyles.modalHeader}>
                                    <h2>Remover Funcionário?</h2>
                                </div>
                                <p className={formStyles.confirmText}>
                                    Tem a certeza que deseja remover <strong>{confirmDelete.name}</strong>?
                                    Esta ação não pode ser desfeita.
                                </p>
                                <div className={formStyles.formActions}>
                                    <button className={formStyles.cancelBtn} onClick={() => setConfirmDelete(null)}>
                                        Cancelar
                                    </button>
                                    <button className={formStyles.dangerBtn} onClick={() => handleDelete(confirmDelete.id)}>
                                        <Trash2 size={18} />
                                        Remover
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Team Grid */}
                    <div className={styles.employeeGrid}>
                        {employees.map(emp => (
                            <div key={emp.id} className={styles.employeeCard}>
                                <Avatar name={emp.name} size="xl" />
                                <h3>{emp.name}</h3>
                                <span className={styles.role}>{emp.role}</span>
                                <div style={{ background: '#F3F4F6', padding: '4px 12px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 'bold', color: '#4B5563', margin: '4px 0' }}>
                                    PIN: {emp.pin || '1234'}
                                </div>
                                <div className={styles.employeeActions}>
                                    <button
                                        className={`${styles.actionIcon} ${styles.danger}`}
                                        onClick={() => setConfirmDelete(emp)}
                                        title="Remover"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {employees.length === 0 && (
                        <div className={formStyles.emptyState}>
                            <Users size={48} />
                            <h3>Sem funcionários</h3>
                            <p>Clique em "Novo" para adicionar o primeiro funcionário.</p>
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}
