import Head from 'next/head';
import Link from 'next/link';
import styles from '@/styles/Dashboard.module.css';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import Card from '@/components/ui/Card';
import { useApp } from '@/pages/_app';
import { useData } from '@/contexts/DataContext';
import { ArrowLeft, CalendarDays, Syringe } from 'lucide-react';

export default function FuncionarioRegistosInsulinaPage() {
    const { isAdmin, toggleMode, currentUser } = useApp();
    const { insulinLogs, isHydrated } = useData();

    const sortedLogs = [...(insulinLogs || [])].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (!isHydrated) return null;

    return (
        <>
            <Head>
                <title>Registos de Insulina - Área Médica</title>
            </Head>

            <Header user={currentUser} isAdmin={isAdmin} onModeSwitch={toggleMode} />
            <Sidebar isAdmin={false} />
            <BottomNav isAdmin={false} />

            <main className={styles.main}>
                <div className={styles.container}>
                    <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <h1 style={{ margin: 0, fontSize: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Syringe size={26} color="#0284c7" />
                            Registos de Insulina
                        </h1>
                        <Link href="/funcionario/area-medica" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#0284c7', fontWeight: 700, textDecoration: 'none' }}>
                            <ArrowLeft size={16} /> Voltar
                        </Link>
                    </div>

                    <Card padding="lg">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <CalendarDays size={18} color="#64748b" />
                            <strong>Total de registos: {sortedLogs.length}</strong>
                        </div>

                        {sortedLogs.length === 0 ? (
                            <p style={{ margin: 0, color: '#64748b' }}>Ainda não existem registos de insulina.</p>
                        ) : (
                            <div style={{ display: 'grid', gap: '12px' }}>
                                {sortedLogs.map((log) => (
                                    <div key={log.id} style={{ border: '1px solid #E2E8F0', borderRadius: '12px', background: '#F8FAFC', padding: '14px 16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                                            <strong>{log.patientName}</strong>
                                            <span style={{ fontSize: '13px', color: '#475569' }}>
                                                {new Date(log.timestamp).toLocaleDateString('pt-PT')} {log.appliedAt ? `- ${log.appliedAt}` : ''}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                                            <span style={{ background: '#DBEAFE', color: '#1D4ED8', padding: '5px 9px', borderRadius: '999px', fontSize: '13px', fontWeight: 700 }}>
                                                Nível {log.measuredValue}
                                            </span>
                                            <span style={{ background: '#E0F2FE', color: '#0369A1', padding: '5px 9px', borderRadius: '999px', fontSize: '13px', fontWeight: 700 }}>
                                                {log.insulinUnits} unidades
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                                            Registado por {log.executorName || 'Equipa'}
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
