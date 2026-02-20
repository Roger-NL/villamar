import Head from 'next/head';
import { useState } from 'react';
import { useRouter } from 'next/router';
import styles from '@/styles/AdminPages.module.css';
import formStyles from '@/styles/Forms.module.css';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import { useApp } from '../_app';
import { useData } from '@/contexts/DataContext';
import { db } from '@/config/firebase';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Shield, ArrowLeft, Mail, Lock, User, Plus } from 'lucide-react';

export default function NovoAdminPage() {
    const router = useRouter();
    const { isAdmin, currentUser, toggleMode } = useApp();
    const { isHydrated, addNotification } = useData();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState('Gerente');

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    if (!isHydrated) return null;

    const handleCreateAdmin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess(false);

        try {
            // Usar uma instância secundária do Firebase para NÃO DESLOGAR o Admin atual
            // Este truque permite criar utilizadores em background
            const primaryApp = getApp();
            const secondaryApp = getApps().find(app => app.name === 'Secondary') || initializeApp(primaryApp.options, 'Secondary');
            const secondaryAuth = getAuth(secondaryApp);

            // Cria o usuário na consola do firebase auth
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
            const user = userCredential.user;

            // Grava o usuário na coleção employees como 'Administrador'
            const newUser = {
                id: user.uid,
                name: name,
                email: email,
                role: role,
                isAdmin: true,
                status: 'absent',
                clockIn: null,
                clockOut: null,
                createdAt: new Date().toISOString()
            };

            await setDoc(doc(db, 'employees', user.uid), newUser);

            // Faz logout na app secundária para limpá-la
            await signOut(secondaryAuth);

            // Manda notificação e reseta formulário
            addNotification({
                type: 'admin_created',
                title: 'Novo Administrador',
                message: `${name} foi adicionado à direção.`,
                forAdmin: true
            });

            setSuccess(true);
            setEmail('');
            setPassword('');
            setName('');
            setRole('Gerente');

        } catch (err) {
            console.error("Create admin error:", err);
            if (err.code === 'auth/email-already-in-use') {
                setError('Este email já está registado noutra conta.');
            } else if (err.code === 'auth/weak-password') {
                setError('A senha deve ter pelo menos 6 caracteres.');
            } else {
                setError('Ocorreu um erro ao criar a conta: ' + err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Head>
                <title>Criar Admin - Villa Mar</title>
            </Head>

            <Header user={currentUser} isAdmin={isAdmin} onModeSwitch={toggleMode} />
            <Sidebar isAdmin={true} />
            <BottomNav isAdmin={true} />

            <main className={styles.main}>
                <div className={styles.container}>
                    <div className={styles.pageHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                                onClick={() => router.back()}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                                <ArrowLeft size={24} color="#6B7280" />
                            </button>
                            <h1 className={styles.pageTitle} style={{ margin: 0 }}>
                                <Shield size={28} />
                                Criar Novo Admin
                            </h1>
                        </div>
                    </div>

                    <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', maxWidth: '500px' }}>

                        <p style={{ color: '#4B5563', marginBottom: '24px', lineHeight: '1.5' }}>
                            Utilize este formulário para conceder privilégios de **Administração** temporária ou permanente a um novo membro da direção. Ele usará e-mail e palavra-passe para entrar.
                        </p>

                        {error && (
                            <div style={{ background: '#FEE2E2', color: '#DC2626', padding: '12px', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '16px' }}>
                                {error}
                            </div>
                        )}

                        {success && (
                            <div style={{ background: '#D1FAE5', color: '#059669', padding: '12px', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Shield size={18} />
                                Administrador criado com sucesso!
                            </div>
                        )}

                        <form onSubmit={handleCreateAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div className={formStyles.formGroup}>
                                <label className={formStyles.label}>Nome do Administrador</label>
                                <div style={{ position: 'relative' }}>
                                    <User size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: '#9CA3AF' }} />
                                    <input
                                        type="text"
                                        className={formStyles.input}
                                        style={{ paddingLeft: '40px' }}
                                        placeholder="Ex: Carlos Silva"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className={formStyles.formGroup}>
                                <label className={formStyles.label}>Cargo de Direção</label>
                                <select
                                    className={formStyles.select}
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                >
                                    <option value="Gerente">Gerente</option>
                                    <option value="Coordenador">Coordenador/a</option>
                                    <option value="Admin Temporário">Admin Temporário</option>
                                    <option value="CEO">CEO / Fundador</option>
                                </select>
                            </div>

                            <div className={formStyles.formGroup}>
                                <label className={formStyles.label}>Email de Login</label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: '#9CA3AF' }} />
                                    <input
                                        type="email"
                                        className={formStyles.input}
                                        style={{ paddingLeft: '40px' }}
                                        placeholder="novo_admin@villamar.pt"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className={formStyles.formGroup}>
                                <label className={formStyles.label}>Palavra-passe (Senha Segura)</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: '#9CA3AF' }} />
                                    <input
                                        type="password"
                                        className={formStyles.input}
                                        style={{ paddingLeft: '40px' }}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    width: '100%', padding: '14px', marginTop: '8px',
                                    background: '#8B5CF6', color: 'white', border: 'none', borderRadius: '12px',
                                    fontWeight: '600', fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer',
                                    display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                                    opacity: loading ? 0.7 : 1
                                }}
                            >
                                {loading ? 'A Registar...' : 'Criar Conta de Admin'}
                                {!loading && <Plus size={18} />}
                            </button>
                        </form>
                    </div>
                </div>
            </main>
        </>
    );
}
