import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from './Sidebar.module.css';
import {
    Home, Clock, CalendarDays, CheckSquare, Users,
    Settings, BarChart3, ArrowLeftRight, FileText, CalendarRange
} from 'lucide-react';

const adminSidebarItems = [
    {
        section: 'Principal', items: [
            { href: '/admin', icon: Home, label: 'Dashboard' },
            { href: '/admin/presencas', icon: Clock, label: 'Presenças' },
            { href: '/admin/escalas', icon: CalendarDays, label: 'Escalas' },
            { href: '/admin/tarefas', icon: CheckSquare, label: 'Tarefas' },
        ]
    },
    {
        section: 'Gestão', items: [
            { href: '/admin/funcionarios', icon: Users, label: 'Funcionários' },
            { href: '/admin/ferias-licencas', icon: CalendarRange, label: 'Férias & Licenças' },
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
    const sidebarItems = isAdmin ? adminSidebarItems : employeeSidebarItems;

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
