import Head from 'next/head';
import { useState, useMemo } from 'react';
import styles from '@/styles/AdminPages.module.css';
import formStyles from '@/styles/Forms.module.css';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import Avatar from '@/components/ui/Avatar';
import Card from '@/components/ui/Card';
import { useApp } from '../_app';
import { useData } from '@/contexts/DataContext';
import { CalendarRange, Plus, X, Trash2 } from 'lucide-react';

export default function FeriaseLicencasPage() {
    const { isAdmin, toggleMode, currentUser } = useApp();
    const { employees, leaves, addLeave, deleteLeave } = useData();

    // Estado do Formulário
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        employeeId: '',
        type: 'Férias',
        startDate: '',
        endDate: '',
        reason: ''
    });

    const validTeamEmployees = employees.filter(emp => !emp.isAdmin || emp.name.toLowerCase().includes('roger'));

    const sortedLeaves = useMemo(() => {
        return [...leaves].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    }, [leaves]);

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.employeeId || !formData.startDate || !formData.endDate) {
            alert('Por favor preencha todos os campos obrigatórios.');
            return;
        }

        if (new Date(formData.endDate) < new Date(formData.startDate)) {
            alert('A data de fim não pode ser anterior à data de início.');
            return;
        }

        const employee = validTeamEmployees.find(emp => emp.id.toString() === formData.employeeId.toString());

        addLeave({
            employeeId: employee.id,
            employeeName: employee.name,
            type: formData.type,
            startDate: formData.startDate,
            endDate: formData.endDate,
            reason: formData.reason,
            createdAt: new Date().toISOString()
        });

        setShowForm(false);
        setFormData({ employeeId: '', type: 'Férias', startDate: '', endDate: '', reason: '' });
    };

    const handleDelete = (id) => {
        if (confirm('Tem a certeza que pretende eliminar este registo?')) {
            deleteLeave(id);
        }
    };

    return (
        <>
            <Head>
                <title>Férias & Licenças - Admin</title>
            </Head>

            <Header user={currentUser} isAdmin={isAdmin} onModeSwitch={toggleMode} />
            <Sidebar isAdmin={true} />
            <BottomNav isAdmin={true} />

            <main className={styles.main}>
                <div className={styles.container}>
                    <div className={styles.pageHeader}>
                        <h1 className={styles.pageTitle}>
                            <CalendarRange size={28} />
                            Férias & Licenças
                        </h1>
                        <button className={styles.primaryButton} onClick={() => setShowForm(!showForm)}>
                            {showForm ? <X size={20} /> : <Plus size={20} />}
                            {showForm ? 'Cancelar' : 'Novo Registo'}
                        </button>
                    </div>

                    {showForm && (
                        <Card className={formStyles.formCard} padding="lg">
                            <h2 style={{ margin: '0 0 20px', fontSize: '1.25rem' }}>Adicionar Período de Ausência</h2>
                            <form onSubmit={handleSubmit} className={formStyles.form}>
                                <div className={formStyles.formGroup}>
                                    <label>Colaborador *</label>
                                    <select
                                        value={formData.employeeId}
                                        onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                                        required
                                        className={formStyles.input}
                                    >
                                        <option value="">Selecione um colaborador...</option>
                                        {validTeamEmployees.map(emp => (
                                            <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className={formStyles.formGroup}>
                                    <label>Tipo de Ausência *</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        className={formStyles.input}
                                    >
                                        <option value="Férias">Férias</option>
                                        <option value="Licença">Licença (Baixa, Maternidade, etc)</option>
                                    </select>
                                </div>

                                <div className={formStyles.rowFormGroup}>
                                    <div className={formStyles.formGroup} style={{ flex: 1 }}>
                                        <label>Data de Início *</label>
                                        <input
                                            type="date"
                                            value={formData.startDate}
                                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                            required
                                            className={formStyles.input}
                                        />
                                    </div>
                                    <div className={formStyles.formGroup} style={{ flex: 1 }}>
                                        <label>Data de Fim *</label>
                                        <input
                                            type="date"
                                            value={formData.endDate}
                                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                            required
                                            className={formStyles.input}
                                        />
                                    </div>
                                </div>

                                <div className={formStyles.formGroup}>
                                    <label>Motivo / Observações (Opcional)</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Baixa médica de 15 dias"
                                        value={formData.reason}
                                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                        className={formStyles.input}
                                    />
                                </div>

                                <div className={formStyles.formActions}>
                                    <button type="button" className={formStyles.btnSecondary} onClick={() => setShowForm(false)}>
                                        Cancelar
                                    </button>
                                    <button type="submit" className={formStyles.btnPrimary}>
                                        Guardar Ausência
                                    </button>
                                </div>
                            </form>
                        </Card>
                    )}

                    <div className={styles.leavesList}>
                        {sortedLeaves.length === 0 ? (
                            <div className={formStyles.emptyState}>
                                <CalendarRange size={48} />
                                <h3>Sem registos de ausências</h3>
                                <p>Clique em "Novo Registo" para adicionar férias ou licenças.</p>
                            </div>
                        ) : (
                            <div className={styles.tableWrapper}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Colaborador</th>
                                            <th>Tipo</th>
                                            <th>Início</th>
                                            <th>Fim</th>
                                            <th>Observações</th>
                                            <th align="right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedLeaves.map(leave => (
                                            <tr key={leave.id}>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <Avatar name={leave.employeeName} size="sm" />
                                                        <strong>{leave.employeeName}</strong>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span style={{
                                                        background: leave.type === 'Férias' ? '#E3F2FD' : '#FFF3E0',
                                                        color: leave.type === 'Férias' ? '#0071E3' : '#FF9500',
                                                        padding: '4px 8px',
                                                        borderRadius: '12px',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 600
                                                    }}>
                                                        {leave.type}
                                                    </span>
                                                </td>
                                                <td>{new Date(leave.startDate).toLocaleDateString('pt-PT')}</td>
                                                <td>{new Date(leave.endDate).toLocaleDateString('pt-PT')}</td>
                                                <td>{leave.reason || '-'}</td>
                                                <td align="right">
                                                    <button
                                                        onClick={() => handleDelete(leave.id)}
                                                        style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                                                        title="Remover"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </>
    );
}
