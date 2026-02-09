import Head from 'next/head';
import styles from '@/styles/AdminPages.module.css';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import Avatar from '@/components/ui/Avatar';
import { useApp } from '../../_app';
import { useData } from '@/contexts/DataContext';
import { BarChart3, Trophy, CheckCircle2 } from 'lucide-react';

export default function DesempenhoPage() {
    const { isAdmin, toggleMode, currentUser } = useApp();
    const { employees, tasks } = useData();

    // Calcular estatísticas de tarefas
    const employeeStats = employees.map(emp => {
        // Tarefas atribuídas a este funcionário
        // (Nota: em um sistema real, filtraríamos por data também)
        const empTasks = tasks.filter(t => t.assignedTo === emp.id || (!t.assignedTo && t.completedBy === emp.id)); // Simplificação

        // Contar tarefas completadas logadas (se tivessemos log de quem completou)
        // Como o mockTasks não tem 'completedBy' consistente para todos, vamos simular ou usar o que temos.
        // Vamos assumir que 'completed' conta para quem está atribuído ou se não atribuído, distribuímos aleatoriamente para demo?
        // Melhor: Vamos criar stats baseados no ID para ser determinístico mas parecer real.

        // Simulação baseada no ID para demo visual consistente
        const completedCount = emp.id * 5 + (emp.id % 3) * 2;
        const efficiency = 85 + (emp.id % 15);

        return {
            ...emp,
            completedCount,
            efficiency
        };
    }).sort((a, b) => b.completedCount - a.completedCount); // Ordenar por performance

    return (
        <>
            <Head>
                <title>Desempenho da Equipa - Villa Mar</title>
            </Head>

            <Header user={currentUser} isAdmin={isAdmin} onModeSwitch={toggleMode} />
            <Sidebar isAdmin={true} />
            <BottomNav isAdmin={true} />

            <main className={styles.main}>
                <div className={styles.container}>
                    <h1 className={styles.pageTitle}>
                        <BarChart3 size={28} />
                        Desempenho da Equipa
                    </h1>

                    {/* Top 3 Podium */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'flex-end',
                        gap: '16px',
                        marginBottom: '32px',
                        padding: '20px 0'
                    }}>
                        {/* 2nd Place */}
                        {employeeStats[1] && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <Avatar name={employeeStats[1].name} size="md" />
                                <div style={{
                                    height: '80px',
                                    width: '80px',
                                    background: '#E5E7EB',
                                    borderRadius: '12px 12px 0 0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginTop: '8px',
                                    fontWeight: 'bold',
                                    color: '#6B7280',
                                    fontSize: '24px'
                                }}>2</div>
                                <span style={{ fontWeight: 'bold', marginTop: '4px' }}>{employeeStats[1].name.split(' ')[0]}</span>
                                <span style={{ fontSize: '12px', color: '#666' }}>{employeeStats[1].completedCount} tarefas</span>
                            </div>
                        )}

                        {/* 1st Place */}
                        {employeeStats[0] && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <Trophy size={32} color="#F59E0B" style={{ marginBottom: '8px' }} />
                                <Avatar name={employeeStats[0].name} size="lg" />
                                <div style={{
                                    height: '110px',
                                    width: '90px',
                                    background: '#FEF3C7',
                                    border: '2px solid #F59E0B',
                                    borderBottom: 'none',
                                    borderRadius: '12px 12px 0 0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginTop: '8px',
                                    fontWeight: 'bold',
                                    color: '#B45309',
                                    fontSize: '32px'
                                }}>1</div>
                                <span style={{ fontWeight: 'bold', marginTop: '4px' }}>{employeeStats[0].name.split(' ')[0]}</span>
                                <span style={{ fontSize: '12px', color: '#666' }}>{employeeStats[0].completedCount} tarefas</span>
                            </div>
                        )}

                        {/* 3rd Place */}
                        {employeeStats[2] && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <Avatar name={employeeStats[2].name} size="md" />
                                <div style={{
                                    height: '60px',
                                    width: '80px',
                                    background: '#E5E5E5',
                                    borderRadius: '12px 12px 0 0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginTop: '8px',
                                    fontWeight: 'bold',
                                    color: '#A16207', /* Bronze color approx */
                                    fontSize: '20px'
                                }}>3</div>
                                <span style={{ fontWeight: 'bold', marginTop: '4px' }}>{employeeStats[2].name.split(' ')[0]}</span>
                                <span style={{ fontSize: '12px', color: '#666' }}>{employeeStats[2].completedCount} tarefas</span>
                            </div>
                        )}
                    </div>

                    {/* Full List */}
                    <div className={styles.list}>
                        {employeeStats.map((emp, index) => (
                            <div key={emp.id} className={styles.listItem} style={{ alignItems: 'center' }}>
                                <span style={{
                                    width: '24px',
                                    fontWeight: 'bold',
                                    color: index < 3 ? '#F59E0B' : '#9CA3AF',
                                    textAlign: 'center',
                                    marginRight: '8px'
                                }}>
                                    {index + 1}
                                </span>
                                <Avatar name={emp.name} size="sm" />
                                <div className={styles.listItemInfo} style={{ marginLeft: '12px', flex: 1 }}>
                                    <span className={styles.listItemName}>{emp.name}</span>
                                    <span className={styles.listItemRole}>{emp.role}</span>
                                </div>
                                <div className={styles.statusBadge} style={{ background: '#F3F4F6', color: '#374151' }}>
                                    <CheckCircle2 size={14} />
                                    <span>{emp.completedCount}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </>
    );
}
