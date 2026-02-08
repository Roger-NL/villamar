import Head from 'next/head';
import { useState, useMemo, useEffect } from 'react';
import styles from '@/styles/Schedule.module.css';
import genStyles from '@/styles/ScheduleGenerator.module.css';
import dashStyles from '@/styles/Dashboard.module.css';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import Avatar from '@/components/ui/Avatar';
import Card from '@/components/ui/Card';
import { useApp } from '../_app';
import { useData } from '@/contexts/DataContext';
import { formatScheduleForGrid } from '@/utils/scheduleGenerator';
import { Calendar, Sun, Moon, Coffee, ChevronLeft, ChevronRight, X, AlertCircle, Send } from 'lucide-react';

export default function EscalaPage() {
    const { isAdmin, toggleMode, currentUser } = useApp();
    const { employees, getScheduleForMonth, addSwapRequest, addNotification } = useData();

    // Estado para mês/ano selecionado
    const today = new Date();
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());

    // Estado para escala carregada
    const [currentSchedule, setCurrentSchedule] = useState(null);

    // Modal de pedido de troca
    const [swapModal, setSwapModal] = useState(null); // { targetEmployeeId, targetDate, targetShift }

    // Carregar escala salva ao mudar de mês
    useEffect(() => {
        const saved = getScheduleForMonth(selectedYear, selectedMonth);
        setCurrentSchedule(saved);
    }, [selectedYear, selectedMonth, getScheduleForMonth]);

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

    // Abrir modal de troca ao clicar em célula
    const handleCellClick = (targetEmployee, date, targetShift) => {
        // Não pode trocar consigo mesmo
        if (targetEmployee.id === currentUser?.id) return;

        // Verificar se o funcionário atual trabalha nesse dia
        const myShift = currentSchedule?.schedules?.[currentUser?.id]?.[date];

        setSwapModal({
            targetEmployeeId: targetEmployee.id,
            targetEmployeeName: targetEmployee.name,
            targetDate: date,
            targetShift,
            myShift: myShift?.shift || 'Folga',
        });
    };

    // Validar e enviar pedido de troca
    const handleSwapRequest = () => {
        if (!swapModal || !currentUser) return;

        const { targetEmployeeId, targetEmployeeName, targetDate, targetShift, myShift } = swapModal;

        // Validação: não pode trocar se já trabalha nesse dia
        if (myShift !== 'Folga' && targetShift !== 'Folga') {
            // Ambos trabalham nesse dia - troca de turnos é válida
        }

        // Validação: não pode pedir troca para o mesmo turno
        if (myShift === targetShift) {
            addNotification({
                type: 'swap_error',
                title: 'Troca Inválida',
                message: `Não pode trocar - vocês já têm o mesmo turno (${myShift}).`,
                forEmployee: currentUser.id,
            });
            setSwapModal(null);
            return;
        }

        // Criar pedido de troca
        const dateFormatted = new Date(targetDate).toLocaleDateString('pt-PT', {
            weekday: 'short',
            day: 'numeric',
            month: 'short'
        });

        addSwapRequest({
            requestorId: currentUser.id,
            requestor: currentUser.name,
            swapWithId: targetEmployeeId,
            swapWith: targetEmployeeName,
            date: targetDate,
            dateFormatted,
            fromShift: myShift,
            toShift: targetShift,
        });

        setSwapModal(null);
    };

    // Encontrar a minha linha na escala
    const myRow = gridData?.rows?.find(r => r.employee.id === currentUser?.id);

    return (
        <>
            <Head>
                <title>Escala - Villa Mar</title>
            </Head>

            <Header user={currentUser} isAdmin={isAdmin} onModeSwitch={toggleMode} />
            <Sidebar isAdmin={false} />
            <BottomNav isAdmin={false} />

            <main className={dashStyles.main}>
                <div className={dashStyles.container}>
                    <section className={dashStyles.greeting}>
                        <div className={dashStyles.greetingText}>
                            <span className={dashStyles.greetingLine}>
                                <Calendar size={20} />
                                Escala da Equipa
                            </span>
                            <p className={dashStyles.greetingSubtext}>
                                Clique num turno de colega para pedir troca
                            </p>
                        </div>
                    </section>

                    {/* Month Navigation */}
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div className={`${genStyles.shiftBadge} ${genStyles.M}`}><Sun size={12} strokeWidth={2.5} /></div>
                                <span style={{ fontSize: '12px' }}>Manhã</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div className={`${genStyles.shiftBadge} ${genStyles.T}`}><Moon size={12} strokeWidth={2.5} /></div>
                                <span style={{ fontSize: '12px' }}>Tarde</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div className={`${genStyles.shiftBadge} ${genStyles.F}`}><Coffee size={12} strokeWidth={2.5} /></div>
                                <span style={{ fontSize: '12px' }}>Folga</span>
                            </div>
                        </div>
                    </div>

                    {/* My Schedule Highlight */}
                    {myRow && (
                        <Card padding="md" className={styles.myScheduleCard}>
                            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600 }}>
                                A Minha Escala Este Mês
                            </h4>
                            <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '8px' }}>
                                {myRow.cells.map((cell, i) => {
                                    const isToday = new Date().toISOString().split('T')[0] === cell.date;
                                    return (
                                        <div
                                            key={i}
                                            className={`${genStyles.shiftCell} ${genStyles[getShiftClass(cell.shift)]} ${isToday ? styles.todayCell : ''}`}
                                            style={{ minWidth: '36px', maxWidth: '36px' }}
                                            title={`${new Date(cell.date).getDate()} - ${cell.shift}`}
                                        >
                                            {getShiftIcon(cell.shift)}
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    )}

                    {/* Full Team Schedule Grid (Read-Only) */}
                    {gridData ? (
                        <div className={genStyles.scheduleWrapper}>
                            <div className={genStyles.scheduleGrid}>
                                {/* Header Row - Days */}
                                <div className={genStyles.gridHeader}>
                                    <div className={genStyles.nameColumn}>Equipa</div>
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
                                {gridData.rows.map((row, i) => {
                                    const isMe = row.employee.id === currentUser?.id;

                                    return (
                                        <div key={i} className={`${genStyles.gridRow} ${isMe ? styles.myRow : ''}`}>
                                            <div className={genStyles.nameColumn}>
                                                <Avatar name={row.employee.name} size="sm" />
                                                <span>{row.employee.name.split(' ')[0]}</span>
                                                {isMe && <span className={styles.meTag}>Eu</span>}
                                            </div>
                                            {row.cells.map((cell, j) => {
                                                const isToday = new Date().toISOString().split('T')[0] === cell.date;
                                                const isSunday = cell.dayOfWeek === 0;
                                                const canSwap = !isMe; // Não pode trocar consigo mesmo

                                                return (
                                                    <div
                                                        key={j}
                                                        className={`
                                                            ${genStyles.shiftCell} 
                                                            ${genStyles[getShiftClass(cell.shift)]}
                                                            ${canSwap ? styles.swappable : ''}
                                                            ${isToday ? genStyles.currentDay : ''}
                                                            ${isSunday ? genStyles.weekEnd : ''}
                                                        `}
                                                        title={canSwap ? `Clique para pedir troca com ${row.employee.name.split(' ')[0]}` : cell.shift}
                                                        onClick={() => canSwap && handleCellClick(row.employee, cell.date, cell.shift)}
                                                    >
                                                        {getShiftIcon(cell.shift)}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className={genStyles.emptyState}>
                            <Calendar size={48} />
                            <h3>Nenhuma escala disponível</h3>
                            <p>A escala de {monthName} ainda não foi gerada pelo administrador.</p>
                        </div>
                    )}
                </div>
            </main>

            {/* Swap Request Modal */}
            {swapModal && (
                <div className={genStyles.modalOverlay} onClick={() => setSwapModal(null)}>
                    <div className={genStyles.editModal} onClick={e => e.stopPropagation()}>
                        <div className={genStyles.modalHeader}>
                            <h3>Pedir Troca</h3>
                            <button onClick={() => setSwapModal(null)} className={genStyles.closeBtn}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className={styles.swapModalContent}>
                            <div className={styles.swapSummary}>
                                <div className={styles.swapParty}>
                                    <Avatar name={currentUser?.name || 'Eu'} size="md" />
                                    <div>
                                        <strong>{currentUser?.name?.split(' ')[0]}</strong>
                                        <span className={`${styles.shiftTag} ${styles[getShiftClass(swapModal.myShift)]}`}>
                                            {getShiftIcon(swapModal.myShift)} {swapModal.myShift}
                                        </span>
                                    </div>
                                </div>

                                <div className={styles.swapArrow}>⇄</div>

                                <div className={styles.swapParty}>
                                    <Avatar name={swapModal.targetEmployeeName} size="md" />
                                    <div>
                                        <strong>{swapModal.targetEmployeeName.split(' ')[0]}</strong>
                                        <span className={`${styles.shiftTag} ${styles[getShiftClass(swapModal.targetShift)]}`}>
                                            {getShiftIcon(swapModal.targetShift)} {swapModal.targetShift}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.swapDate}>
                                📅 {new Date(swapModal.targetDate).toLocaleDateString('pt-PT', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long'
                                })}
                            </div>

                            {swapModal.myShift === swapModal.targetShift && (
                                <div className={styles.swapWarning}>
                                    <AlertCircle size={16} />
                                    <span>Não pode trocar - vocês têm o mesmo turno!</span>
                                </div>
                            )}

                            <button
                                className={styles.sendSwapBtn}
                                onClick={handleSwapRequest}
                                disabled={swapModal.myShift === swapModal.targetShift}
                            >
                                <Send size={16} />
                                Enviar Pedido ao Admin
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
