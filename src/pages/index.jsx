import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '@/styles/Home.module.css';
import formStyles from '@/styles/Forms.module.css';
import { useApp } from './_app';
import { useData } from '@/contexts/DataContext';
import Avatar from '@/components/ui/Avatar';
import { User, Shield, ChevronRight, X, Bell } from 'lucide-react';

export default function Home() {
    const router = useRouter();
    const { setIsAdmin, setCurrentUser } = useApp();
    const { employees, notifications, isHydrated, markAllNotificationsRead } = useData();

    const [showUserSelector, setShowUserSelector] = useState(false);
    const [selectedMode, setSelectedMode] = useState(null); // 'employee' or 'admin'

    // Notificações não lidas
    const unreadNotifications = notifications.filter(n => !n.read);

    const handleOpenSelector = (mode) => {
        setSelectedMode(mode);
        setShowUserSelector(true);
    };

    const handleSelectUser = (employee) => {
        setCurrentUser({
            id: employee.id,
            name: employee.name,
            role: employee.role,
            avatar: null,
        });

        if (selectedMode === 'admin') {
            setIsAdmin(true);
            router.push('/admin');
        } else {
            setIsAdmin(false);
            router.push('/funcionario');
        }

        setShowUserSelector(false);
    };

    const handleEnterAdmin = () => {
        // Admin pode entrar direto ou escolher um utilizador
        setIsAdmin(true);
        router.push('/admin');
    };

    if (!isHydrated) {
        return (
            <main className={styles.main}>
                <div className={styles.content}>
                    <div className={styles.loading}>A carregar...</div>
                </div>
            </main>
        );
    }

    return (
        <>
            <Head>
                <title>Villa Mar</title>
                <meta name="theme-color" content="#F5F5F7" />
            </Head>

            <main className={styles.main}>
                <div className={styles.content}>
                    {/* Notification Badge */}
                    {unreadNotifications.length > 0 && (
                        <div className={styles.notifBanner}>
                            <Bell size={18} />
                            <span>{unreadNotifications.length} notificação(ões) nova(s)</span>
                        </div>
                    )}

                    <div className={styles.header}>
                        <div className={styles.logoIcon}>🌊</div>
                        <h1>Villa Mar</h1>
                        <p>Sistema de Gestão Interno</p>
                    </div>

                    <div className={styles.grid}>
                        <button className={styles.card} onClick={() => handleOpenSelector('employee')}>
                            <div className={`${styles.iconContainer} ${styles.blue}`}>
                                <User size={32} strokeWidth={1.5} />
                            </div>
                            <div className={styles.cardInfo}>
                                <h2>Equipa</h2>
                                <p>Entrar como funcionário</p>
                            </div>
                            <ChevronRight className={styles.arrow} />
                        </button>

                        <button className={styles.card} onClick={() => handleOpenSelector('admin')}>
                            <div className={`${styles.iconContainer} ${styles.gray}`}>
                                <Shield size={32} strokeWidth={1.5} />
                            </div>
                            <div className={styles.cardInfo}>
                                <h2>Admin</h2>
                                <p>Gestão e controlo</p>
                            </div>
                            <ChevronRight className={styles.arrow} />
                        </button>
                    </div>

                    <p className={styles.footer}>v1.2 • {employees.length} funcionários</p>
                </div>
            </main>

            {/* User Selector Modal */}
            {showUserSelector && (
                <div className={formStyles.modalBackdrop} onClick={() => setShowUserSelector(false)}>
                    <div className={formStyles.modal} onClick={e => e.stopPropagation()}>
                        <div className={formStyles.modalHeader}>
                            <h2>
                                {selectedMode === 'admin' ? <Shield size={24} /> : <User size={24} />}
                                {selectedMode === 'admin' ? 'Entrar como Admin' : 'Escolher Funcionário'}
                            </h2>
                            <button className={formStyles.closeBtn} onClick={() => setShowUserSelector(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        <div className={styles.userList}>
                            {employees.map(emp => (
                                <button
                                    key={emp.id}
                                    className={styles.userOption}
                                    onClick={() => handleSelectUser(emp)}
                                >
                                    <Avatar name={emp.name} size="md" />
                                    <div className={styles.userInfo}>
                                        <span className={styles.userName}>{emp.name}</span>
                                        <span className={styles.userRole}>{emp.role}</span>
                                    </div>
                                    <ChevronRight size={20} className={styles.userArrow} />
                                </button>
                            ))}
                        </div>

                        {employees.length === 0 && (
                            <p className={formStyles.confirmText}>
                                Nenhum funcionário registado. Adicione funcionários na área de admin.
                            </p>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
