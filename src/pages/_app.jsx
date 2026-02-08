import '@/styles/globals.css';
import { useState, createContext, useContext } from 'react';
import { DataProvider } from '@/contexts/DataContext';
import ToastNotifications from '@/components/ui/Toast';

// Context para modo Admin/Membro
export const AppContext = createContext();

export function useApp() {
    return useContext(AppContext);
}

export default function App({ Component, pageProps }) {
    const [isAdmin, setIsAdmin] = useState(false);
    const [currentUser, setCurrentUser] = useState({
        id: 1,
        name: 'Deisy',
        role: 'Cuidadora',
        avatar: null,
    });

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
                <Component {...pageProps} />
                <ToastNotifications />
            </AppContext.Provider>
        </DataProvider>
    );
}
