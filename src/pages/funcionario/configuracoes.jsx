import Head from 'next/head';
import { useState } from 'react';
import styles from '@/styles/Config.module.css';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import { useApp } from '../_app';
import { mockCurrentUser } from '@/data/mockData';
import Avatar from '@/components/ui/Avatar';
import { User, Bell, Moon, Shield, LogOut, ChevronRight, Check } from 'lucide-react';

export default function ConfiguracoesPage() {
    const { isAdmin, toggleMode } = useApp();
    const user = mockCurrentUser;
    const [notifications, setNotifications] = useState(true);
    const [darkMode, setDarkMode] = useState(false);

    return (
        <>
            <Head>
                <title>Configurações - Villa Mar</title>
            </Head>

            <Header user={user} isAdmin={isAdmin} onModeSwitch={toggleMode} />
            <Sidebar isAdmin={false} />
            <BottomNav isAdmin={false} />

            <main className={styles.main}>
                <div className={styles.container}>

                    {/* Profile Card */}
                    <div className={styles.profileCard}>
                        <Avatar name={user.name} size="xl" />
                        <div className={styles.profileInfo}>
                            <h2>{user.name}</h2>
                            <span>{user.role}</span>
                        </div>
                    </div>

                    {/* Settings Options */}
                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>Preferências</h3>

                        <div className={styles.optionsList}>
                            <div className={styles.option}>
                                <div className={styles.optionLeft}>
                                    <div className={styles.optionIcon}>
                                        <Bell size={20} />
                                    </div>
                                    <span>Notificações</span>
                                </div>
                                <button
                                    className={`${styles.toggle} ${notifications ? styles.on : ''}`}
                                    onClick={() => setNotifications(!notifications)}
                                >
                                    <span className={styles.toggleDot}></span>
                                </button>
                            </div>

                            <div className={styles.option}>
                                <div className={styles.optionLeft}>
                                    <div className={styles.optionIcon}>
                                        <Moon size={20} />
                                    </div>
                                    <span>Modo Escuro</span>
                                </div>
                                <button
                                    className={`${styles.toggle} ${darkMode ? styles.on : ''}`}
                                    onClick={() => setDarkMode(!darkMode)}
                                >
                                    <span className={styles.toggleDot}></span>
                                </button>
                            </div>
                        </div>
                    </section>

                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>Conta</h3>

                        <div className={styles.optionsList}>
                            <button className={styles.option}>
                                <div className={styles.optionLeft}>
                                    <div className={styles.optionIcon}>
                                        <User size={20} />
                                    </div>
                                    <span>Perfil</span>
                                </div>
                                <ChevronRight size={20} className={styles.arrow} />
                            </button>

                            <button className={styles.option}>
                                <div className={styles.optionLeft}>
                                    <div className={styles.optionIcon}>
                                        <Shield size={20} />
                                    </div>
                                    <span>Segurança</span>
                                </div>
                                <ChevronRight size={20} className={styles.arrow} />
                            </button>
                        </div>
                    </section>

                    <button className={styles.logoutButton} onClick={() => { localStorage.removeItem('villamar_employee_session'); window.location.href = '/'; }}>
                        <LogOut size={20} />
                        <span>Terminar Sessão</span>
                    </button>

                    <p className={styles.version}>Villa Mar v1.0.0</p>
                </div>
            </main>
        </>
    );
}
