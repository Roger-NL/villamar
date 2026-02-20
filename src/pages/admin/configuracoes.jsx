import Head from 'next/head';
import styles from '@/styles/Config.module.css';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import { useApp } from '../_app';
import { mockCurrentUser } from '@/data/mockData';
import Avatar from '@/components/ui/Avatar';
import { Settings, Bell, Shield, Users, Database, LogOut, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/router';

export default function AdminConfiguracoesPage() {
    const router = useRouter();
    const { isAdmin, toggleMode } = useApp();
    const [notifications, setNotifications] = useState(true);

    return (
        <>
            <Head>
                <title>Configurações - Admin Villa Mar</title>
            </Head>

            <Header user={mockCurrentUser} isAdmin={isAdmin} onModeSwitch={toggleMode} />
            <Sidebar isAdmin={true} />
            <BottomNav isAdmin={true} />

            <main className={styles.main}>
                <div className={styles.container}>

                    {/* Profile Card */}
                    <div className={styles.profileCard}>
                        <Avatar name="Administrador" size="xl" />
                        <div className={styles.profileInfo}>
                            <h2>Administrador</h2>
                            <span>Villa Mar</span>
                        </div>
                    </div>

                    {/* Settings */}
                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>Sistema</h3>

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

                            <button className={styles.option} onClick={() => router.push('/admin/novo-admin')}>
                                <div className={styles.optionLeft}>
                                    <div className={styles.optionIcon}>
                                        <Users size={20} />
                                    </div>
                                    <span>Gestão de Administradores</span>
                                </div>
                                <ChevronRight size={20} className={styles.arrow} />
                            </button>

                            <button className={styles.option}>
                                <div className={styles.optionLeft}>
                                    <div className={styles.optionIcon}>
                                        <Database size={20} />
                                    </div>
                                    <span>Backup de Dados</span>
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

                    <button className={styles.logoutButton} onClick={() => { import('firebase/auth').then(({ getAuth, signOut }) => signOut(getAuth())).then(() => window.location.href = '/') }}>
                        <LogOut size={20} />
                        <span>Terminar Sessão</span>
                    </button>

                    <p className={styles.version}>Villa Mar Admin v1.0.0</p>
                </div>
            </main>
        </>
    );
}
