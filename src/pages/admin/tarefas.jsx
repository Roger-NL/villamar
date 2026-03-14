import Head from 'next/head';
import { useState, useMemo, useEffect, startTransition, useRef } from 'react';
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

function getLocalISODate() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 10);
}

function DraggableEmployee({ id, name, role, draggableEnabled = true }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `employee:${id}`, disabled: !draggableEnabled });
    const style = {
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0.5 : 1,
        touchAction: draggableEnabled ? 'none' : 'auto'
    };

    return (
        <div ref={setNodeRef} style={style} {...(draggableEnabled ? listeners : {})} {...(draggableEnabled ? attributes : {})} className={`${planStyles.draggableEmployee} ${isDragging ? planStyles.dragging : ''}`}>
            <Avatar name={name} size="sm" />
            <div className={planStyles.empInfo}>
                <span className={planStyles.empName}>{name.split(' ')[0]}</span>
                <span className={planStyles.empRole}>{role}</span>
            </div>
        </div>
    );
}

function DraggableResident({ id, resident, status, customName, onCycleStatus, onUpdateName, onDelete, draggableEnabled = true }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: id, disabled: !draggableEnabled });
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
        cursor: draggableEnabled ? 'grab' : 'default',
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
        startTransition(() => {
            setEditValue(customName || resident);
        });
    }, [customName, resident]);

    return (
        <div ref={setNodeRef} style={style} {...(!isEditing && draggableEnabled ? listeners : {})} {...(!isEditing && draggableEnabled ? attributes : {})}>
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
        startTransition(() => {
            setEditValue(displayLabel);
        });
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

function ResidentDropZone({ id, residents, sourceId, residentStatuses, customResidentNames, onCycleStatus, onUpdateName, onDelete, draggableEnabled = true, emptyText = 'Arraste utentes para aqui...' }) {
    const { isOver, setNodeRef } = useDroppable({ id });
    return (
        <div
            ref={setNodeRef}
            className={`${planStyles.residentDropZone} ${isOver ? planStyles.residentDropZoneOver : ''}`}
        >
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
                    draggableEnabled={draggableEnabled}
                />
            ))}
            {residents.length === 0 && <div className={planStyles.residentEmpty}>{emptyText}</div>}
        </div>
    );
}

function TaskSlot({ taskId, label, isExtra, customLabels, onUpdateCustomLabel, assignedName, employees, onAssign, isMobileView = false }) {
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
                    {assignedName || (isMobileView ? 'Selecionar responsável' : 'Arrastar ou Selecionar')}
                </span>
                {assignedName && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onAssign(null); }}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                        title="Remover atribuição"
                    >
                        <X size={14} />
                    </button>
                )}
                {isMobileView ? (
                    <select
                        value={assignedName ? employees.find(e => e.name.split(' ')[0] === assignedName || e.name === assignedName)?.id || "" : ""}
                        onChange={(e) => onAssign(e.target.value)}
                        className={planStyles.mobileAssignSelect}
                    >
                        <option value="">Selecionar...</option>
                        <option value="unassign">-- Remover --</option>
                        {employees.map(e => <option key={e.id} value={e.id}>{e.name.split(' ')[0]}</option>)}
                    </select>
                ) : (
                    <select
                        value={assignedName ? employees.find(e => e.name.split(' ')[0] === assignedName || e.name === assignedName)?.id || "" : ""}
                        onChange={(e) => onAssign(e.target.value)}
                        className={planStyles.slotSelect}
                    >
                        <option value="" disabled>Atribuir...</option>
                        <option value="unassign">-- Remover --</option>
                        {employees.map(e => <option key={e.id} value={e.id}>{e.name.split(' ')[0]}</option>)}
                    </select>
                )}
            </div>
        </div>
    );
}

export default function AdminTarefasPage() {
    const { isAdmin, toggleMode, currentUser } = useApp();
    const { employees, dailyPlans, updateDailyPlan, publishDailyPlan, isHydrated } = useData();

    // YYYY-MM-DD local logic
    const [selectedDate, setSelectedDate] = useState(() => getLocalISODate());
    const [period, setPeriod] = useState("DAY");
    const [activeDragItem, setActiveDragItem] = useState(null);
    const [localAssignments, setLocalAssignments] = useState({});
    const [customLabels, setCustomLabels] = useState({});
    const [localGroupResidents, setLocalGroupResidents] = useState({});
    const [residentStatuses, setResidentStatuses] = useState({});
    const [customResidentNames, setCustomResidentNames] = useState({});
    const [isMobileView, setIsMobileView] = useState(false);
    const residentCounterRef = useRef(0);

    const planKey = period === 'DAY' ? selectedDate : `${selectedDate}_NIGHT`;
    const currentTemplate = period === 'DAY' ? planoDiarioTemplate : planoDiarioNoturnoTemplate;

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    useEffect(() => {
        const updateViewportMode = () => {
            setIsMobileView(window.innerWidth < 768);
        };

        updateViewportMode();
        window.addEventListener('resize', updateViewportMode);

        return () => window.removeEventListener('resize', updateViewportMode);
    }, []);

    useEffect(() => {
        if (isHydrated) {
            const plan = dailyPlans[planKey];
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
            startTransition(() => {
                setLocalAssignments(plan?.assignments || {});
                setCustomLabels(plan?.customLabels || {});
                setResidentStatuses(plan?.residentStatuses || {});
                setCustomResidentNames(plan?.customResidentNames || {});
                setLocalGroupResidents(updatedGroups);
            });
        }
    }, [planKey, dailyPlans, isHydrated, currentTemplate]);

    const getEmployeeName = (id) => employees.find(e => e.id == id)?.name.split(' ')[0] || null;

    const handleAssign = (taskId, employeeId) => {
        let newAssignments;
        if (!employeeId || employeeId === 'unassign') {
            newAssignments = { ...localAssignments };
            delete newAssignments[taskId];
        } else {
            newAssignments = { ...localAssignments, [taskId]: employeeId };
        }
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

            if (current === null) nextStatus = 'Banho';
            else if (current === 'Banho') nextStatus = 'Troca';
            else if (current === 'Troca') nextStatus = null;

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
        residentCounterRef.current += 1;
        const newName = `Nova Pessoa ${residentCounterRef.current}`;
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
                    <div className={styles.pageHeader} style={{ marginBottom: '20px', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start' }}>
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
                            <div className={planStyles.periodSwitch}>
                                <button
                                    onClick={() => setPeriod('DAY')}
                                    className={`${planStyles.periodBtn} ${period === 'DAY' ? planStyles.periodBtnActiveDay : ''}`}
                                >
                                    <Sun size={16} /> Diurno
                                </button>
                                <button
                                    onClick={() => setPeriod('NIGHT')}
                                    className={`${planStyles.periodBtn} ${period === 'NIGHT' ? planStyles.periodBtnActiveNight : ''}`}
                                >
                                    <Moon size={16} /> Noturno
                                </button>
                            </div>
                            <button
                                onClick={handleClearPlan}
                                className={planStyles.dangerBtn}
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
                                <p className={planStyles.helperText}>
                                    {isMobileView ? 'No telemóvel, use o seletor dentro de cada tarefa.' : 'Arraste o funcionário para a tarefa ou atribua na caixa.'}
                                </p>
                                <div className={planStyles.employeesList}>
                                    {employees.filter(e => !e.isAdmin).map(emp => (
                                        <DraggableEmployee key={emp.id} id={emp.id} name={emp.name} role={emp.role} draggableEnabled={!isMobileView} />
                                    ))}
                                </div>
                            </div>

                            {/* Plan Canvas */}
                            <div className={planStyles.planCol}>
                                <div className={planStyles.blocksStack}>
                                    {currentTemplate.blocks.map(block => {
                                        if (block.type === 'group_assignment') {
                                            return (
                                                <div key={block.id} className={planStyles.block} style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
                                                    <h3 className={planStyles.blockTitle}>
                                                        {block.name}
                                                    </h3>
                                                    <div className={planStyles.groupBlockBody}>

                                                        {/* Unassigned Pool */}
                                                        {localGroupResidents?.[block.id]?.unassigned?.length > 0 && (
                                                            <div className={planStyles.unassignedCard}>
                                                                <div className={planStyles.unassignedHeader}>
                                                                    <span>Utentes Não Atribuídos</span>
                                                                    <button onClick={() => handleAddNewResident(block.id, 'unassigned')} className={planStyles.actionLink}>+ Adicionar à Lista</button>
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
                                                                    draggableEnabled={!isMobileView}
                                                                    emptyText={isMobileView ? 'Sem utentes nesta lista.' : 'Arraste utentes para aqui...'}
                                                                />
                                                            </div>
                                                        )}

                                                        {/* Employee Assignment Slots & Assigned Residents */}
                                                        <div className={planStyles.assignmentMatrix}>
                                                            {block.columns.map((colName, colIdx) => {
                                                                const taskId = `${block.id}_${colIdx}`;
                                                                return (
                                                                    <div key={colIdx} className={planStyles.assignmentColumn}>
                                                                        <h4 className={planStyles.columnTitle}>
                                                                            <span>{colName}</span>
                                                                        </h4>
                                                                        <TaskSlot
                                                                            taskId={taskId}
                                                                            label="Atribuir Responsável"
                                                                            assignedName={localAssignments[taskId] ? getEmployeeName(localAssignments[taskId]) : null}
                                                                            employees={employees}
                                                                            onAssign={(empId) => handleAssign(taskId, empId)}
                                                                            isMobileView={isMobileView}
                                                                        />
                                                                        <div className={planStyles.columnCard}>
                                                                            <div className={planStyles.residentsHeader}>
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
                                                                                draggableEnabled={!isMobileView}
                                                                                emptyText={isMobileView ? 'Sem utentes atribuídos.' : 'Arraste utentes para aqui...'}
                                                                            />
                                                                            <div className={planStyles.residentsFooter}>
                                                                                <button
                                                                                    onClick={() => handleAddNewResident(block.id, colIdx)}
                                                                                    className={planStyles.actionLink}
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
                                                <h3 className={planStyles.blockTitle}>
                                                    {block.name}
                                                </h3>
                                                {block.columns ? (
                                                    <div className={`${planStyles.blockColumns} ${planStyles.blockColumnsPadded}`}>
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
                                                    <div className={planStyles.simpleTasksGrid}>
                                                        {block.items?.map(item => (
                                                            <div key={item.id} className={planStyles.simpleTaskCard}>
                                                                <div className={planStyles.simpleTaskTitle}>{item.label}</div>
                                                                <TaskSlot
                                                                    taskId={item.id}
                                                                    label="Atribuir Responsável"
                                                                    isExtra={item.isExtra}
                                                                    customLabels={customLabels}
                                                                    onUpdateCustomLabel={handleUpdateCustomLabel}
                                                                    assignedName={localAssignments[item.id] ? getEmployeeName(localAssignments[item.id]) : null}
                                                                    employees={employees}
                                                                    onAssign={(empId) => handleAssign(item.id, empId)}
                                                                    isMobileView={isMobileView}
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
                            {!isMobileView && activeDragItem?.type === 'employee' && activeEmployee ? (
                                <div className={`${planStyles.draggableEmployee} ${planStyles.dragging}`}>
                                    <Avatar name={activeEmployee.name} size="sm" />
                                    <div className={planStyles.empInfo}>
                                        <span className={planStyles.empName}>{activeEmployee.name.split(' ')[0]}</span>
                                    </div>
                                </div>
                            ) : null}
                            {!isMobileView && activeDragItem?.type === 'resident' && activeResidentName ? (
                                <div className={planStyles.residentDragPreview}>
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
