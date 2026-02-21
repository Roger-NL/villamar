import Head from 'next/head';
import styles from '@/styles/Config.module.css';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import { useApp } from '../_app';
import { useData } from '@/contexts/DataContext';
import { mockCurrentUser } from '@/data/mockData';
import Avatar from '@/components/ui/Avatar';
import {
    Settings, Bell, Shield, Users, Database, LogOut, ChevronRight, X,
    ClipboardList, ArrowLeftRight, Clock, Calendar, Umbrella, Package, History,
    ShieldAlert, CheckCircle2
} from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/router';

export default function AdminConfiguracoesPage() {
    const router = useRouter();
    const { isAdmin, toggleMode } = useApp();
    const { resetData } = useData();
    const [notifications, setNotifications] = useState(true);
    const [showResetModal, setShowResetModal] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);
    const [isResetting, setIsResetting] = useState(false);

    const resetOptions = [
        { id: 'tasks', label: 'Tarefas e Atividades', icon: <ClipboardList size={18} />, color: '#F59E0B' },
        { id: 'swapRequests', label: 'Pedidos de Troca', icon: <ArrowLeftRight size={18} />, color: '#8B5CF6' },
        { id: 'notifications', label: 'Notificações', icon: <Bell size={18} />, color: '#0071E3' },
        { id: 'timeRecords', label: 'Presenças e Registos', icon: <Clock size={18} />, color: '#10B981' },
        { id: 'schedules', label: 'Escalas Mensais', icon: <Calendar size={18} />, color: '#6366F1' },
        { id: 'leaves', label: 'Férias e Licenças', icon: <Umbrella size={18} />, color: '#EC4899' },
        { id: 'inventoryItems', label: 'Stock de Fraldas', icon: <Package size={18} />, color: '#0077B6' },
        { id: 'diaperPatients', label: 'Utentes (Fraldas)', icon: <Users size={18} />, color: '#F43F5E' },
        { id: 'diaperLogs', label: 'Histórico de Mudas', icon: <History size={18} />, color: '#64748B' },
        { id: 'employees', label: 'Funcionários (CUIDADO)', icon: <ShieldAlert size={18} />, color: '#DC2626', warning: true },
    ];

    const toggleItem = (id) => {
        setSelectedItems(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedItems.length === resetOptions.length) {
            setSelectedItems([]);
        } else {
            setSelectedItems(resetOptions.map(o => o.id));
        }
    };

    const handleReset = async () => {
        if (selectedItems.length === 0) return;

        const hasEmployees = selectedItems.includes('employees');
        let confirmMsg = `Deseja apagar os dados de: ${selectedItems.length} categorias selecionadas?`;
        if (hasEmployees) confirmMsg += "\n\nAVISO: Selecionou 'Funcionários'. Isto pode remover o seu próprio acesso se não tiver cuidado!";

        if (confirm(confirmMsg)) {
            setIsResetting(true);
            try {
                await resetData(selectedItems);
                alert('Limpeza concluída com sucesso.');
                setShowResetModal(false);
                setSelectedItems([]);
            } catch (error) {
                alert('Erro ao limpar dados: ' + error.message);
            } finally {
                setIsResetting(false);
            }
        }
    };

    return (
        <>
            <Head>
                <title>Configurações - Admin Villa Mar</title>
            </Head>

            <Header user={mockCurrentUser} isAdmin={isAdmin} onModeSwitch={toggleMode} />
            <Sidebar isAdmin={true} />
            <BottomNav isAdmin={true} />

            <main className={styles.main}>
                <div className={styles.container}>

                    {/* Profile Card */}
                    <div className={styles.profileCard}>
                        <Avatar name="Administrador" size="xl" />
                        <div className={styles.profileInfo}>
                            <h2>Administrador</h2>
                            <span>Villa Mar</span>
                        </div>
                    </div>

                    {/* Settings */}
                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>Sistema</h3>

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

                            <button className={styles.option} onClick={() => router.push('/admin/novo-admin')}>
                                <div className={styles.optionLeft}>
                                    <div className={styles.optionIcon}>
                                        <Users size={20} />
                                    </div>
                                    <span>Gestão de Administradores</span>
                                </div>
                                <ChevronRight size={20} className={styles.arrow} />
                            </button>

                            <button className={styles.option}>
                                <div className={styles.optionLeft}>
                                    <div className={styles.optionIcon}>
                                        <Database size={20} />
                                    </div>
                                    <span>Backup de Dados</span>
                                </div>
                                <ChevronRight size={20} className={styles.arrow} />
                            </button>

                            <button className={styles.option}>
                                <div className={styles.optionLeft}>
                                    <div className={styles.optionIcon}>
                                        <Shield size={20} />
                                    </div>
                                    <span>Segurança</span>
                                </div>
                                <ChevronRight size={20} className={styles.arrow} />
                            </button>

                            <button
                                className={styles.option}
                                onClick={() => setShowResetModal(true)}
                                style={{ color: '#DC2626' }}
                            >
                                <div className={styles.optionLeft}>
                                    <div className={styles.optionIcon} style={{ background: '#FEE2E2', color: '#DC2626' }}>
                                        <Database size={20} />
                                    </div>
                                    <span>Limpeza Seletiva de Dados</span>
                                </div>
                                <ChevronRight size={20} className={styles.arrow} />
                            </button>
                        </div>
                    </section>

                    {/* Reset Modal */}
                    {showResetModal && (
                        <div className={styles.modalOverlay} onClick={() => !isResetting && setShowResetModal(false)}>
                            <div className={styles.resetModal} onClick={e => e.stopPropagation()}>
                                <div className={styles.modalHeader}>
                                    <div>
                                        <h3>Limpar Dados</h3>
                                        <p>Selecione o que deseja apagar permanentemente</p>
                                    </div>
                                    <button onClick={() => !isResetting && setShowResetModal(false)} className={styles.closeBtn}>
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className={styles.selectAllHeader}>
                                    <button onClick={handleSelectAll} className={styles.selectBtn}>
                                        {selectedItems.length === resetOptions.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                                    </button>
                                    <span>{selectedItems.length} selecionados</span>
                                </div>

                                <div className={styles.optionsGrid}>
                                    {resetOptions.map(opt => (
                                        <div
                                            key={opt.id}
                                            className={`${styles.resetItem} ${selectedItems.includes(opt.id) ? styles.selected : ''}`}
                                            onClick={() => toggleItem(opt.id)}
                                        >
                                            <div className={styles.itemIcon} style={{ background: opt.color + '15', color: opt.color }}>
                                                {opt.icon}
                                            </div>
                                            <div className={styles.itemInfo}>
                                                <span className={styles.itemLabel}>{opt.label}</span>
                                            </div>
                                            <div className={styles.checkbox}>
                                                {selectedItems.includes(opt.id) && <CheckCircle2 size={18} />}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className={styles.modalFooter}>
                                    <button
                                        className={styles.cancelBtn}
                                        onClick={() => setShowResetModal(false)}
                                        disabled={isResetting}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        className={styles.confirmResetBtn}
                                        onClick={handleReset}
                                        disabled={selectedItems.length === 0 || isResetting}
                                    >
                                        {isResetting ? 'A limpar...' : `Limpar Seletivos (${selectedItems.length})`}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <button className={styles.logoutButton} onClick={() => { import('firebase/auth').then(({ getAuth, signOut }) => signOut(getAuth())).then(() => window.location.href = '/') }}>
                        <LogOut size={20} />
                        <span>Terminar Sessão</span>
                    </button>

                    <p className={styles.version}>Villa Mar Admin v1.0.0</p>
                </div>
            </main>
        </>
    );
}
