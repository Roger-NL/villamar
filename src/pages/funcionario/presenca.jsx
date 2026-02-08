import Head from 'next/head';
import { useState } from 'react';
import styles from '@/styles/Presenca.module.css';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import { useApp } from '../_app';
import { mockCurrentUser, formatTime } from '@/data/mockData';
import { LogIn, LogOut, Clock, Check, Coffee, Calendar } from 'lucide-react';

export default function PresencaPage() {
    const { isAdmin, toggleMode } = useApp();
    const user = mockCurrentUser;
    const [clockedIn, setClockedIn] = useState(false);
    const [clockTime, setClockTime] = useState(null);
    const [history, setHistory] = useState([
        { type: 'in', time: '08:02', date: '2026-02-06' },
        { type: 'out', time: '16:35', date: '2026-02-06' },
        { type: 'in', time: '07:58', date: '2026-02-05' },
        { type: 'out', time: '16:28', date: '2026-02-05' },
    ]);

    const handleClock = () => {
        const now = new Date();
        const time = formatTime(now);

        if (clockedIn) {
            setClockedIn(false);
            setHistory([{ type: 'out', time, date: '2026-02-07' }, ...history]);
        } else {
            setClockedIn(true);
            setClockTime(time);
            setHistory([{ type: 'in', time, date: '2026-02-07' }, ...history]);
        }
    };

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
                            {formatTime(new Date())}
                        </div>

                        <button
                            className={`${styles.bigClockButton} ${clockedIn ? styles.out : styles.in}`}
                            onClick={handleClock}
                        >
                            <div className={styles.clockIcon}>
                                {clockedIn ? <LogOut size={48} /> : <LogIn size={48} />}
                            </div>
                            <span className={styles.clockLabel}>
                                {clockedIn ? 'Registar Saída' : 'Registar Entrada'}
                            </span>
                        </button>

                        {clockedIn && (
                            <div className={styles.status}>
                                <Check size={20} />
                                <span>Entrada às {clockTime}</span>
                            </div>
                        )}
                    </div>

                    {/* Today's Info */}
                    <div className={styles.infoCards}>
                        <div className={styles.infoCard}>
                            <Calendar size={24} />
                            <div>
                                <span className={styles.infoLabel}>Turno Hoje</span>
                                <span className={styles.infoValue}>Manhã</span>
                            </div>
                        </div>
                        <div className={styles.infoCard}>
                            <Clock size={24} />
                            <div>
                                <span className={styles.infoLabel}>Horário</span>
                                <span className={styles.infoValue}>8h - 16:30</span>
                            </div>
                        </div>
                    </div>

                    {/* History */}
                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>Histórico</h3>
                        <div className={styles.historyList}>
                            {history.map((entry, i) => (
                                <div key={i} className={`${styles.historyItem} ${styles[entry.type]}`}>
                                    <div className={styles.historyLeft}>
                                        <div className={styles.historyIcon}>
                                            {entry.type === 'in' ? <LogIn size={18} /> : <LogOut size={18} />}
                                        </div>
                                        <div className={styles.historyInfo}>
                                            <span className={styles.historyType}>
                                                {entry.type === 'in' ? 'Entrada' : 'Saída'}
                                            </span>
                                            <span className={styles.historyDate}>{entry.date}</span>
                                        </div>
                                    </div>
                                    <span className={styles.historyTime}>{entry.time}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </main>
        </>
    );
}
