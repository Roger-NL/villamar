import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from './Header.module.css';
import { Menu, X, User, LogOut, Home, Clock, CalendarDays, CheckSquare, Users, CalendarRange, Package, ArrowLeftRight, FileText, Settings, Download } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Avatar from '../ui/Avatar';
import { auth } from '@/config/firebase';
import { signOut } from 'firebase/auth';

const adminMobileSections = [
    {
        title: 'Principal',
        items: [
            { href: '/admin', icon: Home, label: 'Dashboard' },
            { href: '/admin/presencas', icon: Clock, label: 'Presenças' },
            { href: '/admin/escalas', icon: CalendarDays, label: 'Escalas' },
            { href: '/admin/tarefas', icon: CheckSquare, label: 'Plano Tarefas' }
        ]
    },
    {
        title: 'Gestão',
        items: [
            { href: '/admin/funcionarios', icon: Users, label: 'Funcionários' },
            { href: '/admin/ferias-licencas', icon: CalendarRange, label: 'Férias & Licenças' },
            { href: '/admin/estoque', icon: Package, label: 'Estoque' },
            { href: '/admin/trocas', icon: ArrowLeftRight, label: 'Pedidos de Troca' },
            { href: '/admin/relatorios', icon: FileText, label: 'Relatórios' },
            { href: '/admin/configuracoes', icon: Settings, label: 'Configurações' }
        ]
    }
];

export default function Header({
    user,
    isAdmin = false,
    onModeSwitch,
    showModeSwitch = true
}) {
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [mobileAdminMenuOpen, setMobileAdminMenuOpen] = useState(false);
    const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
    const [installModalOpen, setInstallModalOpen] = useState(false);
    const router = useRouter();
    const profileMenuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
                setProfileMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const isStandalone = window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone;
        if (isStandalone) {
            return;
        }

        const handleBeforeInstallPrompt = (event) => {
            event.preventDefault();
            setDeferredInstallPrompt(event);
        };

        const handleAppInstalled = () => {
            setDeferredInstallPrompt(null);
            setInstallModalOpen(false);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    useEffect(() => {
        if (typeof document === 'undefined') return;

        const shouldLockPage = mobileAdminMenuOpen || installModalOpen;
        const previousOverflow = document.body.style.overflow;
        const previousTouchAction = document.body.style.touchAction;

        if (shouldLockPage) {
            document.body.style.overflow = 'hidden';
            document.body.style.touchAction = 'none';
        }

        return () => {
            document.body.style.overflow = previousOverflow;
            document.body.style.touchAction = previousTouchAction;
        };
    }, [mobileAdminMenuOpen, installModalOpen]);

    const handleOpenProfile = () => {
        setProfileMenuOpen(false);
        setMobileAdminMenuOpen(false);
        router.push(isAdmin ? '/admin/configuracoes' : '/funcionario/configuracoes');
    };

    const handleLogout = async () => {
        setProfileMenuOpen(false);
        setMobileAdminMenuOpen(false);

        if (isAdmin && auth?.currentUser) {
            await signOut(auth);
        }

        localStorage.removeItem('villamar_employee_session');
        window.location.href = '/';
    };

    const handleInstallApp = async () => {
        setProfileMenuOpen(false);
        setInstallModalOpen(true);
    };

    const handleAndroidInstall = async () => {
        const isStandalone = window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone;
        if (isStandalone) {
            return;
        }

        if (deferredInstallPrompt) {
            deferredInstallPrompt.prompt();
            const choice = await deferredInstallPrompt.userChoice;
            if (choice?.outcome === 'accepted') {
                setDeferredInstallPrompt(null);
                setInstallModalOpen(false);
            }
            return;
        }

        window.alert('No Android, abra o menu do navegador e toque em "Instalar app" ou "Adicionar ao ecrã principal".');
    };

    const handleIosInstall = () => {
        setInstallModalOpen(false);
        window.alert('No iPhone, abra no Safari, toque em Partilhar e depois em "Adicionar ao ecrã principal".');
    };

    const isIos = typeof window !== 'undefined' && /iphone|ipad|ipod/i.test(window.navigator.userAgent || '');
    const isStandalone = typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone);

    const installButtonLabel = isStandalone ? 'App instalado' : 'Baixar App';

    return (
        <>
            <header className={styles.header}>
                <div className={styles.container}>
                    <div className={styles.leftSection}>
                        {isAdmin && (
                            <button
                                type="button"
                                className={styles.menuButton}
                                onClick={() => setMobileAdminMenuOpen((value) => !value)}
                                aria-label="Abrir menu administrativo"
                            >
                                {mobileAdminMenuOpen ? <X size={20} /> : <Menu size={20} />}
                            </button>
                        )}
                        <Link href="/" className={styles.logo}>
                            <span className={styles.logoText}>Villa Mar</span>
                        </Link>
                    </div>

                    <div className={styles.rightSection}>
                        <div className={styles.userSection} ref={profileMenuRef}>
                            <button
                                type="button"
                                className={styles.userButton}
                                onClick={() => setProfileMenuOpen((value) => !value)}
                                aria-label="Abrir menu do utilizador"
                            >
                                <Avatar
                                    name={user?.name || 'Utilizador'}
                                    size="sm"
                                    status="online"
                                />
                            </button>

                            {profileMenuOpen && (
                                <div className={styles.profileMenu}>
                                    <div className={styles.profileMenuHeader}>
                                        <div className={styles.profileMenuName}>{user?.name || 'Utilizador'}</div>
                                        <div className={styles.profileMenuRole}>{user?.role || (isAdmin ? 'Administrador' : 'Funcionário')}</div>
                                    </div>
                                    <button
                                        type="button"
                                        className={`${styles.profileMenuItem} ${styles.profileMenuItemPrimary}`}
                                        onClick={handleInstallApp}
                                    >
                                        <Download size={16} />
                                        {installButtonLabel}
                                    </button>
                                    <button type="button" className={styles.profileMenuItem} onClick={handleOpenProfile}>
                                        <User size={16} />
                                        Perfil Pessoal
                                    </button>
                                    <button type="button" className={styles.profileMenuItem} onClick={handleLogout}>
                                        <LogOut size={16} />
                                        Sair
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {isAdmin && mobileAdminMenuOpen && (
                    <div className={styles.backdrop} onClick={() => setMobileAdminMenuOpen(false)} />
                )}

                {isAdmin && (
                    <div className={`${styles.mobileMenu} ${mobileAdminMenuOpen ? styles.open : ''}`}>
                        <div className={styles.menuHeader}>
                            <div>
                                <div className={styles.menuTitle}>Administração</div>
                                <div className={styles.menuSubtitle}>Acesso rápido às áreas de gestão</div>
                            </div>
                            <button className={styles.closeButton} onClick={() => setMobileAdminMenuOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className={styles.menuContent}>
                            {adminMobileSections.map((section) => (
                                <div key={section.title} className={styles.menuSection}>
                                    <div className={styles.menuSectionTitle}>{section.title}</div>
                                    <div className={styles.menuSectionItems}>
                                        {section.items.map((item) => {
                                            const Icon = item.icon;
                                            const isActive = router.pathname === item.href;

                                            return (
                                                <button
                                                    key={item.href}
                                                    type="button"
                                                    className={`${styles.menuLink} ${isActive ? styles.menuLinkActive : ''}`}
                                                    onClick={() => {
                                                        setMobileAdminMenuOpen(false);
                                                        router.push(item.href);
                                                    }}
                                                >
                                                    <Icon size={18} />
                                                    {item.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </header>

            {installModalOpen && (
                <div className={styles.installBackdrop} onClick={() => setInstallModalOpen(false)}>
                    <div className={styles.installModal} onClick={(event) => event.stopPropagation()}>
                        <div className={styles.installModalHeader}>
                            <div>
                                <div className={styles.installModalTitle}>Baixar App no telemóvel</div>
                                <div className={styles.installModalSubtitle}>Android e iPhone, direto do navegador.</div>
                            </div>
                            <button
                                type="button"
                                className={styles.installCloseButton}
                                onClick={() => setInstallModalOpen(false)}
                                aria-label="Fechar janela de instalação"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <button
                            type="button"
                            className={styles.installActionPrimary}
                            onClick={handleAndroidInstall}
                            disabled={isStandalone}
                        >
                            <Download size={18} />
                            {isStandalone ? 'App já instalado neste telemóvel' : 'Android: instalar app'}
                        </button>

                        <button type="button" className={styles.installActionSecondary} onClick={handleIosInstall}>
                            <Download size={18} />
                            iPhone: ver como adicionar
                        </button>

                        <div className={styles.installInfoBox}>
                            <strong>{isIos ? 'iPhone / iPad' : 'Dica rápida'}</strong>
                            <span>
                                {isIos
                                    ? 'Abra no Safari, toque em Partilhar e escolha "Adicionar ao ecrã principal".'
                                    : 'No Android, se o botão automático não abrir, use o menu do navegador e toque em "Instalar app".'}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
