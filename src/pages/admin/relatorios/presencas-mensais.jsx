import Head from 'next/head';
import { useState } from 'react';
import styles from '@/styles/AdminPages.module.css';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import Avatar from '@/components/ui/Avatar';
import { useApp } from '../../_app';
import { useData } from '@/contexts/DataContext';
import { Clock, Download, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

export default function PresencasMensaisPage() {
    const { isAdmin, toggleMode, currentUser } = useApp();
    const { timeRecords, employees } = useData();

    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedEmployee, setSelectedEmployee] = useState('all');

    // Navegar meses
    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)));
    };

    // Filtrar registos
    const filteredRecords = timeRecords.filter(record => {
        const recordDate = new Date(record.date);
        const isSameMonth = recordDate.getMonth() === currentDate.getMonth() &&
            recordDate.getFullYear() === currentDate.getFullYear();

        const isSameEmployee = selectedEmployee === 'all' || record.employeeId === parseInt(selectedEmployee);

        return isSameMonth && isSameEmployee;
    }).sort((a, b) => new Date(b.date) - new Date(a.date)); // Decrescente

    const getEmployeeName = (id) => {
        const emp = employees.find(e => e.id === id);
        return emp ? emp.name : 'Desconhecido';
    };

    const formatTime = (isoString) => {
        if (!isoString) return '-';
        return new Date(isoString).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (isoDate) => {
        return new Date(isoDate).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', weekday: 'short' });
    };

    return (
        <>
            <Head>
                <title>Relatório de Presenças - Villa Mar</title>
            </Head>

            <Header user={currentUser} isAdmin={isAdmin} onModeSwitch={toggleMode} />
            <Sidebar isAdmin={true} />
            <BottomNav isAdmin={true} />

            <main className={styles.main}>
                <div className={styles.container}>
                    <div className={styles.header}>
                        <h1 className={styles.pageTitle}>
                            <Clock size={28} />
                            Presenças Mensais
                        </h1>
                        <button className={styles.addButton} title="Exportar CSV (Demo)">
                            <Download size={20} />
                        </button>
                    </div>

                    {/* Filters Toolbar */}
                    <div style={{
                        background: 'white',
                        padding: '16px',
                        borderRadius: '16px',
                        marginBottom: '20px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '16px',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <button onClick={prevMonth} className={styles.iconButton}><ChevronLeft size={20} /></button>
                            <span style={{ fontSize: '18px', fontWeight: 'bold', minWidth: '140px', textAlign: 'center' }}>
                                {currentDate.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
                            </span>
                            <button onClick={nextMonth} className={styles.iconButton}><ChevronRight size={20} /></button>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Filter size={18} color="#666" />
                            <select
                                value={selectedEmployee}
                                onChange={(e) => setSelectedEmployee(e.target.value)}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid #ddd',
                                    fontSize: '14px',
                                    outline: 'none',
                                    minWidth: '200px'
                                }}
                            >
                                <option value="all">Todos os Funcionários</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Records Table */}
                    <div className={styles.list}>
                        {filteredRecords.length > 0 ? (
                            filteredRecords.map(record => (
                                <div key={record.id} className={styles.listItem} style={{ alignItems: 'center' }}>
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        marginRight: '12px',
                                        minWidth: '60px',
                                        background: '#f5f5f7',
                                        padding: '4px 8px',
                                        borderRadius: '8px'
                                    }}>
                                        <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{formatDate(record.date).split(',')[1]}</span>
                                        <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#666' }}>
                                            {formatDate(record.date).split(',')[0]}
                                        </span>
                                    </div>

                                    <Avatar name={getEmployeeName(record.employeeId)} size="sm" />

                                    <div className={styles.listItemInfo} style={{ marginLeft: '12px', flex: 1 }}>
                                        <span className={styles.listItemName}>{getEmployeeName(record.employeeId)}</span>
                                        <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: '#666', marginTop: '4px' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10B981' }}>
                                                Entrada: <b>{formatTime(record.startTime)}</b>
                                            </span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#EF4444' }}>
                                                Saída: <b>{formatTime(record.endTime)}</b>
                                            </span>
                                        </div>
                                    </div>

                                    <div className={styles.statusBadge} style={{ background: '#E0E7FF', color: '#4338CA' }}>
                                        <Clock size={14} />
                                        <span>{Math.floor(record.durationMinutes / 60)}h {record.durationMinutes % 60}m</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
                                Nenhum registo encontrado para este período.
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </>
    );
}
