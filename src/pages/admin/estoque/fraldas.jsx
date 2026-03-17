import Head from 'next/head';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import styles from '@/styles/AdminPages.module.css';
import formStyles from '@/styles/Forms.module.css';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import Card from '@/components/ui/Card';
import { useApp } from '@/pages/_app';
import { useData } from '@/contexts/DataContext';
import { DIAPER_INVENTORY_CATALOG, getInventoryItemConfig, getPackSize, getPatientDiaperAssignment, hasExplicitDiaperAssignment, sortDiaperPatientsByPlan, isDirectFamilySupplyPatient } from '@/data/diaperConfig.mjs';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Baby, Plus, X, ArrowLeft, RefreshCw, Box, TableProperties, ChevronLeft, ChevronRight, CheckCircle2, Download, Clock, User } from 'lucide-react';

// Helper for local YYYY-MM-DD
const toISODate = (d) => {
    const copy = new Date(d);
    copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
    return copy.toISOString().split('T')[0];
};

const cloneInventory = (items = []) => items.map((item) => ({ ...item }));
const CUSTOM_DEPOT_OPTION = '__custom__';

const slugifySegment = (value = '') => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const buildInventoryName = ({ diaperKind, diaperSize, origin, patientName }) => {
    const kindLabel = diaperKind === 'cueca-fralda' ? 'Cueca-Fralda' : 'Fraldas';
    const sizeLabel = (diaperSize || '').toUpperCase();
    return origin === 'Própria' && patientName
        ? `${kindLabel} ${sizeLabel} ${patientName}`.trim()
        : `${kindLabel} ${sizeLabel}`.trim();
};

const buildCustomInventoryItem = (form, stockDepot) => {
    const packSize = Number(form.packSize || (form.diaperKind === 'cueca-fralda' ? 14 : 20));
    const safeOrigin = form.origin || 'Própria';
    const safePatientName = (form.patientName || '').trim();
    const safeKind = form.diaperKind || 'fralda';
    const safeSize = (form.diaperSize || '').toUpperCase();

    return {
        id: `${safeOrigin === 'Própria' ? 'propria' : 'casa'}-${slugifySegment(safePatientName || 'geral')}-${slugifySegment(safeKind)}-${slugifySegment(safeSize)}`,
        name: buildInventoryName({
            diaperKind: safeKind,
            diaperSize: safeSize,
            origin: safeOrigin,
            patientName: safePatientName
        }),
        category: 'fralda',
        origin: safeOrigin,
        patientName: safeOrigin === 'Própria' ? safePatientName : null,
        stockDepot: Number(stockDepot || 0),
        packSize,
        diaperKind: safeKind,
        diaperSize: safeSize
    };
};

const serializeInventory = (items = []) => JSON.stringify(
    [...items]
        .map((item) => ({
            id: item.id,
            name: item.name,
            category: item.category,
            origin: item.origin,
            patientName: item.patientName || null,
            stockDepot: Number(item.stockDepot || 0),
            packSize: Number(item.packSize || 0),
            diaperKind: item.diaperKind || null,
            diaperSize: item.diaperSize || null
        }))
        .sort((a, b) => a.id.localeCompare(b.id))
);

const getLogMoment = (log) => new Date(log?.timestamp || `${log?.date || ''}T${log?.time || '00:00'}:00`);

const buildDailyReplenishmentSummary = (logs = []) => {
    if (!logs.length) return null;

    const uniqueLogs = Array.from(new Map(
        logs.map((log) => {
            const signature = [
                log.type,
                log.patientId,
                log.date,
                log.time || '',
                log.timestamp || '',
                log.diaperId || '',
                Number(log.amountAdded || 0),
                Number(log.previousStock ?? 0),
                Number(log.newStock ?? 0),
                log.directSupplyStatus || ''
            ].join('|');
            return [signature, log];
        })
    ).values()).sort((a, b) => getLogMoment(a) - getLogMoment(b));

    const firstLog = uniqueLogs[0];
    const lastLog = uniqueLogs[uniqueLogs.length - 1];
    const positiveReplenishments = uniqueLogs
        .map((log) => Number(log.amountAdded || 0))
        .filter((amount) => amount > 0);

    return {
        ...lastLog,
        previousStock: Number(firstLog.previousStock ?? 0),
        newStock: Number(lastLog.newStock ?? 0),
        amountAdded: positiveReplenishments.reduce((sum, amount) => sum + amount, 0),
        logs: uniqueLogs
    };
};

export default function FraldasPage() {
    const { isAdmin, toggleMode, currentUser } = useApp();
    const router = useRouter();
    const {
        diaperPatients, diaperLogs, inventoryItems,
        addDiaperPatient, deleteDiaperPatient, updateDiaperPatient,
        addDiaperLog, updateDiaperLog,
        addInventoryItem, updateInventoryItem, deleteInventoryItem
    } = useData();

    // TABS
    const [activeTab, setActiveTab] = useState('tabela'); // tabela | deposito | diarias

    // Formulários e Modais
    const [showDepotForm, setShowDepotForm] = useState(false);
    const [depotForm, setDepotForm] = useState({
        name: '',
        stockDepot: '',
        origin: 'Casa',
        patientName: '',
        diaperKind: 'fralda',
        diaperSize: 'M',
        packSize: '20'
    });

    const [showPatientForm, setShowPatientForm] = useState(false);
    const [patientForm, setPatientForm] = useState({ name: '', diaperId: '', origin: 'Casa' });
    const [expandedArrivalItemId, setExpandedArrivalItemId] = useState('');

    const [replaceModal, setReplaceModal] = useState(null); // { patient, date: YYYY-MM-DD }
    const [currentRoomStock, setCurrentRoomStock] = useState('');
    const [replenishAmount, setReplenishAmount] = useState('0');
    const [selectedReplenishDiaperId, setSelectedReplenishDiaperId] = useState('');
    const [directSupplyStatus, setDirectSupplyStatus] = useState('ok');
    const [toast, setToast] = useState('');
    const [draftInventory, setDraftInventory] = useState(null);
    const [savedInventorySnapshot, setSavedInventorySnapshot] = useState(null);

    // Filtro de inventário para fraldas
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

    const inventoryEditorItems = draftInventory ?? diaperInventory;

    const availableCatalogItems = useMemo(() => {
        const existingIds = new Set(inventoryEditorItems.map((item) => item.id));
        return DIAPER_INVENTORY_CATALOG.filter((item) => !existingIds.has(item.id));
    }, [inventoryEditorItems]);

    const selectedDepotCatalogItem = useMemo(
        () => DIAPER_INVENTORY_CATALOG.find((item) => item.id === depotForm.name) || null,
        [depotForm.name]
    );

    const customDepotPreview = useMemo(() => {
        if (depotForm.name !== CUSTOM_DEPOT_OPTION) return null;
        return buildCustomInventoryItem(depotForm, Number(depotForm.stockDepot || 0));
    }, [depotForm]);

    const orderedDiaperPatients = useMemo(() => (
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

    const patientNameOptions = useMemo(
        () => orderedDiaperPatients.map((patient) => patient.name),
        [orderedDiaperPatients]
    );

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

    const inventoryDirty = useMemo(
        () => draftInventory !== null && serializeInventory(draftInventory) !== serializeInventory(diaperInventory),
        [draftInventory, diaperInventory]
    );

    // Gestão da Semana Visível
    const todayStr = toISODate(new Date());
    const [weekOffset, setWeekOffset] = useState(0);
    const [dayOffset, setDayOffset] = useState(0); // Para a aba 'Diárias'
    const [depositUsageDate, setDepositUsageDate] = useState(todayStr);
    const [arrivalForm, setArrivalForm] = useState({ itemId: '', date: todayStr, quantity: '' });
    const [selectedWeeklyOwnSupplyPatientId, setSelectedWeeklyOwnSupplyPatientId] = useState('');

    const selectedDay = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() + dayOffset);
        return d;
    }, [dayOffset]);

    const weekDates = useMemo(() => {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1) + (weekOffset * 7); // Início na segunda-feira
        const monday = new Date(d.setDate(diff));

        const dates = [];
        for (let i = 0; i < 7; i++) {
            const current = new Date(monday);
            current.setDate(monday.getDate() + i);
            dates.push(current);
        }
        return dates;
    }, [weekOffset]);

    // Resumo mensal
    const monthStats = useMemo(() => {
        const stats = {};
        const focusMonthStr = weekDates[0].toISOString().slice(0, 7); // Mês base desta semana focada (ex: 2023-11)

        if (diaperLogs) {
            diaperLogs.forEach(log => {
                if (!log.date) return;

                const logMonthStr = log.date.slice(0, 7);
                if (logMonthStr === focusMonthStr) {
                    if (!stats[log.patientId]) stats[log.patientId] = { added: 0, used: 0 };

                    if (log.type === 'usage') {
                        stats[log.patientId].used += Number(log.amountUsed || 0);
                    } else {
                        stats[log.patientId].added += Number(log.amountAdded || 0);
                    }
                }
            });
        }
        return { stats, focusMonthStr };
    }, [diaperLogs, weekDates]);

    const weeklyHouseUsage = useMemo(() => {
        const totals = new Map();
        const weekDateSet = new Set(weekDates.map((date) => toISODate(date)));
        if (!diaperLogs) return totals;

        diaperLogs
            .filter((log) => log.type === 'replenishment' && weekDateSet.has(log.date))
            .forEach((log) => {
                const diaperItem = diaperInventory.find((item) => item.id === log.diaperId) || getInventoryItemConfig(log.diaperId);
                if (!diaperItem || diaperItem.origin !== 'Casa') return;
                totals.set(diaperItem.id, {
                    id: diaperItem.id,
                    name: diaperItem.name,
                    amount: (totals.get(diaperItem.id)?.amount || 0) + Number(log.amountAdded || 0)
                });
            });

        return [...totals.values()].sort((a, b) => b.amount - a.amount);
    }, [diaperLogs, weekDates, diaperInventory]);

    const weeklyOwnSupplyPatients = useMemo(() => (
        orderedDiaperPatients.filter((patient) => patient.origin === 'Própria' && !isDirectFamilySupplyPatient(patient))
    ), [orderedDiaperPatients]);

    const effectiveWeeklyOwnSupplyPatientId = weeklyOwnSupplyPatients.some((patient) => patient.id === selectedWeeklyOwnSupplyPatientId)
        ? selectedWeeklyOwnSupplyPatientId
        : (weeklyOwnSupplyPatients[0]?.id || '');

    const weeklyOwnSupplyUsage = useMemo(() => {
        if (!effectiveWeeklyOwnSupplyPatientId) return 0;
        const weekDateSet = new Set(weekDates.map((date) => toISODate(date)));
        return (diaperLogs || [])
            .filter((log) => log.type === 'replenishment' && log.patientId === effectiveWeeklyOwnSupplyPatientId && weekDateSet.has(log.date))
            .reduce((sum, log) => sum + Number(log.amountAdded || 0), 0);
    }, [diaperLogs, effectiveWeeklyOwnSupplyPatientId, weekDates]);

    const houseReplenishedTotalByPatient = useMemo(() => {
        const totals = new Map();
        const logsByPatient = new Map();
        const inventoryById = new Map(diaperInventory.map((item) => [item.id, item]));

        (diaperLogs || []).forEach((log) => {
            if (log.type !== 'replenishment' || !log.patientId) return;
            const amountAdded = Number(log.amountAdded || 0);
            if (!Number.isFinite(amountAdded) || amountAdded <= 0) return;
            const diaperItem = inventoryById.get(log.diaperId) || getInventoryItemConfig(log.diaperId);
            if (!diaperItem) return;
            const entries = logsByPatient.get(log.patientId) || [];
            entries.push({
                diaperId: log.diaperId,
                origin: diaperItem.origin,
                amountAdded,
                moment: getLogMoment(log)
            });
            logsByPatient.set(log.patientId, entries);
        });

        orderedDiaperPatients.forEach((patient) => {
            if (patient.origin !== 'Própria') return;

            const ownDiaperIds = new Set(
                diaperInventory
                    .filter((item) => item.origin === 'Própria' && item.patientName === patient.name)
                    .map((item) => item.id)
            );
            if (patient.diaperId) ownDiaperIds.add(patient.diaperId);

            const ownStockNow = [...ownDiaperIds].reduce((sum, diaperId) => {
                const ownItem = inventoryById.get(diaperId) || getInventoryItemConfig(diaperId);
                return sum + Number(ownItem?.stockDepot || 0);
            }, 0);
            if (ownStockNow > 0) return;

            const patientLogs = (logsByPatient.get(patient.id) || []).sort((a, b) => a.moment - b.moment);
            if (!patientLogs.length) return;

            let fallbackStartIndex = 0;
            for (let i = patientLogs.length - 1; i >= 0; i -= 1) {
                if (ownDiaperIds.has(patientLogs[i].diaperId)) {
                    fallbackStartIndex = i + 1;
                    break;
                }
            }

            const totalHouseReplenished = patientLogs
                .slice(fallbackStartIndex)
                .filter((entry) => entry.origin === 'Casa')
                .reduce((sum, entry) => sum + entry.amountAdded, 0);

            if (totalHouseReplenished > 0) {
                totals.set(patient.id, totalHouseReplenished);
            }
        });

        return totals;
    }, [diaperLogs, diaperInventory, orderedDiaperPatients]);

    // Diaper usages of the selected day
    const usagesForSelectedDay = useMemo(() => {
        const dateStr = toISODate(selectedDay);
        if (!diaperLogs) return [];
        return diaperLogs.filter(l => l.type === 'usage' && l.date === dateStr).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }, [diaperLogs, selectedDay]);

    const usageByInventoryForDepositDate = useMemo(() => {
        const totals = new Map();
        if (!diaperLogs) return totals;

        diaperLogs
            .filter((log) => log.type === 'replenishment' && log.date === depositUsageDate && !log.skipDepotAdjustment)
            .forEach((log) => {
                const key = log.diaperId || '';
                totals.set(key, (totals.get(key) || 0) + Number(log.amountAdded || 0));
            });

        return totals;
    }, [diaperLogs, depositUsageDate]);

    const getArrivalHistory = (item) => (
        [...(item?.arrivalHistory || [])]
            .sort((a, b) => new Date(b.date || b.timestamp || 0) - new Date(a.date || a.timestamp || 0))
    );

    const openArrivalHistory = (item) => {
        setExpandedArrivalItemId((current) => current === item.id ? '' : item.id);
        setArrivalForm({
            itemId: item.id,
            date: todayStr,
            quantity: ''
        });
    };

    const handleSaveArrival = async (item) => {
        const quantity = Number(arrivalForm.quantity);
        if (!arrivalForm.date || Number.isNaN(quantity) || quantity <= 0) {
            alert('Indique a data e a quantidade recebida.');
            return;
        }

        const arrivalEntry = {
            id: Date.now().toString(),
            date: arrivalForm.date,
            quantity,
            createdAt: new Date().toISOString(),
            createdBy: currentUser?.name || 'Admin'
        };

        await updateInventoryItem(item.id, {
            stockDepot: Number(item.stockDepot || 0) + quantity,
            arrivalHistory: [...(item.arrivalHistory || []), arrivalEntry]
        });

        setToast(`Chegada registada em ${item.name}: +${quantity}`);
        setTimeout(() => setToast(''), 3000);
        setArrivalForm({ itemId: item.id, date: todayStr, quantity: '' });
    };

    // EXPORT PDF
    const exportPDF = (patient = null) => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.setTextColor(17, 24, 39);
        doc.text(`Relatório Mensal de Fraldas - ${patient ? patient.name : 'Visão Geral'}`, 14, 22);

        doc.setFontSize(11);
        doc.setTextColor(107, 114, 128);
        const focusMonthName = new Date(monthStats.focusMonthStr + '-01').toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
        doc.text(`Mês de Referência: ${focusMonthName}`, 14, 30);
        doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-PT')} às ${new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`, 14, 36);

        let targetPatients = patient ? [patient] : orderedDiaperPatients;
        if (!targetPatients || targetPatients.length === 0) {
            alert("Não há dados para exportar.");
            return;
        }

        const tableColumn = ["Utente", "Fralda Utilizada", "Propriedade", "Total Gasto no Mês"];
        const tableRows = [];

        targetPatients.forEach(p => {
            const diaperType = diaperInventory.find(d => d.id === p.diaperId) || getInventoryItemConfig(p.diaperId);
            const patientStats = monthStats.stats[p.id] || { added: 0, used: 0 };
            const total = Math.max(patientStats.added, patientStats.used); // Use whichever is higher, or just show used if they don't do refills.

            tableRows.push([
                p.name,
                isDirectFamilySupplyPatient(p) ? 'Fralda própria no quarto' : (diaperType ? diaperType.name : 'Sem Fralda'),
                p.origin === 'Própria' ? 'Própria' : 'Casa',
                total + " uni."
            ]);
        });

        doc.autoTable({
            startY: 44,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [0, 113, 227], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 10, cellPadding: 4 },
            didDrawPage: function (data) {
                // Footer
                doc.setFontSize(9);
                doc.text(`Página ${doc.internal.getNumberOfPages()}`, 14, doc.internal.pageSize.getHeight() - 10);
                doc.text(`Villa Mar - Sistema de Gestão Interna`, doc.internal.pageSize.getWidth() - 70, doc.internal.pageSize.getHeight() - 10);
            }
        });

        const filename = patient ? `Relatorio_Fraldas_${patient.name}_${focusMonthName}.pdf` : `Relatorio_Fraldas_Geral_${focusMonthName}.pdf`;
        doc.save(filename.replace(/\s+/g, '_'));
    };

    // HANDLERS DEPÓSITO
    const handleAddDepot = (e) => {
        e.preventDefault();
        if (!depotForm.name.trim()) return;
        const customStock = depotForm.stockDepot === '' ? null : Number(depotForm.stockDepot);
        const source = draftInventory ?? cloneInventory(diaperInventory);
        let selectedCatalogItem = null;

        if (depotForm.name === CUSTOM_DEPOT_OPTION) {
            if (depotForm.origin === 'Própria' && !depotForm.patientName.trim()) {
                alert('Escolha o utente para a referência própria.');
                return;
            }

            selectedCatalogItem = buildCustomInventoryItem(depotForm, Number.isNaN(customStock) || customStock === null ? 0 : customStock);
        } else {
            selectedCatalogItem = DIAPER_INVENTORY_CATALOG.find((item) => item.id === depotForm.name);
            if (!selectedCatalogItem) return;
        }

        const existingIndex = source.findIndex((item) => item.id === selectedCatalogItem.id);
        setDraftInventory((current) => {
            const base = current ?? cloneInventory(diaperInventory);
            const newItem = {
                ...selectedCatalogItem,
                stockDepot: Number.isNaN(customStock) || customStock === null ? (selectedCatalogItem.stockDepot || 0) : customStock
            };

            if (existingIndex >= 0) {
                return base.map((item, index) => (
                    index === existingIndex ? newItem : item
                ));
            }

            return [...base, newItem];
        });
        setDepotForm({ name: '', stockDepot: '', origin: 'Casa', patientName: '', diaperKind: 'fralda', diaperSize: 'M', packSize: '20' });
        setShowDepotForm(false);
    };

    const handleUpdateDepot = (id, change) => {
        const source = draftInventory ?? diaperInventory;
        const item = source.find(i => i.id === id);
        if (!item) return;
        if (item.stockDepot + change < 0) return;
        setDraftInventory((current) => {
            const base = current ?? cloneInventory(diaperInventory);
            return base.map((entry) => (
            entry.id === id ? { ...entry, stockDepot: entry.stockDepot + change } : entry
            ));
        });
    };

    const handleResetInventoryDraft = () => {
        setDraftInventory(null);
        setToast('Alterações do stock descartadas.');
        setTimeout(() => setToast(''), 3000);
    };

    const handleSaveInventory = async () => {
        const workingDraft = draftInventory ?? cloneInventory(diaperInventory);
        const previousLive = cloneInventory(diaperInventory);
        const currentById = new Map(diaperInventory.map((item) => [item.id, item]));
        const draftById = new Map(workingDraft.map((item) => [item.id, item]));

        for (const existing of diaperInventory) {
            if (!draftById.has(existing.id)) {
                await deleteInventoryItem(existing.id);
            }
        }

        for (const draftItem of workingDraft) {
            const currentItem = currentById.get(draftItem.id);
            if (!currentItem) {
                await addInventoryItem(draftItem);
                continue;
            }

            const draftPayload = {
                name: draftItem.name,
                category: draftItem.category,
                origin: draftItem.origin,
                patientName: draftItem.patientName || null,
                stockDepot: Number(draftItem.stockDepot || 0),
                packSize: Number(draftItem.packSize || 0),
                diaperKind: draftItem.diaperKind || null,
                diaperSize: draftItem.diaperSize || null
            };

            const currentPayload = {
                name: currentItem.name,
                category: currentItem.category,
                origin: currentItem.origin,
                patientName: currentItem.patientName || null,
                stockDepot: Number(currentItem.stockDepot || 0),
                packSize: Number(currentItem.packSize || 0),
                diaperKind: currentItem.diaperKind || null,
                diaperSize: currentItem.diaperSize || null
            };

            if (JSON.stringify(draftPayload) !== JSON.stringify(currentPayload)) {
                await updateInventoryItem(draftItem.id, draftPayload);
            }
        }

        setSavedInventorySnapshot(previousLive);
        setDraftInventory(null);
        setToast('Stock guardado com sucesso.');
        setTimeout(() => setToast(''), 3000);
    };

    const handleRestorePreviousInventory = async () => {
        if (!savedInventorySnapshot) return;

        const snapshot = cloneInventory(savedInventorySnapshot);
        const currentLive = cloneInventory(diaperInventory);
        setSavedInventorySnapshot(currentLive);

        const currentById = new Map(diaperInventory.map((item) => [item.id, item]));
        const snapshotById = new Map(snapshot.map((item) => [item.id, item]));

        for (const existing of diaperInventory) {
            if (!snapshotById.has(existing.id)) {
                await deleteInventoryItem(existing.id);
            }
        }

        for (const item of snapshot) {
            if (!currentById.has(item.id)) {
                await addInventoryItem(item);
            } else {
                await updateInventoryItem(item.id, {
                    name: item.name,
                    category: item.category,
                    origin: item.origin,
                    patientName: item.patientName || null,
                    stockDepot: Number(item.stockDepot || 0),
                    packSize: Number(item.packSize || 0),
                    diaperKind: item.diaperKind || null,
                    diaperSize: item.diaperSize || null
                });
            }
        }

        setDraftInventory(null);
        setToast('Stock anterior restaurado.');
        setTimeout(() => setToast(''), 3000);
    };

    // HANDLERS PACIENTES
    const handleAddPatient = (e) => {
        e.preventDefault();
        if (!patientForm.name.trim() || !patientForm.diaperId) return;
        addDiaperPatient({
            name: patientForm.name.trim(),
            diaperId: patientForm.diaperId,
            origin: patientForm.origin || 'Casa'
        });
        setPatientForm({ name: '', diaperId: '', origin: 'Casa' });
        setShowPatientForm(false);
    };

    // HANDLERS REPOSIÇÃO
    const closeReplaceModal = () => {
        setReplaceModal(null);
        setCurrentRoomStock('');
        setReplenishAmount('0');
        setSelectedReplenishDiaperId('');
        setDirectSupplyStatus('ok');
    };

    const openReplaceModal = (patient, date, existingLog = null) => {
        setReplaceModal({ patient, date, existingLog });
        setCurrentRoomStock(existingLog ? String(existingLog.previousStock ?? 0) : '');
        setReplenishAmount(existingLog ? String(existingLog.amountAdded ?? 0) : '0');
        setSelectedReplenishDiaperId(existingLog?.diaperId || patient.diaperId || '');
        setDirectSupplyStatus(existingLog?.directSupplyStatus || 'ok');
    };

    const handleReplaceSubmit = (e) => {
        e.preventDefault();
        const patient = replaceModal.patient;
        const actionDateStr = replaceModal.date;
        const existingLog = replaceModal.existingLog;
        const isDirectSupply = isDirectFamilySupplyPatient(patient);
        const currentInRoom = Number(currentRoomStock);
        const amountToReplenish = Number(replenishAmount);

        if (isDirectSupply) {
            const stockValue = directSupplyStatus === 'ok' ? 10 : 0;
            const logPayload = {
                type: 'replenishment',
                patientId: patient.id,
                patientName: patient.name,
                diaperId: '',
                diaperName: 'Fralda própria no quarto',
                date: actionDateStr,
                time: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
                amountAdded: 0,
                previousStock: stockValue,
                newStock: stockValue,
                directSupplyStatus,
                executorId: currentUser?.id || 'admin',
                executorName: currentUser?.name || 'Admin',
            };

            if (existingLog) {
                updateDiaperLog(existingLog.id, {
                    ...logPayload,
                    editedAt: new Date().toISOString(),
                    editedById: currentUser?.id || 'admin',
                    editedByName: currentUser?.name || 'Admin',
                    editHistory: [
                        ...(existingLog.editHistory || []),
                        {
                            editedAt: new Date().toISOString(),
                            editedById: currentUser?.id || 'admin',
                            editedByName: currentUser?.name || 'Admin',
                            previousStock: existingLog.previousStock ?? null,
                            amountAdded: existingLog.amountAdded ?? null,
                            newStock: existingLog.newStock ?? null,
                            directSupplyStatus: existingLog.directSupplyStatus ?? null
                        }
                    ]
                });
            } else {
                addDiaperLog(logPayload);
            }
            updateDiaperPatient(patient.id, {
                wardrobeStock: stockValue,
                hasAnomaly: directSupplyStatus !== 'ok',
                currentWardrobeDiaperId: '',
                currentWardrobeDiaperName: '',
                currentWardrobeOrigin: 'Própria'
            });
            closeReplaceModal();
            return;
        }

        if (Number.isNaN(currentInRoom) || currentInRoom < 0) {
            alert("A quantidade no quarto deve ser 0 ou superior.");
            return;
        }

        if (Number.isNaN(amountToReplenish) || amountToReplenish < 0) {
            alert("A quantidade a repor deve ser 0 ou superior.");
            return;
        }

        const diaperType = diaperInventory.find((item) => item.id === selectedReplenishDiaperId) || getInventoryItemConfig(selectedReplenishDiaperId);
        const shouldAdjustInventory = amountToReplenish > 0 && Boolean(diaperType);
        const previousDiaperType = existingLog?.diaperId
            ? (diaperInventory.find((item) => item.id === existingLog.diaperId) || getInventoryItemConfig(existingLog.diaperId))
            : null;
        if (amountToReplenish > 0 && !diaperType) {
            alert('Tipo de fralda não encontrado! Verifique o depósito.');
            return;
        }

        const requiredAmount = amountToReplenish;
        const inventoryAvailable = (() => {
            if (!shouldAdjustInventory) return 0;
            if (!existingLog || existingLog.skipDepotAdjustment || !previousDiaperType) return Number(diaperType.stockDepot || 0);
            if (previousDiaperType.id === diaperType.id) {
                return Number(diaperType.stockDepot || 0) + Number(existingLog.amountAdded || 0);
            }
            return Number(diaperType.stockDepot || 0);
        })();

        if (shouldAdjustInventory && inventoryAvailable < requiredAmount) {
            alert(`Falta estoque no depósito! Há apenas ${diaperType.stockDepot} de ${diaperType.name}.`);
            return;
        }

        const finalStock = currentInRoom + amountToReplenish;

        // Subtrai do depósito se for preciso adicionar
        if (existingLog && !existingLog.skipDepotAdjustment && previousDiaperType && Number(existingLog.amountAdded || 0) > 0) {
            const restoredStock = Number(previousDiaperType.stockDepot || 0) + Number(existingLog.amountAdded || 0);
            updateInventoryItem(previousDiaperType.id, { stockDepot: restoredStock });
        }

        if (shouldAdjustInventory && !existingLog?.skipDepotAdjustment) {
            const nextStock = previousDiaperType?.id === diaperType.id
                ? inventoryAvailable - requiredAmount
                : Number(diaperType.stockDepot || 0) - requiredAmount;
            updateInventoryItem(diaperType.id, { stockDepot: nextStock });
        }

        const logPayload = {
            type: 'replenishment',
            patientId: patient.id,
            patientName: patient.name,
            diaperId: diaperType?.id || '',
            diaperName: diaperType?.name || '',
            date: actionDateStr,
            time: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
            amountAdded: requiredAmount,
            previousStock: currentInRoom,
            newStock: finalStock,
            executorId: currentUser?.id || 'admin',
            executorName: currentUser?.name || 'Admin',
        };

        if (existingLog) {
            updateDiaperLog(existingLog.id, {
                ...logPayload,
                editedAt: new Date().toISOString(),
                editedById: currentUser?.id || 'admin',
                editedByName: currentUser?.name || 'Admin',
                editHistory: [
                    ...(existingLog.editHistory || []),
                    {
                        editedAt: new Date().toISOString(),
                        editedById: currentUser?.id || 'admin',
                        editedByName: currentUser?.name || 'Admin',
                        previousStock: existingLog.previousStock ?? null,
                        amountAdded: existingLog.amountAdded ?? null,
                        newStock: existingLog.newStock ?? null,
                        diaperId: existingLog.diaperId ?? null,
                        diaperName: existingLog.diaperName ?? null
                    }
                ]
            });
        } else {
            addDiaperLog(logPayload);
        }

        updateDiaperPatient(patient.id, {
            wardrobeStock: finalStock,
            hasAnomaly: false,
            currentWardrobeDiaperId: diaperType?.id || (patient.currentWardrobeDiaperId || patient.diaperId || ''),
            currentWardrobeDiaperName: diaperType?.name || patient.currentWardrobeDiaperName || '',
            currentWardrobeOrigin: diaperType?.origin || patient.currentWardrobeOrigin || patient.origin || ''
        });

        closeReplaceModal();
    };

    return (
        <>
            <Head>
                <title>Fraldas - Admin Villa Mar</title>
            </Head>

            <Header user={currentUser} isAdmin={isAdmin} onModeSwitch={toggleMode} />
            <Sidebar isAdmin={true} />
            <BottomNav isAdmin={true} />

            <main className={styles.main}>
                <div className={styles.container}>
                    {/* Header Principal */}
                    <div className={styles.pageHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <button
                                onClick={() => router.push('/admin/estoque')}
                                style={{ background: '#F3F4F6', border: 'none', padding: '10px', borderRadius: '12px', cursor: 'pointer', display: 'flex' }}
                            >
                                <ArrowLeft size={20} color="#4B5563" />
                            </button>
                            <h1 className={styles.pageTitle} style={{ margin: 0 }}>
                                <Baby size={28} />
                                Planeamento de Fraldas
                            </h1>
                        </div>
                    </div>

                    {toast && (
                        <div style={{ background: '#DCFCE7', color: '#166534', padding: '16px', borderRadius: '14px', fontSize: '15px', marginBottom: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                            <CheckCircle2 size={18} /> {toast}
                        </div>
                    )}

                    {/* Menu Pivot */}
                    <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #E5E7EB', marginBottom: '24px' }}>
                        <button
                            onClick={() => setActiveTab('tabela')}
                            style={{ padding: '12px 20px', border: 'none', background: 'transparent', cursor: 'pointer', borderBottom: activeTab === 'tabela' ? '3px solid #0071E3' : '3px solid transparent', fontWeight: activeTab === 'tabela' ? 700 : 500, color: activeTab === 'tabela' ? '#0071E3' : '#6B7280', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <TableProperties size={18} /> Reposição Semanal
                        </button>
                        <button
                            onClick={() => setActiveTab('diarias')}
                            style={{ padding: '12px 20px', border: 'none', background: 'transparent', cursor: 'pointer', borderBottom: activeTab === 'diarias' ? '3px solid #0071E3' : '3px solid transparent', fontWeight: activeTab === 'diarias' ? 700 : 500, color: activeTab === 'diarias' ? '#0071E3' : '#6B7280', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <Clock size={18} /> Fraldas Usadas no Dia
                        </button>
                        <button
                            onClick={() => setActiveTab('deposito')}
                            style={{ padding: '12px 20px', border: 'none', background: 'transparent', cursor: 'pointer', borderBottom: activeTab === 'deposito' ? '3px solid #0071E3' : '3px solid transparent', fontWeight: activeTab === 'deposito' ? 700 : 500, color: activeTab === 'deposito' ? '#0071E3' : '#6B7280', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <Box size={18} /> Central do Depósito
                        </button>
                    </div>

                    {/* ---- ABA RELATÓRIO/TABELA SEMANAL ---- */}
                    {activeTab === 'tabela' && (
                        <div>
                            {/* Controlos e Funcionalidades Adicionais */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'white', padding: '6px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                    <button onClick={() => setWeekOffset(w => w - 1)} style={{ background: 'transparent', border: 'none', padding: '6px', cursor: 'pointer', display: 'flex' }} title="Semana Anterior">
                                        <ChevronLeft size={20} color="#4B5563" />
                                    </button>
                                    <span style={{ fontWeight: 600, fontSize: '14px', color: '#111827', minWidth: '150px', textAlign: 'center' }}>
                                        {weekDates[0].toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })} - {weekDates[6].toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
                                    </span>
                                    <button onClick={() => setWeekOffset(w => w + 1)} style={{ background: 'transparent', border: 'none', padding: '6px', cursor: 'pointer', display: 'flex' }} title="Semana Seguinte">
                                        <ChevronRight size={20} color="#4B5563" />
                                    </button>
                                    <button onClick={() => setWeekOffset(0)} style={{ background: '#F3F4F6', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: '#4B5563', marginLeft: '8px' }}>
                                        Hoje
                                    </button>
                                </div>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button
                                        onClick={() => exportPDF()}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', border: '1px solid #D1D5DB', padding: '8px 16px', borderRadius: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#374151', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                                    >
                                        <Download size={16} /> Relatório Geral Mensal
                                    </button>
                                    <button className={styles.primaryButton} onClick={() => setShowPatientForm(!showPatientForm)} style={{ padding: '8px 16px' }}>
                                        {showPatientForm ? <X size={16} /> : <Plus size={16} />}
                                        <span style={{ fontSize: '14px' }}>{showPatientForm ? 'Fechar Tab' : 'Novo Utente'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Mostrar formulário se necessário */}
                            {showPatientForm && (
                                <Card className={formStyles.formCard} padding="lg" style={{ marginBottom: '24px' }}>
                                    <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem' }}>Configurar Rotina do Utente</h3>
                                    <form onSubmit={handleAddPatient} className={formStyles.form}>
                                        <div className={formStyles.rowFormGroup}>
                                            <div className={formStyles.formGroup} style={{ flex: 1 }}>
                                                <label>Nome do Utente *</label>
                                                <input type="text" value={patientForm.name} onChange={e => setPatientForm({ ...patientForm, name: e.target.value })} required placeholder="Ex: Sr. Joaquim" />
                                            </div>
                                            <div className={formStyles.formGroup} style={{ flex: 1 }}>
                                                <label>Tamanho Associado (Depósito) *</label>
                                                <select value={patientForm.diaperId} onChange={e => setPatientForm({ ...patientForm, diaperId: e.target.value })} required >
                                                    <option value="">Selecione o tamanho</option>
                                                    {diaperInventory.map(d => (
                                                        <option key={d.id} value={d.id}>{d.name} ({d.stockDepot} disponíveis)</option>
                                                    ))}
                                                </select>
                                                {diaperInventory.length === 0 && (
                                                    <small style={{ color: '#EF4444', display: 'block', marginTop: '6px' }}>Vá à central do depósito primeiro.</small>
                                                )}
                                            </div>
                                            <div className={formStyles.formGroup} style={{ flex: 1 }}>
                                                <label>Propriedade da Fralda *</label>
                                                <select value={patientForm.origin} onChange={e => setPatientForm({ ...patientForm, origin: e.target.value })} required>
                                                    <option value="Casa">Fornecido pela Casa</option>
                                                    <option value="Própria">Própria do Utente</option>
                                                </select>
                                            </div>
                                        </div>
                                        <button type="submit" className={formStyles.btnPrimary} style={{ width: '100%', justifyContent: 'center' }}>Adicionar Registo</button>
                                    </form>
                                </Card>
                            )}

                            {/* A Tabela Robusta em Container SCROLL para mobile */}
                            <div className={styles.tableWrapper} style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E5E7EB', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px', tableLayout: 'fixed' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ padding: '16px', textAlign: 'left', borderBottom: '2px solid #E5E7EB', width: '200px' }}>Utente</th>
                                            {weekDates.map(d => (
                                                <th key={d.toISOString()} style={{ padding: '16px 8px', textAlign: 'center', borderBottom: '2px solid #E5E7EB', background: toISODate(d) === todayStr ? '#FEF9C3' : 'transparent', width: '100px' }}>
                                                    <div style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                        {d.toLocaleDateString('pt-PT', { weekday: 'short' })}
                                                    </div>
                                                    <div style={{ fontSize: '15px', color: '#111827', marginTop: '4px' }}>
                                                        {d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}
                                                    </div>
                                                </th>
                                            ))}
                                            <th style={{ padding: '16px', textAlign: 'center', borderBottom: '2px solid #E5E7EB', background: '#F9FAFB', borderLeft: '1px solid #E5E7EB', width: '120px' }}>
                                                <div style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase' }}>Consumo</div>
                                                <div style={{ fontSize: '14px', color: '#111827', marginTop: '4px' }}>
                                                    {new Date(monthStats.focusMonthStr + '-01').toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
                                                </div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orderedDiaperPatients && orderedDiaperPatients.length > 0 ? orderedDiaperPatients.map(patient => {
                                            const diaperType = diaperInventory.find(d => d.id === patient.diaperId) || getInventoryItemConfig(patient.diaperId);
                                            const isDirectSupply = isDirectFamilySupplyPatient(patient);
                                            const totalHouseReplenished = Number(houseReplenishedTotalByPatient.get(patient.id) || 0);

                                            return (
                                                <tr key={patient.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                                                    <td style={{ padding: '16px', borderRight: '1px solid #F3F4F6' }}>
                                                        <strong style={{ display: 'block', fontSize: '15px', color: '#111827' }}>{patient.name}</strong>
                                                        <span style={{ fontSize: '12px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                                                            {diaperType ? (
                                                                <>
                                                                    <Baby size={12} />
                                                                    <span>{diaperType.name}</span>
                                                                    <span style={{ fontWeight: 800, color: diaperType.stockDepot < 20 ? '#EF4444' : '#16A34A', marginLeft: '4px' }}>
                                                                        ({diaperType.stockDepot} no depósito)
                                                                    </span>
                                                                </>
                                                            ) : isDirectSupply ? (
                                                                <>
                                                                    <Baby size={12} />
                                                                    <span>Fralda própria no quarto</span>
                                                                </>
                                                            ) : (
                                                                <span style={{ color: '#EF4444', fontWeight: 600 }}>Falta Configurar Fralda</span>
                                                            )}
                                                            {patient.origin === 'Própria' && (
                                                                <span style={{ background: '#E0F2FE', color: '#0369A1', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800, marginLeft: '4px' }}>PRÓPRIA</span>
                                                            )}
                                                        </span>
                                                        {patient.origin === 'Própria' && totalHouseReplenished > 0 && (
                                                            <div style={{ marginTop: '6px', fontSize: '11px', fontWeight: 800, color: '#B91C1C' }}>
                                                                Quantidade de fraldas da casa repostas no total: {totalHouseReplenished}
                                                            </div>
                                                        )}
                                                    </td>

                                                    {weekDates.map(d => {
                                                        const dateStr = toISODate(d);
                                                        const isFuture = dateStr > todayStr;

                                                        const dayLogs = diaperLogs?.filter(l => l.patientId === patient.id && l.date === dateStr) || [];
                                                        const refillLog = buildDailyReplenishmentSummary(dayLogs.filter((log) => log.type === 'replenishment'));

                                                        return (
                                                            <td key={dateStr} style={{ padding: '12px 8px', textAlign: 'center', background: dateStr === todayStr ? '#FEFCE8' : 'transparent', borderRight: '1px solid #F3F4F6', verticalAlign: 'middle' }}>
                                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                                                    {refillLog ? (
                                                                        <button
                                                                            type="button"
                                                                            title={`Confirmado por ${refillLog.executorName || 'Admin'}`}
                                                                            onClick={() => openReplaceModal(patient, dateStr, refillLog)}
                                                                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', background: 'transparent', border: 'none', padding: 0 }}
                                                                        >
                                                                            {refillLog.directSupplyStatus === 'missing' ? (
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: '#FEE2E2', color: '#B91C1C', padding: '4px 10px', borderRadius: '12px', fontWeight: 700, fontSize: '13px' }}>
                                                                                    Sem fralda
                                                                                </div>
                                                                            ) : (
                                                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '10px', minWidth: '88px' }}>
                                                                                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B' }}>
                                                                                        Tinha: <span style={{ color: '#0F172A' }}>{Number(refillLog.previousStock || 0)}</span>
                                                                                    </div>
                                                                                    <div style={{ fontSize: '12px', fontWeight: 900, color: '#166534' }}>
                                                                                        Tem: {Number(refillLog.newStock || 0)}
                                                                                    </div>
                                                                                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#0284C7' }}>
                                                                                        Repostas: {Number(refillLog.amountAdded || 0)}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                            <span style={{ fontSize: '11px', color: '#6B7280', marginTop: '6px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                                                <CheckCircle2 size={10} color="#166534" />
                                                                                {refillLog.timestamp ? new Date(refillLog.timestamp).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : (refillLog.time || '')}
                                                                            </span>
                                                                        </button>
                                                                    ) : isFuture ? (
                                                                        <span style={{ color: '#D1D5DB' }}>-</span>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => openReplaceModal(patient, dateStr)}
                                                                            style={{ border: '1px dashed #9CA3AF', background: 'white', color: '#4B5563', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', width: '100%', transition: 'all 0.2s' }}
                                                                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#0071E3'; e.currentTarget.style.color = '#0071E3'; }}
                                                                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#9CA3AF'; e.currentTarget.style.color = '#4B5563'; }}
                                                                        >
                                                                            {isDirectSupply ? 'OK' : 'Registar'}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        )
                                                    })}

                                                    <td style={{ padding: '16px', textAlign: 'center', background: '#F9FAFB', borderLeft: '1px solid #E5E7EB', verticalAlign: 'middle' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                                            <span style={{ fontSize: '20px', fontWeight: 800, color: '#111827' }}>
                                                                {Math.max((monthStats.stats[patient.id]?.added || 0), (monthStats.stats[patient.id]?.used || 0))}
                                                            </span>
                                                            <span style={{ fontSize: '11px', color: '#6B7280', marginBottom: '8px' }}>gastas</span>
                                                            <button
                                                                onClick={() => exportPDF(patient)}
                                                                title="Baixar PDF Diste Utente"
                                                                style={{ border: 'none', background: '#E0F2FE', color: '#0284C7', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700 }}
                                                            >
                                                                <Download size={12} /> PDF
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        }) : (
                                            <tr>
                                                <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: '#6B7280' }}>
                                                    Nenhum utente registado para gestão de fraldas.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '14px' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a', marginBottom: '10px', textTransform: 'uppercase' }}>
                                        Fraldas usadas na semana
                                    </div>
                                    {weeklyHouseUsage.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {weeklyHouseUsage.map((item) => (
                                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                                                    <span>{item.name}</span>
                                                    <span style={{ color: '#166534' }}>{item.amount}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 700 }}>Ainda não há consumo da casa nesta semana.</div>
                                    )}
                                </div>

                                <div style={{ background: '#fffaf0', border: '1px solid #fed7aa', borderRadius: '16px', padding: '14px' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 900, color: '#7c2d12', marginBottom: '10px', textTransform: 'uppercase' }}>
                                        Fraldas próprias na semana
                                    </div>
                                    {weeklyOwnSupplyPatients.length > 0 ? (
                                        <>
                                            <select
                                                value={effectiveWeeklyOwnSupplyPatientId}
                                                onChange={(e) => setSelectedWeeklyOwnSupplyPatientId(e.target.value)}
                                                style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid #fdba74', fontSize: '14px', fontWeight: 700, color: '#7c2d12', background: 'white', marginBottom: '10px' }}
                                            >
                                                {weeklyOwnSupplyPatients.map((patient) => (
                                                    <option key={patient.id} value={patient.id}>{patient.name}</option>
                                                ))}
                                            </select>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                                                <span style={{ fontSize: '13px', fontWeight: 800, color: '#9a3412' }}>Usadas nesta semana</span>
                                                <span style={{ fontSize: '24px', fontWeight: 900, color: '#c2410c', lineHeight: 1 }}>{weeklyOwnSupplyUsage}</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div style={{ fontSize: '13px', color: '#9a3412', fontWeight: 700 }}>Ainda não há utentes com fralda própria para resumir.</div>
                                    )}
                                </div>
                            </div>

                            {/* Informativo */}
                            <div style={{ marginTop: '16px', fontSize: '13px', color: '#6B7280', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                <span>💡 <strong>Dica:</strong> Pode adicionar reposições retroativas clicando em &quot;Registar&quot;.</span>
                                <span>🔒 Registo protegido com hora/assinatura exata do funcionário.</span>
                            </div>
                        </div>
                    )}

                    {/* ---- ABA DIÁRIAS (USO) ---- */}
                    {activeTab === 'diarias' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'white', padding: '6px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                    <button onClick={() => setDayOffset(w => w - 1)} style={{ background: 'transparent', border: 'none', padding: '6px', cursor: 'pointer', display: 'flex' }} title="Dia Anterior">
                                        <ChevronLeft size={20} color="#4B5563" />
                                    </button>
                                    <span style={{ fontWeight: 600, fontSize: '14px', color: '#111827', minWidth: '150px', textAlign: 'center' }}>
                                        {selectedDay.toLocaleDateString('pt-PT', { weekday: 'long', day: '2-digit', month: 'long' })}
                                    </span>
                                    <button onClick={() => setDayOffset(w => w + 1)} style={{ background: 'transparent', border: 'none', padding: '6px', cursor: 'pointer', display: 'flex' }} title="Dia Seguinte">
                                        <ChevronRight size={20} color="#4B5563" />
                                    </button>
                                    <button onClick={() => setDayOffset(0)} style={{ background: '#F3F4F6', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: '#4B5563', marginLeft: '8px' }}>
                                        Hoje
                                    </button>
                                </div>
                            </div>

                            {usagesForSelectedDay.length > 0 ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                                    {usagesForSelectedDay.map(log => {
                                        const typeColor = diaperInventory.find(d => d.id === log.diaperId)?.origin === 'Própria' ? '#0369A1' : '#166534';
                                        const typeBg = diaperInventory.find(d => d.id === log.diaperId)?.origin === 'Própria' ? '#E0F2FE' : '#DCFCE7';

                                        return (
                                            <div key={log.id} style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #E5E7EB', paddingBottom: '8px' }}>
                                                    <span style={{ fontWeight: 800, color: '#111827', fontSize: '15px' }}>{log.patientName}</span>
                                                    <span style={{ background: typeBg, color: typeColor, padding: '4px 8px', borderRadius: '8px', fontSize: '12px', fontWeight: 800 }}>
                                                        {log.amountUsed} {log.amountUsed === 1 ? 'Fralda' : 'Fraldas'}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6B7280', fontSize: '13px' }}>
                                                        <Clock size={14} /> {log.time}
                                                    </div>
                                                    <div style={{ fontSize: '13px', color: '#4B5563', fontWeight: 500 }}>
                                                        Por: <span style={{ color: '#0071E3' }}>{log.executorName || 'Equipa'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className={formStyles.emptyState} style={{ background: 'white', border: '1px dashed #E5E7EB', marginTop: '16px' }}>
                                    <Baby size={40} style={{ opacity: 0.3, marginBottom: '16px' }} />
                                    <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#374151' }}>Sem Mudas Registadas</h3>
                                    <p style={{ margin: 0, color: '#6B7280', fontSize: '14px' }}>Não foram declaradas mudas de fraldas neste dia.</p>
                                </div>
                            )}

                            <div style={{ marginTop: '24px', fontSize: '13px', color: '#6B7280', display: 'flex', gap: '16px' }}>
                                <span>💡 <strong>Dica:</strong> Estas informações vêm do painel da equipa em tempo real.</span>
                            </div>
                        </div>
                    )}

                    {/* ---- ABA DEPÓSITO ---- */}
                    {activeTab === 'deposito' && (
                        <div>
                            <div style={{ background: inventoryDirty ? '#fff7ed' : '#f8fafc', border: `1px solid ${inventoryDirty ? '#fdba74' : '#e2e8f0'}`, borderRadius: '20px', padding: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                <div>
                                    <div style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a' }}>
                                        {inventoryDirty ? 'Existem alterações por guardar' : 'Stock guardado'}
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#64748B', marginTop: '4px', fontWeight: 600 }}>
                                        Os botões alteram primeiro em rascunho. Só fica permanente quando carregar em guardar.
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    <button
                                        type="button"
                                        onClick={handleResetInventoryDraft}
                                        disabled={!inventoryDirty}
                                        style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #CBD5E1', background: inventoryDirty ? 'white' : '#F8FAFC', color: '#334155', fontWeight: 800, cursor: inventoryDirty ? 'pointer' : 'not-allowed', opacity: inventoryDirty ? 1 : 0.5 }}
                                    >
                                        Descartar alterações
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleRestorePreviousInventory}
                                        disabled={!savedInventorySnapshot}
                                        style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #BFDBFE', background: savedInventorySnapshot ? '#EFF6FF' : '#F8FAFC', color: '#1D4ED8', fontWeight: 800, cursor: savedInventorySnapshot ? 'pointer' : 'not-allowed', opacity: savedInventorySnapshot ? 1 : 0.5 }}
                                    >
                                        Voltar ao estado anterior
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSaveInventory}
                                        disabled={!inventoryDirty}
                                        style={{ padding: '12px 18px', borderRadius: '12px', border: 'none', background: inventoryDirty ? '#16A34A' : '#94A3B8', color: 'white', fontWeight: 900, cursor: inventoryDirty ? 'pointer' : 'not-allowed' }}
                                    >
                                        Salvar
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>Gestão Principal das Caixas</h2>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', border: '1px solid #D1D5DB', borderRadius: '12px', padding: '10px 12px', fontSize: '14px', fontWeight: 700, color: '#374151' }}>
                                        Fraldas usadas em
                                        <input
                                            type="date"
                                            value={depositUsageDate}
                                            onChange={(e) => setDepositUsageDate(e.target.value)}
                                            max={todayStr}
                                            style={{ border: 'none', background: 'transparent', color: '#111827', fontWeight: 700 }}
                                        />
                                    </label>
                                    <button className={styles.primaryButton} onClick={() => setShowDepotForm(!showDepotForm)} style={{ padding: '8px 16px', background: '#34C759' }}>
                                        {showDepotForm ? <X size={16} /> : <Plus size={16} />}
                                        <span style={{ fontSize: '14px' }}>{showDepotForm ? 'Fechar' : 'Nova Referência'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Form Depósito */}
                            {showDepotForm && (
                                <Card className={formStyles.formCard} padding="lg" style={{ marginBottom: '24px' }}>
                                    <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem' }}>Adicionar Referência ao Almoxarifado</h3>
                                    <form onSubmit={handleAddDepot} className={formStyles.form}>
                                        <div className={formStyles.rowFormGroup}>
                                            <div className={formStyles.formGroup} style={{ flex: 1 }}>
                                                <label>Nome do Tamanho/Modelo *</label>
                                                <select value={depotForm.name} onChange={e => setDepotForm({ ...depotForm, name: e.target.value })} required>
                                                    <option value="">Selecione o tamanho...</option>
                                                    {availableCatalogItems.map((item) => (
                                                        <option key={item.id} value={item.id}>{item.name}</option>
                                                    ))}
                                                    <option value={CUSTOM_DEPOT_OPTION}>Nova referência personalizada</option>
                                                </select>
                                            </div>
                                            {depotForm.name === CUSTOM_DEPOT_OPTION ? (
                                                <>
                                                    <div className={formStyles.formGroup} style={{ flex: 1 }}>
                                                        <label>Origem</label>
                                                        <select
                                                            value={depotForm.origin}
                                                            onChange={e => setDepotForm({
                                                                ...depotForm,
                                                                origin: e.target.value,
                                                                patientName: e.target.value === 'Casa' ? '' : depotForm.patientName
                                                            })}
                                                        >
                                                            <option value="Casa">Casa</option>
                                                            <option value="Própria">Própria</option>
                                                        </select>
                                                    </div>
                                                    <div className={formStyles.formGroup} style={{ flex: 1 }}>
                                                        <label>Para quem</label>
                                                        {depotForm.origin === 'Própria' ? (
                                                            <select
                                                                value={depotForm.patientName}
                                                                onChange={e => setDepotForm({ ...depotForm, patientName: e.target.value })}
                                                                required
                                                            >
                                                                <option value="">Selecione o utente...</option>
                                                                {patientNameOptions.map((name) => (
                                                                    <option key={name} value={name}>{name}</option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            <input type="text" value="Casa" readOnly />
                                                        )}
                                                    </div>
                                                </>
                                            ) : (
                                                <div className={formStyles.formGroup} style={{ flex: 1 }}>
                                                    <label>Para quem</label>
                                                    <input
                                                        type="text"
                                                        value={selectedDepotCatalogItem?.patientName || (selectedDepotCatalogItem?.origin === 'Casa' ? 'Casa' : '')}
                                                        readOnly
                                                        placeholder="Escolha a referência"
                                                    />
                                                </div>
                                            )}
                                            <div className={formStyles.formGroup} style={{ flex: 1 }}>
                                                <label>Quantidade inicial</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={depotForm.stockDepot}
                                                    onChange={e => setDepotForm({ ...depotForm, stockDepot: e.target.value })}
                                                    placeholder={selectedDepotCatalogItem ? String(selectedDepotCatalogItem.stockDepot || 0) : '0'}
                                                />
                                            </div>
                                        </div>

                                        {depotForm.name === CUSTOM_DEPOT_OPTION && (
                                            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
                                                <div className={formStyles.formGroup} style={{ flex: 1 }}>
                                                    <label>Tipo</label>
                                                    <select
                                                        value={depotForm.diaperKind}
                                                        onChange={e => setDepotForm({
                                                            ...depotForm,
                                                            diaperKind: e.target.value,
                                                            packSize: e.target.value === 'cueca-fralda' ? '14' : '20'
                                                        })}
                                                    >
                                                        <option value="fralda">Fralda normal</option>
                                                        <option value="cueca-fralda">Cueca-fralda</option>
                                                    </select>
                                                </div>
                                                <div className={formStyles.formGroup} style={{ flex: 1 }}>
                                                    <label>Tamanho</label>
                                                    <select
                                                        value={depotForm.diaperSize}
                                                        onChange={e => setDepotForm({ ...depotForm, diaperSize: e.target.value })}
                                                    >
                                                        <option value="XS">XS</option>
                                                        <option value="S">S</option>
                                                        <option value="M">M</option>
                                                        <option value="L">L</option>
                                                        <option value="G">G</option>
                                                        <option value="XL">XL</option>
                                                        <option value="XXL">XXL</option>
                                                    </select>
                                                </div>
                                                <div className={formStyles.formGroup} style={{ flex: 1 }}>
                                                    <label>Pacote padrão</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={depotForm.packSize}
                                                        onChange={e => setDepotForm({ ...depotForm, packSize: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {(selectedDepotCatalogItem || customDepotPreview) && (
                                            <div style={{ marginBottom: '16px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '12px', display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                                                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                                                    {(selectedDepotCatalogItem || customDepotPreview).origin === 'Casa' ? 'Estoque da casa' : 'Fralda própria'}
                                                </div>
                                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>
                                                    {depotForm.name === CUSTOM_DEPOT_OPTION
                                                        ? `${customDepotPreview?.name || 'Nova referência'} | Pacote padrão: ${customDepotPreview?.packSize || 20} | Pacotões: 46 ou 52`
                                                        : `Pacote padrão: ${getPackSize(selectedDepotCatalogItem)} | Pacotões: 46 ou 52`}
                                                </div>
                                            </div>
                                        )}

                                        <button type="submit" className={formStyles.btnPrimary} style={{ width: '100%', justifyContent: 'center', background: '#34C759' }}>Guardar Nova Referência</button>
                                    </form>
                                </Card>
                            )}

                            {/* Cards de Deposito - Estoque Casa */}
                            <div style={{ marginBottom: '40px' }}>
                                <h3 style={{ fontSize: '18px', color: '#166534', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Box size={22} /> Fraldas da Casa
                                </h3>
                                {inventoryEditorItems.filter(i => i.origin === 'Casa').length > 0 ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                                        {inventoryEditorItems.filter(i => i.origin === 'Casa').map(item => (
                                            <div key={item.id} style={{ background: 'white', padding: '20px', border: '1px solid #E5E7EB', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                                    <div>
                                                        <h4 style={{ margin: '0 0 6px 0', fontSize: '18px', color: '#111827', fontWeight: '800' }}>{item.name}</h4>
                                                        <span style={{ background: '#DCFCE7', color: '#166534', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 800 }}>ESTOQUE DA CASA</span>
                                                    </div>
                                                    <div style={{ background: item.stockDepot < 30 ? '#FEF2F2' : '#F3F4F6', border: item.stockDepot < 30 ? '1px solid #FECACA' : '1px solid transparent', padding: '12px 16px', borderRadius: '16px', textAlign: 'center', minWidth: '80px' }}>
                                                        <span style={{ display: 'block', fontSize: '28px', fontWeight: 900, color: item.stockDepot < 30 ? '#EF4444' : '#111827', lineHeight: 1 }}>{item.stockDepot}</span>
                                                        <span style={{ fontSize: '10px', color: '#6B7280', fontWeight: 800, marginTop: '4px', display: 'block' }}>UNIDADES</span>
                                                    </div>
                                                </div>

                                                <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: '#64748B', fontWeight: 700 }}>
                                                    Pacote: {getPackSize(item)} unidades
                                                </p>

                                                <div style={{ marginBottom: '14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '12px' }}>
                                                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Fraldas usadas em {new Date(`${depositUsageDate}T00:00:00`).toLocaleDateString('pt-PT')}</div>
                                                    <div style={{ marginTop: '6px', fontSize: '24px', fontWeight: 900, color: '#0F172A' }}>
                                                        {usageByInventoryForDepositDate.get(item.id) || 0}
                                                    </div>
                                                </div>

                                                <div style={{ marginBottom: '14px', borderTop: '1px dashed #E5E7EB', paddingTop: '14px' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => openArrivalHistory(item)}
                                                        style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #BFDBFE', background: expandedArrivalItemId === item.id ? '#EFF6FF' : 'white', color: '#1D4ED8', fontWeight: 800, cursor: 'pointer' }}
                                                    >
                                                        {expandedArrivalItemId === item.id ? 'Fechar histórico de chegadas' : 'Histórico de chegadas'}
                                                    </button>

                                                    {expandedArrivalItemId === item.id && (
                                                        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '12px' }}>
                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', alignItems: 'end' }}>
                                                                <label style={{ fontSize: '12px', fontWeight: 800, color: '#475569' }}>
                                                                    Data
                                                                    <input type="date" value={arrivalForm.itemId === item.id ? arrivalForm.date : todayStr} max={todayStr} onChange={(e) => setArrivalForm({ itemId: item.id, date: e.target.value, quantity: arrivalForm.itemId === item.id ? arrivalForm.quantity : '' })} style={{ width: '100%', marginTop: '6px', padding: '10px', borderRadius: '10px', border: '1px solid #CBD5E1' }} />
                                                                </label>
                                                                <label style={{ fontSize: '12px', fontWeight: 800, color: '#475569' }}>
                                                                    Quantidade recebida
                                                                    <input type="number" min="1" placeholder="Ex: 104" value={arrivalForm.itemId === item.id ? arrivalForm.quantity : ''} onChange={(e) => setArrivalForm({ itemId: item.id, date: arrivalForm.itemId === item.id ? arrivalForm.date : todayStr, quantity: e.target.value })} style={{ width: '100%', marginTop: '6px', padding: '10px', borderRadius: '10px', border: '1px solid #CBD5E1' }} />
                                                                </label>
                                                                <button type="button" onClick={() => handleSaveArrival(item)} style={{ padding: '10px 14px', borderRadius: '10px', border: 'none', background: '#16A34A', color: 'white', fontWeight: 900, cursor: 'pointer' }}>
                                                                    Guardar
                                                                </button>
                                                            </div>

                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                {getArrivalHistory(item).length > 0 ? getArrivalHistory(item).map((entry) => (
                                                                    <div key={entry.id || `${entry.date}-${entry.quantity}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '10px 12px' }}>
                                                                        <div>
                                                                            <div style={{ fontWeight: 900, color: '#0F172A' }}>{new Date(`${entry.date}T00:00:00`).toLocaleDateString('pt-PT')}</div>
                                                                            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 700 }}>Registado por {entry.createdBy || 'Admin'}</div>
                                                                        </div>
                                                                        <div style={{ fontWeight: 900, color: '#166534' }}>+{entry.quantity}</div>
                                                                    </div>
                                                                )) : (
                                                                    <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 700 }}>Ainda não há chegadas registadas.</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', borderTop: '1px dashed #E5E7EB', paddingTop: '20px', marginTop: 'auto' }}>
                                                    <button title="-10" onClick={() => handleUpdateDepot(item.id, -10)} style={{ border: 'none', background: '#FEE2E2', color: '#EF4444', flex: 1, padding: '12px 0', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, fontSize: '15px', transition: '0.2s' }}>-10</button>
                                                    <button title="-1" onClick={() => handleUpdateDepot(item.id, -1)} style={{ border: 'none', background: '#FEE2E2', color: '#EF4444', flex: 1, padding: '12px 0', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, fontSize: '15px', transition: '0.2s' }}>-1</button>
                                                    <button title="+1" onClick={() => handleUpdateDepot(item.id, 1)} style={{ border: 'none', background: '#DCFCE7', color: '#16A34A', flex: 1, padding: '12px 0', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, fontSize: '15px', transition: '0.2s' }}>+1</button>
                                                    <button title="+10" onClick={() => handleUpdateDepot(item.id, 10)} style={{ border: 'none', background: '#DCFCE7', color: '#16A34A', flex: 1, padding: '12px 0', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, fontSize: '15px', transition: '0.2s' }}>+10</button>
                                                    <button title={`+Pacote (${getPackSize(item)})`} onClick={() => handleUpdateDepot(item.id, getPackSize(item))} style={{ border: 'none', background: '#166534', color: 'white', width: '100%', padding: '12px 0', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, fontSize: '15px', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                        <Plus size={16} /> Adicionar Pacote (+{getPackSize(item)})
                                                    </button>
                                                    <button title="+Pacotão (46)" onClick={() => handleUpdateDepot(item.id, 46)} style={{ border: 'none', background: '#0F766E', color: 'white', width: '100%', padding: '12px 0', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, fontSize: '15px', marginTop: '4px' }}>
                                                        Adicionar Pacotão (+46)
                                                    </button>
                                                    <button title="+Pacotão (52)" onClick={() => handleUpdateDepot(item.id, 52)} style={{ border: 'none', background: '#115E59', color: 'white', width: '100%', padding: '12px 0', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, fontSize: '15px', marginTop: '4px' }}>
                                                        Adicionar Pacotão (+52)
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className={formStyles.emptyState} style={{ padding: '32px', background: 'white', borderRadius: '20px', border: '1px dashed #D1D5DB' }}>
                                        <Box size={32} color="#9CA3AF" style={{ marginBottom: '12px' }} />
                                        <p style={{ margin: 0, color: '#4B5563', fontSize: '16px', fontWeight: 600 }}>Sem fraldas da casa configuradas.</p>
                                    </div>
                                )}
                            </div>

                            {/* Cards de Deposito - Estoque Próprio */}
                            <div style={{ marginBottom: '40px' }}>
                                <h3 style={{ fontSize: '18px', color: '#0369A1', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <User size={22} /> Fraldas Próprias (Família)
                                </h3>
                                {inventoryEditorItems.filter(i => i.origin === 'Própria').length > 0 ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                                        {inventoryEditorItems.filter(i => i.origin === 'Própria').map(item => (
                                            <div key={item.id} style={{ background: 'white', padding: '20px', border: '1px solid #E5E7EB', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                                    <div>
                                                        <h4 style={{ margin: '0 0 6px 0', fontSize: '18px', color: '#111827', fontWeight: '800' }}>{item.name}</h4>
                                                        <span style={{ background: '#E0F2FE', color: '#0369A1', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 800 }}>FAMÍLIA: {item.patientName || 'Desconhecido'}</span>
                                                    </div>
                                                    <div style={{ background: item.stockDepot < 30 ? '#FEF2F2' : '#F3F4F6', border: item.stockDepot < 30 ? '1px solid #FECACA' : '1px solid transparent', padding: '12px 16px', borderRadius: '16px', textAlign: 'center', minWidth: '80px' }}>
                                                        <span style={{ display: 'block', fontSize: '28px', fontWeight: 900, color: item.stockDepot < 30 ? '#EF4444' : '#111827', lineHeight: 1 }}>{item.stockDepot}</span>
                                                        <span style={{ fontSize: '10px', color: '#6B7280', fontWeight: 800, marginTop: '4px', display: 'block' }}>UNIDADES</span>
                                                    </div>
                                                </div>

                                                <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: '#64748B', fontWeight: 700 }}>
                                                    Pacote: {getPackSize(item)} unidades
                                                </p>

                                                <div style={{ marginBottom: '14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '12px' }}>
                                                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Fraldas usadas em {new Date(`${depositUsageDate}T00:00:00`).toLocaleDateString('pt-PT')}</div>
                                                    <div style={{ marginTop: '6px', fontSize: '24px', fontWeight: 900, color: '#0F172A' }}>
                                                        {usageByInventoryForDepositDate.get(item.id) || 0}
                                                    </div>
                                                </div>

                                                <div style={{ marginBottom: '14px', borderTop: '1px dashed #E5E7EB', paddingTop: '14px' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => openArrivalHistory(item)}
                                                        style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #BFDBFE', background: expandedArrivalItemId === item.id ? '#EFF6FF' : 'white', color: '#1D4ED8', fontWeight: 800, cursor: 'pointer' }}
                                                    >
                                                        {expandedArrivalItemId === item.id ? 'Fechar histórico de chegadas' : 'Histórico de chegadas'}
                                                    </button>

                                                    {expandedArrivalItemId === item.id && (
                                                        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '12px' }}>
                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', alignItems: 'end' }}>
                                                                <label style={{ fontSize: '12px', fontWeight: 800, color: '#475569' }}>
                                                                    Data
                                                                    <input type="date" value={arrivalForm.itemId === item.id ? arrivalForm.date : todayStr} max={todayStr} onChange={(e) => setArrivalForm({ itemId: item.id, date: e.target.value, quantity: arrivalForm.itemId === item.id ? arrivalForm.quantity : '' })} style={{ width: '100%', marginTop: '6px', padding: '10px', borderRadius: '10px', border: '1px solid #CBD5E1' }} />
                                                                </label>
                                                                <label style={{ fontSize: '12px', fontWeight: 800, color: '#475569' }}>
                                                                    Quantidade recebida
                                                                    <input type="number" min="1" placeholder="Ex: 104" value={arrivalForm.itemId === item.id ? arrivalForm.quantity : ''} onChange={(e) => setArrivalForm({ itemId: item.id, date: arrivalForm.itemId === item.id ? arrivalForm.date : todayStr, quantity: e.target.value })} style={{ width: '100%', marginTop: '6px', padding: '10px', borderRadius: '10px', border: '1px solid #CBD5E1' }} />
                                                                </label>
                                                                <button type="button" onClick={() => handleSaveArrival(item)} style={{ padding: '10px 14px', borderRadius: '10px', border: 'none', background: '#0284C7', color: 'white', fontWeight: 900, cursor: 'pointer' }}>
                                                                    Guardar
                                                                </button>
                                                            </div>

                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                {getArrivalHistory(item).length > 0 ? getArrivalHistory(item).map((entry) => (
                                                                    <div key={entry.id || `${entry.date}-${entry.quantity}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '10px 12px' }}>
                                                                        <div>
                                                                            <div style={{ fontWeight: 900, color: '#0F172A' }}>{new Date(`${entry.date}T00:00:00`).toLocaleDateString('pt-PT')}</div>
                                                                            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 700 }}>Registado por {entry.createdBy || 'Admin'}</div>
                                                                        </div>
                                                                        <div style={{ fontWeight: 900, color: '#0284C7' }}>+{entry.quantity}</div>
                                                                    </div>
                                                                )) : (
                                                                    <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 700 }}>Ainda não há chegadas registadas.</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', borderTop: '1px dashed #E5E7EB', paddingTop: '20px', marginTop: 'auto' }}>
                                                    <button title="-10" onClick={() => handleUpdateDepot(item.id, -10)} style={{ border: 'none', background: '#FEE2E2', color: '#EF4444', flex: 1, padding: '12px 0', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, fontSize: '15px' }}>-10</button>
                                                    <button title="-1" onClick={() => handleUpdateDepot(item.id, -1)} style={{ border: 'none', background: '#FEE2E2', color: '#EF4444', flex: 1, padding: '12px 0', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, fontSize: '15px' }}>-1</button>
                                                    <button title="+1" onClick={() => handleUpdateDepot(item.id, 1)} style={{ border: 'none', background: '#E0F2FE', color: '#0284C7', flex: 1, padding: '12px 0', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, fontSize: '15px' }}>+1</button>
                                                    <button title="+10" onClick={() => handleUpdateDepot(item.id, 10)} style={{ border: 'none', background: '#E0F2FE', color: '#0284C7', flex: 1, padding: '12px 0', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, fontSize: '15px' }}>+10</button>
                                                    <button title={`+Pacote (${getPackSize(item)})`} onClick={() => handleUpdateDepot(item.id, getPackSize(item))} style={{ border: 'none', background: '#0284C7', color: 'white', width: '100%', padding: '12px 0', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, fontSize: '15px', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                        <Plus size={16} /> Adicionar Pacote (+{getPackSize(item)})
                                                    </button>
                                                    <button title="+Pacotão (46)" onClick={() => handleUpdateDepot(item.id, 46)} style={{ border: 'none', background: '#0369A1', color: 'white', width: '100%', padding: '12px 0', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, fontSize: '15px', marginTop: '4px' }}>
                                                        Adicionar Pacotão (+46)
                                                    </button>
                                                    <button title="+Pacotão (52)" onClick={() => handleUpdateDepot(item.id, 52)} style={{ border: 'none', background: '#075985', color: 'white', width: '100%', padding: '12px 0', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, fontSize: '15px', marginTop: '4px' }}>
                                                        Adicionar Pacotão (+52)
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className={formStyles.emptyState} style={{ padding: '32px', background: 'white', borderRadius: '20px', border: '1px dashed #D1D5DB' }}>
                                        <User size={32} color="#9CA3AF" style={{ marginBottom: '12px' }} />
                                        <p style={{ margin: 0, color: '#4B5563', fontSize: '16px', fontWeight: 600 }}>Sem fraldas da família registadas.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* MODAL CONFIRMAÇÃO DIÁRIA (ActionModal) */}
            {replaceModal && (
                <div className={formStyles.modalBackdrop} onClick={closeReplaceModal}>
                    <div className={formStyles.modal} onClick={e => e.stopPropagation()}>
                        <div className={formStyles.modalHeader}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <RefreshCw size={24} color="#0071E3" />
                                <h2 style={{ margin: 0, color: '#111827' }}>Completar o Quarto</h2>
                            </div>
                            <button className={formStyles.closeBtn} onClick={closeReplaceModal}>
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ background: '#F3F4F6', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#6B7280' }}>Alvo do Registo</p>
                                    <h3 style={{ margin: '0', fontSize: '18px', color: '#111827' }}>{replaceModal.patient.name}</h3>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#6B7280' }}>Data Designada</p>
                                    <h3 style={{ margin: '0', fontSize: '16px', color: '#0071E3', fontWeight: 800 }}>{new Date(replaceModal.date).toLocaleDateString('pt-PT')}</h3>
                                </div>
                            </div>
                        </div>

                        {replaceModal.existingLog?.editedAt && (
                            <div style={{ marginBottom: '16px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '12px', padding: '12px', color: '#1D4ED8', fontSize: '13px', fontWeight: 700 }}>
                                Última alteração: {replaceModal.existingLog.editedByName || 'Admin'} em {new Date(replaceModal.existingLog.editedAt).toLocaleString('pt-PT')}
                            </div>
                        )}

                        <form onSubmit={handleReplaceSubmit}>
                            {isDirectFamilySupplyPatient(replaceModal.patient) ? (
                                <div className={formStyles.formGroup}>
                                    <label style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>Fralda própria no quarto</label>
                                    <p style={{ fontSize: '13px', color: '#6B7280', margin: '4px 0 16px 0', lineHeight: 1.5 }}>Para este utente não contamos stock do depósito. Basta confirmar se tem fralda no quarto.</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setDirectSupplyStatus('ok')}
                                            style={{ padding: '18px', borderRadius: '14px', border: directSupplyStatus === 'ok' ? '2px solid #16A34A' : '1px solid #CBD5E1', background: directSupplyStatus === 'ok' ? '#DCFCE7' : 'white', color: '#166534', fontWeight: 900, cursor: 'pointer' }}
                                        >
                                            OK, tem fralda
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDirectSupplyStatus('missing')}
                                            style={{ padding: '18px', borderRadius: '14px', border: directSupplyStatus === 'missing' ? '2px solid #DC2626' : '1px solid #CBD5E1', background: directSupplyStatus === 'missing' ? '#FEE2E2' : 'white', color: '#B91C1C', fontWeight: 900, cursor: 'pointer' }}
                                        >
                                            Sem fralda
                                        </button>
                                    </div>
                                </div>
                            ) : (
                            <div className={formStyles.formGroup}>
                                <label style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>Quantas fraldas AINDA estão na gaveta ou quarto agora? *</label>
                                <p style={{ fontSize: '13px', color: '#6B7280', margin: '4px 0 16px 0', lineHeight: 1.5 }}>Primeiro confirme a quantidade atual no quarto e depois escolha quantas fraldas vai repor agora.</p>
                                <input
                                    type="number"
                                    min="0"
                                    value={currentRoomStock}
                                    onChange={e => setCurrentRoomStock(e.target.value)}
                                    required
                                    autoFocus
                                    placeholder="N° Atual. Ex: 3"
                                    style={{ fontSize: '28px', padding: '16px', textAlign: 'center', height: '60px', borderRadius: '12px' }}
                                />
                                {currentRoomStock !== '' && (
                                    <>
                                        <div style={{ marginTop: '20px', padding: '20px', background: '#EFF6FF', borderRadius: '16px', border: '1px solid #BFDBFE' }}>
                                            <div style={{ fontSize: '15px', color: '#1D4ED8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span>{Number(currentRoomStock) >= 10 ? 'Já tem 10 ou mais; pode repor 0 se quiser.' : `Faltam ${Math.max(0, 10 - Number(currentRoomStock))} para chegar a 10.`}</span>
                                            </div>
                                        </div>

                                        <div style={{ marginTop: '16px' }}>
                                            <label style={{ fontSize: '16px', fontWeight: 600, color: '#111827', display: 'block', marginBottom: '8px' }}>Quantas vai repor agora?</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={replenishAmount}
                                                onChange={e => setReplenishAmount(e.target.value)}
                                                style={{ fontSize: '28px', padding: '16px', textAlign: 'center', height: '60px', borderRadius: '12px', width: '100%' }}
                                            />
                                            <p style={{ fontSize: '13px', color: '#6B7280', margin: '10px 0 0', textAlign: 'center' }}>
                                                Stock final previsto: <strong>{Number(currentRoomStock) + (Number(replenishAmount) || 0)}</strong>
                                            </p>
                                        </div>

                                        {Number(replenishAmount) > 0 && (
                                            <div style={{ marginTop: '16px' }}>
                                                <label style={{ fontSize: '16px', fontWeight: 600, color: '#111827', display: 'block', marginBottom: '8px' }}>Que fralda vai usar?</label>
                                                <select
                                                    value={selectedReplenishDiaperId}
                                                    onChange={e => setSelectedReplenishDiaperId(e.target.value)}
                                                    style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #D1D5DB', fontSize: '16px', fontWeight: 700 }}
                                                >
                                                    {!selectedReplenishDiaperId && <option value="">Escolha a fralda</option>}
                                                    {getPatientReplenishOptions(replaceModal.patient).map((item) => (
                                                        <option key={item.id} value={item.id}>
                                                            {item.name} ({item.stockDepot} no depósito)
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                            )}

                            <div className={formStyles.formActions} style={{ marginTop: '24px' }}>
                                <button type="button" className={formStyles.cancelBtn} onClick={closeReplaceModal}>
                                    Cancelar
                                </button>
                                <button type="submit" className={formStyles.submitBtn} style={{ background: '#0071E3', fontWeight: 700, fontSize: '16px', padding: '12px 24px' }}>
                                    {replaceModal.existingLog ? 'Guardar Alteração' : 'Guardar Registo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
