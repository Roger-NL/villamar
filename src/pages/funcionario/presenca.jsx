import Head from 'next/head';
import { useState, useEffect } from 'react';
import styles from '@/styles/Presenca.module.css';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import { useApp } from '../_app';
import { useData } from '@/contexts/DataContext';
import { LogIn, LogOut, Clock, Check, Calendar, Sun, HeartPulse, Coffee } from 'lucide-react';

export default function PresencaPage() {
    const { isAdmin, toggleMode, currentUser } = useApp();
    const { clockIn, clockOut, isEmployeeClockedIn, getActiveSession, getTimeRecords, getTotalHours, getScheduleForMonth } = useData();
    const user = currentUser;
    const [currentTime, setCurrentTime] = useState(new Date());

    // Relógio em tempo real
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const isClockedIn = user ? isEmployeeClockedIn(user.id) : false;
    const activeSession = user ? getActiveSession(user.id) : null;

    const handleClock = async () => {
        if (!user) return;
        if (isClockedIn) {
            await clockOut(user.id);
        } else {
            await clockIn(user.id);
        }
    };

    // Estísticas do Mês
    const today = new Date();
    const monthSchedule = getScheduleForMonth(today.getFullYear(), today.getMonth());

    let diasTrabalho = 0;
    let diasFolga = 0;
    let finaisSemanaFolga = 0;
    let currentShift = 'Não definido';
    let currentHours = '-';

    if (monthSchedule && monthSchedule.schedules && user) {
        const scheduleObj = monthSchedule.schedules[user.id] || monthSchedule.schedules[parseInt(user.id)] || monthSchedule.schedules[user.id.toString()];

        if (scheduleObj) {
            let lastSaturdayOff = false;

            const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
            const dateStrToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

            if (scheduleObj[dateStrToday]) {
                currentShift = scheduleObj[dateStrToday].shift || 'Folga';
                currentHours = scheduleObj[dateStrToday].hours || '-';
            }

            for (let i = 1; i <= daysInMonth; i++) {
                const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                const dailyShift = scheduleObj[dateStr];

                const dayDate = new Date(today.getFullYear(), today.getMonth(), i);
                const dow = dayDate.getDay();

                const isOff = dailyShift ? (dailyShift.isOff || dailyShift.shift === 'Folga' || !dailyShift.shift) : true;

                if (isOff) {
                    diasFolga++;
                } else {
                    diasTrabalho++;
                }

                if (dow === 6) { // Sábado
                    lastSaturdayOff = isOff;
                } else if (dow === 0) { // Domingo
                    if (lastSaturdayOff && isOff) {
                        finaisSemanaFolga++;
                        diasFolga -= 2; // Remove os dois dias que já tinham sido adicionados ao 'diasFolga' normal
                    }
                    lastSaturdayOff = false;
                } else {
                    lastSaturdayOff = false;
                }
            }
        }
    }

    const { hours: totalHours, minutes: totalMinutes } = user ? getTotalHours(user.id) : { hours: 0, minutes: 0 };
    const historyRecords = user ? getTimeRecords(user.id).sort((a, b) => new Date(b.startTime) - new Date(a.startTime)) : [];

    return (
        <>
            <Head>
                <title>Ponto - Villa Mar</title>
            </Head>

            <Header user={user} isAdmin={isAdmin} onModeSwitch={toggleMode} />
            <Sidebar isAdmin={false} />
            <BottomNav isAdmin={false} />

            <main className={styles.main}>
                <div className={styles.container}>

                    {/* Big Clock Button */}
                    <div className={styles.clockSection}>
                        <div className={styles.currentTime}>
                            {currentTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                        </div>

                        <button
                            className={`${styles.bigClockButton} ${isClockedIn ? styles.out : styles.in}`}
                            onClick={handleClock}
                        >
                            <div className={styles.clockIcon}>
                                {isClockedIn ? <LogOut size={48} /> : <LogIn size={48} />}
                            </div>
                            <span className={styles.clockLabel}>
                                {isClockedIn ? 'Registar Saída' : 'Registar Entrada'}
                            </span>
                        </button>

                        {isClockedIn && activeSession && (
                            <div className={styles.status}>
                                <Check size={20} />
                                <span>Entrada às {new Date(activeSession.startTime).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        )}
                    </div>

                    {/* Informações do Turno e Estatísticas (Mensais) */}
                    <div className={styles.infoCards}>
                        <div className={styles.infoCard}>
                            <Calendar size={24} />
                            <div>
                                <span className={styles.infoLabel}>Turno Hoje</span>
                                <span className={styles.infoValue}>{currentShift}</span>
                            </div>
                        </div>
                        <div className={styles.infoCard}>
                            <Clock size={24} />
                            <div>
                                <span className={styles.infoLabel}>Horário</span>
                                <span className={styles.infoValue}>{currentHours}</span>
                            </div>
                        </div>
                        <div className={styles.infoCard}>
                            <HeartPulse size={24} style={{ color: '#0284C7' }} />
                            <div>
                                <span className={styles.infoLabel}>Dias de Trabalho</span>
                                <span className={styles.infoValue}>{diasTrabalho} d</span>
                            </div>
                        </div>
                        <div className={styles.infoCard}>
                            <Coffee size={24} style={{ color: '#F59E0B' }} />
                            <div>
                                <span className={styles.infoLabel}>Dias de Folga</span>
                                <span className={styles.infoValue}>{diasFolga} d</span>
                            </div>
                        </div>
                        <div className={styles.infoCard}>
                            <Sun size={24} style={{ color: '#EAB308' }} />
                            <div>
                                <span className={styles.infoLabel}>Fim de Sem. Livres</span>
                                <span className={styles.infoValue}>{finaisSemanaFolga} FDS</span>
                            </div>
                        </div>
                        <div className={styles.infoCard}>
                            <Clock size={24} style={{ color: '#8B5CF6' }} />
                            <div>
                                <span className={styles.infoLabel}>Horas Registadas</span>
                                <span className={styles.infoValue}>{totalHours}h {totalMinutes}m</span>
                            </div>
                        </div>
                    </div>

                    {/* Historico Mensal Real */}
                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>Histórico do Mês</h3>
                        <div className={styles.historyList}>
                            {historyRecords.length > 0 ? historyRecords.map((record) => (
                                <div key={record.id} className={`${styles.historyItem} ${styles.in}`}>
                                    <div className={styles.historyLeft}>
                                        <div className={styles.historyIcon} style={{ background: '#E0F2FE', color: '#0284C7' }}>
                                            <Calendar size={18} />
                                        </div>
                                        <div className={styles.historyInfo}>
                                            <span className={styles.historyType}>
                                                Trabalho Registado
                                            </span>
                                            <span className={styles.historyDate}>
                                                {new Date(record.startTime).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                        <span className={styles.historyTime}>
                                            {new Date(record.startTime).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })} - {record.endTime ? new Date(record.endTime).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : '...'}
                                        </span>
                                        <span style={{ fontSize: '12px', color: '#64748B' }}>
                                            {record.endTime ? `${Math.floor(record.durationMinutes / 60)}h ${record.durationMinutes % 60}m` : 'A decorrer'}
                                        </span>
                                    </div>
                                </div>
                            )) : (
                                <div style={{ textAlign: 'center', color: '#94A3B8', padding: '20px' }}>
                                    Nenhum registo de ponto este mês.
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </main>
        </>
    );
}
