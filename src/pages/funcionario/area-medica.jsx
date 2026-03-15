import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import styles from '@/styles/Dashboard.module.css';
import formStyles from '@/styles/Forms.module.css';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import Card from '@/components/ui/Card';
import { useApp } from '@/pages/_app';
import { useData } from '@/contexts/DataContext';
import { mergeInsulinPatients } from '@/data/insulinDefaults';
import { isMedicalRole } from '@/lib/medicalAccess';
import { CheckCircle2, ClipboardPlus, Clock3, Droplets, NotebookPen, Syringe } from 'lucide-react';

function getCurrentTimeValue() {
    return new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function FuncionarioAreaMedicaPage() {
    const router = useRouter();
    const { isAdmin, toggleMode, currentUser } = useApp();
    const { insulinPatients, insulinLogs, medicalNotes, addInsulinLog, addMedicalNote, isHydrated } = useData();

    const [activeSection, setActiveSection] = useState('insulina');
    const [selectedPatientId, setSelectedPatientId] = useState('');
    const [measuredValue, setMeasuredValue] = useState('');
    const [insulinUnits, setInsulinUnits] = useState('');
    const [appliedAt, setAppliedAt] = useState(getCurrentTimeValue());
    const [notePatientId, setNotePatientId] = useState('');
    const [noteText, setNoteText] = useState('');
    const [toast, setToast] = useState('');

    const availablePatients = useMemo(() => mergeInsulinPatients(insulinPatients || []), [insulinPatients]);
    const todayStr = new Date().toISOString().split('T')[0];

    useEffect(() => {
        if (isHydrated && currentUser && !isMedicalRole(currentUser.role) && !isAdmin) {
            router.replace('/funcionario');
        }
    }, [currentUser, isHydrated, isAdmin, router]);

    const todayInsulinLogs = useMemo(() => (
        (insulinLogs || [])
            .filter((log) => log.date === todayStr)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    ), [insulinLogs, todayStr]);

    const todayMedicalNotes = useMemo(() => (
        (medicalNotes || [])
            .filter((note) => note.date === todayStr)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    ), [medicalNotes, todayStr]);

    const handleInsulinSubmit = async (event) => {
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

        setToast(`Insulina registada para ${patient.name}.`);
        setSelectedPatientId('');
        setMeasuredValue('');
        setInsulinUnits('');
        setAppliedAt(getCurrentTimeValue());
        setTimeout(() => setToast(''), 2500);
    };

    const handleMedicalNoteSubmit = async (event) => {
        event.preventDefault();
        const patient = availablePatients.find((entry) => entry.id === notePatientId);
        if (!patient || !noteText.trim()) return;

        await addMedicalNote({
            patientId: patient.id,
            patientName: patient.name,
            date: todayStr,
            reportedAt: getCurrentTimeValue(),
            noteText: noteText.trim(),
            executorId: currentUser?.id || '',
            executorName: currentUser?.name || 'Membro da Equipa'
        });

        setToast(`Observação guardada para ${patient.name}.`);
        setNotePatientId('');
        setNoteText('');
        setTimeout(() => setToast(''), 2500);
    };

    if (!isHydrated) return null;

    return (
        <>
            <Head>
                <title>Área Médica - Equipa Villa Mar</title>
            </Head>

            <Header user={currentUser} isAdmin={isAdmin} onModeSwitch={toggleMode} />
            <Sidebar isAdmin={false} />
            <BottomNav isAdmin={false} />

            <main className={styles.main}>
                <div className={styles.container}>
                    <div style={{ marginBottom: '24px' }}>
                        <h1 style={{ margin: '0 0 8px 0', fontSize: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Syringe size={28} color="#0284c7" /> Área Médica
                        </h1>
                        <p style={{ margin: 0, color: '#64748b' }}>
                            Registe insulina e observações clínicas dos utentes.
                        </p>
                    </div>

                    {toast && (
                        <div style={{ background: '#DCFCE7', color: '#15803D', padding: '16px', borderRadius: '12px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <CheckCircle2 size={18} /> {toast}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            onClick={() => setActiveSection('insulina')}
                            style={{
                                border: 'none',
                                background: activeSection === 'insulina' ? '#0284c7' : '#E2E8F0',
                                color: activeSection === 'insulina' ? 'white' : '#475569',
                                borderRadius: '999px',
                                padding: '12px 16px',
                                fontWeight: 700,
                                cursor: 'pointer'
                            }}
                        >
                            Insulina
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveSection('ocorrencias')}
                            style={{
                                border: 'none',
                                background: activeSection === 'ocorrencias' ? '#0284c7' : '#E2E8F0',
                                color: activeSection === 'ocorrencias' ? 'white' : '#475569',
                                borderRadius: '999px',
                                padding: '12px 16px',
                                fontWeight: 700,
                                cursor: 'pointer'
                            }}
                        >
                            Informações do utente
                        </button>
                    </div>

                    {activeSection === 'insulina' ? (
                        <div style={{ display: 'grid', gap: '20px' }}>
                            <Card className={formStyles.formCard} padding="lg">
                                <h2 style={{ margin: '0 0 18px 0', fontSize: '18px' }}>Novo registo de insulina</h2>
                                <form onSubmit={handleInsulinSubmit} style={{ display: 'grid', gap: '16px' }}>
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
                                            <input type="number" min="0" step="1" inputMode="numeric" value={measuredValue} onChange={(e) => setMeasuredValue(e.target.value)} placeholder="Ex.: 147" required />
                                        </div>
                                        <div className={formStyles.formGroup}>
                                            <label>Unidades *</label>
                                            <input type="number" min="0" step="1" inputMode="numeric" value={insulinUnits} onChange={(e) => setInsulinUnits(e.target.value)} placeholder="Ex.: 6" required />
                                        </div>
                                    </div>

                                    <button type="submit" style={{ border: 'none', background: '#0284c7', color: 'white', padding: '16px 18px', borderRadius: '14px', fontSize: '16px', fontWeight: 700, cursor: 'pointer' }}>
                                        Guardar insulina
                                    </button>
                                </form>
                            </Card>

                            <Card padding="lg">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                    <Clock3 size={18} color="#64748b" />
                                    <h2 style={{ margin: 0, fontSize: '18px' }}>Registos de hoje</h2>
                                </div>
                                {todayInsulinLogs.length === 0 ? (
                                    <p style={{ margin: 0, color: '#64748b' }}>Ainda não existe nenhum registo de insulina hoje.</p>
                                ) : (
                                    <div style={{ display: 'grid', gap: '12px' }}>
                                        {todayInsulinLogs.map((log) => (
                                            <div key={log.id} style={{ border: '1px solid #E2E8F0', borderRadius: '14px', padding: '14px 16px', background: '#F8FAFC' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
                                                    <strong style={{ color: '#0f172a' }}>{log.patientName}</strong>
                                                    <span style={{ fontSize: '13px', color: '#64748b' }}>{log.appliedAt}</span>
                                                </div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '6px' }}>
                                                    <span style={{ background: '#DBEAFE', color: '#1D4ED8', padding: '6px 10px', borderRadius: '999px', fontSize: '13px', fontWeight: 700 }}>
                                                        <Droplets size={13} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                                                        Nível {log.measuredValue}
                                                    </span>
                                                    <span style={{ background: '#E0F2FE', color: '#0369A1', padding: '6px 10px', borderRadius: '999px', fontSize: '13px', fontWeight: 700 }}>
                                                        <Syringe size={13} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                                                        {log.insulinUnits} unidades
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#64748b' }}>Registado por {log.executorName}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '20px' }}>
                            <Card className={formStyles.formCard} padding="lg">
                                <h2 style={{ margin: '0 0 18px 0', fontSize: '18px' }}>Nova informação do utente</h2>
                                <form onSubmit={handleMedicalNoteSubmit} style={{ display: 'grid', gap: '16px' }}>
                                    <div className={formStyles.formGroup}>
                                        <label>Utente *</label>
                                        <select value={notePatientId} onChange={(e) => setNotePatientId(e.target.value)} required>
                                            <option value="">Selecionar utente</option>
                                            {availablePatients.map((patient) => (
                                                <option key={patient.id} value={patient.id}>{patient.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className={formStyles.formGroup}>
                                        <label>Observação *</label>
                                        <textarea
                                            value={noteText}
                                            onChange={(e) => setNoteText(e.target.value)}
                                            rows={5}
                                            placeholder="Ex.: caiu, está com gripe, diarreia, dor, ferida, etc."
                                            required
                                            style={{ width: '100%', resize: 'vertical', borderRadius: '14px', border: '1px solid #CBD5E1', padding: '14px 16px', fontSize: '15px', fontFamily: 'inherit' }}
                                        />
                                    </div>

                                    <button type="submit" style={{ border: 'none', background: '#0284c7', color: 'white', padding: '16px 18px', borderRadius: '14px', fontSize: '16px', fontWeight: 700, cursor: 'pointer' }}>
                                        Guardar observação
                                    </button>
                                </form>
                            </Card>

                            <Card padding="lg">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                    <NotebookPen size={18} color="#64748b" />
                                    <h2 style={{ margin: 0, fontSize: '18px' }}>Observações de hoje</h2>
                                </div>
                                {todayMedicalNotes.length === 0 ? (
                                    <p style={{ margin: 0, color: '#64748b' }}>Ainda não existe nenhuma observação clínica hoje.</p>
                                ) : (
                                    <div style={{ display: 'grid', gap: '12px' }}>
                                        {todayMedicalNotes.map((note) => (
                                            <div key={note.id} style={{ border: '1px solid #E2E8F0', borderRadius: '14px', padding: '14px 16px', background: '#F8FAFC' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
                                                    <strong style={{ color: '#0f172a' }}>{note.patientName}</strong>
                                                    <span style={{ fontSize: '13px', color: '#64748b' }}>{note.reportedAt || note.timestamp?.slice(11, 16)}</span>
                                                </div>
                                                <p style={{ margin: '0 0 8px 0', color: '#334155', lineHeight: 1.5 }}>{note.noteText}</p>
                                                <div style={{ fontSize: '12px', color: '#64748b' }}>Registado por {note.executorName}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}
