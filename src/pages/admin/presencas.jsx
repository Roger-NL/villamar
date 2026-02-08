import Head from 'next/head';
import styles from '@/styles/AdminPages.module.css';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import Avatar from '@/components/ui/Avatar';
import { useApp } from '../_app';
import { mockEmployees, mockCurrentUser } from '@/data/mockData';
import { UserCheck, UserX, Coffee, Clock, Search } from 'lucide-react';

export default function AdminPresencasPage() {
    const { isAdmin, toggleMode } = useApp();

    const getStatusIcon = (status) => {
        switch (status) {
            case 'present': return <UserCheck size={18} />;
            case 'absent': return <UserX size={18} />;
            case 'dayoff': return <Coffee size={18} />;
            default: return null;
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'present': return 'Presente';
            case 'absent': return 'Ausente';
            case 'dayoff': return 'Folga';
            default: return status;
        }
    };

    return (
        <>
            <Head>
                <title>Presenças - Admin Villa Mar</title>
            </Head>

            <Header user={mockCurrentUser} isAdmin={isAdmin} onModeSwitch={toggleMode} />
            <Sidebar isAdmin={true} />
            <BottomNav isAdmin={true} />

            <main className={styles.main}>
                <div className={styles.container}>
                    <h1 className={styles.pageTitle}>
                        <UserCheck size={28} />
                        Presenças Hoje
                    </h1>

                    {/* Stats Summary */}
                    <div className={styles.miniStats}>
                        <div className={`${styles.miniStat} ${styles.success}`}>
                            <span className={styles.miniStatNumber}>
                                {mockEmployees.filter(e => e.status === 'present').length}
                            </span>
                            <span>Presentes</span>
                        </div>
                        <div className={`${styles.miniStat} ${styles.warning}`}>
                            <span className={styles.miniStatNumber}>
                                {mockEmployees.filter(e => e.status === 'dayoff').length}
                            </span>
                            <span>Folga</span>
                        </div>
                        <div className={`${styles.miniStat} ${styles.danger}`}>
                            <span className={styles.miniStatNumber}>
                                {mockEmployees.filter(e => e.status === 'absent').length}
                            </span>
                            <span>Ausentes</span>
                        </div>
                    </div>

                    {/* Employee List */}
                    <div className={styles.list}>
                        {mockEmployees.map(emp => (
                            <div key={emp.id} className={styles.listItem}>
                                <Avatar name={emp.name} size="md" status={emp.status === 'present' ? 'online' : emp.status === 'dayoff' ? 'away' : 'offline'} />
                                <div className={styles.listItemInfo}>
                                    <span className={styles.listItemName}>{emp.name}</span>
                                    <span className={styles.listItemRole}>{emp.role}</span>
                                </div>
                                <div className={`${styles.statusBadge} ${styles[emp.status]}`}>
                                    {getStatusIcon(emp.status)}
                                    <span>{getStatusLabel(emp.status)}</span>
                                </div>
                                {emp.clockIn && (
                                    <span className={styles.clockTime}>
                                        <Clock size={14} />
                                        {emp.clockIn}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </>
    );
}
