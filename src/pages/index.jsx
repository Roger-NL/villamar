import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '@/styles/Home.module.css';
import formStyles from '@/styles/Forms.module.css';
import { useApp } from './_app';
import { useData } from '@/contexts/DataContext';
import { db, auth } from '@/config/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import Avatar from '@/components/ui/Avatar';
import { User, Shield, ChevronRight, X, Lock, Mail, LogIn, Bell, ArrowLeft, UserPlus } from 'lucide-react';

export default function Home() {
    const router = useRouter();
    const { setIsAdmin, setCurrentUser } = useApp();
    const { employees, notifications, isHydrated } = useData();

    const [showUserSelector, setShowUserSelector] = useState(false);
    const [showAdminLogin, setShowAdminLogin] = useState(false);
    const [isRegisteringAdmin, setIsRegisteringAdmin] = useState(false);

    // Form Admins
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [adminName, setAdminName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form Equipa (PIN)
    const [selectedEmployeeForPin, setSelectedEmployeeForPin] = useState(null);
    const [enteredPin, setEnteredPin] = useState('');
    const [pinError, setPinError] = useState('');



    const handleOpenSelector = (mode) => {
        if (mode === 'employee') {
            setShowUserSelector(true);
            setShowAdminLogin(false);
            setSelectedEmployeeForPin(null);
        } else if (mode === 'admin') {
            setShowUserSelector(false);
            setShowAdminLogin(true);
            setIsRegisteringAdmin(false);
            setError('');
        }
    };

    const handleSelectUser = (employee) => {
        setSelectedEmployeeForPin(employee);
        setEnteredPin('');
        setPinError('');
    };

    const handlePinSubmit = (e) => {
        e.preventDefault();
        const correctPin = selectedEmployeeForPin.pin || '1234';

        if (enteredPin === correctPin) {
            localStorage.setItem('villamar_employee_session', selectedEmployeeForPin.id);
            setCurrentUser({
                id: selectedEmployeeForPin.id,
                name: selectedEmployeeForPin.name,
                role: selectedEmployeeForPin.role,
                avatar: null,
            });
            setIsAdmin(false);
            router.push('/funcionario');
        } else {
            setPinError('PIN Incorreto. Tente novamente.');
            setEnteredPin('');
        }
    };

    const handleAdminAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!auth) {
            setError('Ocorreu um erro: A ligação ao painel Firebase está falhando.');
            setLoading(false);
            return;
        }

        try {
            if (isRegisteringAdmin) {
                if (!adminName) throw new Error("Preencha o seu nome completo.");
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                const newUser = {
                    id: user.uid,
                    name: adminName,
                    email: email,
                    role: 'Administrador',
                    isAdmin: true,
                    status: 'absent',
                    clockIn: null,
                    clockOut: null,
                    createdAt: new Date().toISOString()
                };
                await setDoc(doc(db, 'employees', user.uid), newUser);
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (err) {
            console.error("Auth error:", err);
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                setError('Credenciais incorretas ou sem permissão.');
            } else if (err.code === 'auth/email-already-in-use') {
                setError('Este email já está registado.');
            } else if (err.code === 'auth/weak-password') {
                setError('A senha deve ter pelo menos 6 caracteres.');
            } else {
                setError(err.message || 'Ocorreu um erro ao autênticar admin.');
            }
            setLoading(false);
        }
    };

    if (!isHydrated) {
        return (
            <main className={styles.main}>
                <div className={styles.content}>
                    <div className={styles.loading}>A carregar sistema...</div>
                </div>
            </main>
        );
    }

    return (
        <>
            <Head>
                <title>Villa Mar | Autenticação</title>
                <meta name="theme-color" content="#F5F5F7" />
            </Head>

            <main className={styles.main}>
                <div className={styles.content}>

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
                                <h2>Admin & Direção</h2>
                                <p>Gestão restrita</p>
                            </div>
                            <ChevronRight className={styles.arrow} />
                        </button>
                    </div>

                    <p className={styles.footer}>v2.0 • {employees.length} funcionários no sistema</p>
                </div>
            </main>

            {/* Modal - LOGIN ADMIN */}
            {showAdminLogin && (
                <div className={formStyles.modalBackdrop} onClick={() => setShowAdminLogin(false)}>
                    <div className={formStyles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', margin: '0 auto' }}>
                        <div className={formStyles.modalHeader} style={{ marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {isRegisteringAdmin ? <UserPlus size={20} className={styles.blueText} /> : <Shield size={20} className={styles.blueText} />}
                                {isRegisteringAdmin ? 'Criar Acesso Admin' : 'Acesso Restrito Admin'}
                            </h2>
                            <button className={formStyles.closeBtn} onClick={() => setShowAdminLogin(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        {error && (
                            <div style={{ background: '#FEE2E2', color: '#DC2626', padding: '12px', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '16px', textAlign: 'center' }}>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleAdminAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {isRegisteringAdmin && (
                                <div className={formStyles.formGroup}>
                                    <label className={formStyles.label}>Nome Completo</label>
                                    <div style={{ position: 'relative' }}>
                                        <User size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: '#9CA3AF' }} />
                                        <input
                                            type="text"
                                            className={formStyles.input}
                                            style={{ paddingLeft: '40px' }}
                                            placeholder="Ex: Carlos Silva"
                                            value={adminName}
                                            onChange={(e) => setAdminName(e.target.value)}
                                            required={isRegisteringAdmin}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className={formStyles.formGroup}>
                                <label className={formStyles.label}>Email da Direção</label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: '#9CA3AF' }} />
                                    <input
                                        type="email"
                                        className={formStyles.input}
                                        style={{ paddingLeft: '40px' }}
                                        placeholder="admin@villamar.pt"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className={formStyles.formGroup}>
                                <label className={formStyles.label}>Código/Senha</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: '#9CA3AF' }} />
                                    <input
                                        type="password"
                                        className={formStyles.input}
                                        style={{ paddingLeft: '40px' }}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    width: '100%', padding: '14px', marginTop: '8px',
                                    background: isRegisteringAdmin ? '#3B82F6' : '#000', color: 'white', border: 'none', borderRadius: '12px',
                                    fontWeight: '600', fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer',
                                    display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                                    opacity: loading ? 0.7 : 1
                                }}
                            >
                                {loading ? 'A validar...' : (isRegisteringAdmin ? 'Registar' : 'Aceder ao Painel')}
                                {!loading && (isRegisteringAdmin ? <UserPlus size={18} /> : <LogIn size={18} />)}
                            </button>
                        </form>

                        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.875rem' }}>
                            <button
                                onClick={() => {
                                    setIsRegisteringAdmin(!isRegisteringAdmin);
                                    setError('');
                                }}
                                type="button"
                                style={{ background: 'none', border: 'none', color: '#6B7280', textDecoration: 'underline', cursor: 'pointer' }}
                            >
                                {isRegisteringAdmin ? 'Já possui conta? Iniciar Sessão' : 'Criar Conta de Direção'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal - SELEÇÃO DE EQUIPA E AUTENTICAÇÃO COM PIN */}
            {showUserSelector && (
                <div className={formStyles.modalBackdrop} onClick={() => setShowUserSelector(false)}>
                    <div className={formStyles.modal} onClick={e => e.stopPropagation()}>

                        {!selectedEmployeeForPin ? (
                            <>
                                <div className={formStyles.modalHeader}>
                                    <h2>
                                        <User size={24} /> Identificação da Equipa
                                    </h2>
                                    <button className={formStyles.closeBtn} onClick={() => setShowUserSelector(false)}>
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className={styles.userList}>
                                    {employees
                                        .filter(emp => emp.name.toLowerCase().includes('roger') || (!emp.isAdmin && emp.role !== 'Administrador'))
                                        .sort((a, b) => a.name.localeCompare(b.name))
                                        .map(emp => (
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
                                        A lista de funcionários está vazia. O Administrador precisa adicionar os colaboradores na Área de Gestão.
                                    </p>
                                )}
                            </>
                        ) : (
                            <>
                                <div className={formStyles.modalHeader} style={{ marginBottom: '16px', borderBottom: 'none' }}>
                                    <button className={formStyles.closeBtn} onClick={() => setSelectedEmployeeForPin(null)} style={{ background: '#F3F4F6', color: '#111827' }}>
                                        <ArrowLeft size={20} />
                                    </button>
                                    <h2 style={{ flex: 1, textAlign: 'center', fontSize: '1.2rem', paddingRight: '40px' }}>
                                        Introduzir PIN
                                    </h2>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                                    <Avatar name={selectedEmployeeForPin.name} size="xl" />
                                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{selectedEmployeeForPin.name}</h3>
                                    <span style={{ color: '#6B7280', fontSize: '0.9rem' }}>{selectedEmployeeForPin.role}</span>
                                </div>

                                {pinError && (
                                    <div style={{ background: '#FEE2E2', color: '#DC2626', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px', textAlign: 'center' }}>
                                        {pinError}
                                    </div>
                                )}

                                <form onSubmit={handlePinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>

                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            type="password"
                                            maxLength={4}
                                            autoFocus
                                            value={enteredPin}
                                            onChange={(e) => setEnteredPin(e.target.value.replace(/\D/g, ''))} // Apenas números
                                            style={{
                                                fontSize: '2rem',
                                                letterSpacing: '0.5em',
                                                padding: '16px',
                                                width: '180px',
                                                textAlign: 'center',
                                                borderRadius: '16px',
                                                border: '2px solid #E5E7EB',
                                                outline: 'none',
                                                fontFamily: 'monospace',
                                                background: '#F9FAFB'
                                            }}
                                            placeholder="••••"
                                            required
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={enteredPin.length < 4}
                                        style={{
                                            width: '100%', padding: '16px',
                                            background: enteredPin.length === 4 ? '#3B82F6' : '#9CA3AF',
                                            color: 'white', border: 'none', borderRadius: '12px',
                                            fontWeight: '600', fontSize: '1rem', cursor: enteredPin.length === 4 ? 'pointer' : 'not-allowed',
                                            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        Validar Ponto
                                        <ChevronRight size={18} />
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
