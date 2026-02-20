/**
 * Toast Notifications Component
 * Mostra pop-ups de notificações em tempo real e pendentes ao login
 */
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { useData } from '@/contexts/DataContext';
import { useApp } from '@/pages/_app';
import styles from './Toast.module.css';
import { Bell, CheckCircle, AlertCircle, UserPlus, ArrowLeftRight, X, ClipboardList } from 'lucide-react';

const TOAST_DURATION = 5000; // 5 segundos

const getToastIcon = (type) => {
    switch (type) {
        case 'task_assigned':
        case 'task_completed':
            return <ClipboardList size={20} />;
        case 'employee_added':
        case 'employee_removed':
            return <UserPlus size={20} />;
        case 'swap_request':
        case 'swap_approved':
        case 'swap_rejected':
            return <ArrowLeftRight size={20} />;
        default:
            return <Bell size={20} />;
    }
};

const getToastClass = (type) => {
    if (type.includes('approved') || type.includes('completed') || type.includes('added')) {
        return styles.success;
    }
    if (type.includes('rejected') || type.includes('removed')) {
        return styles.danger;
    }
    if (type.includes('request') || type.includes('assigned')) {
        return styles.info;
    }
    return '';
};

export default function ToastNotifications() {
    const router = useRouter();
    const { notifications, isHydrated, markNotificationRead } = useData();
    const { currentUser } = useApp();
    const [visibleToasts, setVisibleToasts] = useState([]);
    const [shownIds, setShownIds] = useState(new Set());
    const hasCheckedPending = useRef(false);

    // Mostrar notificações não lidas quando entra numa área (não na home)
    useEffect(() => {
        if (!isHydrated || router.pathname === ('/') || !currentUser?.id) return;

        // Só verificar uma vez por sessão
        if (hasCheckedPending.current) return;
        hasCheckedPending.current = true;

        const userId = currentUser.uid || currentUser.id;
        const unread = notifications.filter(n => !(n.readBy || []).includes(userId));

        // Mostrar até 3 notificações pendentes com delay
        unread.slice(0, 3).forEach((notif, index) => {
            setTimeout(() => {
                if (!shownIds.has(notif.id)) {
                    setShownIds(prev => new Set([...prev, notif.id]));
                    setVisibleToasts(prev => [...prev, { ...notif, showing: true }]);

                    // Auto-remove após duração
                    setTimeout(() => {
                        setVisibleToasts(prev => prev.filter(t => t.id !== notif.id));
                    }, TOAST_DURATION);
                }
            }, index * 800); // Delay entre cada toast
        });
    }, [isHydrated, router.pathname, notifications, shownIds]);

    // Detectar NOVAS notificações (em tempo real)
    useEffect(() => {
        if (notifications.length === 0 || !isHydrated || router.pathname === ('/') || !currentUser?.id) return;

        const userId = currentUser.uid || currentUser.id;
        const latestNotif = notifications[0];

        // Se é uma notificação nova (não foi lida e não foi mostrada ainda)
        if (latestNotif && !shownIds.has(latestNotif.id) && !(latestNotif.readBy || []).includes(userId)) {
            setShownIds(prev => new Set([...prev, latestNotif.id]));

            setVisibleToasts(prev => [...prev, { ...latestNotif, showing: true }]);

            // Marcar logo como lida na BD ao ser mostrada no toast pop-up para não repetir
            markNotificationRead(latestNotif.id, userId);

            setTimeout(() => {
                setVisibleToasts(prev => prev.filter(t => t.id !== latestNotif.id));
            }, TOAST_DURATION);
        }
    }, [notifications, shownIds, isHydrated, currentUser]);

    const dismissToast = (id) => {
        if (currentUser?.id) {
            markNotificationRead(id, currentUser.uid || currentUser.id);
        }
        setVisibleToasts(prev => prev.filter(t => t.id !== id));
    };

    if (visibleToasts.length === 0) return null;

    return (
        <div className={styles.toastContainer}>
            {visibleToasts.map(toast => (
                <div
                    key={toast.id}
                    className={`${styles.toast} ${getToastClass(toast.type)}`}
                >
                    <div className={styles.toastIcon}>
                        {getToastIcon(toast.type)}
                    </div>
                    <div className={styles.toastContent}>
                        <strong className={styles.toastTitle}>{toast.title}</strong>
                        <span className={styles.toastMessage}>{toast.message}</span>
                    </div>
                    <button
                        className={styles.toastClose}
                        onClick={() => dismissToast(toast.id)}
                    >
                        <X size={16} />
                    </button>
                </div>
            ))}
        </div>
    );
}
