import Head from 'next/head';
import Link from 'next/link';
import styles from '@/styles/Dashboard.module.css';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import Card from '@/components/ui/Card';
import { useApp } from '@/pages/_app';
import { useData } from '@/contexts/DataContext';
import { isMedicalRole } from '@/lib/medicalAccess';
import { ArrowLeft, CalendarDays, ClipboardPlus, ShieldCheck } from 'lucide-react';

export default function FuncionarioObservacoesClinicasPage() {
    const { isAdmin, toggleMode, currentUser } = useApp();
    const { medicalNotes, updateMedicalNote, isHydrated } = useData();

    const canDoctorReview = isMedicalRole(currentUser?.role);
    const sortedNotes = [...(medicalNotes || [])].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const handleMarkReviewed = async (note) => {
        if (!note?.id || !canDoctorReview || note.reviewedAt) return;
        await updateMedicalNote(note.id, {
            reviewedAt: new Date().toISOString(),
            reviewedById: currentUser?.id || '',
            reviewedByName: currentUser?.name || ''
        });
    };

    if (!isHydrated) return null;

    return (
        <>
            <Head>
                <title>Observações Clínicas - Área Médica</title>
            </Head>

            <Header user={currentUser} isAdmin={isAdmin} onModeSwitch={toggleMode} />
            <Sidebar isAdmin={false} />
            <BottomNav isAdmin={false} />

            <main className={styles.main}>
                <div className={styles.container}>
                    <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <h1 style={{ margin: 0, fontSize: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ClipboardPlus size={26} color="#0284c7" />
                            Observações Clínicas
                        </h1>
                        <Link href="/funcionario/area-medica" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#0284c7', fontWeight: 700, textDecoration: 'none' }}>
                            <ArrowLeft size={16} /> Voltar
                        </Link>
                    </div>

                    <Card padding="lg">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <CalendarDays size={18} color="#64748b" />
                            <strong>Total de observações: {sortedNotes.length}</strong>
                        </div>

                        {sortedNotes.length === 0 ? (
                            <p style={{ margin: 0, color: '#64748b' }}>Ainda não existem observações clínicas.</p>
                        ) : (
                            <div style={{ display: 'grid', gap: '12px' }}>
                                {sortedNotes.map((note) => (
                                    <div key={note.id} style={{ border: '1px solid #E2E8F0', borderRadius: '12px', background: '#F8FAFC', padding: '14px 16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                            <strong>{note.patientName}</strong>
                                            <span style={{ fontSize: '13px', color: '#475569' }}>
                                                {new Date(note.timestamp).toLocaleDateString('pt-PT')} {note.reportedAt ? `- ${note.reportedAt}` : ''}
                                            </span>
                                        </div>
                                        <p style={{ margin: '0 0 8px 0', color: '#334155', lineHeight: 1.45 }}>{note.noteText}</p>
                                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                                            Registado por {note.executorName || 'Equipa'}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                            {note.reviewedAt ? (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#DCFCE7', color: '#15803D', padding: '6px 9px', borderRadius: '999px', fontSize: '12px', fontWeight: 800 }}>
                                                    <ShieldCheck size={14} />
                                                    Visto por {note.reviewedByName || 'Médico'} em {new Date(note.reviewedAt).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            ) : (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', background: '#FEF3C7', color: '#92400E', padding: '6px 9px', borderRadius: '999px', fontSize: '12px', fontWeight: 800 }}>
                                                    Pendente do médico
                                                </span>
                                            )}

                                            {canDoctorReview && !note.reviewedAt && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleMarkReviewed(note)}
                                                    style={{ border: 'none', background: '#0284c7', color: 'white', padding: '8px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                                                >
                                                    Marcar como visto
                                                </button>
                                            )}
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
