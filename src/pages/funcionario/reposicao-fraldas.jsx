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
import { Box, CheckCircle2, ClipboardList, Package2, AlertCircle, X } from 'lucide-react';

const TARGET_STOCK = 10;
const FLOOR_PLAN = [
    {
        id: 'piso-0',
        label: 'Piso 0',
        names: ['Otílio Guerreiro', 'Mário Almeida', 'Zélia Oliveira', 'Luísa Reis']
    },
    {
        id: 'piso-1',
        label: 'Piso 1',
        names: ['Amélia Marinho', 'Maria Rodrigues', 'Lourdes Correia', 'Simão', 'Babicha', 'Zulmira Teixeira', 'Carlos Almeida (Fraldas)', 'Carlos Almeida (Cueca-fralda)', 'Domingos Ventura']
    },
    {
        id: 'piso-2',
        label: 'Piso 2',
        names: ['Judite', 'Teresa Almendra', 'Lourdes Nunes', 'Sofia Delgado', 'Perpétua Pinto', 'Maria Emília', 'Ernestina Borges', 'Fernanda Costa']
    }
];

export default function FraldasReposicaoFuncionarioPage() {
    const { isAdmin, toggleMode, currentUser } = useApp();
    const router = useRouter();
    const { diaperPatients, diaperInventory, diaperLogs, updateInventoryItem, addDiaperLog, isHydrated, dailyPlans, updateDiaperPatient } = useData();

    const [toast, setToast] = useState('');
    const [replaceModal, setReplaceModal] = useState(null);
    const [selectedReplenishDiaperId, setSelectedReplenishDiaperId] = useState('');
    const [currentRoomStock, setCurrentRoomStock] = useState('');
    const [replenishAmount, setReplenishAmount] = useState('0');
    const [todayStr] = useState(() => new Date().toISOString().split('T')[0]);
    const [todayPlanStr] = useState(() => {
        const now = new Date();
        const tzOffset = now.getTimezoneOffset() * 60000;
        return new Date(now.getTime() - tzOffset).toISOString().slice(0, 10);
    });

    const hasAccess = useMemo(() => {
        if (!isHydrated || !currentUser || !dailyPlans) return false;
        const todayPlan = dailyPlans[todayPlanStr];
        return todayPlan && todayPlan.assignments && todayPlan.assignments['G_RepFraldas'] === currentUser.id;
    }, [isHydrated, currentUser, dailyPlans, todayPlanStr]);

    useEffect(() => {
        if (isHydrated && currentUser && !hasAccess && !isAdmin) {
            router.push('/funcionario');
        }
    }, [isHydrated, currentUser, hasAccess, router, isAdmin]);

    const closeReplaceModal = () => {
        setReplaceModal(null);
        setCurrentRoomStock('');
        setReplenishAmount('0');
        setSelectedReplenishDiaperId('');
    };

    const dedupedPatients = useMemo(() => (
        diaperPatients && diaperPatients.length > 0
            ? [...new Map(diaperPatients.map((p) => [p.name.toLowerCase().trim(), p])).values()].sort((a, b) => a.name.localeCompare(b.name))
            : []
    ), [diaperPatients]);

    const orderedPatients = useMemo(() => {
        const byName = new Map(dedupedPatients.map((patient) => [patient.name, patient]));
        const plannedNames = FLOOR_PLAN.flatMap((floor) => floor.names);
        const plannedPatients = plannedNames.map((name) => byName.get(name)).filter(Boolean);
        const extraPatients = dedupedPatients.filter((patient) => !plannedNames.includes(patient.name));
        return [...plannedPatients, ...extraPatients];
    }, [dedupedPatients]);

    const patientDayState = useMemo(() => {
        const states = {};

        orderedPatients.forEach((patient) => {
            const patientLogs = (diaperLogs || [])
                .filter((log) => log.patientId === patient.id && log.date === todayStr)
                .sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date));

            const latestAudit = patientLogs.find((log) => log.type === 'audit');
            const latestReplenishment = patientLogs.find((log) => log.type === 'replenishment');
            const currentStock = patient.wardrobeStock !== undefined ? patient.wardrobeStock : TARGET_STOCK;
            const missingToTarget = Math.max(0, TARGET_STOCK - currentStock);
            const checkedToday = Boolean(latestAudit || latestReplenishment);
            const replenishedToday = patientLogs
                .filter((log) => log.type === 'replenishment')
                .reduce((sum, log) => sum + Number(log.amountAdded || 0), 0);

            let stage = 'pending';
            if (checkedToday && missingToTarget === 0) stage = 'done';
            if (checkedToday && missingToTarget > 0) stage = replenishedToday > 0 ? 'partial' : 'ready';

            states[patient.id] = {
                checkedToday,
                currentStock,
                missingToTarget,
                replenishedToday,
                latestAudit,
                latestReplenishment,
                stage
            };
        });

        return states;
    }, [orderedPatients, diaperLogs, todayStr]);

    const depotPickupSummary = useMemo(() => {
        const summary = new Map();

        orderedPatients.forEach((patient) => {
            const state = patientDayState[patient.id];
            if (!state?.checkedToday || state.missingToTarget <= 0 || patient.origin === 'Própria') return;

            const diaperType = diaperInventory?.find((item) => item.id === patient.diaperId);
            const key = diaperType?.id || `missing-${patient.id}`;
            const existing = summary.get(key) || {
                id: key,
                name: diaperType?.name || 'Modelo não associado',
                amount: 0,
                stockDepot: diaperType?.stockDepot ?? null
            };
            existing.amount += state.missingToTarget;
            summary.set(key, existing);
        });

        return [...summary.values()].sort((a, b) => b.amount - a.amount);
    }, [orderedPatients, patientDayState, diaperInventory]);

    const ownSupplySummary = useMemo(() => (
        orderedPatients
            .filter((patient) => patient.origin === 'Própria')
            .map((patient) => ({ patient, state: patientDayState[patient.id] }))
            .filter(({ state }) => state?.checkedToday && state.missingToTarget > 0)
    ), [orderedPatients, patientDayState]);

    const summaryCards = useMemo(() => {
        const total = orderedPatients.length;
        const checked = orderedPatients.filter((patient) => patientDayState[patient.id]?.checkedToday).length;
        const missingUnits = orderedPatients.reduce((sum, patient) => sum + (patientDayState[patient.id]?.missingToTarget || 0), 0);

        return [
            { label: 'Por conferir', value: Math.max(0, total - checked), tone: '#ef4444', bg: '#fef2f2' },
            { label: 'Conferidos hoje', value: checked, tone: '#0284c7', bg: '#eff6ff' },
            { label: 'Fraldas em falta', value: missingUnits, tone: '#15803d', bg: '#f0fdf4' }
        ];
    }, [orderedPatients, patientDayState]);

    const patientSections = useMemo(() => {
        const pending = [];
        const ready = [];
        const done = [];

        orderedPatients.forEach((patient) => {
            const state = patientDayState[patient.id];
            if (!state || state.stage === 'pending') pending.push(patient);
            else if (state.stage === 'ready' || state.stage === 'partial') ready.push(patient);
            else done.push(patient);
        });

        return { pending, ready, done };
    }, [orderedPatients, patientDayState]);

    const groupedSections = useMemo(() => {
        const buildGroups = (patients) => {
            const usedIds = new Set();
            const floorGroups = FLOOR_PLAN.map((floor) => {
                const items = floor.names
                    .map((name) => patients.find((patient) => patient.name === name))
                    .filter(Boolean);
                items.forEach((patient) => usedIds.add(patient.id));
                return { ...floor, patients: items };
            }).filter((floor) => floor.patients.length > 0);

            const extras = patients.filter((patient) => !usedIds.has(patient.id));
            if (extras.length > 0) {
                floorGroups.push({ id: 'sem-piso', label: 'Sem piso definido', patients: extras });
            }

            return floorGroups;
        };

        return {
            pending: buildGroups(patientSections.pending),
            ready: buildGroups(patientSections.ready),
            done: buildGroups(patientSections.done)
        };
    }, [patientSections]);

    const openPatientModal = (patient) => {
        const state = patientDayState[patient.id];
        setReplaceModal(patient);
        setCurrentRoomStock(state ? String(state.currentStock) : '');
        setReplenishAmount('0');
        setSelectedReplenishDiaperId(patient.diaperId || '');
    };

    const handleSaveReplace = async (e) => {
        if (e) e.preventDefault();
        if (!replaceModal) return;

        const patient = replaceModal;
        const currentInRoom = Number(currentRoomStock);
        const amountToReplenish = Number(replenishAmount);

        if (Number.isNaN(currentInRoom) || currentInRoom < 0) {
            alert('A quantidade no quarto deve ser 0 ou superior.');
            return;
        }

        if (Number.isNaN(amountToReplenish) || amountToReplenish < 0) {
            alert('A quantidade a repor deve ser 0 ou superior.');
            return;
        }

        const inventory = diaperInventory || [];
        const diaperType = inventory.find((item) => item.id === selectedReplenishDiaperId);
        const usingHouseStock = amountToReplenish > 0 && patient.origin !== 'Própria';

        if (usingHouseStock && !diaperType) {
            alert('Escolha o modelo de fralda para a reposição.');
            return;
        }

        if (usingHouseStock && diaperType.stockDepot < amountToReplenish) {
            alert(`Falta stock no depósito. Existem apenas ${diaperType.stockDepot} de ${diaperType.name}.`);
            return;
        }

        const systemExpectedStock = patient.wardrobeStock !== undefined ? patient.wardrobeStock : TARGET_STOCK;
        const finalStock = currentInRoom + amountToReplenish;

        await addDiaperLog({
            type: 'audit',
            patientId: patient.id,
            patientName: patient.name,
            date: todayStr,
            time: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
            expectedStock: systemExpectedStock,
            actualStock: currentInRoom,
            deviance: systemExpectedStock - currentInRoom,
            checkedOnly: amountToReplenish === 0,
            executorId: currentUser?.id,
            executorName: currentUser?.name || 'Funcionário'
        });

        if (usingHouseStock) {
            await updateInventoryItem(diaperType.id, {
                stockDepot: Math.max(0, diaperType.stockDepot - amountToReplenish)
            });
        }

        if (amountToReplenish > 0) {
            await addDiaperLog({
                type: 'replenishment',
                patientId: patient.id,
                patientName: patient.name,
                diaperId: diaperType ? diaperType.id : '',
                diaperName: diaperType ? diaperType.name : '',
                date: todayStr,
                time: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
                amountAdded: amountToReplenish,
                previousStock: currentInRoom,
                newStock: finalStock,
                executorId: currentUser?.id,
                executorName: currentUser?.name || 'Funcionário'
            });
        }

        await updateDiaperPatient(patient.id, {
            wardrobeStock: finalStock,
            hasAnomaly: finalStock < TARGET_STOCK
        });

        setToast(amountToReplenish > 0
            ? `${patient.name}: conferido e reposto (+${amountToReplenish})`
            : `${patient.name}: conferido sem reposição`);
        setTimeout(() => setToast(''), 3000);
        closeReplaceModal();
    };

    if (!isHydrated) return null;

    const renderPatientCard = (patient, accent) => {
        const state = patientDayState[patient.id];
        const missing = state?.missingToTarget || 0;
        const statusLabel = !state?.checkedToday
            ? 'Falta conferir'
            : missing === 0
                ? 'Pronto'
                : state.stage === 'partial'
                    ? 'Reposição parcial'
                    : 'Falta repor';

        return (
            <button
                key={patient.id}
                onClick={() => openPatientModal(patient)}
                style={{
                    background: 'white',
                    padding: '18px',
                    borderRadius: '20px',
                    border: `2px solid ${accent.border}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    textAlign: 'left',
                    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
                    cursor: 'pointer'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ fontSize: '19px', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>{patient.name}</div>
                        <div style={{ marginTop: '6px', display: 'inline-flex', padding: '6px 10px', borderRadius: '999px', background: accent.badgeBg, color: accent.badgeColor, fontSize: '12px', fontWeight: 800 }}>
                            {statusLabel}
                        </div>
                    </div>
                    <div style={{ minWidth: '72px', borderRadius: '16px', background: accent.boxBg, padding: '10px 8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Agora</div>
                        <div style={{ fontSize: '28px', fontWeight: 900, color: accent.badgeColor, lineHeight: 1 }}>{state?.currentStock ?? '-'}</div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
                    <div style={{ borderRadius: '16px', background: '#f8fafc', padding: '12px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Faltam para 10</div>
                        <div style={{ fontSize: '24px', fontWeight: 900, color: missing > 0 ? '#ea580c' : '#16a34a' }}>{missing}</div>
                    </div>
                    <div style={{ borderRadius: '16px', background: '#f8fafc', padding: '12px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Modelo</div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                            {patient.origin === 'Própria'
                                ? 'Própria'
                                : diaperInventory?.find((item) => item.id === patient.diaperId)?.name || 'Sem modelo'}
                        </div>
                    </div>
                </div>

                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                    {!state?.checkedToday && 'Abrir para conferir'}
                    {state?.checkedToday && missing > 0 && `Abrir para repor ${missing}`}
                    {state?.checkedToday && missing === 0 && 'Abrir para confirmar'}
                </div>
            </button>
        );
    };

    const renderFloorSection = (groups, accent) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {groups.map((group) => (
                <div key={group.id}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
                        <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>{group.label}</div>
                        <div style={{ padding: '6px 10px', borderRadius: '999px', background: accent.badgeBg, color: accent.badgeColor, fontSize: '12px', fontWeight: 800 }}>
                            {group.patients.length} utentes
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px' }}>
                        {group.patients.map((patient) => renderPatientCard(patient, accent))}
                    </div>
                </div>
            ))}
        </div>
    );

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
                        <h1 style={{ margin: '0 0 10px 0', fontSize: '28px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Box size={30} color="#0284c7" /> Conferir e Repor Fraldas
                        </h1>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '16px', maxWidth: '720px' }}>
                            Primeiro conte o que está no armário. Depois o sistema mostra exatamente o que falta apanhar no piso 3.
                        </p>
                    </div>

                    {toast && (
                        <div style={{ background: '#DCFCE7', color: '#166534', padding: '16px', borderRadius: '16px', fontSize: '1rem', marginBottom: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                            <CheckCircle2 size={20} /> {toast}
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                        {summaryCards.map((card) => (
                            <div key={card.label} style={{ background: card.bg, borderRadius: '20px', padding: '18px', border: '1px solid rgba(148, 163, 184, 0.18)' }}>
                                <div style={{ fontSize: '13px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{card.label}</div>
                                <div style={{ marginTop: '8px', fontSize: '34px', fontWeight: 900, color: card.tone }}>{card.value}</div>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                        <div style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', borderRadius: '22px', padding: '18px', border: '1px solid #bfdbfe' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                <ClipboardList size={22} color="#1d4ed8" />
                                <div style={{ fontSize: '18px', fontWeight: 900, color: '#1e3a8a' }}>1. Conferir</div>
                            </div>
                            <div style={{ color: '#1e40af', fontSize: '15px', fontWeight: 700 }}>Abra o utente e escreva quantas fraldas estão no armário.</div>
                        </div>

                        <div style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #dcfce7 100%)', borderRadius: '22px', padding: '18px', border: '1px solid #bbf7d0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                <Package2 size={22} color="#15803d" />
                                <div style={{ fontSize: '18px', fontWeight: 900, color: '#166534' }}>2. Recolher</div>
                            </div>
                            <div style={{ color: '#166534', fontSize: '15px', fontWeight: 700 }}>Veja abaixo quantas fraldas deve apanhar de cada modelo.</div>
                        </div>
                    </div>

                    <div style={{ background: 'white', borderRadius: '24px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.05)', marginBottom: '24px' }}>
                        <div style={{ fontSize: '19px', fontWeight: 900, color: '#0f172a', marginBottom: '14px' }}>Levar do piso 3</div>

                        {depotPickupSummary.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                                {depotPickupSummary.map((item) => (
                                    <div key={item.id} style={{ background: '#f8fafc', borderRadius: '18px', padding: '16px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Modelo</div>
                                        <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>{item.name}</div>
                                        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
                                            <div>
                                                <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 700 }}>Precisa de</div>
                                                <div style={{ fontSize: '30px', fontWeight: 900, color: '#15803d', lineHeight: 1 }}>{item.amount}</div>
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>
                                                Depósito: {item.stockDepot ?? '-'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ background: '#f8fafc', borderRadius: '18px', padding: '18px', color: '#475569', fontWeight: 700 }}>
                                Ainda não há necessidades do depósito. Comece pela conferência dos quartos.
                            </div>
                        )}

                        {ownSupplySummary.length > 0 && (
                            <div style={{ marginTop: '16px', background: '#fff7ed', borderRadius: '18px', padding: '16px', border: '1px solid #fed7aa' }}>
                                <div style={{ fontSize: '14px', fontWeight: 900, color: '#c2410c', marginBottom: '8px' }}>Fraldas próprias do utente</div>
                                <div style={{ color: '#9a3412', fontWeight: 700, lineHeight: 1.5 }}>
                                    {ownSupplySummary.map(({ patient, state }) => `${patient.name}: faltam ${state.missingToTarget}`).join(' | ')}
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                        <section>
                            <div style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a', marginBottom: '14px' }}>Falta Conferir</div>
                            {patientSections.pending.length > 0 ? (
                                renderFloorSection(groupedSections.pending, {
                                    border: '#fecaca',
                                    badgeBg: '#fef2f2',
                                    badgeColor: '#dc2626',
                                    boxBg: '#fff1f2'
                                })
                            ) : (
                                <div style={{ background: '#f8fafc', borderRadius: '18px', padding: '18px', color: '#475569', fontWeight: 700 }}>
                                    Todos os quartos já foram conferidos hoje.
                                </div>
                            )}
                        </section>

                        <section>
                            <div style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a', marginBottom: '14px' }}>Pronto Para Repor</div>
                            {patientSections.ready.length > 0 ? (
                                renderFloorSection(groupedSections.ready, {
                                    border: '#fde68a',
                                    badgeBg: '#fef3c7',
                                    badgeColor: '#b45309',
                                    boxBg: '#fffbeb'
                                })
                            ) : (
                                <div style={{ background: '#f8fafc', borderRadius: '18px', padding: '18px', color: '#475569', fontWeight: 700 }}>
                                    Ainda não há quartos a aguardar reposição.
                                </div>
                            )}
                        </section>

                        <section>
                            <div style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a', marginBottom: '14px' }}>Concluído</div>
                            {patientSections.done.length > 0 ? (
                                renderFloorSection(groupedSections.done, {
                                    border: '#bbf7d0',
                                    badgeBg: '#dcfce7',
                                    badgeColor: '#15803d',
                                    boxBg: '#f0fdf4'
                                })
                            ) : (
                                <div style={{ background: '#f8fafc', borderRadius: '18px', padding: '18px', color: '#475569', fontWeight: 700 }}>
                                    Os quartos completos vão aparecer aqui.
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </main>

            {replaceModal && (
                <div
                    onClick={closeReplaceModal}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{ background: 'white', padding: '24px 20px 20px', borderRadius: '28px', width: '100%', maxWidth: '420px', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', position: 'relative' }}
                    >
                        <button
                            type="button"
                            onClick={closeReplaceModal}
                            aria-label="Fechar janela"
                            style={{
                                position: 'absolute',
                                top: '12px',
                                right: '12px',
                                width: '40px',
                                height: '40px',
                                borderRadius: '999px',
                                border: 'none',
                                background: '#f1f5f9',
                                color: '#334155',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                            }}
                        >
                            <X size={20} />
                        </button>

                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <div style={{ display: 'inline-flex', background: '#e0f2fe', color: '#0284c7', padding: '16px', borderRadius: '50%', marginBottom: '14px' }}>
                                <Box size={30} />
                            </div>
                            <h2 style={{ margin: '0 0 6px 0', fontSize: '26px', color: '#0f172a' }}>{replaceModal.name}</h2>
                            <p style={{ margin: 0, color: '#64748b', fontSize: '15px', lineHeight: 1.4 }}>
                                Passo 1: conte. Passo 2: diga quantas vai repor.
                            </p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', marginBottom: '20px' }}>
                            <div style={{ background: '#eff6ff', borderRadius: '18px', padding: '14px', textAlign: 'center', border: '1px solid #bfdbfe' }}>
                                <div style={{ fontSize: '12px', fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase' }}>Agora</div>
                                <div style={{ fontSize: '30px', fontWeight: 900, color: '#1d4ed8', lineHeight: 1 }}>{currentRoomStock === '' ? '-' : currentRoomStock}</div>
                            </div>
                            <div style={{ background: '#f0fdf4', borderRadius: '18px', padding: '14px', textAlign: 'center', border: '1px solid #bbf7d0' }}>
                                <div style={{ fontSize: '12px', fontWeight: 800, color: '#15803d', textTransform: 'uppercase' }}>Depois</div>
                                <div style={{ fontSize: '30px', fontWeight: 900, color: '#15803d', lineHeight: 1 }}>
                                    {(Number(currentRoomStock) || 0) + (Number(replenishAmount) || 0)}
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSaveReplace}>
                            <div className={formStyles.formGroup} style={{ marginBottom: '18px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 900, color: '#475569', marginBottom: '8px', textTransform: 'uppercase' }}>
                                    1. Quantas estão no armário?
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    required
                                    value={currentRoomStock}
                                    onChange={(e) => setCurrentRoomStock(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '18px',
                                        fontSize: '36px',
                                        textAlign: 'center',
                                        fontWeight: '900',
                                        borderRadius: '18px',
                                        border: '2px solid #cbd5e1',
                                        background: '#f8fafc',
                                        color: '#0f172a'
                                    }}
                                    autoFocus
                                />
                            </div>

                            {currentRoomStock !== '' && (
                                <>
                                    <div style={{ marginBottom: '18px', background: '#f8fafc', borderRadius: '18px', padding: '14px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <AlertCircle size={20} color="#0284c7" />
                                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                                            {Number(currentRoomStock) >= TARGET_STOCK
                                                ? 'Já está com 10 ou mais.'
                                                : `Faltam ${Math.max(0, TARGET_STOCK - Number(currentRoomStock))} para chegar a 10.`}
                                        </div>
                                    </div>

                                    <div className={formStyles.formGroup} style={{ marginBottom: '18px' }}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 900, color: '#475569', marginBottom: '8px', textTransform: 'uppercase' }}>
                                            2. Quantas vai repor agora?
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={replenishAmount}
                                            onChange={(e) => setReplenishAmount(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '18px',
                                                fontSize: '36px',
                                                textAlign: 'center',
                                                fontWeight: '900',
                                                borderRadius: '18px',
                                                border: '2px solid #cbd5e1',
                                                background: '#fff',
                                                color: '#0f172a'
                                            }}
                                        />

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px', marginTop: '10px' }}>
                                            {[0, Math.max(0, TARGET_STOCK - (Number(currentRoomStock) || 0)), Math.max(0, Math.ceil((TARGET_STOCK - (Number(currentRoomStock) || 0)) / 2))].filter((value, index, arr) => arr.indexOf(value) === index).map((value) => (
                                                <button
                                                    key={value}
                                                    type="button"
                                                    onClick={() => setReplenishAmount(String(value))}
                                                    style={{
                                                        padding: '12px',
                                                        borderRadius: '14px',
                                                        border: '1px solid #cbd5e1',
                                                        background: Number(replenishAmount) === value ? '#0f172a' : '#fff',
                                                        color: Number(replenishAmount) === value ? '#fff' : '#0f172a',
                                                        fontWeight: 800,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {value}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {Number(replenishAmount) > 0 && (
                                        <div className={formStyles.formGroup} style={{ marginBottom: '18px' }}>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 900, color: '#475569', marginBottom: '8px', textTransform: 'uppercase' }}>
                                                3. Que fralda vai usar?
                                            </label>
                                            <select
                                                value={selectedReplenishDiaperId}
                                                onChange={(e) => setSelectedReplenishDiaperId(e.target.value)}
                                                style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1px solid #cbd5e1', fontSize: '16px', fontWeight: '800', color: '#0f172a', background: 'white', cursor: 'pointer' }}
                                            >
                                                {replaceModal.origin === 'Própria' && (
                                                    <option value={replaceModal.diaperId}>Fraldas próprias</option>
                                                )}
                                                {diaperInventory?.filter((item) => item.origin === 'Casa').map((item) => (
                                                    <option key={item.id} value={item.id}>{item.name} ({item.stockDepot} no depósito)</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </>
                            )}

                            <button
                                type="submit"
                                style={{
                                    width: '100%',
                                    padding: '18px',
                                    background: '#0284c7',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '18px',
                                    fontWeight: '900',
                                    fontSize: '20px',
                                    cursor: 'pointer',
                                    boxShadow: '0 6px 16px rgba(2, 132, 199, 0.24)'
                                }}
                            >
                                Guardar
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
