import Head from 'next/head';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import styles from '@/styles/AdminPages.module.css';
import formStyles from '@/styles/Forms.module.css';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import Card from '@/components/ui/Card';
import { useApp } from '../_app';
import { useData } from '@/contexts/DataContext';
import { defaultInsulinPatients, mergeInsulinPatients } from '@/data/insulinDefaults';
import { ClipboardPlus, Plus, Syringe, Trash2 } from 'lucide-react';

export default function AdminAreaMedicaPage() {
    const { isAdmin, toggleMode, currentUser } = useApp();
    const { insulinPatients, insulinLogs, medicalNotes, addInsulinPatient, deleteInsulinPatient, updateInsulinPatient, isHydrated } = useData();
    const [newPatientName, setNewPatientName] = useState('');
    const [toast, setToast] = useState('');

    const patients = useMemo(() => mergeInsulinPatients(insulinPatients || []), [insulinPatients]);
    const protectedNames = useMemo(() => new Set(defaultInsulinPatients.map((patient) => patient.name.trim().toLowerCase())), []);

    const weekSummary = useMemo(() => {
        const today = new Date();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 6);
        const recentInsulinLogs = (insulinLogs || []).filter((log) => new Date(log.timestamp) >= weekStart);
        const recentMedicalNotes = (medicalNotes || []).filter((note) => new Date(note.timestamp) >= weekStart);
        return { recentInsulinLogs, recentMedicalNotes };
    }, [insulinLogs, medicalNotes]);

    const handleAddPatient = async (event) => {
        event.preventDefault();
        const trimmedName = newPatientName.trim();
        if (!trimmedName) return;

        const exists = patients.some((patient) => patient.name.trim().toLowerCase() === trimmedName.toLowerCase());
        if (exists) {
            setToast('Esse utente já está configurado.');
            setTimeout(() => setToast(''), 2500);
            return;
        }

        await addInsulinPatient({ name: trimmedName });
        setNewPatientName('');
        setToast(`Utente ${trimmedName} adicionado à Área Médica.`);
        setTimeout(() => setToast(''), 2500);
    };

    const handleRemovePatient = async (patient) => {
        const key = patient?.name?.trim().toLowerCase();
        if (!key) return;

        const isProtected = protectedNames.has(key);
        if (isProtected) {
            const persisted = (insulinPatients || []).find((entry) => entry.name?.trim().toLowerCase() === key);
            if (persisted) {
                await updateInsulinPatient(persisted.id, { active: false });
            } else {
                await addInsulinPatient({ id: `insulin-disabled-${key.replace(/\s+/g, '-')}`, name: patient.name, active: false });
            }
            setToast(`Utente ${patient.name} removido dos monitorizados.`);
        } else {
            await deleteInsulinPatient(patient.id);
            setToast(`Utente ${patient.name} removido dos monitorizados.`);
        }

        setTimeout(() => setToast(''), 2500);
    };

    if (!isHydrated) return null;

    return (
        <>
            <Head>
                <title>Área Médica - Admin Villa Mar</title>
            </Head>

            <Header user={currentUser} isAdmin={isAdmin} onModeSwitch={toggleMode} />
            <Sidebar isAdmin={true} />
            <BottomNav isAdmin={true} />

            <main className={styles.main}>
                <div className={styles.container}>
                    <div className={styles.pageHeader}>
                        <h1 className={styles.pageTitle}>
                            <Syringe size={28} />
                            Área Médica
                        </h1>
                    </div>

                    {toast && (
                        <div style={{ marginBottom: '20px', padding: '14px 16px', borderRadius: '12px', background: '#DCFCE7', color: '#15803D', fontWeight: 700 }}>
                            {toast}
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                        <Card className={formStyles.formCard} padding="lg">
                            <h2 style={{ margin: '0 0 16px 0', fontSize: '20px' }}>Utentes monitorizados</h2>
                            <p style={{ margin: '0 0 18px 0', color: '#64748b' }}>
                                Gestão dos utentes que podem receber registos de insulina e observações clínicas.
                            </p>

                            <form onSubmit={handleAddPatient} style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
                                <input
                                    type="text"
                                    value={newPatientName}
                                    onChange={(e) => setNewPatientName(e.target.value)}
                                    placeholder="Nome do utente"
                                    style={{ flex: '1 1 180px', padding: '14px 16px', borderRadius: '12px', border: '1px solid #CBD5E1', fontSize: '15px' }}
                                />
                                <button
                                    type="submit"
                                    style={{ border: 'none', background: '#0284c7', color: 'white', padding: '14px 16px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                                >
                                    <Plus size={18} /> Adicionar
                                </button>
                            </form>

                            <div style={{ display: 'grid', gap: '12px' }}>
                                {patients.map((patient) => {
                                    return (
                                        <div key={patient.id} style={{ border: '1px solid #E2E8F0', background: '#F8FAFC', borderRadius: '14px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                                            <div>
                                                <strong style={{ color: '#0f172a' }}>{patient.name}</strong>
                                                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                                                    Utente monitorizado
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemovePatient(patient)}
                                                style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', width: '38px', height: '38px', borderRadius: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>

                        <Card padding="lg">
                            <h2 style={{ margin: '0 0 16px 0', fontSize: '20px' }}>Resumo da semana</h2>
                            <div style={{ display: 'grid', gap: '12px' }}>
                                <div style={{ border: '1px solid #E2E8F0', borderRadius: '14px', padding: '14px 16px', background: 'white' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                        <Syringe size={16} color="#0284c7" />
                                        <strong>Registos de insulina</strong>
                                    </div>
                                    <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a' }}>{weekSummary.recentInsulinLogs.length}</div>
                                    <Link href="/admin/area-medica/registos-insulina" style={{ marginTop: '8px', display: 'inline-block', fontSize: '13px', fontWeight: 700, color: '#0284c7', textDecoration: 'none' }}>
                                        Ver todos os registos
                                    </Link>
                                </div>

                                <div style={{ border: '1px solid #E2E8F0', borderRadius: '14px', padding: '14px 16px', background: 'white' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                        <ClipboardPlus size={16} color="#0284c7" />
                                        <strong>Observações clínicas</strong>
                                    </div>
                                    <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a' }}>{weekSummary.recentMedicalNotes.length}</div>
                                    <Link href="/admin/area-medica/observacoes-clinicas" style={{ marginTop: '8px', display: 'inline-block', fontSize: '13px', fontWeight: 700, color: '#0284c7', textDecoration: 'none' }}>
                                        Ver todas as observações
                                    </Link>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </main>
        </>
    );
}
