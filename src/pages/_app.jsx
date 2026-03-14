import '@/styles/globals.css';
import { useState, createContext, useContext, useEffect } from 'react';
import { DataProvider, useData } from '@/contexts/DataContext';
import ToastNotifications from '@/components/ui/Toast';
import { useRouter } from 'next/router';
import { auth, db } from '@/config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

// Context para modo Admin/Membro
export const AppContext = createContext();

export function useApp() {
    return useContext(AppContext);
}

function GlobalAuthListener({ children }) {
    const { setIsAdmin, setCurrentUser } = useApp();
    const { employees, isHydrated } = useData();
    const router = useRouter();
    const [isChecking, setIsChecking] = useState(() => Boolean(auth)); // Prevenir flash

    useEffect(() => {
        if (!auth) {
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            const isAdminRoute = router.pathname.startsWith('/admin');
            const isEmployeeRoute = router.pathname.startsWith('/funcionario');

            if (user) {
                try {
                    const docRef = doc(db, 'employees', user.uid);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        const userData = docSnap.data();
                        const hasAdminAccess = Boolean(userData.isAdmin || userData.role === 'Administrador');
                        setCurrentUser({
                            id: userData.id || user.uid,
                            name: userData.name,
                            role: userData.role,
                            email: userData.email,
                            avatar: userData.avatar || null,
                            isAdmin: hasAdminAccess,
                        });
                        setIsAdmin(hasAdminAccess);

                        if (hasAdminAccess) {
                            if (router.pathname === '/' || isEmployeeRoute) {
                                router.push('/admin');
                            }
                        } else if (isAdminRoute || router.pathname === '/') {
                            router.push('/funcionario');
                        }
                    } else {
                        setCurrentUser({
                            id: user.uid,
                            name: user.email.split('@')[0],
                            role: 'Administrador',
                            email: user.email,
                            avatar: null,
                            isAdmin: true,
                        });
                        setIsAdmin(true);

                        if (router.pathname === '/' || isEmployeeRoute) {
                            router.push('/admin');
                        }
                    }
                } catch (err) {
                    console.error("Erro ao obter perfil de admin (possível bloqueador/firewall):", err);
                    // Fallback para não ficar preso no "A validar..."
                    setCurrentUser({
                        id: user.uid,
                        name: user.email.split('@')[0],
                        role: 'Administrador',
                        email: user.email,
                        avatar: null,
                        isAdmin: true,
                    });
                    setIsAdmin(true);

                    if (router.pathname === '/' || isEmployeeRoute) {
                        router.push('/admin');
                    }
                }
            } else if (isHydrated && employees?.length > 0) {
                const savedEmpId = localStorage.getItem('villamar_employee_session');
                if (savedEmpId) {
                    const savedUser = employees.find(e => e.id.toString() === savedEmpId.toString());
                    if (savedUser) {
                        setCurrentUser({
                            id: savedUser.id,
                            name: savedUser.name,
                            role: savedUser.role,
                            avatar: null,
                            isAdmin: false,
                        });
                        setIsAdmin(false);
                        if (router.pathname === '/') {
                            router.push('/funcionario');
                        } else if (isAdminRoute) {
                            router.push('/funcionario');
                        }
                    } else {
                        setCurrentUser(null);
                        setIsAdmin(false);
                        localStorage.removeItem('villamar_employee_session');
                        if (router.pathname !== '/') router.push('/');
                    }
                } else {
                    setCurrentUser(null);
                    setIsAdmin(false);
                    if (router.pathname !== '/') router.push('/');
                }
            } else if (isHydrated) {
                setCurrentUser(null);
                setIsAdmin(false);
                if (router.pathname !== '/') router.push('/');
            }
            setIsChecking(false);
        });

        return () => unsubscribe();
    }, [employees, isHydrated, router, setCurrentUser, setIsAdmin]);

    if (isChecking && router.pathname !== '/') {
        return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#64748b' }}>A carregar sessão...</div>;
    }

    return children;
}

export default function App({ Component, pageProps }) {
    const [isAdmin, setIsAdmin] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    const toggleMode = () => {
        setIsAdmin(!isAdmin);
    };

    const value = {
        isAdmin,
        setIsAdmin,
        toggleMode,
        currentUser,
        setCurrentUser,
    };

    return (
        <DataProvider>
            <AppContext.Provider value={value}>
                <GlobalAuthListener>
                    <Component {...pageProps} />
                </GlobalAuthListener>
                <ToastNotifications />
            </AppContext.Provider>
        </DataProvider>
    );
}
