import Head from 'next/head';
import styles from '@/styles/AdminPages.module.css';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import { useApp } from '../_app';
import { mockCurrentUser } from '@/data/mockData';
import { FileText, Download, Calendar, Clock, Users, ClipboardList } from 'lucide-react';

export default function AdminRelatoriosPage() {
    const { isAdmin, toggleMode } = useApp();

    const reports = [
        { id: 1, title: 'Presenças Mensais', desc: 'Resumo de entradas e saídas', icon: Clock },
        { id: 2, title: 'Escalas por Mês', desc: 'Distribuição de turnos', icon: Calendar },
        { id: 3, title: 'Desempenho Equipa', desc: 'Tarefas concluídas', icon: Users },
        { id: 4, title: 'Atividades Diárias', desc: 'Histórico de cuidados', icon: ClipboardList },
    ];

    return (
        <>
            <Head>
                <title>Relatórios - Admin Villa Mar</title>
            </Head>

            <Header user={mockCurrentUser} isAdmin={isAdmin} onModeSwitch={toggleMode} />
            <Sidebar isAdmin={true} />
            <BottomNav isAdmin={true} />

            <main className={styles.main}>
                <div className={styles.container}>
                    <h1 className={styles.pageTitle}>
                        <FileText size={28} />
                        Relatórios
                    </h1>

                    <div className={styles.reportGrid}>
                        {reports.map(report => (
                            <button key={report.id} className={styles.reportCard}>
                                <div className={styles.reportIcon}>
                                    <report.icon size={28} />
                                </div>
                                <h3>{report.title}</h3>
                                <p>{report.desc}</p>
                            </button>
                        ))}
                    </div>
                </div>
            </main>
        </>
    );
}
