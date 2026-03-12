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
import { DIAPER_INVENTORY_CATALOG, getPackSize } from '@/data/diaperConfig.mjs';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Baby, Plus, X, ArrowLeft, RefreshCw, Box, TableProperties, ChevronLeft, ChevronRight, CheckCircle2, Download, Clock, User } from 'lucide-react';

// Helper for local YYYY-MM-DD
const toISODate = (d) => {
    const copy = new Date(d);
    copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
    return copy.toISOString().split('T')[0];
};

export default function FraldasPage() {
    const { isAdmin, toggleMode, currentUser } = useApp();
    const router = useRouter();
    const {
        diaperPatients, diaperLogs, inventoryItems,
        addDiaperPatient, deleteDiaperPatient, updateDiaperPatient,
        addDiaperLog,
        addInventoryItem, updateInventoryItem
    } = useData();

    // TABS
    const [activeTab, setActiveTab] = useState('tabela'); // tabela | deposito | diarias

    // Formulários e Modais
    const [showDepotForm, setShowDepotForm] = useState(false);
    const [depotForm, setDepotForm] = useState({ name: '', stockDepot: 0, origin: 'Casa', patientName: '' });

    const [showPatientForm, setShowPatientForm] = useState(false);
    const [patientForm, setPatientForm] = useState({ name: '', diaperId: '', origin: 'Casa' });

    const [replaceModal, setReplaceModal] = useState(null); // { patient, date: YYYY-MM-DD }
    const [currentRoomStock, setCurrentRoomStock] = useState('');
    const [replenishAmount, setReplenishAmount] = useState('0');

    // Filtro de inventário para fraldas
    const diaperInventory = useMemo(() => {
        if (!inventoryItems) return [];
        return inventoryItems
            .filter((i) => i.category === 'fralda')
            .sort((a, b) => {
                if (a.origin !== b.origin) return a.origin.localeCompare(b.origin);
                return a.name.localeCompare(b.name);
            });
    }, [inventoryItems]);

    const availableCatalogItems = useMemo(() => {
        const existingIds = new Set(diaperInventory.map((item) => item.id));
        return DIAPER_INVENTORY_CATALOG.filter((item) => !existingIds.has(item.id));
    }, [diaperInventory]);

    // Gestão da Semana Visível
    const todayStr = toISODate(new Date());
    const [weekOffset, setWeekOffset] = useState(0);
    const [dayOffset, setDayOffset] = useState(0); // Para a aba 'Diárias'

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

    // Diaper usages of the selected day
    const usagesForSelectedDay = useMemo(() => {
        const dateStr = toISODate(selectedDay);
        if (!diaperLogs) return [];
        return diaperLogs.filter(l => l.type === 'usage' && l.date === dateStr).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }, [diaperLogs, selectedDay]);

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

        let targetPatients = patient ? [patient] : [...new Map(diaperPatients.map(p => [p.name.toLowerCase().trim(), p])).values()].sort((a, b) => a.name.localeCompare(b.name));
        if (!targetPatients || targetPatients.length === 0) {
            alert("Não há dados para exportar.");
            return;
        }

        const tableColumn = ["Utente", "Fralda Utilizada", "Propriedade", "Total Gasto no Mês"];
        const tableRows = [];

        targetPatients.forEach(p => {
            const diaperType = diaperInventory.find(d => d.id === p.diaperId);
            const patientStats = monthStats.stats[p.id] || { added: 0, used: 0 };
            const total = Math.max(patientStats.added, patientStats.used); // Use whichever is higher, or just show used if they don't do refills.

            tableRows.push([
                p.name,
                diaperType ? diaperType.name : 'Sem Fralda',
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
        const selectedCatalogItem = DIAPER_INVENTORY_CATALOG.find((item) => item.id === depotForm.name);
        if (!selectedCatalogItem) return;
        addInventoryItem({
            ...selectedCatalogItem,
            stockDepot: selectedCatalogItem.stockDepot || 0
        });
        setDepotForm({ name: '', stockDepot: 0, origin: 'Casa', patientName: '' });
        setShowDepotForm(false);
    };

    const handleUpdateDepot = (id, change) => {
        const item = diaperInventory.find(i => i.id === id);
        if (!item) return;
        if (item.stockDepot + change < 0) return;
        updateInventoryItem(id, { stockDepot: item.stockDepot + change });
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
    };

    const handleReplaceSubmit = (e) => {
        e.preventDefault();
        const patient = replaceModal.patient;
        const actionDateStr = replaceModal.date;
        const currentInRoom = Number(currentRoomStock);
        const amountToReplenish = Number(replenishAmount);

        if (Number.isNaN(currentInRoom) || currentInRoom < 0) {
            alert("A quantidade no quarto deve ser 0 ou superior.");
            return;
        }

        if (Number.isNaN(amountToReplenish) || amountToReplenish < 0) {
            alert("A quantidade a repor deve ser 0 ou superior.");
            return;
        }

        const diaperType = diaperInventory.find(d => d.id === patient.diaperId);
        if (amountToReplenish > 0 && !diaperType) {
            alert('Tipo de fralda não encontrado! Verifique o depósito.');
            return;
        }

        const requiredAmount = amountToReplenish;
        if (requiredAmount > 0 && diaperType.stockDepot < requiredAmount) {
            alert(`Falta estoque no depósito! Há apenas ${diaperType.stockDepot} de ${diaperType.name}.`);
            return;
        }

        const systemExpectedStock = patient.wardrobeStock !== undefined ? patient.wardrobeStock : 10;
        const anomalyAmount = systemExpectedStock - currentInRoom;
        const finalStock = currentInRoom + amountToReplenish;

        if (anomalyAmount !== 0) {
            addDiaperLog({
                type: 'audit',
                patientId: patient.id,
                patientName: patient.name,
                date: actionDateStr,
                time: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
                expectedStock: systemExpectedStock,
                actualStock: currentInRoom,
                deviance: anomalyAmount,
                executorId: currentUser?.id || 'admin',
                executorName: currentUser?.name || 'Admin'
            });
        }

        // Subtrai do depósito se for preciso adicionar
        if (requiredAmount > 0) {
            updateInventoryItem(diaperType.id, { stockDepot: diaperType.stockDepot - requiredAmount });
        }

        // Log the refill
        addDiaperLog({
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
        });

        updateDiaperPatient(patient.id, { wardrobeStock: finalStock, hasAnomaly: anomalyAmount > 0 ? true : false });

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
                                        {diaperPatients && diaperPatients.length > 0 ? [...new Map(diaperPatients.map(p => [p.name.toLowerCase().trim(), p])).values()].sort((a, b) => a.name.localeCompare(b.name)).map(patient => {
                                            const diaperType = diaperInventory.find(d => d.id === patient.diaperId);

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
                                                            ) : (
                                                                <span style={{ color: '#EF4444', fontWeight: 600 }}>Falta Configurar Fralda</span>
                                                            )}
                                                            {patient.origin === 'Própria' && (
                                                                <span style={{ background: '#E0F2FE', color: '#0369A1', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800, marginLeft: '4px' }}>PRÓPRIA</span>
                                                            )}
                                                        </span>
                                                    </td>

                                                    {weekDates.map(d => {
                                                        const dateStr = toISODate(d);
                                                        const isFuture = dateStr > todayStr;

                                                        const dayLogs = diaperLogs?.filter(l => l.patientId === patient.id && l.date === dateStr) || [];
                                                        const refillLog = dayLogs.find(l => l.type === 'replenishment');
                                                        const usageLogs = dayLogs.filter(l => l.type === 'usage');
                                                        const anomalyLogs = dayLogs.filter(l => l.type === 'audit' || (l.type === 'usage' && l.anomaly > 0));

                                                        const totalUsed = usageLogs.reduce((sum, l) => sum + Number(l.amountUsed || 0), 0);
                                                        const totalAnomaly = anomalyLogs.reduce((sum, l) => sum + Number(l.deviance || l.anomaly || 0), 0);

                                                        return (
                                                            <td key={dateStr} style={{ padding: '12px 8px', textAlign: 'center', background: dateStr === todayStr ? '#FEFCE8' : (totalAnomaly > 0 ? '#FEF2F2' : 'transparent'), borderRight: '1px solid #F3F4F6', verticalAlign: 'middle' }}>
                                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                                                    {refillLog ? (
                                                                        <div title={`Confirmado por ${refillLog.executorName || 'Admin'}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
                                                                            {refillLog.amountAdded > 0 ? (
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: '#DCFCE7', color: '#166534', padding: '4px 10px', borderRadius: '12px', fontWeight: 800, fontSize: '14px' }}>
                                                                                    +{refillLog.amountAdded}
                                                                                </div>
                                                                            ) : (
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: '#E5E7EB', color: '#4B5563', padding: '4px 10px', borderRadius: '12px', fontWeight: 600, fontSize: '14px' }}>
                                                                                    OK (10)
                                                                                </div>
                                                                            )}
                                                                            <span style={{ fontSize: '11px', color: '#6B7280', marginTop: '6px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                                                <CheckCircle2 size={10} color="#166534" />
                                                                                {refillLog.timestamp ? new Date(refillLog.timestamp).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : (refillLog.time || '')}
                                                                            </span>
                                                                        </div>
                                                                    ) : isFuture ? (
                                                                        <span style={{ color: '#D1D5DB' }}>{totalUsed === 0 && totalAnomaly === 0 ? '-' : ''}</span>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => {
                                                                                setReplaceModal({ patient, date: dateStr });
                                                                                setReplenishAmount('0');
                                                                            }}
                                                                            style={{ border: '1px dashed #9CA3AF', background: 'white', color: '#4B5563', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', width: '100%', transition: 'all 0.2s' }}
                                                                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#0071E3'; e.currentTarget.style.color = '#0071E3'; }}
                                                                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#9CA3AF'; e.currentTarget.style.color = '#4B5563'; }}
                                                                        >
                                                                            {dateStr === todayStr ? 'Repor' : 'Atrasado'}
                                                                        </button>
                                                                    )}

                                                                    {totalUsed > 0 && (
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: '#FEE2E2', color: '#EF4444', padding: '4px 10px', borderRadius: '12px', fontWeight: 800, fontSize: '14px' }} title={`${totalUsed} fraldas usadas`}>
                                                                            -{totalUsed}
                                                                        </div>
                                                                    )}

                                                                    {totalAnomaly !== 0 && (
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: '#991B1B', color: 'white', padding: '2px 8px', borderRadius: '8px', fontWeight: 800, fontSize: '11px', marginTop: '4px' }} title={`Desvio de Stock Identificado: ${totalAnomaly}`}>
                                                                            ⚠️ Desvio: {totalAnomaly}
                                                                        </div>
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

                            {/* Informativo */}
                            <div style={{ marginTop: '16px', fontSize: '13px', color: '#6B7280', display: 'flex', gap: '16px' }}>
                                <span>💡 <strong>Dica:</strong> Pode adicionar reposições retroativas clicando em &quot;Atrasado&quot;.</span>
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>Gestão Principal das Caixas</h2>
                                <button className={styles.primaryButton} onClick={() => setShowDepotForm(!showDepotForm)} style={{ padding: '8px 16px', background: '#34C759' }}>
                                    {showDepotForm ? <X size={16} /> : <Plus size={16} />}
                                    <span style={{ fontSize: '14px' }}>{showDepotForm ? 'Fechar' : 'Nova Referência'}</span>
                                </button>
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
                                                </select>
                                            </div>
                                        </div>

                                        <button type="submit" className={formStyles.btnPrimary} style={{ width: '100%', justifyContent: 'center', background: '#34C759' }}>Guardar Nova Referência</button>
                                    </form>
                                </Card>
                            )}

                            {/* Cards de Deposito - Estoque Casa */}
                            <div style={{ marginBottom: '40px' }}>
                                <h3 style={{ fontSize: '18px', color: '#166534', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Box size={22} /> Fraldas da Casa
                                </h3>
                                {diaperInventory.filter(i => i.origin === 'Casa').length > 0 ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                                        {diaperInventory.filter(i => i.origin === 'Casa').map(item => (
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

                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', borderTop: '1px dashed #E5E7EB', paddingTop: '20px', marginTop: 'auto' }}>
                                                    <button title="-10" onClick={() => handleUpdateDepot(item.id, -10)} style={{ border: 'none', background: '#FEE2E2', color: '#EF4444', flex: 1, padding: '12px 0', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, fontSize: '15px', transition: '0.2s' }}>-10</button>
                                                    <button title="-1" onClick={() => handleUpdateDepot(item.id, -1)} style={{ border: 'none', background: '#FEE2E2', color: '#EF4444', flex: 1, padding: '12px 0', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, fontSize: '15px', transition: '0.2s' }}>-1</button>
                                                    <button title="+1" onClick={() => handleUpdateDepot(item.id, 1)} style={{ border: 'none', background: '#DCFCE7', color: '#16A34A', flex: 1, padding: '12px 0', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, fontSize: '15px', transition: '0.2s' }}>+1</button>
                                                    <button title="+10" onClick={() => handleUpdateDepot(item.id, 10)} style={{ border: 'none', background: '#DCFCE7', color: '#16A34A', flex: 1, padding: '12px 0', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, fontSize: '15px', transition: '0.2s' }}>+10</button>
                                                    <button title={`+Pacote (${getPackSize(item)})`} onClick={() => handleUpdateDepot(item.id, getPackSize(item))} style={{ border: 'none', background: '#166534', color: 'white', width: '100%', padding: '12px 0', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, fontSize: '15px', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                        <Plus size={16} /> Adicionar Pacote (+{getPackSize(item)})
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
                                {diaperInventory.filter(i => i.origin === 'Própria').length > 0 ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                                        {diaperInventory.filter(i => i.origin === 'Própria').map(item => (
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

                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', borderTop: '1px dashed #E5E7EB', paddingTop: '20px', marginTop: 'auto' }}>
                                                    <button title="-10" onClick={() => handleUpdateDepot(item.id, -10)} style={{ border: 'none', background: '#FEE2E2', color: '#EF4444', flex: 1, padding: '12px 0', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, fontSize: '15px' }}>-10</button>
                                                    <button title="-1" onClick={() => handleUpdateDepot(item.id, -1)} style={{ border: 'none', background: '#FEE2E2', color: '#EF4444', flex: 1, padding: '12px 0', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, fontSize: '15px' }}>-1</button>
                                                    <button title="+1" onClick={() => handleUpdateDepot(item.id, 1)} style={{ border: 'none', background: '#E0F2FE', color: '#0284C7', flex: 1, padding: '12px 0', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, fontSize: '15px' }}>+1</button>
                                                    <button title="+10" onClick={() => handleUpdateDepot(item.id, 10)} style={{ border: 'none', background: '#E0F2FE', color: '#0284C7', flex: 1, padding: '12px 0', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, fontSize: '15px' }}>+10</button>
                                                    <button title={`+Pacote (${getPackSize(item)})`} onClick={() => handleUpdateDepot(item.id, getPackSize(item))} style={{ border: 'none', background: '#0284C7', color: 'white', width: '100%', padding: '12px 0', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, fontSize: '15px', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                        <Plus size={16} /> Adicionar Pacote (+{getPackSize(item)})
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

                        <form onSubmit={handleReplaceSubmit}>
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
                                    </>
                                )}
                            </div>

                            <div className={formStyles.formActions} style={{ marginTop: '24px' }}>
                                <button type="button" className={formStyles.cancelBtn} onClick={closeReplaceModal}>
                                    Cancelar
                                </button>
                                <button type="submit" className={formStyles.submitBtn} style={{ background: '#0071E3', fontWeight: 700, fontSize: '16px', padding: '12px 24px' }}>
                                    Guardar Registo
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
