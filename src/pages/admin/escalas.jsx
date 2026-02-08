import Head from 'next/head';
import styles from '@/styles/AdminPages.module.css';
import genStyles from '@/styles/ScheduleGenerator.module.css';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import Avatar from '@/components/ui/Avatar';
import { useApp } from '../_app';
import { useData } from '@/contexts/DataContext';
import { generateMonthlySchedule, formatScheduleForGrid } from '@/utils/scheduleGenerator';
import { Calendar, Sun, Moon, Coffee, ChevronLeft, ChevronRight, Sparkles, Save, X } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';

export default function AdminEscalasPage() {
    const { isAdmin, toggleMode, currentUser } = useApp();
    const { employees, saveSchedule, getScheduleForMonth, updateShift } = useData();

    // Estado para mês/ano selecionado
    const today = new Date();
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());

    // Estado para escala (gerada ou carregada)
    const [currentSchedule, setCurrentSchedule] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Modal de edição de célula
    const [editModal, setEditModal] = useState(null); // { employeeId, date, currentShift }

    // Funcionários para a escala (filtrar apenas cuidadores/auxiliares ativos)
    const scheduleEmployees = employees.filter(e =>
        e.role !== 'Enfermeira' // Enfermeira tem horário fixo
    );

    // Carregar escala salva ao mudar de mês
    useEffect(() => {
        const saved = getScheduleForMonth(selectedYear, selectedMonth);
        if (saved) {
            setCurrentSchedule(saved);
            setHasUnsavedChanges(false);
        } else {
            setCurrentSchedule(null);
        }
    }, [selectedYear, selectedMonth, getScheduleForMonth]);

    // Gerar nova escala
    const handleGenerate = () => {
        setIsGenerating(true);
        setTimeout(() => {
            const schedule = generateMonthlySchedule(scheduleEmployees, selectedYear, selectedMonth);
            setCurrentSchedule(schedule);
            setHasUnsavedChanges(true);
            setIsGenerating(false);
        }, 500);
    };

    // Guardar escala
    const handleSave = () => {
        if (currentSchedule) {
            saveSchedule(selectedYear, selectedMonth, currentSchedule);
            setHasUnsavedChanges(false);
        }
    };

    // Atualizar turno de uma célula
    const handleCellClick = (employeeId, date, currentShift) => {
        setEditModal({ employeeId, date, currentShift });
    };

    const handleShiftChange = (newShift) => {
        if (!editModal || !currentSchedule) return;

        const { employeeId, date } = editModal;

        // Atualizar localmente
        setCurrentSchedule(prev => {
            const updatedSchedules = {
                ...prev.schedules,
                [employeeId]: {
                    ...prev.schedules[employeeId],
                    [date]: {
                        shift: newShift,
                        hours: newShift === 'Manhã' ? '8h-16:30' : newShift === 'Tarde' ? '11:30-20h' : '',
                        isOff: newShift === 'Folga',
                    }
                }
            };
            return { ...prev, schedules: updatedSchedules };
        });

        setHasUnsavedChanges(true);
        setEditModal(null);
    };

    // Formatar escala para exibição
    const gridData = useMemo(() => {
        if (!currentSchedule) return null;
        return formatScheduleForGrid(currentSchedule);
    }, [currentSchedule]);

    // Navegar entre meses
    const goToPrevMonth = () => {
        if (selectedMonth === 0) {
            setSelectedMonth(11);
            setSelectedYear(y => y - 1);
        } else {
            setSelectedMonth(m => m - 1);
        }
    };

    const goToNextMonth = () => {
        if (selectedMonth === 11) {
            setSelectedMonth(0);
            setSelectedYear(y => y + 1);
        } else {
            setSelectedMonth(m => m + 1);
        }
    };

    const monthName = new Date(selectedYear, selectedMonth, 1)
        .toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });

    const getShiftClass = (shift) => {
        if (shift === 'Manhã') return 'M';
        if (shift === 'Tarde') return 'T';
        if (shift === 'Folga') return 'F';
        return '';
    };

    const getShiftIcon = (shift) => {
        if (shift === 'Manhã') return <Sun size={14} strokeWidth={2.5} />;
        if (shift === 'Tarde') return <Moon size={14} strokeWidth={2.5} />;
        if (shift === 'Folga') return <Coffee size={14} strokeWidth={2.5} />;
        return null;
    };

    return (
        <>
            <Head>
                <title>Escalas - Admin Villa Mar</title>
            </Head>

            <Header user={currentUser} isAdmin={isAdmin} onModeSwitch={toggleMode} />
            <Sidebar isAdmin={true} />
            <BottomNav isAdmin={true} />

            <main className={styles.main}>
                <div className={styles.container}>
                    <div className={styles.pageHeader}>
                        <h1 className={styles.pageTitle}>
                            <Calendar size={28} />
                            Escalas
                        </h1>
                        {hasUnsavedChanges && (
                            <span className={genStyles.unsavedBadge}>Alterações não guardadas</span>
                        )}
                    </div>

                    {/* Month Selector + Generate Button */}
                    <div className={genStyles.controls}>
                        <div className={genStyles.monthNav}>
                            <button onClick={goToPrevMonth} className={genStyles.navBtn}>
                                <ChevronLeft size={20} />
                            </button>
                            <span className={genStyles.monthLabel}>{monthName}</span>
                            <button onClick={goToNextMonth} className={genStyles.navBtn}>
                                <ChevronRight size={20} />
                            </button>
                        </div>

                        {/* Legend */}
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div className={styles.legendItem} style={{ background: 'none', padding: 0 }}>
                                <div className={`${genStyles.shiftBadge} ${genStyles.M}`}><Sun size={12} strokeWidth={2.5} /></div>
                                <span style={{ fontSize: '13px', fontWeight: 500 }}>Manhã</span>
                            </div>
                            <div className={styles.legendItem} style={{ background: 'none', padding: 0 }}>
                                <div className={`${genStyles.shiftBadge} ${genStyles.T}`}><Moon size={12} strokeWidth={2.5} /></div>
                                <span style={{ fontSize: '13px', fontWeight: 500 }}>Tarde</span>
                            </div>
                            <div className={styles.legendItem} style={{ background: 'none', padding: 0 }}>
                                <div className={`${genStyles.shiftBadge} ${genStyles.F}`}><Coffee size={12} strokeWidth={2.5} /></div>
                                <span style={{ fontSize: '13px', fontWeight: 500 }}>Folga</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={handleGenerate}
                                className={genStyles.generateBtn}
                                disabled={isGenerating}
                            >
                                <Sparkles size={16} />
                                {isGenerating ? 'A gerar...' : 'Gerar Escala'}
                            </button>

                            {gridData && (
                                <button
                                    onClick={handleSave}
                                    className={genStyles.saveBtn}
                                    disabled={!hasUnsavedChanges}
                                >
                                    <Save size={16} />
                                    Guardar
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Generated Schedule Grid */}
                    {gridData ? (
                        <div className={genStyles.scheduleWrapper}>
                            <div className={genStyles.scheduleGrid}>
                                {/* Header Row - Days */}
                                <div className={genStyles.gridHeader}>
                                    <div className={genStyles.nameColumn}>Funcionário</div>
                                    {gridData.headers.map((day, i) => {
                                        const isToday = new Date().toISOString().split('T')[0] === day.date;
                                        const isSunday = day.dayOfWeek === 0;

                                        return (
                                            <div
                                                key={i}
                                                className={`
                                                    ${genStyles.dayColumn} 
                                                    ${day.isWeekend ? genStyles.weekend : ''}
                                                    ${isToday ? genStyles.currentDay : ''}
                                                    ${isSunday ? genStyles.weekEnd : ''}
                                                `}
                                            >
                                                <span className={genStyles.dayName}>{day.dayName}</span>
                                                <span className={genStyles.dayNum}>{day.dayNum}</span>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Employee Rows */}
                                {gridData.rows.map((row, i) => (
                                    <div key={i} className={genStyles.gridRow}>
                                        <div className={genStyles.nameColumn}>
                                            <Avatar name={row.employee.name} size="sm" />
                                            <span>{row.employee.name.split(' ')[0]}</span>
                                        </div>
                                        {row.cells.map((cell, j) => {
                                            const isToday = new Date().toISOString().split('T')[0] === cell.date;
                                            const isSunday = cell.dayOfWeek === 0;

                                            return (
                                                <div
                                                    key={j}
                                                    className={`
                                                        ${genStyles.shiftCell} 
                                                        ${genStyles[getShiftClass(cell.shift)]}
                                                        ${genStyles.editable}
                                                        ${isToday ? genStyles.currentDay : ''}
                                                        ${isSunday ? genStyles.weekEnd : ''}
                                                    `}
                                                    title={`${cell.shift} - Clique para editar`}
                                                    onClick={() => handleCellClick(row.employee.id, cell.date, cell.shift)}
                                                >
                                                    {getShiftIcon(cell.shift)}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className={genStyles.emptyState}>
                            <Calendar size={48} />
                            <h3>Nenhuma escala para este mês</h3>
                            <p>Clique em "Gerar Escala" para criar uma escala automática para {monthName}.</p>
                        </div>
                    )}
                </div>
            </main>

            {/* Edit Shift Modal */}
            {editModal && (
                <div className={genStyles.modalOverlay} onClick={() => setEditModal(null)}>
                    <div className={genStyles.editModal} onClick={e => e.stopPropagation()}>
                        <div className={genStyles.modalHeader}>
                            <h3>Alterar Turno</h3>
                            <button onClick={() => setEditModal(null)} className={genStyles.closeBtn}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className={genStyles.shiftOptions}>
                            <button
                                className={`${genStyles.shiftOption} ${genStyles.M} ${editModal.currentShift === 'Manhã' ? genStyles.active : ''}`}
                                onClick={() => handleShiftChange('Manhã')}
                            >
                                <Sun size={20} />
                                <span>Manhã</span>
                                <small>8h - 16:30</small>
                            </button>
                            <button
                                className={`${genStyles.shiftOption} ${genStyles.T} ${editModal.currentShift === 'Tarde' ? genStyles.active : ''}`}
                                onClick={() => handleShiftChange('Tarde')}
                            >
                                <Moon size={20} />
                                <span>Tarde</span>
                                <small>11:30 - 20h</small>
                            </button>
                            <button
                                className={`${genStyles.shiftOption} ${genStyles.F} ${editModal.currentShift === 'Folga' ? genStyles.active : ''}`}
                                onClick={() => handleShiftChange('Folga')}
                            >
                                <Coffee size={20} />
                                <span>Folga</span>
                                <small>Dia livre</small>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
