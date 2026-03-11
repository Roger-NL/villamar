import Head from 'next/head';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '@/styles/Dashboard.module.css';
import formStyles from '@/styles/Forms.module.css';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import { useApp } from '@/pages/_app';
import { useData } from '@/contexts/DataContext';
import { Box, CheckCircle2, AlertCircle, Baby } from 'lucide-react';

export default function FraldasReposicaoFuncionarioPage() {
    const { isAdmin, toggleMode, currentUser } = useApp();
    const router = useRouter();
    const { diaperPatients, diaperInventory, diaperLogs, updateInventoryItem, addDiaperLog, isHydrated, dailyPlans, updateDiaperPatient } = useData();

    const [toast, setToast] = useState('');
    const [replaceModal, setReplaceModal] = useState(null);
    const [currentRoomStock, setCurrentRoomStock] = useState('');

    const hasAccess = useMemo(() => {
        if (!isHydrated || !currentUser || !dailyPlans) return false;
        const tzOffset = (new Date()).getTimezoneOffset() * 60000;
        const todayStr = (new Date(Date.now() - tzOffset)).toISOString().slice(0, 10);
        const todayPlan = dailyPlans[todayStr];
        return todayPlan && todayPlan.assignments && todayPlan.assignments['G_RepFraldas'] === currentUser.id;
    }, [isHydrated, currentUser, dailyPlans]);

    // Redirect or show access denied if trying to access URL manually
    useEffect(() => {
        if (isHydrated && currentUser && !hasAccess && !isAdmin) {
            router.push('/funcionario');
        }
    }, [isHydrated, currentUser, hasAccess, router, isAdmin]);

    const handleSaveReplace = async (e, directValue = null) => {
        if (e) e.preventDefault();
        const patient = replaceModal;
        const currentInRoom = directValue !== null ? directValue : Number(currentRoomStock);

        if (currentInRoom < 0 || currentInRoom > 10) {
            alert("A quantidade no quarto deve ser entre 0 e 10.");
            return;
        }

        const systemExpectedStock = patient.wardrobeStock !== undefined ? patient.wardrobeStock : 10;
        const anomalyAmount = systemExpectedStock - currentInRoom;

        const requiredAmount = 10 - currentInRoom;
        const inventory = diaperInventory || [];
        const diaperType = inventory.find(d => d.id === patient.diaperId);
        const todayStr = new Date().toISOString().split('T')[0];

        // Se houve divergência entre sistema e físico (vistoria)
        if (anomalyAmount !== 0) {
            addDiaperLog({
                type: 'audit',
                patientId: patient.id,
                patientName: patient.name,
                date: todayStr,
                time: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
                expectedStock: systemExpectedStock,
                actualStock: currentInRoom,
                deviance: anomalyAmount,
                executorId: currentUser?.id,
                executorName: currentUser?.name || 'Funcionário'
            });
        }

        // Subtrai do depósito se for preciso adicionar & houver tipo
        if (requiredAmount > 0 && diaperType) {
            updateInventoryItem(diaperType.id, { stockDepot: Math.max(0, diaperType.stockDepot - requiredAmount) });
        }

        // Log the refill
        addDiaperLog({
            type: 'replenishment',
            patientId: patient.id,
            patientName: patient.name,
            diaperId: diaperType ? diaperType.id : '',
            diaperName: diaperType ? diaperType.name : '',
            date: todayStr,
            time: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
            amountAdded: requiredAmount,
            previousStock: currentInRoom,
            newStock: 10,
            executorId: currentUser?.id,
            executorName: currentUser?.name || 'Funcionário',
        });

        // Atualizar estado de armário
        updateDiaperPatient(patient.id, {
            wardrobeStock: 10,
            hasAnomaly: anomalyAmount > 0 ? true : false // Reseta a anomalia grave na vistoria
        });

        setToast(`Foram repostas ${requiredAmount} fraldas no quarto de ${patient.name}`);
        setTimeout(() => setToast(''), 3000);
        setReplaceModal(null);
        setCurrentRoomStock('');
    };

    if (!isHydrated) return null;

    // Remove duplicates visually and ensure array
    const dedupedPatients = diaperPatients && diaperPatients.length > 0
        ? [...new Map(diaperPatients.map(p => [p.name.toLowerCase().trim(), p])).values()].sort((a, b) => a.name.localeCompare(b.name))
        : [];

    const getRoomStockInfo = (patientId) => {
        const p = diaperPatients?.find(p => p.id === patientId);
        if (!p) return { text: 'Desconhecido', value: 0, color: '#94a3b8', ext: '' };

        if (p.origin === 'Própria') {
            return { text: 'Fornecimento', value: 'Próprio', color: '#0284c7', ext: '' };
        }

        // Vistoria directa ao nosso controlo central
        const stock = p.wardrobeStock !== undefined ? p.wardrobeStock : 10;

        let color = '#16A34A'; // Verde se 10
        if (stock < 5) color = '#ea580c'; // Laranja se abaixo de 5
        if (stock === 0) color = '#ef4444'; // Vermelho se 0
        if (p.hasAnomaly) color = '#ef4444'; // Vermelho se teve anomalia

        return {
            text: p.hasAnomaly ? 'Armário com Desvio' : 'No Armário',
            value: stock,
            color: color,
            ext: ''
        };
    };

    return (
        <>
            <Head>
                <title>Reposição Fraldas - Equipa Villa Mar</title>
            </Head>

            <Header user={currentUser} isAdmin={isAdmin} onModeSwitch={toggleMode} />
            <Sidebar isAdmin={false} />
            <BottomNav isAdmin={false} />

            <main className={styles.main}>
                <div className={styles.container}>

                    <div style={{ marginBottom: '24px' }}>
                        <h1 style={{ margin: '0 0 8px 0', fontSize: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Box size={28} color="#0284c7" /> Repor Fraldas nos Quartos
                        </h1>
                        <p style={{ margin: 0, color: '#64748b' }}>É responsável por garantir que as prateleiras de cada utente têm sempre 10 fraldas (o máximo).</p>
                    </div>

                    {toast && (
                        <div style={{ background: '#DCFCE7', color: '#16A34A', padding: '16px', borderRadius: '12px', fontSize: '1rem', marginBottom: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                            <CheckCircle2 size={20} /> {toast}
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '16px' }}>
                        {dedupedPatients.map(p => {
                            const info = getRoomStockInfo(p.id);
                            return (
                                <button
                                    key={p.id}
                                    onClick={() => setReplaceModal(p)}
                                    style={{
                                        background: 'white', padding: '16px', borderRadius: '16px', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', alignItems: 'center',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center'
                                    }}
                                >
                                    <span style={{ fontWeight: 800, color: '#111827', fontSize: '15px', marginBottom: '8px' }}>{p.name.split(' ').slice(0, 2).join(' ')}</span>

                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>{info.text}</span>
                                        <span style={{ fontSize: '18px', fontWeight: 800, color: info.color, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            {info.value} <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{info.ext}</span>
                                        </span>
                                    </div>

                                    {p.origin === 'Própria' && (
                                        <span style={{ background: '#E0F2FE', color: '#0369A1', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800, marginTop: '8px' }}>PRÓPRIA</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                </div>
            </main>

            {replaceModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: 'white', padding: '32px 24px', borderRadius: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                            <div style={{ display: 'inline-flex', background: '#e0f2fe', color: '#0284c7', padding: '16px', borderRadius: '50%', marginBottom: '16px' }}>
                                <Box size={32} />
                            </div>
                            <h3 style={{ margin: '0 0 8px 0', fontSize: '22px', color: '#0f172a' }}>{replaceModal.name}</h3>
                            <p style={{ margin: 0, color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>O armário do quarto tem de ficar com o <strong>stock máximo de 10</strong> fraldas.</p>

                            {(!diaperInventory || !diaperInventory.find(d => d.id === replaceModal.diaperId)) ? (
                                <div style={{ background: '#FFFBEB', color: '#D97706', padding: '16px', borderRadius: '12px', fontSize: '15px', marginBottom: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                                    Aviso: Utente não tem tipo de fralda associado. A reposição ficará registada mesmo assim.
                                </div>
                            ) : null}

                            {(() => {
                                const todayStr2 = new Date().toISOString().split('T')[0];
                                const pLogs = (diaperLogs && replaceModal) ? diaperLogs.filter(l => l.patientId === replaceModal.id) : [];
                                const usedToday = pLogs.filter(l => l.type === 'usage' && l.date === todayStr2).reduce((acc, l) => acc + (l.amountUsed || 1), 0);
                                const info = replaceModal ? getRoomStockInfo(replaceModal.id) : null;
                                return (
                                    <div style={{ display: 'flex', justifyContent: 'space-around', background: '#f8fafc', padding: '16px', borderRadius: '16px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ textAlign: 'center', width: info && info.text !== 'Usadas Hoje' ? 'auto' : '100%' }}>
                                            <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Usadas Hoje</span>
                                            <span style={{ fontSize: '24px', fontWeight: '800', color: '#ef4444' }}>{usedToday}</span>
                                        </div>
                                        {info && info.text !== 'Usadas Hoje' && (
                                            <>
                                                <div style={{ width: '1px', background: '#cbd5e1' }}></div>
                                                <div style={{ textAlign: 'center' }}>
                                                    <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>{info.text}</span>
                                                    <span style={{ fontSize: '24px', fontWeight: '800', color: info.color }}>{info.value}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>

                        <form onSubmit={handleSaveReplace}>
                            <div className={formStyles.formGroup} style={{ marginBottom: '24px' }}>
                                <label style={{ textAlign: 'center', display: 'block', fontSize: '16px', fontWeight: 600, color: '#334155', marginBottom: '16px' }}>
                                    Quantas fraldas AINDA LÁ ESTÃO? (0 a 10)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    required
                                    value={currentRoomStock}
                                    onChange={e => setCurrentRoomStock(e.target.value)}
                                    style={{
                                        width: '100%', padding: '20px', fontSize: '32px', textAlign: 'center', fontWeight: 'bold',
                                        borderRadius: '16px', border: '2px solid #cbd5e1', background: '#f8fafc', color: '#0f172a'
                                    }}
                                    autoFocus
                                />
                                {currentRoomStock !== '' && (
                                    <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#0284c7', background: '#f0f9ff', padding: '12px', borderRadius: '12px' }}>
                                        <AlertCircle size={20} />
                                        <span style={{ fontSize: '15px' }}>O sistema vai repor: </span>
                                        <span style={{ fontWeight: 800, fontSize: '24px' }}>+{10 - Number(currentRoomStock)} uni.</span>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <button
                                    type="submit"
                                    style={{
                                        width: '100%', padding: '18px', background: '#0284c7', color: 'white',
                                        border: 'none', borderRadius: '16px', fontWeight: '800', fontSize: '18px', cursor: 'pointer',
                                        boxShadow: '0 4px 6px -1px rgba(2, 132, 199, 0.2)'
                                    }}
                                >
                                    Confirmar Reposição
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleSaveReplace(null, 10)}
                                    style={{
                                        width: '100%', padding: '16px', background: '#e2e8f0', color: '#334155',
                                        border: '1px solid #cbd5e1', borderRadius: '16px', fontWeight: '800', fontSize: '16px', cursor: 'pointer'
                                    }}
                                >
                                    Já Estão Completas (10 Fraldas)
                                </button>
                            </div>
                        </form>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                            <button
                                type="button"
                                onClick={() => { setReplaceModal(null); setCurrentRoomStock(''); }}
                                style={{
                                    width: '100%', padding: '16px', background: 'transparent', color: '#0284c7',
                                    border: 'none', borderRadius: '16px', fontWeight: '800', fontSize: '16px', cursor: 'pointer'
                                }}
                            >
                                Fechar
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </>
    );
}
