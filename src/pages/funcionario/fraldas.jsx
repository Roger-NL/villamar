import Head from 'next/head';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '@/styles/Dashboard.module.css';
import formStyles from '@/styles/Forms.module.css';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import Card from '@/components/ui/Card';
import { useApp } from '@/pages/_app';
import { useData } from '@/contexts/DataContext';
import { Baby, Clock, CheckCircle2, User, HelpCircle, Plus, Trash2, Edit2 } from 'lucide-react';

const defaultNames = ["Amélia", "António", "Babixa", "Carlos A.", "Conceição", "Emília", "Fernanda", "Fernanda C.", "José Carlos", "Judite", "Júlio", "Luísa", "Lurdes C.", "Lurdes N.", "M. Rodrigues", "M. Zélia", "Maria", "Mário", "Otílio", "Perpétua", "Simão", "Sofia", "Teresa", "Tina", "Ventura"];

export default function FraldasFuncionarioPage() {
    const { isAdmin, toggleMode, currentUser } = useApp();
    const router = useRouter();
    const { diaperPatients, diaperLogs, addDiaperLog, isHydrated, addDiaperPatient, deleteDiaperPatient, updateDiaperPatient } = useData();

    const [selectedPatient, setSelectedPatient] = useState('');
    const [amount, setAmount] = useState(1);
    const [toast, setToast] = useState('');
    const [editMode, setEditMode] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newPatientName, setNewPatientName] = useState('');

    useEffect(() => {
        if (isHydrated && diaperPatients.length === 0) {
            const seed = async () => {
                for (const name of defaultNames) {
                    await addDiaperPatient({ name, origin: 'Casa', diaperId: '' });
                }
            };
            seed();
        }
    }, [isHydrated, diaperPatients.length, addDiaperPatient]);

    const handleAddPatientModal = () => {
        if (!newPatientName.trim()) return;

        // Prevent adding visually similar duplicates
        if (diaperPatients.some(p => p.name.toLowerCase() === newPatientName.trim().toLowerCase())) {
            setToast('Utente já está na lista.');
            setTimeout(() => setToast(''), 3000);
            return;
        }

        addDiaperPatient({ name: newPatientName.trim(), origin: 'Casa', diaperId: '' });
        setNewPatientName('');
        setShowAddModal(false);
    };

    const handleLogUsage = (e) => {
        e.preventDefault();
        if (!selectedPatient || amount < 1) return;

        const patient = diaperPatients.find(p => p.id === selectedPatient);
        if (!patient) return;

        const isOwn = patient.origin === 'Própria';
        let currentStock = patient.wardrobeStock !== undefined ? patient.wardrobeStock : 10;
        let anomalyAmount = 0;

        if (!isOwn) {
            if (amount > currentStock) {
                anomalyAmount = amount - currentStock;
                currentStock = 0;
            } else {
                currentStock -= amount;
            }
            updateDiaperPatient(patient.id, { wardrobeStock: currentStock, hasAnomaly: anomalyAmount > 0 ? true : patient.hasAnomaly });
        }

        addDiaperLog({
            type: 'usage',
            patientId: patient.id,
            patientName: patient.name,
            diaperId: patient.diaperId,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
            amountUsed: Number(amount),
            anomaly: anomalyAmount,
            executorId: currentUser?.id,
            executorName: currentUser?.name || 'Membro da Equipa'
        });

        setToast(`Registada 1 troca de fralda para ${patient.name}`);
        setTimeout(() => setToast(''), 3000);
        setSelectedPatient('');
        setAmount(1);
    };

    // My logs for today only
    const myLogsToday = useMemo(() => {
        if (!diaperLogs) return [];
        const todayStr = new Date().toISOString().split('T')[0];
        return diaperLogs.filter(l =>
            l.type === 'usage' &&
            l.date === todayStr &&
            l.executorId === currentUser?.id
        ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }, [diaperLogs, currentUser]);

    if (!isHydrated) return null;

    return (
        <>
            <Head>
                <title>Fraldas - Equipa Villa Mar</title>
            </Head>

            <Header user={currentUser} isAdmin={isAdmin} onModeSwitch={toggleMode} />
            <Sidebar isAdmin={false} />
            <BottomNav isAdmin={false} />

            <main className={styles.main}>
                <div className={styles.container}>

                    <div style={{ marginBottom: '24px' }}>
                        <h1 style={{ margin: '0 0 8px 0', fontSize: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Baby size={28} color="#0284c7" /> Mudança de Fraldas
                        </h1>
                        <p style={{ margin: 0, color: '#64748b' }}>Registe as fraldas que trocou no seu turno de hoje.</p>
                    </div>

                    {toast && (
                        <div style={{ background: '#DCFCE7', color: '#16A34A', padding: '16px', borderRadius: '12px', fontSize: '1rem', marginBottom: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                            <CheckCircle2 size={20} /> {toast}
                        </div>
                    )}

                    <Card className={formStyles.formCard} padding="lg" style={{ marginBottom: '24px' }}>
                        <h2 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            Nova Mudança <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#64748b' }}>(Automático: {new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })})</span>
                        </h2>

                        {diaperPatients && diaperPatients.length > 0 ? (
                            <form onSubmit={handleLogUsage} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div className={formStyles.formGroup}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <label style={{ fontWeight: 600, margin: 0 }}>Utentes</label>
                                        <button
                                            type="button"
                                            onClick={() => setEditMode(!editMode)}
                                            style={{ background: editMode ? '#fee2e2' : '#f1f5f9', color: editMode ? '#ef4444' : '#0284c7', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
                                        >
                                            <Edit2 size={14} /> {editMode ? 'Concluir' : 'Editar Lista'}
                                        </button>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '10px' }}>
                                        {[...new Map(diaperPatients.map(p => [p.name, p])).values()].sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                                            <div key={p.id} style={{ position: 'relative' }}>
                                                <button
                                                    type="button"
                                                    disabled={editMode}
                                                    onClick={() => setSelectedPatient(p.id)}
                                                    style={{
                                                        width: '100%', padding: '12px 6px', borderRadius: '10px',
                                                        border: selectedPatient === p.id && !editMode ? '2px solid #0284c7' : '2px solid transparent',
                                                        background: selectedPatient === p.id && !editMode ? '#e0f2fe' : '#f8fafc',
                                                        color: selectedPatient === p.id && !editMode ? '#0284c7' : '#334155',
                                                        cursor: editMode ? 'default' : 'pointer', fontWeight: '700', fontSize: '13px',
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: 'all 0.1s',
                                                        opacity: editMode ? 0.7 : 1, wordBreak: 'break-word', minHeight: '50px'
                                                    }}
                                                >
                                                    {p.name.split(' ').slice(0, 2).join(' ')}
                                                </button>
                                                {editMode && (
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteDiaperPatient(p.id)}
                                                        style={{
                                                            position: 'absolute', top: '-8px', right: '-8px', background: '#ef4444', color: 'white',
                                                            border: 'none', width: '24px', height: '24px', borderRadius: '50%',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                                            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                                                        }}
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        {editMode && (
                                            <button
                                                type="button"
                                                onClick={() => setShowAddModal(true)}
                                                style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '2px dashed #cbd5e1', background: 'transparent', color: '#64748b', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px', minHeight: '50px' }}
                                            >
                                                <Plus size={18} /> Novo
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className={formStyles.formGroup}>
                                    <label style={{ fontWeight: 600 }}>Quantidade Utilizada *</label>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        {[1, 2, 3].map(num => (
                                            <button
                                                key={num}
                                                type="button"
                                                onClick={() => setAmount(num)}
                                                style={{
                                                    flex: 1, padding: '12px', fontSize: '18px', fontWeight: 'bold',
                                                    borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s',
                                                    background: amount === num ? '#0284c7' : '#f1f5f9',
                                                    color: amount === num ? 'white' : '#334155',
                                                    border: amount === num ? '2px solid #0284c7' : '2px solid transparent'
                                                }}
                                            >
                                                {num}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={!selectedPatient}
                                    style={{
                                        width: '100%', padding: '16px', background: selectedPatient ? '#0284c7' : '#94a3b8', color: 'white',
                                        border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '16px',
                                        cursor: selectedPatient ? 'pointer' : 'not-allowed', marginTop: '8px', transition: 'background 0.2s'
                                    }}
                                >
                                    Gravar Mudança de Fralda
                                </button>
                            </form>
                        ) : (
                            <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px' }}>
                                <HelpCircle size={32} color="#cbd5e1" style={{ marginBottom: '12px' }} />
                                <h3 style={{ fontSize: '16px', color: '#475569', margin: '0 0 8px 0' }}>Nenhum Utente de Fralda</h3>
                                <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>A gestão de utilizadores de fraldas deve ser configurada primeiro pelo Administrador.</p>
                            </div>
                        )}
                    </Card>

                    <h3 style={{ fontSize: '16px', color: '#334155', margin: '32px 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={18} /> As minhas trocas de hoje
                    </h3>

                    {myLogsToday.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {myLogsToday.map(log => (
                                <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ background: '#e0f2fe', color: '#0284c7', padding: '8px 12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                                            {log.time}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '16px' }}>{log.patientName}</div>
                                            <div style={{ color: '#64748b', fontSize: '13px', marginTop: '2px' }}>Registado por si</div>
                                        </div>
                                    </div>
                                    <div style={{ background: '#f1f5f9', color: '#475569', padding: '4px 12px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold' }}>
                                        {log.amountUsed} uni.
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8', background: 'transparent', border: '2px dashed #e2e8f0', borderRadius: '16px' }}>
                            Ainda não registou trocas no serviço de hoje.
                        </div>
                    )}
                </div>
            </main>

            {/* Modal para Adicionar Novo Utente */}
            {showAddModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: 'white', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '18px', color: '#0f172a' }}>Adicionar Novo Utente</h3>
                        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>Escreva o nome do utente para adicioná-lo à lista de fraldas.</p>
                        <input
                            type="text"
                            value={newPatientName}
                            onChange={e => setNewPatientName(e.target.value)}
                            placeholder="Nome..."
                            style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '16px', marginBottom: '24px' }}
                            autoFocus
                        />
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button type="button" onClick={() => setShowAddModal(false)} className={formStyles.btnSecondary} style={{ padding: '10px 16px', margin: 0 }}>Cancelar</button>
                            <button type="button" onClick={handleAddPatientModal} className={formStyles.btnPrimary} style={{ padding: '10px 16px', margin: 0 }}>Confirmar</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
