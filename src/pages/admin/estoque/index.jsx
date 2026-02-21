import Head from 'next/head';
import { useRouter } from 'next/router';
import styles from '@/styles/AdminPages.module.css';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import { useApp } from '@/pages/_app';
import { Package, Baby, ScrollText } from 'lucide-react';

export default function EstoqueDashboardPage() {
    const { isAdmin, toggleMode, currentUser } = useApp();
    const router = useRouter();

    return (
        <>
            <Head>
                <title>Estoque - Admin Villa Mar</title>
            </Head>

            <Header user={currentUser} isAdmin={isAdmin} onModeSwitch={toggleMode} />
            <Sidebar isAdmin={true} />
            <BottomNav isAdmin={true} />

            <main className={styles.main}>
                <div className={styles.container}>
                    <div className={styles.pageHeader}>
                        <h1 className={styles.pageTitle}>
                            <Package size={28} />
                            Gestão de Estoques
                        </h1>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
                        {/* Fraldas Panel */}
                        <div
                            onClick={() => router.push('/admin/estoque/fraldas')}
                            style={{
                                background: 'white',
                                borderRadius: '16px',
                                padding: '24px',
                                cursor: 'pointer',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center',
                                transition: 'all 0.2s ease',
                                border: '1px solid #E5E7EB'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'; }}
                        >
                            <div style={{ background: '#E0F2FE', padding: '16px', borderRadius: '50%', color: '#0284C7', marginBottom: '16px' }}>
                                <Baby size={32} />
                            </div>
                            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', margin: '0 0 8px' }}>
                                Gestão de Fraldas
                            </h2>
                            <p style={{ color: '#6B7280', fontSize: '14px', margin: 0, lineHeight: 1.5 }}>
                                Controle reposição diária de fraldas para os utentes e visão geral do estoque de tamanhos na casa.
                            </p>
                        </div>

                        {/* Outros consumiveis / Log geral */}
                        <div
                            style={{
                                background: 'white',
                                borderRadius: '16px',
                                padding: '24px',
                                opacity: 0.6,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center',
                                border: '1px solid #E5E7EB'
                            }}
                        >
                            <div style={{ background: '#F3F4F6', padding: '16px', borderRadius: '50%', color: '#6B7280', marginBottom: '16px' }}>
                                <ScrollText size={32} />
                            </div>
                            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', margin: '0 0 8px' }}>
                                Outros Materiais (Em breve)
                            </h2>
                            <p style={{ color: '#6B7280', fontSize: '14px', margin: 0, lineHeight: 1.5 }}>
                                Luvas, toalhitas, material de curativo e mais. Esta secção estará disponível no futuro.
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}
