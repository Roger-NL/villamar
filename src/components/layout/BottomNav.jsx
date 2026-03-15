import Link from 'next/link';
import { useMemo } from 'react';
import { useRouter } from 'next/router';
import styles from './BottomNav.module.css';
import { Home, Calendar, ClipboardList, Settings, Users, Clock, CalendarDays, CheckSquare, Baby, Box, Syringe } from 'lucide-react';
import { useApp } from '@/pages/_app';
import { useData } from '@/contexts/DataContext';
import { isMedicalRole } from '@/lib/medicalAccess';

const employeeNavItems = [
    { href: '/funcionario', icon: Home, label: 'Início' },
    { href: '/funcionario/presenca', icon: Clock, label: 'Ponto' },
    { href: '/funcionario/tarefas', icon: ClipboardList, label: 'Tarefas' },
    { href: '/funcionario/fraldas', icon: Baby, label: 'Fraldas' },
    { href: '/funcionario/area-medica', icon: Syringe, label: 'Área Médica' },
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
    const { currentUser } = useApp();
    const { dailyPlans, isHydrated } = useData();
    const todayStr = useMemo(() => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 10);
    }, []);

    let currentEmployeeNavItems = isMedicalRole(currentUser?.role)
        ? [{ href: '/funcionario/area-medica', icon: Syringe, label: 'Área Médica' }]
        : [...employeeNavItems];

    if (!isAdmin && currentUser && !isMedicalRole(currentUser?.role) && isHydrated && dailyPlans) {
        const todayPlan = dailyPlans[todayStr];

        if (todayPlan && todayPlan.assignments && todayPlan.assignments['G_RepFraldas'] === currentUser.id) {
            // Add "Reposição Fraldas" right after Fraldas
            const fraldasIndex = currentEmployeeNavItems.findIndex(i => i.href === '/funcionario/fraldas');
            if (fraldasIndex >= 0) {
                currentEmployeeNavItems.splice(fraldasIndex + 1, 0, { href: '/funcionario/reposicao-fraldas', icon: Box, label: 'Repor' });
            }
        }
    }

    const navItems = isAdmin ? adminNavItems : currentEmployeeNavItems;

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
