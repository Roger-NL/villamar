import Head from 'next/head';
import Link from 'next/link';
import styles from '@/styles/AdminPages.module.css';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import Card from '@/components/ui/Card';
import { useApp } from '@/pages/_app';
import { useData } from '@/contexts/DataContext';
import { ArrowLeft, CalendarDays, ClipboardPlus, ShieldCheck } from 'lucide-react';

export default function AdminObservacoesClinicasPage() {
    const { isAdmin, toggleMode, currentUser } = useApp();
    const { medicalNotes, isHydrated } = useData();

    const sortedNotes = [...(medicalNotes || [])].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (!isHydrated) return null;

    return (
        <>
            <Head>
                <title>Observações Clínicas - Admin</title>
            </Head>

            <Header user={currentUser} isAdmin={isAdmin} onModeSwitch={toggleMode} />
            <Sidebar isAdmin={true} />
            <BottomNav isAdmin={true} />

            <main className={styles.main}>
                <div className={styles.container}>
                    <div className={styles.pageHeader}>
                        <h1 className={styles.pageTitle}>
                            <ClipboardPlus size={28} />
                            Observações Clínicas
                        </h1>
                        <Link href="/admin/area-medica" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#0284c7', fontWeight: 700, textDecoration: 'none' }}>
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
                                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
                                            Registado por {note.executorName || 'Equipa'}
                                        </div>
                                        {note.reviewedAt ? (
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#DCFCE7', color: '#15803D', padding: '6px 9px', borderRadius: '999px', fontSize: '12px', fontWeight: 800 }}>
                                                <ShieldCheck size={14} />
                                                Visto por {note.reviewedByName || 'Médico'} em {new Date(note.reviewedAt).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        ) : (
                                            <div style={{ display: 'inline-flex', alignItems: 'center', background: '#FEF3C7', color: '#92400E', padding: '6px 9px', borderRadius: '999px', fontSize: '12px', fontWeight: 800 }}>
                                                Pendente do médico
                                            </div>
                                        )}
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
