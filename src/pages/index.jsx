import Head from 'next/head';
import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/router';
import styles from '@/styles/Home.module.css';
import formStyles from '@/styles/Forms.module.css';
import { useApp } from './_app';
import { useData } from '@/contexts/DataContext';
import { db, auth } from '@/config/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import Avatar from '@/components/ui/Avatar';
import { User, Shield, ChevronRight, X, Lock, Mail, LogIn, Bell, ArrowLeft, UserPlus, CalendarDays, ClipboardCheck, Baby, Syringe, Smartphone, BarChart3, ShieldCheck, Sparkles } from 'lucide-react';

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

    const teamCount = employees.filter(emp => !emp.isAdmin && emp.role !== 'Administrador').length;
    const unreadAlerts = notifications.filter(notification => !notification?.read).length || notifications.length;
    const landingHighlights = [
        { icon: CalendarDays, label: 'Escalas e presenças em tempo real' },
        { icon: ClipboardCheck, label: 'Plano diário com tarefas por responsável' },
        { icon: Baby, label: 'Fraldas, reposição e stock controlado' },
        { icon: Syringe, label: 'Área médica com registos e observações' },
    ];
    const landingPillars = [
        {
            icon: ShieldCheck,
            title: 'Acesso por perfil',
            description: 'Cada pessoa entra apenas no que precisa: equipa, administração, área médica e operações restritas.'
        },
        {
            icon: Smartphone,
            title: 'Telemóvel primeiro',
            description: 'Feito para funcionar rápido no bolso, com leitura clara, instalação web app e uso prático no dia a dia.'
        },
        {
            icon: BarChart3,
            title: 'Tudo ligado',
            description: 'Relatórios, escalas, fraldas, tarefas, trocas e observações clínicas num ecossistema único e vivo.'
        }
    ];


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

            localStorage.removeItem('villamar_employee_session');
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
                <title>Villa Mar | Plataforma Interna</title>
                <meta name="description" content="Plataforma interna da Villa Mar para organização diária da equipa, escalas, tarefas, fraldas, área médica e gestão." />
                <meta name="theme-color" content="#0C4EA2" />
                <meta property="og:title" content="Villa Mar | Plataforma Interna" />
                <meta property="og:description" content="Uma entrada elegante para o sistema que organiza escalas, tarefas, fraldas, relatórios e área médica da Villa Mar." />
                <meta property="og:image" content="/villamar-hero.svg" />
                <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
                <link rel="apple-touch-icon" href="/villamar-mark.svg" />
            </Head>

            <main className={styles.main}>
                <div className={styles.ambientGlowLeft} />
                <div className={styles.ambientGlowRight} />
                <div className={styles.gridGlow} />

                <div className={styles.content}>
                    <section className={styles.heroSection}>
                        <div className={styles.heroCopy}>
                            <div className={styles.brandPill}>
                                <Image src="/villamar-mark.svg" alt="Marca Villa Mar" width={52} height={52} className={styles.brandMark} />
                                <div>
                                    <span className={styles.brandEyebrow}>Plataforma interna Villa Mar</span>
                                    <strong className={styles.brandName}>villamaracesso.pt</strong>
                                </div>
                            </div>

                            <div className={styles.heroHeading}>
                                <span className={styles.heroBadge}>
                                    <Sparkles size={16} />
                                    Sistema vivo, bonito e pronto para a rotina real
                                </span>
                                <h1>Uma entrada à altura da Villa Mar, não só um ecrã de login.</h1>
                                <p>
                                    Escalas, presenças, plano de tarefas, fraldas, área médica, relatórios e gestão num só ambiente.
                                    Tudo online, instalado no telemóvel e pensado para ser claro tanto para a direção como para a equipa.
                                </p>
                            </div>

                            <div className={styles.highlightGrid}>
                                {landingHighlights.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <div key={item.label} className={styles.highlightCard}>
                                            <div className={styles.highlightIcon}>
                                                <Icon size={18} />
                                            </div>
                                            <span>{item.label}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className={styles.metricStrip}>
                                <div className={styles.metricCard}>
                                    <strong>{teamCount}</strong>
                                    <span>profissionais registados</span>
                                </div>
                                <div className={styles.metricCard}>
                                    <strong>{unreadAlerts}</strong>
                                    <span>alertas no sistema</span>
                                </div>
                                <div className={styles.metricCard}>
                                    <strong>100%</strong>
                                    <span>web app e telemóvel</span>
                                </div>
                            </div>
                        </div>

                        <div className={styles.heroVisual}>
                            <div className={styles.heroArtFrame}>
                                <Image src="/villamar-hero.svg" alt="Pré-visualização do sistema Villa Mar" width={840} height={660} className={styles.heroArt} priority />
                            </div>
                            <div className={styles.visualMiniCards}>
                                <div className={styles.visualMiniCard}>
                                    <Bell size={18} />
                                    <div>
                                        <strong>Operação diária num só sítio</strong>
                                        <span>Tarefas, avisos, fraldas e controlo da casa sem ruído.</span>
                                    </div>
                                </div>
                                <div className={styles.visualMiniCard}>
                                    <Smartphone size={18} />
                                    <div>
                                        <strong>Instalável no telemóvel</strong>
                                        <span>Funciona como app web, pronta para iPhone, Android, tablet e desktop.</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className={styles.accessSection}>
                        <div className={styles.sectionHeader}>
                            <div>
                                <span className={styles.sectionEyebrow}>Entradas</span>
                                <h2>Aceder à plataforma</h2>
                            </div>
                            <p>
                                A mesma casa, com acessos diferentes para quem cuida, para quem gere e para quem coordena a operação.
                            </p>
                        </div>

                        <div className={styles.accessGrid}>
                            <button className={`${styles.accessCard} ${styles.accessCardPrimary}`} onClick={() => handleOpenSelector('employee')}>
                                <div className={`${styles.accessIconWrap} ${styles.accessBlue}`}>
                                    <User size={30} strokeWidth={1.7} />
                                </div>
                                <div className={styles.accessInfo}>
                                    <h3>Equipa</h3>
                                    <p>Entrar como funcionário com PIN, acesso rápido à rotina, tarefas, fraldas, escalas e área médica.</p>
                                </div>
                                <div className={styles.accessMeta}>
                                    <span>{teamCount} colaboradores ativos</span>
                                    <ChevronRight className={styles.arrow} />
                                </div>
                            </button>

                            <button className={styles.accessCard} onClick={() => handleOpenSelector('admin')}>
                                <div className={`${styles.accessIconWrap} ${styles.accessDark}`}>
                                    <Shield size={30} strokeWidth={1.7} />
                                </div>
                                <div className={styles.accessInfo}>
                                    <h3>Admin & Direção</h3>
                                    <p>Gestão restrita com controlo da equipa, reposição, relatórios, configurações, utilizadores e operação global.</p>
                                </div>
                                <div className={styles.accessMeta}>
                                    <span>Acesso protegido por email e senha</span>
                                    <ChevronRight className={styles.arrow} />
                                </div>
                            </button>
                        </div>

                        <div className={styles.bottomNote}>
                            <span>Villa Mar v2.0</span>
                            <span>Experiência otimizada para web, desktop e telemóvel</span>
                        </div>
                    </section>

                    <section className={styles.pillarsSection}>
                        {landingPillars.map((item) => {
                            const Icon = item.icon;
                            return (
                                <article key={item.title} className={styles.pillarCard}>
                                    <div className={styles.pillarIcon}>
                                        <Icon size={20} />
                                    </div>
                                    <h3>{item.title}</h3>
                                    <p>{item.description}</p>
                                </article>
                            );
                        })}
                    </section>

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
                                        .filter(emp => !emp.isAdmin && emp.role !== 'Administrador')
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
