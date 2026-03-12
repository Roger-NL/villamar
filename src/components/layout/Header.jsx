import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from './Header.module.css';
import { Menu, X, User, LogOut, Home, Clock, CalendarDays, CheckSquare, Users, CalendarRange, Package, ArrowLeftRight, FileText, Settings } from 'lucide-react';
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

    return (
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
    );
}
