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
import { mockCurrentUser, mockEmployees } from '@/data/mockData';
import { Users, Plus, X, Trash2, UserPlus } from 'lucide-react';

export default function AdminFuncionariosPage() {
    const { isAdmin, toggleMode } = useApp();
    const { employees, addEmployee, updateEmployee, removeEmployee, isHydrated } = useData();

    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ name: '', role: 'Cuidador', shiftPreference: 'Dia', pin: '', isAdmin: false });

    const [editingEmployee, setEditingEmployee] = useState(null);
    const [editFormData, setEditFormData] = useState({ name: '', role: 'Cuidador', shiftPreference: 'Dia', pin: '', isAdmin: false });

    const [confirmDelete, setConfirmDelete] = useState(null);

    const roles = ['Cuidador', 'Cuidadora', 'Auxiliar', 'Enfermeira', 'Enfermeiro', 'Médico', 'Médica', 'Coordenador', 'Encarregado', 'Auxiliary_Cozinha'];

    const handleSyncEmployees = async () => {
        const excludedIds = [1, 2, 3, 4]; // Direção/Gestão
        let addedCount = 0;
        let updatedCount = 0;

        for (const mockEmp of mockEmployees) {
            if (excludedIds.includes(mockEmp.id)) continue;

            const existingEmp = employees.find(e => e.id === mockEmp.id || e.name === mockEmp.name);
            if (!existingEmp) {
                await addEmployee({
                    id: mockEmp.id,
                    name: mockEmp.name,
                    role: mockEmp.role,
                    pin: mockEmp.pin,
                    isAdmin: mockEmp.isAdmin || false,
                    shiftPreference: mockEmp.role === 'Cuidadora' && (mockEmp.id >= 15 && mockEmp.id <= 18) ? 'Noite' : 'Dia'
                });
                addedCount++;
            } else {
                // Update their data
                await updateEmployee(existingEmp.id, {
                    name: mockEmp.name,
                    role: mockEmp.role,
                    pin: mockEmp.pin,
                    isAdmin: mockEmp.isAdmin || false,
                    shiftPreference: mockEmp.role === 'Cuidadora' && (mockEmp.id >= 15 && mockEmp.id <= 18) ? 'Noite' : existingEmp.shiftPreference || 'Dia'
                });
                updatedCount++;
            }
        }
        alert(`Sincronização concluída! ${addedCount} novos adicionados, ${updatedCount} atualizados no Firebase.`);
    };


    const handleSubmit = (e) => {
        e.preventDefault();
        if (formData.name.trim()) {
            addEmployee({
                name: formData.name.trim(),
                role: formData.role,
                shiftPreference: formData.shiftPreference,
                pin: formData.pin || Math.floor(1000 + Math.random() * 9000).toString(),
                isAdmin: formData.isAdmin,
                avatar: null,
            });
            setFormData({ name: '', role: 'Cuidador', shiftPreference: 'Dia', pin: '', isAdmin: false });
            setShowForm(false);
        }
    };

    const handleEditClick = (emp) => {
        setEditFormData({
            name: emp.name,
            role: emp.role,
            shiftPreference: emp.shiftPreference || 'Dia',
            pin: emp.pin || '',
            isAdmin: emp.isAdmin || false,
        });
        setEditingEmployee(emp);
    };

    const handleEditSubmit = (e) => {
        e.preventDefault();
        if (editFormData.name.trim()) {
            updateEmployee(editingEmployee.id, {
                name: editFormData.name.trim(),
                role: editFormData.role,
                shiftPreference: editFormData.shiftPreference,
                pin: editFormData.pin || Math.floor(1000 + Math.random() * 9000).toString(),
                isAdmin: editFormData.isAdmin,
            });
            setEditingEmployee(null);
        }
    };

    const handleDeleteFromEdit = () => {
        setConfirmDelete(editingEmployee);
        setEditingEmployee(null);
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
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                className={styles.secondaryButton}
                                onClick={handleSyncEmployees}
                                title="Importar/Sincronizar funcionários baseados na escala"
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '12px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                <UserPlus size={18} />
                                Sincronizar Escala
                            </button>
                            <button
                                className={styles.addButton}
                                onClick={() => setShowForm(true)}
                            >
                                <Plus size={20} />
                                Novo
                            </button>
                        </div>
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
                                        <label>PIN (Senha)</label>
                                        <input
                                            type="text"
                                            value={formData.pin}
                                            onChange={e => setFormData({ ...formData, pin: e.target.value })}
                                            placeholder="Gerado automaticamente se vazio"
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
                                    <div className={formStyles.formGroup}>
                                        <label>Turno Habitual</label>
                                        <select
                                            value={formData.shiftPreference}
                                            onChange={e => setFormData({ ...formData, shiftPreference: e.target.value })}
                                        >
                                            <option value="Dia">Diurno (Dia)</option>
                                            <option value="Noite">Noturno (Noite)</option>
                                        </select>
                                    </div>
                                    <div className={formStyles.formGroup}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={formData.isAdmin}
                                                onChange={e => setFormData({ ...formData, isAdmin: e.target.checked })}
                                                style={{ width: 'auto' }}
                                            />
                                            Permissão de Administrador
                                        </label>
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

                    {/* Edit Form Modal */}
                    {editingEmployee && (
                        <div className={formStyles.modalBackdrop} onClick={() => setEditingEmployee(null)}>
                            <div className={formStyles.modal} onClick={e => e.stopPropagation()}>
                                <div className={formStyles.modalHeader}>
                                    <h2>Editar Funcionário</h2>
                                    <button className={formStyles.closeBtn} onClick={() => setEditingEmployee(null)}>
                                        <X size={24} />
                                    </button>
                                </div>
                                <form onSubmit={handleEditSubmit}>
                                    <div className={formStyles.formGroup}>
                                        <label>Nome Completo</label>
                                        <input
                                            type="text"
                                            value={editFormData.name}
                                            onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className={formStyles.formGroup}>
                                        <label>PIN (Senha)</label>
                                        <input
                                            type="text"
                                            value={editFormData.pin}
                                            onChange={e => setEditFormData({ ...editFormData, pin: e.target.value })}
                                            placeholder="Ex: 1234"
                                            required
                                        />
                                    </div>
                                    <div className={formStyles.formGroup}>
                                        <label>Função</label>
                                        <select
                                            value={editFormData.role}
                                            onChange={e => setEditFormData({ ...editFormData, role: e.target.value })}
                                        >
                                            {roles.map(role => (
                                                <option key={role} value={role}>{role}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className={formStyles.formGroup}>
                                        <label>Turno Habitual</label>
                                        <select
                                            value={editFormData.shiftPreference}
                                            onChange={e => setEditFormData({ ...editFormData, shiftPreference: e.target.value })}
                                        >
                                            <option value="Dia">Diurno (Dia)</option>
                                            <option value="Noite">Noturno (Noite)</option>
                                        </select>
                                    </div>
                                    <div className={formStyles.formGroup}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={editFormData.isAdmin}
                                                onChange={e => setEditFormData({ ...editFormData, isAdmin: e.target.checked })}
                                                style={{ width: 'auto' }}
                                            />
                                            Permissão de Administrador
                                        </label>
                                    </div>
                                    <div className={formStyles.formActions}>
                                        <button type="button" className={formStyles.dangerBtn} onClick={handleDeleteFromEdit}>
                                            <Trash2 size={18} />
                                            Excluir
                                        </button>
                                        <div style={{ flex: 1 }}></div>
                                        <button type="button" className={formStyles.cancelBtn} onClick={() => setEditingEmployee(null)}>
                                            Cancelar
                                        </button>
                                        <button type="submit" className={formStyles.submitBtn}>
                                            Salvar
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
                            <div
                                key={emp.id}
                                className={styles.employeeCard}
                                onClick={() => handleEditClick(emp)}
                                style={{ cursor: 'pointer', position: 'relative' }}
                                title="Clique para editar"
                            >
                                {emp.isAdmin && (
                                    <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#3b82f6', color: 'white', fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 6px', borderRadius: '8px' }}>
                                        ADMIN
                                    </div>
                                )}
                                <Avatar name={emp.name} size="xl" />
                                <h3>{emp.name}</h3>
                                <span className={styles.role}>{emp.role}</span>
                                <div style={{ background: emp.shiftPreference === 'Noite' ? '#1e293b' : '#F3F4F6', padding: '4px 12px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 'bold', color: emp.shiftPreference === 'Noite' ? '#f8fafc' : '#4B5563', margin: '4px 0' }}>
                                    Turno: {emp.shiftPreference === 'Noite' ? 'Noturno' : 'Diurno'}
                                </div>
                                <div style={{ background: '#F3F4F6', padding: '4px 12px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 'bold', color: '#4B5563', margin: '4px 0' }}>
                                    PIN: {emp.pin || '1234'}
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
