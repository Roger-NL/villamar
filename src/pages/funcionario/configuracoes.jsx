import Head from 'next/head';
import { useState, useEffect, startTransition } from 'react';
import styles from '@/styles/Config.module.css';
import formStyles from '@/styles/Forms.module.css';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import { useApp } from '../_app';
import { useData } from '@/contexts/DataContext';
import Avatar from '@/components/ui/Avatar';
import { User, Bell, Moon, Shield, LogOut, ChevronRight, Check, X, Lock, Save } from 'lucide-react';

export default function ConfiguracoesPage() {
    const { isAdmin, toggleMode, currentUser, setCurrentUser } = useApp();
    const { updateEmployee } = useData();
    const [user, setUser] = useState(currentUser);

    useEffect(() => {
        if (currentUser) {
            startTransition(() => {
                setUser(currentUser);
            });
        }
    }, [currentUser]);
    const [notifications, setNotifications] = useState(true);
    const [darkMode, setDarkMode] = useState(false);

    // Profile Settings
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [newName, setNewName] = useState(user.name);

    // Security Settings
    const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [pinError, setPinError] = useState('');
    const [pinSuccess, setPinSuccess] = useState('');

    if (!user) {
        return <div>A carregar...</div>;
    }

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        if (currentUser && newName.trim()) {
            await updateEmployee(currentUser.id, { name: newName.trim() });
            setCurrentUser({ ...currentUser, name: newName.trim() });
            setIsProfileModalOpen(false);
        }
    };

    const handleSaveSecurity = async (e) => {
        e.preventDefault();
        setPinError('');
        setPinSuccess('');

        if (newPin !== confirmPin) {
            setPinError('Os códigos não coincidem.');
            return;
        }

        if (newPin.length < 4) {
            setPinError('O código deve ter pelo menos 4 dígitos.');
            return;
        }

        if (currentUser) {
            await updateEmployee(currentUser.id, { pin: newPin });
            setPinSuccess('Senha/Códido alterado com sucesso!');
            setTimeout(() => {
                setIsSecurityModalOpen(false);
                setNewPin('');
                setConfirmPin('');
                setPinSuccess('');
            }, 2000);
        }
    };

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
                            <button className={styles.option} onClick={() => { setNewName(user.name); setIsProfileModalOpen(true); }}>
                                <div className={styles.optionLeft}>
                                    <div className={styles.optionIcon}>
                                        <User size={20} />
                                    </div>
                                    <span>Perfil</span>
                                </div>
                                <ChevronRight size={20} className={styles.arrow} />
                            </button>

                            <button className={styles.option} onClick={() => { setIsSecurityModalOpen(true); setNewPin(''); setConfirmPin(''); setPinError(''); setPinSuccess(''); }}>
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

                {/* MODAL PERFIL */}
                {isProfileModalOpen && (
                    <div className={formStyles.modalBackdrop} onClick={() => setIsProfileModalOpen(false)}>
                        <div className={formStyles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', margin: '0 auto' }}>
                            <div className={formStyles.modalHeader} style={{ marginBottom: '24px' }}>
                                <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <User size={20} color="#0284c7" /> Editar Perfil
                                </h2>
                                <button className={formStyles.closeBtn} onClick={() => setIsProfileModalOpen(false)}>
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div className={formStyles.formGroup}>
                                    <label className={formStyles.label}>Nome Apresentado</label>
                                    <input
                                        type="text"
                                        className={formStyles.input}
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    style={{
                                        width: '100%', padding: '14px', marginTop: '8px',
                                        background: '#0284c7', color: 'white', border: 'none', borderRadius: '12px',
                                        fontWeight: '600', fontSize: '1rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'
                                    }}
                                >
                                    <Save size={18} /> Guardar Alterações
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL SEGURANÇA */}
                {isSecurityModalOpen && (
                    <div className={formStyles.modalBackdrop} onClick={() => setIsSecurityModalOpen(false)}>
                        <div className={formStyles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', margin: '0 auto' }}>
                            <div className={formStyles.modalHeader} style={{ marginBottom: '24px' }}>
                                <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Shield size={20} color="#0284c7" /> Segurança
                                </h2>
                                <button className={formStyles.closeBtn} onClick={() => setIsSecurityModalOpen(false)}>
                                    <X size={24} />
                                </button>
                            </div>

                            {pinError && (
                                <div style={{ background: '#FEE2E2', color: '#DC2626', padding: '12px', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '16px', textAlign: 'center', fontWeight: 'bold' }}>
                                    {pinError}
                                </div>
                            )}

                            {pinSuccess && (
                                <div style={{ background: '#DCFCE7', color: '#16A34A', padding: '12px', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '16px', textAlign: 'center', fontWeight: 'bold' }}>
                                    {pinSuccess}
                                </div>
                            )}

                            <form onSubmit={handleSaveSecurity} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div className={formStyles.formGroup}>
                                    <label className={formStyles.label}>Novo Código / Senha</label>
                                    <div style={{ position: 'relative' }}>
                                        <Lock size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: '#9CA3AF' }} />
                                        <input
                                            type="password"
                                            className={formStyles.input}
                                            style={{ paddingLeft: '40px', letterSpacing: '2px', fontFamily: 'monospace' }}
                                            maxLength={6}
                                            placeholder="Ex: 123456"
                                            value={newPin}
                                            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                                            required
                                        />
                                    </div>
                                    <span style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'block' }}>Apenas números. No mínimo 4 dígitos.</span>
                                </div>

                                <div className={formStyles.formGroup}>
                                    <label className={formStyles.label}>Confirmar Nova Senha</label>
                                    <div style={{ position: 'relative' }}>
                                        <Check size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: '#9CA3AF' }} />
                                        <input
                                            type="password"
                                            className={formStyles.input}
                                            style={{ paddingLeft: '40px', letterSpacing: '2px', fontFamily: 'monospace' }}
                                            maxLength={6}
                                            placeholder="Repita o código"
                                            value={confirmPin}
                                            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    style={{
                                        width: '100%', padding: '14px', marginTop: '8px',
                                        background: '#0284c7', color: 'white', border: 'none', borderRadius: '12px',
                                        fontWeight: '600', fontSize: '1rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'
                                    }}
                                >
                                    <Lock size={18} /> Atualizar Senha
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </>
    );
}
