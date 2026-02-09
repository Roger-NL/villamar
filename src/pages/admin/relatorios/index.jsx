import Head from 'next/head';
import { useRouter } from 'next/router';
import styles from '@/styles/AdminPages.module.css'; // Reusing general admin styles
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import { useApp } from '../../_app'; // Adjust path if needed
import { FileText, Clock, CalendarDays, BarChart3, Activity } from 'lucide-react';

export default function RelatoriosPage() {
    const { isAdmin, toggleMode, currentUser } = useApp();
    const router = useRouter();

    const reports = [
        {
            title: 'Presenças Mensais',
            description: 'Resumo de entradas e saídas',
            icon: Clock,
            color: '#3B82F6', // Blue
            path: '/admin/relatorios/presencas-mensais'
        },
        {
            title: 'Escalas por Mês',
            description: 'Distribuição de turnos',
            icon: CalendarDays,
            color: '#8B5CF6', // Purple
            path: '/admin/relatorios/escalas-mensais'
        },
        {
            title: 'Desempenho Equipa',
            description: 'Tarefas concluídas',
            icon: BarChart3,
            color: '#10B981', // Green
            path: '/admin/relatorios/desempenho'
        },
        {
            title: 'Atividades Diárias',
            description: 'Histórico de cuidados',
            icon: Activity,
            color: '#F59E0B', // Orange
            path: '/admin/relatorios/atividades'
        }
    ];

    return (
        <>
            <Head>
                <title>Relatórios - Admin Villa Mar</title>
            </Head>

            <Header user={currentUser} isAdmin={isAdmin} onModeSwitch={toggleMode} />
            <Sidebar isAdmin={true} />
            <BottomNav isAdmin={true} />

            <main className={styles.main}>
                <div className={styles.container}>
                    <h1 className={styles.pageTitle}>
                        <FileText size={28} />
                        Relatórios
                    </h1>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                        gap: '20px',
                        marginTop: '20px'
                    }}>
                        {reports.map((report, index) => {
                            const Icon = report.icon;
                            return (
                                <div
                                    key={index}
                                    onClick={() => router.push(report.path)}
                                    style={{
                                        background: 'white',
                                        borderRadius: '20px',
                                        padding: '24px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        textAlign: 'center',
                                        boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                                        cursor: 'pointer',
                                        transition: 'transform 0.2s',
                                        border: '1px solid #f0f0f0',
                                        height: '200px'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    <div style={{
                                        background: `${report.color}20`,
                                        color: report.color,
                                        padding: '16px',
                                        borderRadius: '16px',
                                        marginBottom: '16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Icon size={32} strokeWidth={1.5} />
                                    </div>
                                    <h3 style={{
                                        fontSize: '16px',
                                        fontWeight: '700',
                                        color: '#111827',
                                        marginBottom: '8px'
                                    }}>
                                        {report.title}
                                    </h3>
                                    <p style={{
                                        fontSize: '14px',
                                        color: '#6B7280',
                                        lineHeight: '1.4'
                                    }}>
                                        {report.description}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </main>
        </>
    );
}
