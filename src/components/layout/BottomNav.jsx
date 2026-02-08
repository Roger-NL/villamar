import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from './BottomNav.module.css';
import { Home, Calendar, ClipboardList, Settings, Users, Clock, CalendarDays, CheckSquare } from 'lucide-react';

const employeeNavItems = [
    { href: '/funcionario', icon: Home, label: 'Início' },
    { href: '/funcionario/presenca', icon: Clock, label: 'Ponto' },
    { href: '/funcionario/tarefas', icon: ClipboardList, label: 'Tarefas' },
    { href: '/funcionario/escala', icon: Calendar, label: 'Escala' },
];

const adminNavItems = [
    { href: '/admin', icon: Home, label: 'Início' },
    { href: '/admin/presencas', icon: Clock, label: 'Presenças' },
    { href: '/admin/escalas', icon: CalendarDays, label: 'Escalas' },
    { href: '/admin/tarefas', icon: CheckSquare, label: 'Tarefas' },
];

export default function BottomNav({ isAdmin = false }) {
    const router = useRouter();
    const navItems = isAdmin ? adminNavItems : employeeNavItems;

    return (
        <nav className={styles.nav}>
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = router.pathname === item.href;

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                    >
                        <Icon size={22} />
                        <span>{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
