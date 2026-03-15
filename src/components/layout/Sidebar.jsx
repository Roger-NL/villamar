import Link from 'next/link';
import { useMemo } from 'react';
import { useRouter } from 'next/router';
import styles from './Sidebar.module.css';
import {
    Home, Clock, CalendarDays, CheckSquare, Users,
    Settings, BarChart3, ArrowLeftRight, FileText, CalendarRange, Package, Baby, Box, Syringe
} from 'lucide-react';
import { useApp } from '@/pages/_app';
import { useData } from '@/contexts/DataContext';
import { isMedicalRole } from '@/lib/medicalAccess';

const adminSidebarItems = [
    {
        section: 'Principal', items: [
            { href: '/admin', icon: Home, label: 'Dashboard' },
            { href: '/admin/presencas', icon: Clock, label: 'Presenças' },
            { href: '/admin/escalas', icon: CalendarDays, label: 'Escalas' },
            { href: '/admin/tarefas', icon: CalendarDays, label: 'Plano Tarefas' },
        ]
    },
    {
        section: 'Gestão', items: [
            { href: '/admin/funcionarios', icon: Users, label: 'Funcionários' },
            { href: '/admin/area-medica', icon: Syringe, label: 'Área Médica' },
            { href: '/admin/ferias-licencas', icon: CalendarRange, label: 'Férias & Licenças' },
            { href: '/admin/estoque', icon: Package, label: 'Estoque' },
            { href: '/admin/trocas', icon: ArrowLeftRight, label: 'Pedidos de Troca' },
            { href: '/admin/relatorios', icon: FileText, label: 'Relatórios' },
        ]
    },
    {
        section: 'Sistema', items: [
            { href: '/admin/configuracoes', icon: Settings, label: 'Configurações' },
        ]
    },
];

const employeeSidebarItems = [
    {
        section: 'Minha Área', items: [
            { href: '/funcionario', icon: Home, label: 'Início' },
            { href: '/funcionario/fraldas', icon: Baby, label: 'Muda de Fraldas' },
            { href: '/funcionario/area-medica', icon: Syringe, label: 'Área Médica' },
            { href: '/funcionario/escala', icon: CalendarDays, label: 'Minha Escala' },
            { href: '/funcionario/tarefas', icon: CheckSquare, label: 'Minhas Tarefas' },
            { href: '/funcionario/presenca', icon: Clock, label: 'Meu Ponto' },
        ]
    },
    {
        section: 'Preferências', items: [
            { href: '/funcionario/configuracoes', icon: Settings, label: 'Configurações' },
        ]
    },
];

export default function Sidebar({ isAdmin = false }) {
    const router = useRouter();
    const { currentUser } = useApp();
    const { dailyPlans, isHydrated } = useData();
    const todayStr = useMemo(() => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 10);
    }, []);

    // Dynamically build employee items
    let currentEmployeeItems = isMedicalRole(currentUser?.role)
        ? [
            {
                section: 'Área Médica',
                items: [
                    { href: '/funcionario/area-medica', icon: Syringe, label: 'Área Médica' },
                ]
            }
        ]
        : employeeSidebarItems.map(section => ({
            section: section.section,
            items: [...section.items]
        }));

    if (!isAdmin && currentUser && !isMedicalRole(currentUser?.role) && isHydrated && dailyPlans) {
        const todayPlan = dailyPlans[todayStr];

        if (todayPlan && todayPlan.assignments && todayPlan.assignments['G_RepFraldas'] === currentUser.id) {
            // Add "Reposição Fraldas" right after Muda de Fraldas
            const minArea = currentEmployeeItems.find(s => s.section === 'Minha Área');
            if (minArea) {
                const fraldasIndex = minArea.items.findIndex(i => i.href === '/funcionario/fraldas');
                minArea.items.splice(fraldasIndex + 1, 0, {
                    href: '/funcionario/reposicao-fraldas', icon: Box, label: 'Repor Fraldas'
                });
            }
        }
    }

    const sidebarItems = isAdmin ? adminSidebarItems : currentEmployeeItems;

    return (
        <aside className={styles.sidebar}>
            <nav className={styles.nav}>
                {sidebarItems.map((section) => (
                    <div key={section.section} className={styles.section}>
                        <h3 className={styles.sectionTitle}>{section.section}</h3>
                        <ul className={styles.list}>
                            {section.items.map((item) => {
                                const Icon = item.icon;
                                const isActive = router.pathname === item.href;

                                return (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            className={`${styles.item} ${isActive ? styles.active : ''}`}
                                        >
                                            <Icon size={20} />
                                            <span>{item.label}</span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </nav>
        </aside>
    );
}
