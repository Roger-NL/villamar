import Head from 'next/head';
import { useState, useMemo, useEffect } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDraggable, useDroppable } from '@dnd-kit/core';
import styles from '@/styles/AdminPages.module.css';
import planStyles from '@/styles/PlanoDiario.module.css';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import Avatar from '@/components/ui/Avatar';
import { useApp } from '../_app';
import { useData } from '@/contexts/DataContext';
import { planoDiarioTemplate, planoDiarioNoturnoTemplate } from '@/data/planoDiarioTemplate';
import {
    ClipboardList, CheckCircle, Clock, Check, Users, AlertCircle, Calendar, Send, Sun, Moon, ArrowRight, X, UserX, RotateCcw, Save
} from 'lucide-react';

function DraggableEmployee({ id, name, role }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `employee:${id}` });
    const style = {
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0.5 : 1,
        touchAction: 'none'
    };

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={`${planStyles.draggableEmployee} ${isDragging ? planStyles.dragging : ''}`}>
            <Avatar name={name} size="sm" />
            <div className={planStyles.empInfo}>
                <span className={planStyles.empName}>{name.split(' ')[0]}</span>
                <span className={planStyles.empRole}>{role}</span>
            </div>
        </div>
    );
}

function DraggableResident({ id, resident, status, customName, onCycleStatus, onUpdateName, onDelete }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: id });
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(customName || resident);

    const style = {
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0.5 : 1,
        touchAction: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        background: isDragging ? '#fff' : '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        borderRadius: isDragging ? '8px' : '0',
        color: '#475569',
        fontSize: '0.95rem',
        cursor: 'grab',
        ...(isDragging ? { boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', zIndex: 100 } : {})
    };

    const handleBlur = () => {
        setIsEditing(false);
        const trimmed = editValue.trim();
        if (!trimmed) {
            if (onDelete) onDelete(resident);
        } else if (trimmed !== (customName || resident)) {
            onUpdateName(resident, trimmed);
        } else {
            setEditValue(customName || resident);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleBlur();
        }
    };

    useEffect(() => {
        setEditValue(customName || resident);
    }, [customName, resident]);

    return (
        <div ref={setNodeRef} style={style} {...(!isEditing ? listeners : {})} {...(!isEditing ? attributes : {})}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {isEditing ? (
                    <input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        style={{ border: '1px solid #cbd5e1', borderRadius: '4px', padding: '2px 4px', fontSize: '0.95rem', fontFamily: 'inherit', color: 'inherit', maxWidth: '120px' }}
                        onPointerDown={(e) => e.stopPropagation()}
                    />
                ) : (
                    <>
                        <span
                            onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                            style={{ cursor: 'text', textDecoration: 'underline dotted #94a3b8' }}
                            title="Clica para editar o nome"
                        >
                            {customName || resident}
                        </span>
                        {onDelete && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(resident); }}
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                                title="Remover"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </>
                )}
            </div>
            <span
                onClick={(e) => { e.stopPropagation(); onCycleStatus(resident); }}
                onPointerDown={(e) => e.stopPropagation()}
                style={{
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    color: status === 'Banho' ? '#0ea5e9' : (status === 'Troca' || status === 'Troca Cama' || status === 'Troca Fr') ? '#eab308' : '#cbd5e1',
                    fontWeight: status ? 'bold' : 'normal',
                    marginLeft: '8px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: status ? (status === 'Banho' ? '#e0f2fe' : '#fef9c3') : 'transparent',
                    userSelect: 'none'
                }}
            >
                {status ? `(${status})` : '(Adicionar +)'}
            </span>
        </div>
    );
}

function InlineEditableExtra({ id, defaultLabel, customLabels, onUpdateLabel }) {
    const displayLabel = customLabels?.[id] || defaultLabel;
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(displayLabel);

    useEffect(() => {
        setEditValue(displayLabel);
    }, [displayLabel]);

    const handleBlur = () => {
        setIsEditing(false);
        const trimmed = editValue.trim();
        if (trimmed && trimmed !== displayLabel) {
            onUpdateLabel(id, trimmed);
        } else {
            setEditValue(displayLabel);
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isEditing ? (
                <input
                    autoFocus
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={e => e.key === 'Enter' && handleBlur()}
                    style={{ border: '1px solid #cbd5e1', borderRadius: '4px', padding: '2px 4px', fontSize: '0.9rem', width: '150px' }}
                    onClick={e => e.stopPropagation()}
                />
            ) : (
                <span
                    style={{ color: '#0077b6', cursor: 'text', fontWeight: customLabels?.[id] ? 'bold' : 'normal', fontSize: '0.9rem', textDecoration: 'underline dotted #94a3b8' }}
                    onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                    title="Clique para editar"
                >
                    {displayLabel}
                </span>
            )}
            {customLabels?.[id] && (
                <button
                    onClick={(e) => { e.stopPropagation(); onUpdateLabel(id, defaultLabel); }}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                    title="Remover"
                >
                    <X size={14} />
                </button>
            )}
        </div>
    );
}

function ResidentDropZone({ id, residents, sourceId, residentStatuses, customResidentNames, onCycleStatus, onUpdateName, onDelete }) {
    const { isOver, setNodeRef } = useDroppable({ id });
    return (
        <div ref={setNodeRef} style={{ display: 'flex', flexDirection: 'column', minHeight: '80px', background: isOver ? '#f0f9ff' : 'transparent', border: '1px dashed transparent', ...(isOver ? { borderColor: '#38bdf8', borderRadius: '8px' } : {}) }}>
            {residents.map((r, idx) => (
                <DraggableResident
                    key={`${id}_${idx}`}
                    id={`resident:${sourceId}:${r}`}
                    resident={r}
                    customName={customResidentNames?.[r]}
                    status={residentStatuses?.[r]}
                    onCycleStatus={onCycleStatus}
                    onUpdateName={onUpdateName}
                    onDelete={(rName) => onDelete && onDelete(sourceId, rName)}
                />
            ))}
            {residents.length === 0 && <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>Arraste utentes para aqui...</div>}
        </div>
    );
}

function TaskSlot({ taskId, label, isExtra, customLabels, onUpdateCustomLabel, assignedName, employees, onAssign }) {
    const dropId = `task:${taskId}`;
    const { isOver, setNodeRef } = useDroppable({ id: dropId });

    const displayLabel = customLabels && customLabels[taskId] ? customLabels[taskId] : label;

    const handleLabelClick = () => {
        if (!isExtra) return;
        onUpdateCustomLabel(taskId, displayLabel, label);
    };

    return (
        <div className={planStyles.taskRow}>
            <div
                className={planStyles.taskLabel}
                style={isExtra ? { display: 'flex', alignItems: 'center' } : {}}
            >
                {isExtra ? (
                    <InlineEditableExtra
                        id={taskId}
                        defaultLabel={label}
                        customLabels={customLabels}
                        onUpdateLabel={onUpdateCustomLabel}
                    />
                ) : (
                    <span>{displayLabel}</span>
                )}
            </div>
            <div ref={setNodeRef} className={`${planStyles.taskSlot} ${isOver ? planStyles.slotOver : ''}`} onClick={(e) => { e.stopPropagation(); }}>
                <span className={assignedName ? planStyles.assignedName : planStyles.unassignedName}>
                    {assignedName || "Arrastar ou Selecionar"}
                </span>
                <select
                    value={assignedName ? employees.find(e => e.name.split(' ')[0] === assignedName || e.name === assignedName)?.id || "" : ""}
                    onChange={(e) => onAssign(e.target.value)}
                    className={planStyles.slotSelect}
                >
                    <option value="" disabled>Atribuir...</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name.split(' ')[0]}</option>)}
                </select>
            </div>
        </div>
    );
}

export default function AdminTarefasPage() {
    const { isAdmin, toggleMode, currentUser } = useApp();
    const { employees, dailyPlans, updateDailyPlan, publishDailyPlan, isHydrated } = useData();

    // YYYY-MM-DD local logic
    const today = new Date();
    // Ajustar fuso horário para bater local
    const tzOffset = (new Date()).getTimezoneOffset() * 60000;
    const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, 10);

    const [selectedDate, setSelectedDate] = useState(localISOTime);
    const [period, setPeriod] = useState("DAY");
    const [activeDragItem, setActiveDragItem] = useState(null);
    const [localAssignments, setLocalAssignments] = useState({});
    const [customLabels, setCustomLabels] = useState({});
    const [localGroupResidents, setLocalGroupResidents] = useState({});
    const [residentStatuses, setResidentStatuses] = useState({});
    const [customResidentNames, setCustomResidentNames] = useState({});

    const planKey = period === 'DAY' ? selectedDate : `${selectedDate}_NIGHT`;
    const currentTemplate = period === 'DAY' ? planoDiarioTemplate : planoDiarioNoturnoTemplate;

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    useEffect(() => {
        if (isHydrated) {
            const plan = dailyPlans[planKey];
            setLocalAssignments(plan?.assignments || {});
            setCustomLabels(plan?.customLabels || {});
            setResidentStatuses(plan?.residentStatuses || {});
            setCustomResidentNames(plan?.customResidentNames || {});

            setResidentStatuses(plan?.residentStatuses || {});
            setCustomResidentNames(plan?.customResidentNames || {});

            const initialGroups = plan?.groupResidents || {};
            let updatedGroups = { ...initialGroups };

            currentTemplate.blocks.filter(b => b.type === 'group_assignment').forEach(block => {
                if (!updatedGroups[block.id]) {
                    if (block.predefinedColumns) {
                        updatedGroups[block.id] = { unassigned: [], "0": [...block.predefinedColumns[0]], "1": [...block.predefinedColumns[1]] };
                    } else {
                        updatedGroups[block.id] = { unassigned: block.residents ? [...block.residents] : [], "0": [], "1": [] };
                    }
                }
            });
            setLocalGroupResidents(updatedGroups);
        }
    }, [planKey, dailyPlans, isHydrated, period, currentTemplate]);

    const getEmployeeName = (id) => employees.find(e => e.id == id)?.name.split(' ')[0] || null;

    const handleAssign = (taskId, employeeId) => {
        const newAssignments = { ...localAssignments, [taskId]: employeeId };
        setLocalAssignments(newAssignments);
        updateDailyPlan(planKey, newAssignments, customLabels, localGroupResidents, residentStatuses, customResidentNames);
    };

    const handleUpdateCustomLabel = (taskId, newLabel) => {
        const newLabels = { ...customLabels, [taskId]: newLabel };
        setCustomLabels(newLabels);
        updateDailyPlan(planKey, localAssignments, newLabels, localGroupResidents, residentStatuses, customResidentNames);
    };

    const handleCycleResidentStatus = (taskId, residentName) => {
        setResidentStatuses(prev => {
            const key = `${taskId}:${residentName}`;
            const current = (prev && prev[key]) || null;
            let nextStatus = null;

            const isLevante = taskId.toLowerCase().includes('levante');

            if (isLevante) {
                if (current === null) nextStatus = 'Banho';
                else if (current === 'Banho') nextStatus = 'Troca';
                else if (current === 'Troca') nextStatus = null;
            } else {
                if (current === null) nextStatus = 'Troca';
                else if (current === 'Troca') nextStatus = null;
            }

            const newStatuses = { ...prev, [key]: nextStatus };
            if (nextStatus === null) { delete newStatuses[key]; }

            updateDailyPlan(planKey, localAssignments, customLabels, localGroupResidents, newStatuses, customResidentNames);
            return newStatuses;
        });
    };

    const handleUpdateResidentName = (originalName, newName) => {
        setCustomResidentNames(prev => {
            const newNames = { ...prev, [originalName]: newName };
            updateDailyPlan(planKey, localAssignments, customLabels, localGroupResidents, residentStatuses, newNames);
            return newNames;
        });
    };

    const handleDeleteResident = (taskId, residentName) => {
        setLocalGroupResidents(prev => {
            const blockGroups = prev[taskId];
            if (!blockGroups) return prev;

            const newGroups = { ...prev, [taskId]: { ...blockGroups } };
            for (let col of ['unassigned', '0', '1']) {
                if (newGroups[taskId][col]) {
                    newGroups[taskId][col] = newGroups[taskId][col].filter(r => r !== residentName);
                }
            }
            updateDailyPlan(planKey, localAssignments, customLabels, newGroups, residentStatuses, customResidentNames);
            return newGroups;
        });
    };

    const handleAddNewResident = (taskId, targetCol) => {
        const newName = `Nova Pessoa ${Math.floor(Math.random() * 10000)}`;
        const targetStr = String(targetCol);
        setLocalGroupResidents(prev => {
            const blockGroups = prev[taskId] || { unassigned: [], '0': [], '1': [] };
            const currentList = blockGroups[targetStr] || [];
            if (currentList.includes(newName)) return prev; // Just in case of impossible collision

            const newGroups = {
                ...prev,
                [taskId]: {
                    ...blockGroups,
                    [targetStr]: [...currentList, newName]
                }
            };
            updateDailyPlan(planKey, localAssignments, customLabels, newGroups, residentStatuses, customResidentNames);
            return newGroups;
        });
    };

    const handleDragStart = (event) => {
        setActiveDragItem({ id: event.active.id, type: event.active.id.toString().startsWith('resident:') ? 'resident' : 'employee' });
    };

    const handleDragEnd = (event) => {
        const { over, active } = event;
        setActiveDragItem(null);
        if (!over) return;

        const activeIdStr = active.id.toString();
        const overIdStr = over.id.toString();

        if (activeIdStr.startsWith('employee:') || !activeIdStr.startsWith('resident:')) {
            const employeeId = activeIdStr.startsWith('employee:') ? activeIdStr.replace('employee:', '') : activeIdStr;
            if (overIdStr.startsWith("task:")) {
                const taskId = overIdStr.replace("task:", "");
                handleAssign(taskId, employeeId);
            }
        } else if (activeIdStr.startsWith('resident:')) {
            const [, sourceTaskId, residentName] = activeIdStr.split(':');
            if (overIdStr.startsWith('resident_drop:')) {
                const [, dropTaskId, dropCol] = overIdStr.split(':');
                if (sourceTaskId === dropTaskId) {
                    handleResidentDrop(sourceTaskId, residentName, dropCol);
                }
            }
        }
    };

    const handleResidentDrop = (taskId, residentName, targetCol) => {
        setLocalGroupResidents(prev => {
            const blockGroups = prev[taskId];
            if (!blockGroups) return prev;

            let sourceCol = null;
            if (blockGroups.unassigned.includes(residentName)) sourceCol = 'unassigned';
            else if (blockGroups['0'].includes(residentName)) sourceCol = '0';
            else if (blockGroups['1'].includes(residentName)) sourceCol = '1';

            if (sourceCol === targetCol || sourceCol === null) return prev;

            const newGroups = {
                ...prev,
                [taskId]: {
                    ...blockGroups,
                    [sourceCol]: blockGroups[sourceCol].filter(r => r !== residentName),
                    [targetCol]: [...blockGroups[targetCol], residentName]
                }
            };

            updateDailyPlan(planKey, localAssignments, customLabels, newGroups, residentStatuses, customResidentNames);
            return newGroups;
        });
    };

    const handlePublish = () => {
        publishDailyPlan(planKey);
    };

    const handleClearPlan = () => {
        if (confirm("Tem certeza que deseja limpar todo o plano atual para recomeçar?")) {
            setLocalAssignments({});
            setCustomLabels({});
            setLocalGroupResidents({});
            setResidentStatuses({});
            setCustomResidentNames({});
            updateDailyPlan(planKey, {}, {}, {}, {}, {});
        }
    };

    if (!isHydrated) return <div>A carregar...</div>;

    const activeEmployee = activeDragItem?.type === 'employee' ? employees.find(e => e.id.toString() === activeDragItem.id.toString().replace('employee:', '')) : null;
    const activeResidentName = activeDragItem?.type === 'resident' ? activeDragItem.id.split(':')[2] : null;

    const currentPlan = dailyPlans[planKey];
    const isPublished = currentPlan && currentPlan.publishedAt;

    return (
        <>
            <Head>
                <title>Plano Diário - Admin Villa Mar</title>
            </Head>

            <Header user={currentUser} isAdmin={isAdmin} onModeSwitch={toggleMode} />
            <Sidebar isAdmin={true} />
            <BottomNav isAdmin={true} />

            <main className={styles.main}>
                <div className={styles.container}>
                    <div className={styles.pageHeader} style={{ marginBottom: '20px' }}>
                        <h1 className={styles.pageTitle} style={{ fontSize: '1.4rem' }}>
                            <ClipboardList size={28} />
                            Plano de Trabalho Diário
                        </h1>
                        <div className={planStyles.headerActions}>
                            <div className={planStyles.datePickerContainer}>
                                <Calendar size={20} />
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className={planStyles.dateInput}
                                />
                            </div>
                            <div className={planStyles.datePickerContainer} style={{ padding: '4px', gap: '2px' }}>
                                <button
                                    onClick={() => setPeriod('DAY')}
                                    style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', background: period === 'DAY' ? '#0077b6' : 'transparent', color: period === 'DAY' ? 'white' : '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                    <Sun size={16} /> Diurno
                                </button>
                                <button
                                    onClick={() => setPeriod('NIGHT')}
                                    style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', background: period === 'NIGHT' ? '#1e293b' : 'transparent', color: period === 'NIGHT' ? 'white' : '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                    <Moon size={16} /> Noturno
                                </button>
                            </div>
                            <button
                                onClick={handleClearPlan}
                                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ef4444', background: '#fef2f2', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <RotateCcw size={16} />
                                Limpar
                            </button>
                            <button
                                className={`${planStyles.publishBtn} ${isPublished ? planStyles.published : ''}`}
                                onClick={handlePublish}
                            >
                                {isPublished ? <Check size={18} /> : <Send size={18} />}
                                {isPublished ? 'Publicado' : 'Publicar Escala'}
                            </button>
                        </div>
                    </div>

                    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                        <div className={planStyles.grid}>

                            {/* Employees Sidebar */}
                            <div className={planStyles.employeesCol}>
                                <h2>Equipa</h2>
                                <p className={planStyles.helperText}>Arraste o funcionário para a tarefa ou atribua na caixa.</p>
                                <div className={planStyles.employeesList}>
                                    {employees.filter(e => !e.isAdmin).map(emp => (
                                        <DraggableEmployee key={emp.id} id={emp.id} name={emp.name} role={emp.role} />
                                    ))}
                                </div>
                            </div>

                            {/* Plan Canvas */}
                            <div className={planStyles.planCol}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                    {currentTemplate.blocks.map(block => {
                                        if (block.type === 'group_assignment') {
                                            return (
                                                <div key={block.id} className={planStyles.block} style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
                                                    <h3 className={planStyles.blockTitle} style={{ textAlign: 'center', backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>
                                                        {block.name}
                                                    </h3>
                                                    <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>

                                                        {/* Unassigned Pool */}
                                                        {localGroupResidents?.[block.id]?.unassigned?.length > 0 && (
                                                            <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                                <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: '600', color: '#334155', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>
                                                                    <span>Utentes Não Atribuídos</span>
                                                                    <button onClick={() => handleAddNewResident(block.id, 'unassigned')} style={{ background: 'none', border: 'none', color: '#0077b6', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>+ Adicionar à Lista</button>
                                                                </div>
                                                                <ResidentDropZone
                                                                    id={`resident_drop:${block.id}:unassigned`}
                                                                    residents={localGroupResidents?.[block.id]?.unassigned || []}
                                                                    sourceId={block.id}
                                                                    residentStatuses={residentStatuses ? Object.fromEntries(Object.entries(residentStatuses).filter(([k]) => k.startsWith(block.id + ':')).map(([k, v]) => [k.split(':')[1], v])) : {}}
                                                                    customResidentNames={customResidentNames}
                                                                    onCycleStatus={(rName) => handleCycleResidentStatus(block.id, rName)}
                                                                    onUpdateName={handleUpdateResidentName}
                                                                    onDelete={handleDeleteResident}
                                                                />
                                                            </div>
                                                        )}

                                                        {/* Employee Assignment Slots & Assigned Residents */}
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
                                                            {block.columns.map((colName, colIdx) => {
                                                                const taskId = `${block.id}_${colIdx}`;
                                                                return (
                                                                    <div key={colIdx} style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                                        <h4 style={{ margin: '0', fontSize: '0.95rem', color: '#0f172a', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                            <span>{colName}</span>
                                                                        </h4>
                                                                        <TaskSlot
                                                                            taskId={taskId}
                                                                            label="Atribuir Responsável"
                                                                            assignedName={localAssignments[taskId] ? getEmployeeName(localAssignments[taskId]) : null}
                                                                            employees={employees}
                                                                            onAssign={(empId) => handleAssign(taskId, empId)}
                                                                        />
                                                                        <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                                                            <div style={{ padding: '10px 12px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', fontWeight: '600', color: '#475569', fontSize: '0.85rem' }}>
                                                                                Utentes ({colName})
                                                                            </div>
                                                                            <ResidentDropZone
                                                                                id={`resident_drop:${block.id}:${colIdx}`}
                                                                                residents={localGroupResidents?.[block.id]?.[colIdx] || []}
                                                                                sourceId={block.id}
                                                                                residentStatuses={residentStatuses ? Object.fromEntries(Object.entries(residentStatuses).filter(([k]) => k.startsWith(block.id + ':')).map(([k, v]) => [k.split(':')[1], v])) : {}}
                                                                                customResidentNames={customResidentNames}
                                                                                onCycleStatus={(rName) => handleCycleResidentStatus(block.id, rName)}
                                                                                onUpdateName={handleUpdateResidentName}
                                                                                onDelete={handleDeleteResident}
                                                                            />
                                                                            <div style={{ padding: '8px 16px', borderTop: '1px dashed #cbd5e1' }}>
                                                                                <button
                                                                                    onClick={() => handleAddNewResident(block.id, colIdx)}
                                                                                    style={{ background: 'none', border: 'none', color: '#0077b6', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}
                                                                                >
                                                                                    + Adicionar Pessoa Extra
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        // SINGLE ASSIGNMENT (Gerais, etc) OR legacy backwards compatibility
                                        return (
                                            <div key={block.id} className={planStyles.block} style={{ margin: 0 }}>
                                                <h3 className={planStyles.blockTitle} style={{ textAlign: 'center', backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>
                                                    {block.name}
                                                </h3>
                                                {block.columns ? (
                                                    <div className={planStyles.blockColumns} style={{ padding: '20px' }}>
                                                        {block.columns.map((colName, colIdx) => (
                                                            <div key={colName} className={planStyles.colData}>
                                                                <h4>{colName}</h4>
                                                                {block.items?.filter(item => item.col === colIdx).map(item => (
                                                                    <TaskSlot
                                                                        key={item.id}
                                                                        taskId={item.id}
                                                                        label={item.label}
                                                                        isExtra={item.isExtra}
                                                                        customLabels={customLabels}
                                                                        onUpdateCustomLabel={handleUpdateCustomLabel}
                                                                        assignedName={localAssignments[item.id] ? getEmployeeName(localAssignments[item.id]) : null}
                                                                        employees={employees}
                                                                        onAssign={(empId) => handleAssign(item.id, empId)}
                                                                    />
                                                                ))}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className={planStyles.blockList} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '20px' }}>
                                                        {block.items?.map(item => (
                                                            <div key={item.id} style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                                <div style={{ fontWeight: 500, color: '#334155', marginBottom: '12px' }}>{item.label}</div>
                                                                <TaskSlot
                                                                    taskId={item.id}
                                                                    label="Atribuir Responsável"
                                                                    isExtra={item.isExtra}
                                                                    customLabels={customLabels}
                                                                    onUpdateCustomLabel={handleUpdateCustomLabel}
                                                                    assignedName={localAssignments[item.id] ? getEmployeeName(localAssignments[item.id]) : null}
                                                                    employees={employees}
                                                                    onAssign={(empId) => handleAssign(item.id, empId)}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <DragOverlay>
                            {activeDragItem?.type === 'employee' && activeEmployee ? (
                                <div className={`${planStyles.draggableEmployee} ${planStyles.dragging}`}>
                                    <Avatar name={activeEmployee.name} size="sm" />
                                    <div className={planStyles.empInfo}>
                                        <span className={planStyles.empName}>{activeEmployee.name.split(' ')[0]}</span>
                                    </div>
                                </div>
                            ) : null}
                            {activeDragItem?.type === 'resident' && activeResidentName ? (
                                <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', background: '#fff', borderBottom: '1px solid #e2e8f0', borderRadius: '8px', color: '#475569', fontSize: '0.95rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', zIndex: 999 }}>
                                    {activeResidentName}
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                </div>
            </main>
        </>
    );
}
