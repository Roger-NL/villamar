/**
 * Toast Notifications Component
 * Mostra pop-ups de notificações em tempo real e pendentes ao login
 */
import { useEffect, useState, useRef, useCallback } from 'react';
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
    const shownIdsRef = useRef(new Set());

    const markAsShown = useCallback((id) => {
        shownIdsRef.current = new Set([...shownIdsRef.current, id]);
        setShownIds(new Set(shownIdsRef.current));
    }, []);

    const enqueueToast = useCallback((notif, userId, delay = 0) => {
        setTimeout(() => {
            if (shownIdsRef.current.has(notif.id) || (notif.readBy || []).includes(userId)) return;

            markAsShown(notif.id);
            setVisibleToasts(prev => [...prev, { ...notif, showing: true }]);
            markNotificationRead(notif.id, userId);

            setTimeout(() => {
                setVisibleToasts(prev => prev.filter(t => t.id !== notif.id));
            }, TOAST_DURATION);
        }, delay);
    }, [markAsShown, markNotificationRead]);

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
            enqueueToast(notif, userId, index * 800);
        });
    }, [isHydrated, router.pathname, notifications, currentUser?.id, currentUser?.uid, enqueueToast]);

    // Detectar NOVAS notificações (em tempo real)
    useEffect(() => {
        if (notifications.length === 0 || !isHydrated || router.pathname === ('/') || !currentUser?.id) return;

        const userId = currentUser.uid || currentUser.id;
        const latestNotif = notifications[0];

        // Se é uma notificação nova (não foi lida e não foi mostrada ainda)
        if (latestNotif && !shownIdsRef.current.has(latestNotif.id) && !(latestNotif.readBy || []).includes(userId)) {
            enqueueToast(latestNotif, userId);
        }
    }, [notifications, isHydrated, currentUser, router.pathname, enqueueToast]);

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
