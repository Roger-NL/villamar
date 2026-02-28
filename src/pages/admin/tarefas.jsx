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
import { planoDiarioTemplate } from '@/data/planoDiarioTemplate';
import { Calendar, Save, Send, ClipboardList, Check } from 'lucide-react';

function DraggableEmployee({ id, name, role }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: id.toString() });
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

function TaskSlot({ taskId, label, isExtra, customLabels, onUpdateCustomLabel, assignedName, employees, onAssign }) {
    const dropId = `task:${taskId}`;
    const { isOver, setNodeRef } = useDroppable({ id: dropId });

    const displayLabel = customLabels && customLabels[taskId] ? customLabels[taskId] : label;

    const handleLabelClick = () => {
        if (!isExtra) return;
        const newLabel = prompt("Digite o nome (Ex: João, Limpeza extra, etc):", displayLabel === label ? "" : displayLabel);
        if (newLabel !== null) {
            onUpdateCustomLabel(taskId, newLabel || label);
        }
    };

    return (
        <div className={planStyles.taskRow}>
            <span
                className={planStyles.taskLabel}
                style={isExtra ? { color: '#0077b6', cursor: 'pointer', fontWeight: customLabels && customLabels[taskId] ? 'bold' : 'normal' } : {}}
                onClick={handleLabelClick}
                title={isExtra ? "Clique para editar o nome" : ""}
            >
                {displayLabel}
            </span>
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
    const [activeEmployeeId, setActiveEmployeeId] = useState(null);
    const [localAssignments, setLocalAssignments] = useState({});
    const [customLabels, setCustomLabels] = useState({});

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    useEffect(() => {
        if (isHydrated) {
            const plan = dailyPlans[selectedDate];
            if (plan && plan.assignments) {
                setLocalAssignments(plan.assignments);
            } else {
                setLocalAssignments({});
            }
            if (plan && plan.customLabels) {
                setCustomLabels(plan.customLabels);
            } else {
                setCustomLabels({});
            }
        }
    }, [selectedDate, dailyPlans, isHydrated]);

    const getEmployeeName = (id) => employees.find(e => e.id == id)?.name.split(' ')[0] || null;

    const handleAssign = (taskId, employeeId) => {
        const newAssignments = { ...localAssignments, [taskId]: employeeId };
        setLocalAssignments(newAssignments);
        updateDailyPlan(selectedDate, newAssignments, customLabels); // Pass customLabels to context method (need to update context signature)
    };

    const handleUpdateCustomLabel = (taskId, newLabel) => {
        const newLabels = { ...customLabels, [taskId]: newLabel };
        setCustomLabels(newLabels);
        updateDailyPlan(selectedDate, localAssignments, newLabels);
    };

    const handleDragStart = (event) => {
        setActiveEmployeeId(event.active.id);
    };

    const handleDragEnd = (event) => {
        const { over, active } = event;
        setActiveEmployeeId(null);
        if (!over) return;

        const employeeId = active.id;
        const dropId = over.id;

        if (dropId.startsWith("task:")) {
            const taskId = dropId.replace("task:", "");
            handleAssign(taskId, employeeId);
        }
    };

    const handlePublish = () => {
        publishDailyPlan(selectedDate);
    };

    if (!isHydrated) return <div>A carregar...</div>;

    const activeEmployee = employees.find(e => e.id == activeEmployeeId);
    const currentPlan = dailyPlans[selectedDate];
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
                                {planoDiarioTemplate.blocks.map(block => (
                                    <div key={block.id} className={planStyles.block}>
                                        <h3 className={planStyles.blockTitle}>
                                            {block.name}
                                        </h3>

                                        {block.columns ? (
                                            <div className={planStyles.blockColumns}>
                                                {block.columns.map((colName, colIdx) => (
                                                    <div key={colName} className={planStyles.colData}>
                                                        <h4>{colName}</h4>
                                                        {block.items.filter(item => item.col === colIdx).map(item => (
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
                                            <div className={planStyles.blockList}>
                                                {block.items.map(item => (
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
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <DragOverlay>
                            {activeEmployeeId && activeEmployee ? (
                                <div className={`${planStyles.draggableEmployee} ${planStyles.dragging}`}>
                                    <Avatar name={activeEmployee.name} size="sm" />
                                    <div className={planStyles.empInfo}>
                                        <span className={planStyles.empName}>{activeEmployee.name.split(' ')[0]}</span>
                                    </div>
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                </div>
            </main>
        </>
    );
}
