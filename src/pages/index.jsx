import Head from 'next/head';
import { useState } from 'react';
import { useRouter } from 'next/router';
import styles from '@/styles/Home.module.css';
import formStyles from '@/styles/Forms.module.css';
import { useApp } from './_app';
import { useData } from '@/contexts/DataContext';
import { auth } from '@/config/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import Avatar from '@/components/ui/Avatar';
import { User, Shield, ChevronRight, X, Lock, Mail, LogIn, ArrowLeft, CalendarDays, ClipboardCheck, Baby, Syringe, Smartphone, BarChart3, ShieldCheck, Sparkles, FileText } from 'lucide-react';

export default function Home() {
    const router = useRouter();
    const { setIsAdmin, setCurrentUser } = useApp();
    const { employees, notifications, isHydrated } = useData();

    const [showUserSelector, setShowUserSelector] = useState(false);
    const [showAdminLogin, setShowAdminLogin] = useState(false);

    // Form Admins
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
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
            description: 'Cada pessoa entra apenas no que precisa, com clareza, segurança e menos ruído na operação diária.'
        },
        {
            icon: Smartphone,
            title: 'Telemóvel primeiro',
            description: 'Pensado para bolso, corredor e rotina real: leitura clara, web app instalada e uso rápido em qualquer turno.'
        },
        {
            icon: BarChart3,
            title: 'Tudo ligado',
            description: 'Escalas, tarefas, fraldas, trocas, relatórios e área médica ligados no mesmo ecossistema, sem folhas soltas.'
        }
    ];
    const entryOverview = [
        {
            icon: ClipboardCheck,
            title: 'Plano do dia',
            description: 'Responsáveis, áreas e tarefas principais organizadas logo à entrada.'
        },
        {
            icon: Baby,
            title: 'Fraldas e stock',
            description: 'Conferência, reposição e controlo do depósito sem perder o fio da operação.'
        },
        {
            icon: Syringe,
            title: 'Área médica',
            description: 'Insulina, observações clínicas e registos num fluxo simples de consultar.'
        },
        {
            icon: FileText,
            title: 'Relatórios e gestão',
            description: 'Informação da casa mais acessível para decidir e acompanhar com segurança.'
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
            await signInWithEmailAndPassword(auth, email, password);
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
                <meta name="description" content="A plataforma interna da Villa Mar para coordenar equipa, rotina diária, escalas, fraldas, área médica e gestão com elegância e clareza." />
                <meta name="theme-color" content="#0C4EA2" />
                <meta property="og:title" content="Villa Mar | Plataforma Interna" />
                <meta property="og:description" content="Uma entrada elegante para a plataforma que organiza a rotina, a equipa e a operação diária da Villa Mar." />
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
                                <img src="/villamar-mark.svg" alt="Marca Villa Mar" width={52} height={52} className={styles.brandMark} />
                                <div>
                                    <span className={styles.brandEyebrow}>Plataforma interna Villa Mar</span>
                                    <strong className={styles.brandName}>villamaracesso.pt</strong>
                                </div>
                            </div>

                            <div className={styles.heroHeading}>
                                <span className={styles.heroBadge}>
                                    <Sparkles size={16} />
                                    Tudo o que a casa precisa, num só lugar
                                </span>
                                <h1>Bem-vindos à plataforma interna da Villa Mar.</h1>
                                <p>
                                    Aqui ficam reunidas as rotinas da casa:
                                    equipa, turnos, tarefas, fraldas, área médica, relatórios e gestão.
                                    Um ponto de entrada claro para quem trabalha, para quem coordena e para quem precisa encontrar tudo sem complicação.
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
                            <div className={styles.visualBoard}>
                                <div className={styles.visualBoardHeader}>
                                    <div>
                                        <span className={styles.sectionEyebrow}>Entrar agora</span>
                                        <h2>Como quer entrar?</h2>
                                        <p>Escolha o acesso certo para si. Equipa entra com PIN. Direção e administração entram com email e senha.</p>
                                    </div>
                                </div>

                                <div className={styles.loginGrid}>
                                    <button className={`${styles.accessCard} ${styles.accessCardPrimary}`} onClick={() => handleOpenSelector('employee')}>
                                        <div className={`${styles.accessIconWrap} ${styles.accessBlue}`}>
                                            <User size={30} strokeWidth={1.7} />
                                        </div>
                                        <div className={styles.accessInfo}>
                                            <h3>Equipa</h3>
                                            <p>Para quem está em serviço e precisa abrir o dia, consultar tarefas e seguir a rotina com rapidez.</p>
                                        </div>
                                        <div className={styles.accessMeta}>
                                            <span>{teamCount} profissionais na equipa</span>
                                            <ChevronRight className={styles.arrow} />
                                        </div>
                                    </button>

                                    <button className={styles.accessCard} onClick={() => handleOpenSelector('admin')}>
                                        <div className={`${styles.accessIconWrap} ${styles.accessDark}`}>
                                            <Shield size={30} strokeWidth={1.7} />
                                        </div>
                                        <div className={styles.accessInfo}>
                                            <h3>Admin & Direção</h3>
                                            <p>Para quem organiza a casa, acompanha a equipa, consulta relatórios e gere o funcionamento geral.</p>
                                        </div>
                                        <div className={styles.accessMeta}>
                                            <span>Entrada segura com email e senha</span>
                                            <ChevronRight className={styles.arrow} />
                                        </div>
                                    </button>
                                </div>

                                <div className={styles.overviewPanel}>
                                    <h3>No dia a dia, encontra aqui</h3>
                                    <div className={styles.overviewList}>
                                        {entryOverview.map((item) => {
                                            const Icon = item.icon;
                                            return (
                                                <article key={item.title} className={styles.overviewItem}>
                                                    <div className={styles.overviewItemIcon}>
                                                        <Icon size={16} />
                                                    </div>
                                                    <div className={styles.overviewItemContent}>
                                                        <strong>{item.title}</strong>
                                                        <p>{item.description}</p>
                                                    </div>
                                                </article>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className={styles.pillarsShell}>
                        <div className={styles.sectionHeader}>
                            <div>
                                <span className={styles.sectionEyebrow}>Porque resulta</span>
                                <h2>O dia a dia da casa, mais organizado e mais leve</h2>
                            </div>
                            <p>
                                A ideia aqui é simples: menos procura, menos folhas soltas, menos dúvidas e mais clareza para quem trabalha e para quem coordena.
                            </p>
                        </div>

                        <div className={styles.pillarsSection}>
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
                        </div>
                    </section>
                </div>
            </main>

            {/* Modal - LOGIN ADMIN */}
            {showAdminLogin && (
                <div className={formStyles.modalBackdrop} onClick={() => setShowAdminLogin(false)}>
                    <div className={formStyles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', margin: '0 auto' }}>
                        <div className={formStyles.modalHeader} style={{ marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Shield size={20} className={styles.blueText} />
                                Acesso Restrito Admin
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
                                    background: '#000', color: 'white', border: 'none', borderRadius: '12px',
                                    fontWeight: '600', fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer',
                                    display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                                    opacity: loading ? 0.7 : 1
                                }}
                            >
                                {loading ? 'A validar...' : 'Aceder ao Painel'}
                                {!loading && <LogIn size={18} />}
                            </button>
                        </form>
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
