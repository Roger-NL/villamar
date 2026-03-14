import Head from 'next/head';
import styles from '@/styles/AdminPages.module.css';
import swapStyles from '@/styles/SwapDetails.module.css';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import Avatar from '@/components/ui/Avatar';
import { useApp } from '../_app';
import { useData } from '@/contexts/DataContext';
import { ArrowLeftRight, Check, X, Sun, Moon, Trash2 } from 'lucide-react';

export default function AdminTrocasPage() {
    const { isAdmin, toggleMode, currentUser } = useApp();
    const { swapRequests, approveSwapRequest, rejectSwapRequest, removeSwapRequest, isHydrated } = useData();

    const getStatusStyle = (status) => {
        switch (status) {
            case 'approved': return swapStyles.approved;
            case 'rejected': return swapStyles.rejected;
            default: return swapStyles.pending;
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'approved': return 'Aprovado';
            case 'rejected': return 'Rejeitado';
            default: return 'Pendente';
        }
    };

    const ShiftIcon = ({ shift }) => (
        shift === 'Manhã' ? <Sun size={16} /> : <Moon size={16} />
    );

    const handleApprove = (id) => {
        approveSwapRequest(id);
    };

    const handleReject = (id) => {
        rejectSwapRequest(id);
    };

    if (!isHydrated) {
        return <div>A carregar...</div>;
    }

    return (
        <>
            <Head>
                <title>Trocas - Admin Villa Mar</title>
            </Head>

            <Header user={currentUser} isAdmin={isAdmin} onModeSwitch={toggleMode} />
            <Sidebar isAdmin={true} />
            <BottomNav isAdmin={true} />

            <main className={styles.main}>
                <div className={styles.container}>
                    <h1 className={styles.pageTitle}>
                        <ArrowLeftRight size={28} />
                        Pedidos de Troca
                    </h1>

                    {/* Swap Requests */}
                    <div className={swapStyles.swapList}>
                        {swapRequests.length === 0 && (
                            <div className={swapStyles.emptyState}>
                                <ArrowLeftRight size={48} />
                                <h3>Sem pedidos de troca</h3>
                                <p>Quando funcionários solicitarem trocas, aparecerão aqui.</p>
                            </div>
                        )}

                        {swapRequests.map(request => (
                            <div key={request.id} className={swapStyles.swapCard}>
                                {/* Header with Status */}
                                <div className={swapStyles.cardHeader}>
                                    <span className={swapStyles.reason}>{request.reason}</span>
                                    <span className={`${swapStyles.status} ${getStatusStyle(request.status)}`}>
                                        {getStatusLabel(request.status)}
                                    </span>
                                </div>

                                {/* Exchange Visual */}
                                <div className={swapStyles.exchangeRow}>
                                    {/* Left Person - Requestor */}
                                    <div className={swapStyles.personBox}>
                                        <Avatar name={request.requestor} size="lg" />
                                        <span className={swapStyles.personName}>{request.requestor}</span>
                                        <div className={swapStyles.shiftTag}>
                                            <ShiftIcon shift={request.targetShift} />
                                            <span>{request.targetShift}</span>
                                        </div>
                                        <span className={swapStyles.dateSmall}>{request.targetDate}</span>
                                    </div>

                                    {/* Arrow */}
                                    <div className={swapStyles.exchangeArrow}>
                                        <ArrowLeftRight size={24} />
                                    </div>

                                    {/* Right Person - Swap Partner */}
                                    <div className={swapStyles.personBox}>
                                        <Avatar name={request.swapWith} size="lg" />
                                        <span className={swapStyles.personName}>{request.swapWith}</span>
                                        <div className={swapStyles.shiftTag}>
                                            <ShiftIcon shift={request.swapShift} />
                                            <span>{request.swapShift}</span>
                                        </div>
                                        <span className={swapStyles.dateSmall}>{request.swapDate}</span>
                                    </div>
                                </div>

                                {/* Explanation Text */}
                                <div className={swapStyles.explanation}>
                                    <strong>{request.requestor}</strong> troca <strong>{request.targetShift}</strong> ({request.targetDate})
                                    com <strong>{request.swapWith}</strong> que faz <strong>{request.swapShift}</strong> ({request.swapDate})
                                </div>

                                {/* Actions */}
                                <div className={swapStyles.actions}>
                                    {request.status === 'pending' ? (
                                        <>
                                            <button
                                                className={`${swapStyles.actionBtn} ${swapStyles.approve}`}
                                                onClick={() => handleApprove(request.id)}
                                            >
                                                <Check size={18} />
                                                Aprovar
                                            </button>
                                            <button
                                                className={`${swapStyles.actionBtn} ${swapStyles.reject}`}
                                                onClick={() => handleReject(request.id)}
                                            >
                                                <X size={18} />
                                                Rejeitar
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            className={`${swapStyles.actionBtn} ${swapStyles.reject}`}
                                            onClick={() => {
                                                if (confirm('Deseja remover este registo de troca do histórico?')) {
                                                    removeSwapRequest(request.id);
                                                }
                                            }}
                                            style={{ opacity: 0.7 }}
                                        >
                                            <Trash2 size={18} />
                                            Remover do Histórico
                                        </button>
                                    )}
                                    {request.status === 'pending' && (
                                        <button
                                            className={`${swapStyles.actionBtn} ${swapStyles.reject}`}
                                            onClick={() => {
                                                if (confirm('Deseja cancelar/remover este pedido?')) {
                                                    removeSwapRequest(request.id);
                                                }
                                            }}
                                            style={{ background: '#FEE2E2', color: '#DC2626', border: 'none' }}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </>
    );
}
