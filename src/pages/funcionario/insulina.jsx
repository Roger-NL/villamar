import Head from 'next/head';
import { useMemo, useState } from 'react';
import styles from '@/styles/Dashboard.module.css';
import formStyles from '@/styles/Forms.module.css';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import Card from '@/components/ui/Card';
import { useApp } from '@/pages/_app';
import { useData } from '@/contexts/DataContext';
import { mergeInsulinPatients } from '@/data/insulinDefaults';
import { CheckCircle2, Clock3, Droplets, Syringe } from 'lucide-react';

function getCurrentTimeValue() {
    return new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function FuncionarioInsulinaPage() {
    const { isAdmin, toggleMode, currentUser } = useApp();
    const { insulinPatients, insulinLogs, addInsulinLog, isHydrated } = useData();

    const [selectedPatientId, setSelectedPatientId] = useState('');
    const [measuredValue, setMeasuredValue] = useState('');
    const [insulinUnits, setInsulinUnits] = useState('');
    const [appliedAt, setAppliedAt] = useState(getCurrentTimeValue());
    const [toast, setToast] = useState('');

    const availablePatients = useMemo(
        () => mergeInsulinPatients(insulinPatients || []),
        [insulinPatients]
    );

    const todayStr = new Date().toISOString().split('T')[0];
    const todayLogs = useMemo(() => (
        (insulinLogs || [])
            .filter((log) => log.date === todayStr)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    ), [insulinLogs, todayStr]);

    const myTodayLogs = useMemo(() => (
        todayLogs.filter((log) => String(log.executorId) === String(currentUser?.id))
    ), [todayLogs, currentUser]);

    const handleSubmit = async (event) => {
        event.preventDefault();

        const patient = availablePatients.find((entry) => entry.id === selectedPatientId);
        if (!patient) return;

        await addInsulinLog({
            patientId: patient.id,
            patientName: patient.name,
            date: todayStr,
            appliedAt,
            measuredValue: Number(measuredValue),
            insulinUnits: Number(insulinUnits),
            executorId: currentUser?.id || '',
            executorName: currentUser?.name || 'Membro da Equipa'
        });

        setToast(`Registo guardado para ${patient.name}.`);
        setSelectedPatientId('');
        setMeasuredValue('');
        setInsulinUnits('');
        setAppliedAt(getCurrentTimeValue());
        setTimeout(() => setToast(''), 2500);
    };

    if (!isHydrated) return null;

    return (
        <>
            <Head>
                <title>Insulina - Equipa Villa Mar</title>
            </Head>

            <Header user={currentUser} isAdmin={isAdmin} onModeSwitch={toggleMode} />
            <Sidebar isAdmin={false} />
            <BottomNav isAdmin={false} />

            <main className={styles.main}>
                <div className={styles.container}>
                    <div style={{ marginBottom: '24px' }}>
                        <h1 style={{ margin: '0 0 8px 0', fontSize: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Syringe size={28} color="#0284c7" /> Insulina
                        </h1>
                        <p style={{ margin: 0, color: '#64748b' }}>
                            Registe a hora, o valor medido e as unidades administradas.
                        </p>
                    </div>

                    {toast && (
                        <div style={{ background: '#DCFCE7', color: '#15803D', padding: '16px', borderRadius: '12px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <CheckCircle2 size={18} /> {toast}
                        </div>
                    )}

                    <Card className={formStyles.formCard} padding="lg" style={{ marginBottom: '24px' }}>
                        <h2 style={{ margin: '0 0 18px 0', fontSize: '18px' }}>Novo registo</h2>
                        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
                            <div className={formStyles.formGroup}>
                                <label>Utente *</label>
                                <select value={selectedPatientId} onChange={(e) => setSelectedPatientId(e.target.value)} required>
                                    <option value="">Selecionar utente</option>
                                    {availablePatients.map((patient) => (
                                        <option key={patient.id} value={patient.id}>{patient.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
                                <div className={formStyles.formGroup}>
                                    <label>Hora *</label>
                                    <input type="time" value={appliedAt} onChange={(e) => setAppliedAt(e.target.value)} required />
                                </div>

                                <div className={formStyles.formGroup}>
                                    <label>Nível medido *</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        inputMode="numeric"
                                        value={measuredValue}
                                        onChange={(e) => setMeasuredValue(e.target.value)}
                                        placeholder="Ex.: 147"
                                        required
                                    />
                                </div>

                                <div className={formStyles.formGroup}>
                                    <label>Unidades de insulina *</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        inputMode="numeric"
                                        value={insulinUnits}
                                        onChange={(e) => setInsulinUnits(e.target.value)}
                                        placeholder="Ex.: 6"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                style={{
                                    border: 'none',
                                    background: '#0284c7',
                                    color: 'white',
                                    padding: '16px 18px',
                                    borderRadius: '14px',
                                    fontSize: '16px',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >
                                Guardar registo
                            </button>
                        </form>
                    </Card>

                    <Card padding="lg">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <Clock3 size={18} color="#64748b" />
                            <h2 style={{ margin: 0, fontSize: '18px' }}>Os meus registos de hoje</h2>
                        </div>

                        {myTodayLogs.length === 0 ? (
                            <p style={{ margin: 0, color: '#64748b' }}>Ainda não registou nenhuma administração de insulina hoje.</p>
                        ) : (
                            <div style={{ display: 'grid', gap: '12px' }}>
                                {myTodayLogs.map((log) => (
                                    <div key={log.id} style={{ border: '1px solid #E2E8F0', borderRadius: '14px', padding: '14px 16px', background: '#F8FAFC' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
                                            <strong style={{ color: '#0f172a' }}>{log.patientName}</strong>
                                            <span style={{ fontSize: '13px', color: '#64748b' }}>{log.appliedAt}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                            <span style={{ background: '#DBEAFE', color: '#1D4ED8', padding: '6px 10px', borderRadius: '999px', fontSize: '13px', fontWeight: 700 }}>
                                                <Droplets size={13} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                                                Nível {log.measuredValue}
                                            </span>
                                            <span style={{ background: '#E0F2FE', color: '#0369A1', padding: '6px 10px', borderRadius: '999px', fontSize: '13px', fontWeight: 700 }}>
                                                <Syringe size={13} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                                                {log.insulinUnits} unidades
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
            </main>
        </>
    );
}
