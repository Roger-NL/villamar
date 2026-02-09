import Head from 'next/head';
import { useState } from 'react';
import styles from '@/styles/AdminPages.module.css';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import Avatar from '@/components/ui/Avatar';
import { useApp } from '../../_app';
import { useData } from '@/contexts/DataContext';
import { Activity, Calendar, Filter, CheckSquare } from 'lucide-react';

export default function AtividadesPage() {
    const { isAdmin, toggleMode, currentUser } = useApp();
    const { tasks, taskCategories } = useData();

    // Use current date for demo, but filter tasks based on it if they had full timestamps
    const [selectedCategory, setSelectedCategory] = useState('all');

    const filteredTasks = tasks
        //.filter(t => t.completed) // Show all or just completed? Let's show all
        .filter(t => selectedCategory === 'all' || t.category === selectedCategory)
        .sort((a, b) => a.time.localeCompare(b.time));

    const getCategoryStyle = (catKey) => {
        const cat = taskCategories[catKey];
        return cat ? { color: cat.color, label: cat.label, emoji: cat.emoji } : { color: '#666', label: 'Outro', emoji: '📝' };
    };

    return (
        <>
            <Head>
                <title>Registo de Atividades - Villa Mar</title>
            </Head>

            <Header user={currentUser} isAdmin={isAdmin} onModeSwitch={toggleMode} />
            <Sidebar isAdmin={true} />
            <BottomNav isAdmin={true} />

            <main className={styles.main}>
                <div className={styles.container}>
                    <h1 className={styles.pageTitle}>
                        <Activity size={28} />
                        Atividades Diárias
                    </h1>

                    {/* Filter */}
                    <div style={{ marginBottom: '20px', display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                        <button
                            onClick={() => setSelectedCategory('all')}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '20px',
                                border: 'none',
                                background: selectedCategory === 'all' ? '#111827' : '#E5E7EB',
                                color: selectedCategory === 'all' ? 'white' : '#374151',
                                fontWeight: '600',
                                fontSize: '14px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            Todas
                        </button>
                        {Object.entries(taskCategories).map(([key, cat]) => (
                            <button
                                key={key}
                                onClick={() => setSelectedCategory(key)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '20px',
                                    border: 'none',
                                    background: selectedCategory === key ? cat.color : 'white',
                                    color: selectedCategory === key ? 'white' : '#374151',
                                    border: selectedCategory === key ? 'none' : '1px solid #E5E7EB',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <span>{cat.emoji}</span>
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Activities Timeline */}
                    <div className={styles.list}>
                        {filteredTasks.length > 0 ? (
                            filteredTasks.map(task => {
                                const catStyle = getCategoryStyle(task.category);
                                return (
                                    <div key={task.id} className={styles.listItem} style={{ alignItems: 'flex-start' }}>
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            minWidth: '50px',
                                            marginRight: '12px',
                                            paddingTop: '4px'
                                        }}>
                                            <span style={{ fontWeight: 'bold', color: '#374151' }}>{task.time}</span>
                                            <div style={{ width: '2px', height: '100%', background: '#E5E7EB', marginTop: '8px' }}></div>
                                        </div>

                                        <div style={{ flex: 1, paddingBottom: '16px' }}>
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'flex-start',
                                                marginBottom: '4px'
                                            }}>
                                                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>
                                                    {task.title}
                                                </h3>
                                                <span style={{
                                                    fontSize: '12px',
                                                    padding: '2px 8px',
                                                    borderRadius: '12px',
                                                    background: `${catStyle.color}20`,
                                                    color: catStyle.color,
                                                    fontWeight: '600'
                                                }}>
                                                    {catStyle.emoji} {catStyle.label}
                                                </span>
                                            </div>

                                            <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 8px 0' }}>
                                                {task.description}
                                            </p>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {task.completed ? (
                                                    <span style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        fontSize: '12px',
                                                        color: '#10B981',
                                                        fontWeight: '600'
                                                    }}>
                                                        <CheckSquare size={14} /> Concluída
                                                    </span>
                                                ) : (
                                                    <span style={{ fontSize: '12px', color: '#F59E0B', fontWeight: '600' }}>
                                                        Pendente
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
                                Nenhuma atividade encontrada.
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </>
    );
}
