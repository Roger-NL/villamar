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
import { DIAPER_FLOOR_PLAN, DIAPER_INVENTORY_CATALOG, getInventoryItemConfig, getPatientDiaperAssignment, hasExplicitDiaperAssignment, sortDiaperPatientsByPlan, isDirectFamilySupplyPatient } from '@/data/diaperConfig.mjs';
import { Box, CheckCircle2, ClipboardList, Package2, AlertCircle, X, ChevronDown } from 'lucide-react';

const TARGET_STOCK = 10;

export default function FraldasReposicaoFuncionarioPage() {
    const { isAdmin, toggleMode, currentUser } = useApp();
    const router = useRouter();
    const { diaperPatients, inventoryItems, diaperLogs, updateInventoryItem, addDiaperLog, isHydrated, dailyPlans, updateDiaperPatient } = useData();

    const [toast, setToast] = useState('');
    const [replaceModal, setReplaceModal] = useState(null);
    const [selectedReplenishDiaperId, setSelectedReplenishDiaperId] = useState('');
    const [currentRoomStock, setCurrentRoomStock] = useState('');
    const [replenishAmount, setReplenishAmount] = useState('0');
    const [directSupplyStatus, setDirectSupplyStatus] = useState('ok');
    const [showFlowGuide, setShowFlowGuide] = useState(false);
    const [expandedPickupSections, setExpandedPickupSections] = useState({});
    const [todayPlanStr] = useState(() => {
        const now = new Date();
        const tzOffset = now.getTimezoneOffset() * 60000;
        return new Date(now.getTime() - tzOffset).toISOString().slice(0, 10);
    });
    const [selectedDate, setSelectedDate] = useState(() => {
        const now = new Date();
        const tzOffset = now.getTimezoneOffset() * 60000;
        return new Date(now.getTime() - tzOffset).toISOString().slice(0, 10);
    });
    const isHistoricalDate = selectedDate !== todayPlanStr;

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
        setDirectSupplyStatus('ok');
    };

    const dedupedPatients = useMemo(() => (
        diaperPatients && diaperPatients.length > 0
            ? sortDiaperPatientsByPlan(
                [...new Map(diaperPatients.map((patient) => {
                    const assignment = getPatientDiaperAssignment(patient.name);
                    const useExplicitAssignment = hasExplicitDiaperAssignment(patient.name);
                    return [
                        patient.name.toLowerCase().trim(),
                        {
                            ...patient,
                            diaperId: useExplicitAssignment ? assignment.diaperId : (patient.diaperId ?? assignment.diaperId),
                            origin: useExplicitAssignment ? assignment.origin : (patient.origin ?? assignment.origin),
                            backupDiaperId: useExplicitAssignment ? (assignment.backupDiaperId ?? '') : (patient.backupDiaperId ?? assignment.backupDiaperId ?? '')
                        }
                    ];
                })).values()]
            )
            : []
    ), [diaperPatients]);

    const diaperInventory = useMemo(() => {
        const byId = new Map(
            DIAPER_INVENTORY_CATALOG.map((item) => [item.id, { ...item }])
        );

        (inventoryItems || [])
            .filter((item) => item.category === 'fralda')
            .forEach((item) => {
                byId.set(item.id, { ...byId.get(item.id), ...item });
            });

        return [...byId.values()].sort((a, b) => {
            if (a.origin !== b.origin) return a.origin.localeCompare(b.origin);
            return a.name.localeCompare(b.name);
        });
    }, [inventoryItems]);

    const diaperInventoryById = useMemo(
        () => new Map(diaperInventory.map((item) => [item.id, item])),
        [diaperInventory]
    );

    const orderedPatients = useMemo(() => {
        const byName = new Map(dedupedPatients.map((patient) => [patient.name, patient]));
        const plannedNames = DIAPER_FLOOR_PLAN.flatMap((floor) => floor.names);
        const plannedPatients = plannedNames.map((name) => byName.get(name)).filter(Boolean);
        const extraPatients = dedupedPatients.filter((patient) => !plannedNames.includes(patient.name));
        return [...plannedPatients, ...extraPatients];
    }, [dedupedPatients]);

    const patientDayState = useMemo(() => {
        const states = {};

        orderedPatients.forEach((patient) => {
            const patientLogs = (diaperLogs || [])
                .filter((log) => log.patientId === patient.id && log.date === selectedDate)
                .sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date));

            const latestReplenishment = patientLogs.find((log) => log.type === 'replenishment');
            const currentStock = latestReplenishment?.newStock !== undefined
                ? Number(latestReplenishment.newStock)
                : (patient.wardrobeStock !== undefined ? patient.wardrobeStock : TARGET_STOCK);
            const missingToTarget = Math.max(0, TARGET_STOCK - currentStock);
            const checkedToday = Boolean(latestReplenishment);
            const replenishedToday = Number(latestReplenishment?.amountAdded || 0);

            let stage = 'pending';
            if (checkedToday && missingToTarget === 0) stage = 'done';
            if (checkedToday && missingToTarget > 0) stage = replenishedToday > 0 ? 'partial' : 'ready';

            states[patient.id] = {
                checkedToday,
                currentStock,
                missingToTarget,
                replenishedToday,
                latestReplenishment,
                stage
            };
        });

        return states;
    }, [orderedPatients, diaperLogs, selectedDate]);

    const depotPickupSummary = useMemo(() => {
        const summary = new Map();

        orderedPatients.forEach((patient) => {
            const state = patientDayState[patient.id];
            if (!state?.checkedToday || state.missingToTarget <= 0 || patient.origin === 'Própria') return;

            const diaperType = diaperInventoryById.get(patient.diaperId) || getInventoryItemConfig(patient.diaperId);
            const key = diaperType?.id || `missing-${patient.id}`;
            const existing = summary.get(key) || {
                id: key,
                name: diaperType?.name || 'Modelo não associado',
                amount: 0,
                stockDepot: diaperType?.stockDepot ?? null,
                patients: []
            };
            existing.amount += state.missingToTarget;
            existing.patients.push({
                id: patient.id,
                name: patient.name,
                amount: state.missingToTarget
            });
            summary.set(key, existing);
        });

        return [...summary.values()]
            .map((item) => ({
                ...item,
                patients: item.patients.sort((a, b) => a.name.localeCompare(b.name))
            }))
            .sort((a, b) => b.amount - a.amount);
    }, [orderedPatients, patientDayState, diaperInventoryById]);

    const ownSupplySummary = useMemo(() => (
        orderedPatients
            .filter((patient) => patient.origin === 'Própria')
            .map((patient) => ({ patient, state: patientDayState[patient.id] }))
            .filter(({ state }) => state?.checkedToday && state.missingToTarget > 0)
    ), [orderedPatients, patientDayState]);

    const floorOrderDesc = useMemo(() => [...DIAPER_FLOOR_PLAN].reverse(), []);

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

    const summaryTotals = useMemo(() => ({
        pending: summaryCards[0]?.value || 0,
        checked: summaryCards[1]?.value || 0,
        missing: summaryCards[2]?.value || 0
    }), [summaryCards]);

    const groupedDepotPickupSummary = useMemo(() => (
        floorOrderDesc.map((floor) => {
            const items = depotPickupSummary
                .map((item) => ({
                    ...item,
                    patients: item.patients.filter((patient) => floor.names.includes(patient.name))
                }))
                .filter((item) => item.patients.length > 0)
                .map((item) => ({
                    ...item,
                    amount: item.patients.reduce((sum, patient) => sum + Number(patient.amount || 0), 0)
                }));

            return { id: floor.id, label: floor.label, items };
        }).filter((floor) => floor.items.length > 0)
    ), [depotPickupSummary, floorOrderDesc]);

    const groupedOwnSupplySummary = useMemo(() => (
        floorOrderDesc.map((floor) => ({
            id: floor.id,
            label: floor.label,
            items: ownSupplySummary.filter(({ patient }) => floor.names.includes(patient.name))
        })).filter((floor) => floor.items.length > 0)
    ), [ownSupplySummary, floorOrderDesc]);

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
        const buildGroups = (patients, reverseFloors = false) => {
            const usedIds = new Set();
            const floorPlan = reverseFloors ? [...DIAPER_FLOOR_PLAN].reverse() : DIAPER_FLOOR_PLAN;
            const floorGroups = floorPlan.map((floor) => {
                const items = floor.names
                    .map((name) => patients.find((patient) => patient.name === name))
                    .filter(Boolean);
                items.forEach((patient) => usedIds.add(patient.id));
                return {
                    ...floor,
                    patients: items,
                    replenishedToday: items.reduce((sum, patient) => sum + Number(patientDayState[patient.id]?.replenishedToday || 0), 0),
                    currentStockTotal: items.reduce((sum, patient) => sum + Number(patientDayState[patient.id]?.currentStock || 0), 0)
                };
            }).filter((floor) => floor.patients.length > 0);

            const extras = patients.filter((patient) => !usedIds.has(patient.id));
            if (extras.length > 0) {
                floorGroups.push({
                    id: 'sem-piso',
                    label: 'Sem piso definido',
                    patients: extras,
                    replenishedToday: extras.reduce((sum, patient) => sum + Number(patientDayState[patient.id]?.replenishedToday || 0), 0),
                    currentStockTotal: extras.reduce((sum, patient) => sum + Number(patientDayState[patient.id]?.currentStock || 0), 0)
                });
            }

            return floorGroups;
        };

        return {
            pending: buildGroups(patientSections.pending),
            ready: buildGroups(patientSections.ready, true),
            done: buildGroups(patientSections.done, true)
        };
    }, [patientSections, patientDayState]);

    const getPatientReplenishOptions = (patient) => {
        const ownItems = diaperInventory
            .filter((item) => item.origin === 'Própria' && item.patientName === patient.name)
            .sort((a, b) => a.name.localeCompare(b.name));

        const seen = new Set();
        return [...ownItems, ...diaperInventory.filter((item) => item.origin === 'Casa')].filter((item) => {
            if (!item?.id || seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
        });
    };

    const openPatientModal = (patient) => {
        const state = patientDayState[patient.id];
        setReplaceModal(patient);
        setCurrentRoomStock(state ? String(state.currentStock) : '');
        setReplenishAmount('0');
        setSelectedReplenishDiaperId(
            patient.diaperId
            || diaperInventory.find((item) => item.origin === 'Casa')?.id
            || ''
        );
        setDirectSupplyStatus('ok');
    };

    const togglePickupSection = (sectionId) => {
        setExpandedPickupSections((prev) => ({
            ...prev,
            [sectionId]: !prev[sectionId]
        }));
    };

    const handleReplenishAll = async () => {
        const readyPatients = orderedPatients.filter((patient) => {
            const state = patientDayState[patient.id];
            return state?.checkedToday && state.missingToTarget > 0 && !isDirectFamilySupplyPatient(patient);
        });

        if (readyPatients.length === 0) {
            alert('Não há quartos prontos para repor.');
            return;
        }

        const inventoryMap = new Map(
            diaperInventory.map((item) => [item.id, { ...item }])
        );
        const shortages = [];

        readyPatients.forEach((patient) => {
            const state = patientDayState[patient.id];
            const diaperType = inventoryMap.get(patient.diaperId) || getInventoryItemConfig(patient.diaperId);
            if (!diaperType) {
                shortages.push(`${patient.name}: sem modelo associado`);
                return;
            }

            if (!isHistoricalDate && Number(diaperType.stockDepot || 0) < state.missingToTarget) {
                shortages.push(`${patient.name}: ${diaperType.name} tem apenas ${diaperType.stockDepot}`);
                return;
            }

            if (!isHistoricalDate) {
                inventoryMap.set(diaperType.id, {
                    ...diaperType,
                    stockDepot: Number(diaperType.stockDepot || 0) - state.missingToTarget
                });
            }
        });

        if (shortages.length > 0) {
            alert(`Não foi possível repor tudo.\n${shortages.join('\n')}\n\nSe precisar, faça esses casos manualmente.`);
            return;
        }

        const updatedStocks = new Map();

        for (const patient of readyPatients) {
            const state = patientDayState[patient.id];
            const diaperType = inventoryMap.get(patient.diaperId) || getInventoryItemConfig(patient.diaperId);
            const previousStock = Number(state.currentStock || 0);
            const amountAdded = Number(state.missingToTarget || 0);
            const newStock = previousStock + amountAdded;

            if (!isHistoricalDate) {
                updatedStocks.set(diaperType.id, Number(diaperType.stockDepot || 0));
            }

            await addDiaperLog({
                type: 'replenishment',
                patientId: patient.id,
                patientName: patient.name,
                diaperId: diaperType.id,
                diaperName: diaperType.name,
                date: selectedDate,
                time: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
                amountAdded,
                previousStock,
                newStock,
                isHistoricalEntry: isHistoricalDate,
                executorId: currentUser?.id,
                executorName: currentUser?.name || 'Funcionário'
            });

            if (!isHistoricalDate) {
                await updateDiaperPatient(patient.id, {
                    wardrobeStock: newStock,
                    hasAnomaly: false,
                    currentWardrobeDiaperId: diaperType.id,
                    currentWardrobeDiaperName: diaperType.name,
                    currentWardrobeOrigin: diaperType.origin || 'Casa'
                });
            }
        }

        for (const [inventoryId, stockDepot] of updatedStocks.entries()) {
            await updateInventoryItem(inventoryId, { stockDepot });
        }

        setToast(isHistoricalDate
            ? `Reposição retroativa guardada para ${readyPatients.length} quartos em ${selectedDate}`
            : `Reposição completa: ${readyPatients.length} quartos atualizados`);
        setTimeout(() => setToast(''), 3000);
    };

    const handleSaveReplace = async (e) => {
        if (e) e.preventDefault();
        if (!replaceModal) return;

        const patient = replaceModal;
        const isDirectSupply = isDirectFamilySupplyPatient(patient);
        const currentInRoom = Number(currentRoomStock);
        const amountToReplenish = Number(replenishAmount);

        if (isDirectSupply) {
            const stockValue = directSupplyStatus === 'ok' ? TARGET_STOCK : 0;
            await addDiaperLog({
                type: 'replenishment',
                patientId: patient.id,
                patientName: patient.name,
                diaperId: '',
                diaperName: 'Fralda própria no quarto',
                date: selectedDate,
                time: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
                amountAdded: 0,
                previousStock: stockValue,
                newStock: stockValue,
                directSupplyStatus,
                isHistoricalEntry: isHistoricalDate,
                executorId: currentUser?.id,
                executorName: currentUser?.name || 'Funcionário'
            });

            if (!isHistoricalDate) {
                await updateDiaperPatient(patient.id, {
                    wardrobeStock: stockValue,
                    hasAnomaly: directSupplyStatus !== 'ok',
                    currentWardrobeDiaperId: '',
                    currentWardrobeDiaperName: '',
                    currentWardrobeOrigin: 'Própria'
                });
            }

            setToast(directSupplyStatus === 'ok'
                ? `${patient.name}: confirmado${isHistoricalDate ? ` em ${selectedDate}` : ' com fralda própria'}`
                : `${patient.name}: marcado sem fralda${isHistoricalDate ? ` em ${selectedDate}` : ''}`);
            setTimeout(() => setToast(''), 3000);
            closeReplaceModal();
            return;
        }

        if (Number.isNaN(currentInRoom) || currentInRoom < 0) {
            alert('A quantidade no quarto deve ser 0 ou superior.');
            return;
        }

        if (Number.isNaN(amountToReplenish) || amountToReplenish < 0) {
            alert('A quantidade a repor deve ser 0 ou superior.');
            return;
        }

        const inventory = diaperInventory || [];
        const diaperType = inventory.find((item) => item.id === selectedReplenishDiaperId) || getInventoryItemConfig(selectedReplenishDiaperId);
        const shouldAdjustInventory = amountToReplenish > 0 && Boolean(diaperType);

        if (amountToReplenish > 0 && !diaperType) {
            alert('Escolha o modelo de fralda para a reposição.');
            return;
        }

        if (!isHistoricalDate && shouldAdjustInventory && diaperType.stockDepot < amountToReplenish) {
            alert(`Falta stock no depósito. Existem apenas ${diaperType.stockDepot} de ${diaperType.name}.`);
            return;
        }

        const finalStock = currentInRoom + amountToReplenish;

        if (!isHistoricalDate && shouldAdjustInventory) {
            await updateInventoryItem(diaperType.id, {
                stockDepot: Math.max(0, diaperType.stockDepot - amountToReplenish)
            });
        }

        await addDiaperLog({
            type: 'replenishment',
            patientId: patient.id,
            patientName: patient.name,
            diaperId: diaperType ? diaperType.id : '',
            diaperName: diaperType ? diaperType.name : '',
            date: selectedDate,
            time: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
            amountAdded: amountToReplenish,
            previousStock: currentInRoom,
            newStock: finalStock,
            isHistoricalEntry: isHistoricalDate,
            executorId: currentUser?.id,
            executorName: currentUser?.name || 'Funcionário'
        });

        if (!isHistoricalDate) {
            await updateDiaperPatient(patient.id, {
                wardrobeStock: finalStock,
                hasAnomaly: false,
                currentWardrobeDiaperId: diaperType ? diaperType.id : (patient.currentWardrobeDiaperId || patient.diaperId || ''),
                currentWardrobeDiaperName: diaperType ? diaperType.name : (patient.currentWardrobeDiaperName || ''),
                currentWardrobeOrigin: diaperType ? (diaperType.origin || patient.origin || '') : (patient.currentWardrobeOrigin || patient.origin || '')
            });
        }

        setToast(amountToReplenish > 0
            ? (isHistoricalDate
                ? `${patient.name}: reposição retroativa guardada em ${selectedDate}`
                : `${patient.name}: conferido e reposto (+${amountToReplenish})`)
            : (isHistoricalDate
                ? `${patient.name}: conferido em ${selectedDate} sem reposição`
                : `${patient.name}: conferido sem reposição`));
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
                    padding: '16px',
                    borderRadius: '18px',
                    border: `2px solid ${accent.border}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    textAlign: 'left',
                    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
                    cursor: 'pointer'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', lineHeight: 1.15 }}>{patient.name}</div>
                        <div style={{ marginTop: '6px', display: 'inline-flex', padding: '6px 10px', borderRadius: '999px', background: accent.badgeBg, color: accent.badgeColor, fontSize: '12px', fontWeight: 800 }}>
                            {statusLabel}
                        </div>
                    </div>
                    <div style={{ minWidth: '70px', borderRadius: '16px', background: accent.boxBg, padding: '10px 8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Agora</div>
                        <div style={{ fontSize: '28px', fontWeight: 900, color: accent.badgeColor, lineHeight: 1 }}>{state?.currentStock ?? '-'}</div>
                    </div>
                </div>

                <div style={{ borderRadius: '16px', background: '#f8fafc', padding: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Modelo</div>
                    <div style={{ marginTop: '4px', fontSize: '15px', fontWeight: 800, color: '#0f172a', lineHeight: 1.25 }}>
                        {patient.origin === 'Própria'
                            ? (isDirectFamilySupplyPatient(patient)
                                ? 'No quarto'
                                : (diaperInventoryById.get(patient.diaperId)?.name || getInventoryItemConfig(patient.diaperId)?.name || 'Própria'))
                            : (diaperInventoryById.get(patient.diaperId)?.name || getInventoryItemConfig(patient.diaperId)?.name || 'Sem modelo')}
                    </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {missing > 0 ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 10px', borderRadius: '14px', background: '#fff7ed', color: '#c2410c', fontSize: '13px', fontWeight: 800 }}>
                            {`Faltam ${missing}`}
                        </div>
                    ) : null}
                    {state?.checkedToday ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 10px', borderRadius: '14px', background: '#f0fdf4', color: '#15803d', fontSize: '13px', fontWeight: 800 }}>
                            {`${isHistoricalDate ? 'Repostas na data' : 'Repostas hoje'}: ${state?.replenishedToday ?? 0}`}
                        </div>
                    ) : null}
                    {state?.checkedToday && missing === 0 ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 10px', borderRadius: '14px', background: '#eff6ff', color: '#1d4ed8', fontSize: '13px', fontWeight: 800 }}>
                            Completo
                        </div>
                    ) : null}
                    {!state?.checkedToday ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 10px', borderRadius: '14px', background: '#f8fafc', color: '#64748b', fontSize: '13px', fontWeight: 800 }}>
                            Por conferir
                        </div>
                    ) : null}
                </div>

                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                    {!state?.checkedToday && 'Abrir para conferir'}
                    {state?.checkedToday && missing > 0 && (isDirectFamilySupplyPatient(patient) ? 'Abrir para confirmar' : `Abrir para repor ${missing}`)}
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
                        <div>
                            <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>{group.label}</div>
                            <div style={{ marginTop: '4px', fontSize: '12px', fontWeight: 800, color: '#64748b' }}>
                                Tem agora: {group.currentStockTotal} | {isHistoricalDate ? 'Repostas na data' : 'Repostas hoje'}: {group.replenishedToday}
                            </div>
                        </div>
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
                            Primeiro conte o que está no armário. Depois o sistema mostra exatamente o que falta recolher para repor.
                        </p>
                    </div>

                    <div style={{ background: 'white', borderRadius: '18px', padding: '14px 16px', border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)', marginBottom: '16px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: '12px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Data da reposição</div>
                            <div style={{ marginTop: '4px', fontSize: '16px', fontWeight: 900, color: '#0f172a' }}>
                                {isHistoricalDate ? `Modo retroativo: ${selectedDate}` : `Hoje: ${selectedDate}`}
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <input
                                type="date"
                                value={selectedDate}
                                max={todayPlanStr}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                style={{ padding: '12px 14px', borderRadius: '14px', border: '1px solid #cbd5e1', fontWeight: 800, color: '#0f172a', background: 'white' }}
                            />
                            {isHistoricalDate ? (
                                <div style={{ padding: '10px 12px', borderRadius: '14px', background: '#fff7ed', color: '#c2410c', fontSize: '13px', fontWeight: 800 }}>
                                    Registo histórico: não desconta novamente do depósito nem altera o stock atual.
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {toast && (
                        <div style={{ background: '#DCFCE7', color: '#166534', padding: '16px', borderRadius: '16px', fontSize: '1rem', marginBottom: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                            <CheckCircle2 size={20} /> {toast}
                        </div>
                    )}

                    <div style={{ background: 'white', borderRadius: '24px', padding: '16px 18px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.05)', marginBottom: '16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
                            <div style={{ minWidth: 0, paddingRight: '8px', borderRight: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Por conferir</div>
                                <div style={{ marginTop: '4px', fontSize: '30px', fontWeight: 900, color: '#ef4444', lineHeight: 1 }}>{summaryTotals.pending}</div>
                            </div>
                            <div style={{ minWidth: 0, padding: '0 8px', borderRight: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>{isHistoricalDate ? 'Conferidos na data' : 'Conferidos hoje'}</div>
                                <div style={{ marginTop: '4px', fontSize: '30px', fontWeight: 900, color: '#0284c7', lineHeight: 1 }}>{summaryTotals.checked}</div>
                            </div>
                            <div style={{ minWidth: 0, paddingLeft: '8px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Fraldas em falta</div>
                                <div style={{ marginTop: '4px', fontSize: '30px', fontWeight: 900, color: '#15803d', lineHeight: 1 }}>{summaryTotals.missing}</div>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <button
                            type="button"
                            onClick={() => setShowFlowGuide((prev) => !prev)}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '12px',
                                padding: '14px 16px',
                                borderRadius: '18px',
                                border: '1px solid #dbeafe',
                                background: '#f8fbff',
                                color: '#0f172a',
                                cursor: 'pointer',
                                fontWeight: 900
                            }}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <ClipboardList size={18} color="#1d4ed8" />
                                Regra de conferência e reposição
                            </span>
                            <ChevronDown size={18} style={{ transform: showFlowGuide ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.18s ease' }} />
                        </button>

                        {showFlowGuide && (
                            <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                                <div style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', borderRadius: '18px', padding: '14px', border: '1px solid #bfdbfe' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <ClipboardList size={18} color="#1d4ed8" />
                                        <div style={{ fontSize: '15px', fontWeight: 900, color: '#1e3a8a' }}>1. Conferir</div>
                                    </div>
                                    <div style={{ color: '#1e40af', fontSize: '13px', fontWeight: 700 }}>Abra o utente e confira do piso 0 ao piso 2.</div>
                                </div>
                                <div style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #dcfce7 100%)', borderRadius: '18px', padding: '14px', border: '1px solid #bbf7d0' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <Package2 size={18} color="#15803d" />
                                        <div style={{ fontSize: '15px', fontWeight: 900, color: '#166534' }}>2. Repor</div>
                                    </div>
                                    <div style={{ color: '#166534', fontSize: '13px', fontWeight: 700 }}>Depois reponha de cima para baixo, começando no piso 2.</div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ background: 'white', borderRadius: '24px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.05)', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
                            <div style={{ fontSize: '19px', fontWeight: 900, color: '#0f172a' }}>Recolher para reposição</div>
                            <button
                                type="button"
                                onClick={handleReplenishAll}
                                disabled={patientSections.ready.length === 0}
                                style={{
                                    padding: '12px 16px',
                                    borderRadius: '14px',
                                    border: 'none',
                                    background: patientSections.ready.length > 0 ? '#16a34a' : '#94a3b8',
                                    color: 'white',
                                    fontWeight: 900,
                                    cursor: patientSections.ready.length > 0 ? 'pointer' : 'not-allowed'
                                }}
                            >
                                Repor tudo
                            </button>
                        </div>

                        {depotPickupSummary.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                                    {depotPickupSummary.map((item) => (
                                        <div key={item.id} style={{ background: '#f8fafc', borderRadius: '18px', padding: '16px', border: '1px solid #e2e8f0' }}>
                                            <div style={{ fontSize: '13px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Modelo</div>
                                            <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>{item.name}</div>
                                            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
                                                <div>
                                                    <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 700 }}>Total</div>
                                                    <div style={{ fontSize: '30px', fontWeight: 900, color: '#15803d', lineHeight: 1 }}>{item.amount}</div>
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>
                                                    Depósito: {item.stockDepot ?? '-'}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {groupedDepotPickupSummary.map((floor) => (
                                        <div key={floor.id} style={{ background: '#f8fafc', borderRadius: '18px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                            <button
                                                type="button"
                                                onClick={() => togglePickupSection(`pickup-${floor.id}`)}
                                                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '14px 16px', background: 'transparent', border: 'none', cursor: 'pointer' }}
                                            >
                                                <div style={{ textAlign: 'left' }}>
                                                    <div style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a' }}>{floor.label}</div>
                                                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#64748b' }}>
                                                        {floor.items.reduce((sum, item) => sum + item.amount, 0)} fraldas no total
                                                    </div>
                                                </div>
                                                <ChevronDown size={18} style={{ transform: expandedPickupSections[`pickup-${floor.id}`] ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.18s ease' }} />
                                            </button>

                                            {expandedPickupSections[`pickup-${floor.id}`] && (
                                                <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                    {floor.items.map((item) => (
                                                        <div key={`${floor.id}-${item.id}`} style={{ background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '12px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '8px' }}>
                                                                <div style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a' }}>{item.name}</div>
                                                                <div style={{ fontSize: '14px', fontWeight: 900, color: '#15803d' }}>{item.amount}</div>
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                                {item.patients.map((patient) => (
                                                                    <div key={patient.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                                                                        <span>{patient.name}</span>
                                                                        <span style={{ color: '#15803d' }}>{patient.amount}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div style={{ background: '#f8fafc', borderRadius: '18px', padding: '18px', color: '#475569', fontWeight: 700 }}>
                                Ainda não há necessidades do depósito. Comece pela conferência dos quartos.
                            </div>
                        )}

                        {groupedOwnSupplySummary.length > 0 && (
                            <div style={{ marginTop: '16px', background: '#fff7ed', borderRadius: '18px', padding: '16px', border: '1px solid #fed7aa' }}>
                                <div style={{ fontSize: '14px', fontWeight: 900, color: '#c2410c', marginBottom: '8px' }}>Fraldas próprias do utente</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {groupedOwnSupplySummary.map((floor) => (
                                        <div key={floor.id} style={{ background: '#fffbeb', borderRadius: '16px', border: '1px solid #fed7aa', overflow: 'hidden' }}>
                                            <button
                                                type="button"
                                                onClick={() => togglePickupSection(`own-${floor.id}`)}
                                                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '14px 16px', background: 'transparent', border: 'none', cursor: 'pointer' }}
                                            >
                                                <div style={{ textAlign: 'left' }}>
                                                    <div style={{ fontSize: '15px', fontWeight: 900, color: '#7c2d12' }}>{floor.label}</div>
                                                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#9a3412' }}>
                                                        {floor.items.reduce((sum, entry) => sum + Number(entry.state.missingToTarget || 0), 0)} fraldas em falta
                                                    </div>
                                                </div>
                                                <ChevronDown size={18} style={{ transform: expandedPickupSections[`own-${floor.id}`] ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.18s ease' }} />
                                            </button>

                                            {expandedPickupSections[`own-${floor.id}`] && (
                                                <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {floor.items.map(({ patient, state }) => {
                                                        const ownModel = diaperInventoryById.get(patient.diaperId)?.name || getInventoryItemConfig(patient.diaperId)?.name || 'Fralda própria';
                                                        const backupModel = patient.backupDiaperId
                                                            ? (diaperInventoryById.get(patient.backupDiaperId)?.name || getInventoryItemConfig(patient.backupDiaperId)?.name || '')
                                                            : '';
                                                        if (isDirectFamilySupplyPatient(patient)) {
                                                            return (
                                                                <div key={patient.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', background: 'white', border: '1px solid #fed7aa', borderRadius: '14px', padding: '10px 12px' }}>
                                                                    <div style={{ color: '#7c2d12', fontWeight: 900 }}>{patient.name}</div>
                                                                    <div style={{ color: '#9a3412', fontWeight: 800 }}>Confirmar com a família</div>
                                                                </div>
                                                            );
                                                        }
                                                        return (
                                                            <div key={patient.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', background: 'white', border: '1px solid #fed7aa', borderRadius: '14px', padding: '10px 12px' }}>
                                                                <div>
                                                                    <div style={{ color: '#7c2d12', fontWeight: 900 }}>{patient.name}</div>
                                                                    <div style={{ color: '#9a3412', fontWeight: 700, fontSize: '12px', marginTop: '2px' }}>{ownModel}</div>
                                                                    {backupModel ? (
                                                                        <div style={{ color: '#b45309', fontWeight: 700, fontSize: '12px', marginTop: '2px' }}>Se faltar, usar {backupModel}</div>
                                                                    ) : null}
                                                                </div>
                                                                <div style={{ color: '#c2410c', fontWeight: 900, fontSize: '18px', whiteSpace: 'nowrap' }}>Faltam {state.missingToTarget}</div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    ))}
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
                                    {isHistoricalDate ? 'Todos os quartos desta data já foram conferidos.' : 'Todos os quartos já foram conferidos hoje.'}
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
                    style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px' }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: 'white',
                            borderRadius: '24px',
                            width: '100%',
                            maxWidth: '420px',
                            height: 'min(720px, calc(100dvh - 16px))',
                            maxHeight: 'calc(100dvh - 16px)',
                            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden'
                        }}
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

                        <div style={{ padding: '18px 16px 12px', borderBottom: '1px solid #e2e8f0', background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)', flexShrink: 0 }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ display: 'inline-flex', background: '#e0f2fe', color: '#0284c7', padding: '12px', borderRadius: '50%', marginBottom: '10px' }}>
                                    <Box size={24} />
                                </div>
                                <h2 style={{ margin: '0 0 4px 0', fontSize: '22px', color: '#0f172a', lineHeight: 1.1 }}>{replaceModal.name}</h2>
                                <p style={{ margin: 0, color: '#64748b', fontSize: '13px', lineHeight: 1.3 }}>
                                    Conte, escolha a reposição e guarde.
                                </p>
                            </div>
                        </div>

                        <div style={{ padding: '12px 16px 10px', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
                            <div style={{ background: '#eff6ff', borderRadius: '16px', padding: '10px', textAlign: 'center', border: '1px solid #bfdbfe' }}>
                                <div style={{ fontSize: '11px', fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase' }}>Agora</div>
                                <div style={{ fontSize: '24px', fontWeight: 900, color: '#1d4ed8', lineHeight: 1 }}>{currentRoomStock === '' ? '-' : currentRoomStock}</div>
                            </div>
                            <div style={{ background: '#f0fdf4', borderRadius: '16px', padding: '10px', textAlign: 'center', border: '1px solid #bbf7d0' }}>
                                <div style={{ fontSize: '11px', fontWeight: 800, color: '#15803d', textTransform: 'uppercase' }}>Depois</div>
                                <div style={{ fontSize: '24px', fontWeight: 900, color: '#15803d', lineHeight: 1 }}>
                                    {(Number(currentRoomStock) || 0) + (Number(replenishAmount) || 0)}
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSaveReplace} style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
                            <div style={{ padding: '12px 16px 0', overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {isDirectFamilySupplyPatient(replaceModal) ? (
                                <div className={formStyles.formGroup} style={{ marginBottom: '0' }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 900, color: '#475569', marginBottom: '8px', textTransform: 'uppercase' }}>
                                        Fralda própria no quarto
                                    </label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setDirectSupplyStatus('ok')}
                                            style={{ padding: '14px', borderRadius: '14px', border: directSupplyStatus === 'ok' ? '2px solid #16A34A' : '1px solid #CBD5E1', background: directSupplyStatus === 'ok' ? '#DCFCE7' : 'white', color: '#166534', fontWeight: '900', cursor: 'pointer' }}
                                        >
                                            OK, tem fralda
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDirectSupplyStatus('missing')}
                                            style={{ padding: '14px', borderRadius: '14px', border: directSupplyStatus === 'missing' ? '2px solid #DC2626' : '1px solid #CBD5E1', background: directSupplyStatus === 'missing' ? '#FEE2E2' : 'white', color: '#B91C1C', fontWeight: '900', cursor: 'pointer' }}
                                        >
                                            Sem fralda
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className={formStyles.formGroup} style={{ marginBottom: '0' }}>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 900, color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
                                            1. Quantas estão no armário?
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            required
                                            value={currentRoomStock}
                                            onChange={(e) => setCurrentRoomStock(e.target.value)}
                                            onFocus={(e) => e.target.select()}
                                            onClick={(e) => e.target.select()}
                                            inputMode="numeric"
                                            style={{
                                                width: '100%',
                                                padding: '14px',
                                                fontSize: '30px',
                                                textAlign: 'center',
                                                fontWeight: '900',
                                                borderRadius: '16px',
                                                border: '2px solid #cbd5e1',
                                                background: '#f8fafc',
                                                color: '#0f172a'
                                            }}
                                            autoFocus
                                        />
                                    </div>

                                    {currentRoomStock !== '' && (
                                        <>
                                            <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '10px 12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <AlertCircle size={20} color="#0284c7" />
                                                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', lineHeight: 1.25 }}>
                                                    {Number(currentRoomStock) >= TARGET_STOCK
                                                        ? 'Já está com 10 ou mais.'
                                                        : `Faltam ${Math.max(0, TARGET_STOCK - Number(currentRoomStock))} para chegar a 10.`}
                                                </div>
                                            </div>

                                            <div className={formStyles.formGroup} style={{ marginBottom: '0' }}>
                                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 900, color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
                                                    2. Quantas vai repor agora?
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={replenishAmount}
                                                    onChange={(e) => setReplenishAmount(e.target.value)}
                                                    onFocus={(e) => e.target.select()}
                                                    onClick={(e) => e.target.select()}
                                                    inputMode="numeric"
                                                    style={{
                                                        width: '100%',
                                                        padding: '14px',
                                                        fontSize: '30px',
                                                        textAlign: 'center',
                                                        fontWeight: '900',
                                                        borderRadius: '16px',
                                                        border: '2px solid #cbd5e1',
                                                        background: '#fff',
                                                        color: '#0f172a'
                                                    }}
                                                />

                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '6px', marginTop: '8px' }}>
                                                    {[0, Math.max(0, TARGET_STOCK - (Number(currentRoomStock) || 0)), Math.max(0, Math.ceil((TARGET_STOCK - (Number(currentRoomStock) || 0)) / 2))].filter((value, index, arr) => arr.indexOf(value) === index).map((value) => (
                                                        <button
                                                            key={value}
                                                            type="button"
                                                            onClick={() => setReplenishAmount(String(value))}
                                                            style={{
                                                                padding: '10px',
                                                                borderRadius: '12px',
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
                                                <div className={formStyles.formGroup} style={{ marginBottom: '0' }}>
                                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 900, color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
                                                        3. Que fralda vai usar?
                                                    </label>
                                                    <select
                                                        value={selectedReplenishDiaperId}
                                                        onChange={(e) => setSelectedReplenishDiaperId(e.target.value)}
                                                        style={{ width: '100%', padding: '12px', borderRadius: '14px', border: '1px solid #cbd5e1', fontSize: '15px', fontWeight: '800', color: '#0f172a', background: 'white', cursor: 'pointer' }}
                                                    >
                                                    {!selectedReplenishDiaperId && <option value="">Escolha a fralda</option>}
                                                    {getPatientReplenishOptions(replaceModal).map((item) => (
                                                        <option key={item.id} value={item.id}>{item.name} ({item.stockDepot} no depósito)</option>
                                                    ))}
                                                </select>
                                            </div>
                                            )}
                                        </>
                                    )}
                                </>
                            )}
                            </div>

                            <div style={{ padding: '12px 16px 16px', borderTop: '1px solid #e2e8f0', background: 'white', flexShrink: 0 }}>
                                <button
                                    type="submit"
                                    style={{
                                        width: '100%',
                                        padding: '15px',
                                        background: '#0284c7',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '16px',
                                        fontWeight: '900',
                                        fontSize: '18px',
                                        cursor: 'pointer',
                                        boxShadow: '0 6px 16px rgba(2, 132, 199, 0.24)'
                                    }}
                                >
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
