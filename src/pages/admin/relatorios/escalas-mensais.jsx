import Head from 'next/head';
import { useState } from 'react';
import styles from '@/styles/AdminPages.module.css';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import Avatar from '@/components/ui/Avatar';
import { useApp } from '../../_app';
import { useData } from '@/contexts/DataContext';
import { CalendarDays, ChevronLeft, ChevronRight, Download } from 'lucide-react';

export default function EscalasMensaisPage() {
    const { isAdmin, toggleMode, currentUser } = useApp();
    const { employees, savedSchedules } = useData();

    const [currentDate, setCurrentDate] = useState(new Date());

    // Navegar meses
    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)));
    };

    // Calcular estatísticas de turnos
    const getShiftStats = (employeeId) => {
        let manha = 0;
        let tarde = 0;
        let folga = 0;

        // Iterar sobre todas as escalas salvas
        Object.entries(savedSchedules).forEach(([key, scheduleData]) => {
            // Verificar se a escala pertence ao mês selecionado
            // key format: "YYYY-MM"
            const [year, month] = key.split('-').map(Number);

            // Comparar com currentDate (month é 0-indexed no JS Date, mas 1-indexed na key)
            if (year === currentDate.getFullYear() && (month - 1) === currentDate.getMonth()) {

                // Verificar se existe dados de escalas
                if (scheduleData && scheduleData.schedules && scheduleData.schedules[employeeId]) {
                    const empSchedule = scheduleData.schedules[employeeId];

                    // Iterar sobre os dias
                    Object.values(empSchedule).forEach(dayData => {
                        // dayData pode ser string (legado) ou objeto { shift: '...', ... }
                        const shift = typeof dayData === 'string' ? dayData : dayData.shift;

                        if (shift === 'Manhã') manha++;
                        else if (shift === 'Tarde') tarde++;
                        else if (shift === 'Folga') folga++;
                    });
                }
            }
        });

        return { manha, tarde, folga, total: manha + tarde };
    };

    return (
        <>
            <Head>
                <title>Relatório de Escalas - Villa Mar</title>
            </Head>

            <Header user={currentUser} isAdmin={isAdmin} onModeSwitch={toggleMode} />
            <Sidebar isAdmin={true} />
            <BottomNav isAdmin={true} />

            <main className={styles.main}>
                <div className={styles.container}>
                    <div className={styles.header}>
                        <h1 className={styles.pageTitle}>
                            <CalendarDays size={28} />
                            Escalas por Mês
                        </h1>
                        <button className={styles.addButton} title="Exportar CSV (Demo)">
                            <Download size={20} />
                        </button>
                    </div>

                    {/* Month Navigator */}
                    <div style={{
                        background: 'white',
                        padding: '16px',
                        borderRadius: '16px',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '20px'
                    }}>
                        <button onClick={prevMonth} className={styles.iconButton}><ChevronLeft size={20} /></button>
                        <span style={{ fontSize: '18px', fontWeight: 'bold', minWidth: '140px', textAlign: 'center' }}>
                            {currentDate.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
                        </span>
                        <button onClick={nextMonth} className={styles.iconButton}><ChevronRight size={20} /></button>
                    </div>

                    {/* Employee Stats List */}
                    <div className={styles.list}>
                        <div className={styles.listItem} style={{ background: 'transparent', boxShadow: 'none', padding: '0 16px', marginBottom: '8px' }}>
                            <span style={{ flex: 1, fontSize: '12px', fontWeight: 'bold', color: '#666' }}>FUNCIONÁRIO</span>
                            <div style={{ display: 'flex', gap: '8px', minWidth: '200px', justifyContent: 'flex-end' }}>
                                <span style={{ width: '40px', textAlign: 'center', fontSize: '12px', fontWeight: 'bold', color: '#666' }}>MANHÃ</span>
                                <span style={{ width: '40px', textAlign: 'center', fontSize: '12px', fontWeight: 'bold', color: '#666' }}>TARDE</span>
                                <span style={{ width: '40px', textAlign: 'center', fontSize: '12px', fontWeight: 'bold', color: '#666' }}>FOLGA</span>
                            </div>
                        </div>

                        {employees.map(emp => {
                            const stats = getShiftStats(emp.id);
                            return (
                                <div key={emp.id} className={styles.listItem} style={{ alignItems: 'center' }}>
                                    <Avatar name={emp.name} size="sm" />
                                    <div className={styles.listItemInfo} style={{ marginLeft: '12px', flex: 1 }}>
                                        <span className={styles.listItemName}>{emp.name}</span>
                                        <span className={styles.listItemRole}>{emp.role}</span>
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px', minWidth: '200px', justifyContent: 'flex-end' }}>
                                        <div style={{ width: '40px', textAlign: 'center', background: '#FFF8D4', color: '#B45309', borderRadius: '8px', padding: '4px', fontWeight: 'bold' }}>
                                            {stats.manha}
                                        </div>
                                        <div style={{ width: '40px', textAlign: 'center', background: '#E0E7FF', color: '#4338CA', borderRadius: '8px', padding: '4px', fontWeight: 'bold' }}>
                                            {stats.tarde}
                                        </div>
                                        <div style={{ width: '40px', textAlign: 'center', background: '#DCFCE7', color: '#15803D', borderRadius: '8px', padding: '4px', fontWeight: 'bold' }}>
                                            {stats.folga}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </main>
        </>
    );
}
