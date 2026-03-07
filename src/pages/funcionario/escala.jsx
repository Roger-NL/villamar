import Head from 'next/head';
import React, { useState, useMemo, useEffect } from 'react';
import styles from '@/styles/Schedule.module.css';
import genStyles from '@/styles/ScheduleGenerator.module.css';
import dashStyles from '@/styles/Dashboard.module.css';
import escStyles from '@/styles/EscalaReal.module.css';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import Avatar from '@/components/ui/Avatar';
import Card from '@/components/ui/Card';
import { useApp } from '../_app';
import { useData } from '@/contexts/DataContext';
import { formatScheduleForGrid } from '@/utils/scheduleGenerator';
import { getRealScheduleData } from '@/data/mockData';
import { Calendar, Sun, Sunset, Moon, Coffee, ChevronLeft, ChevronRight, X, AlertCircle, Send, Plane, HeartPulse } from 'lucide-react';

export default function EscalaPage() {
    const { isAdmin, toggleMode, currentUser } = useApp();
    const { employees, getScheduleForMonth, addSwapRequest, approveSwapRequest, addNotification } = useData();

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

    // Buscar dados reais do mês para exibição em tabela
    const scheduleData = useMemo(() => {
        return getRealScheduleData(selectedYear, selectedMonth);
    }, [selectedYear, selectedMonth]);

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

    const dayLabels = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

    // Gerar array de dias do mês
    const daysInMonth = useMemo(() => {
        const count = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        const days = [];
        for (let d = 1; d <= count; d++) {
            const date = new Date(selectedYear, selectedMonth, d);
            days.push({
                num: d,
                dow: date.getDay(),
                label: dayLabels[date.getDay()],
                isWeekend: date.getDay() === 0 || date.getDay() === 6,
                isToday: date.toISOString().split('T')[0] === today.toISOString().split('T')[0],
            });
        }
        return days;
    }, [selectedYear, selectedMonth]);

    // Cor e estilo por código
    const getCellClass = (code) => {
        if (!code) return escStyles.folga;
        const c = String(code).toUpperCase();
        if (c === 'M' || c === 'M/T' || c === 'T/M') return escStyles.manha;
        if (c === 'T') return escStyles.tarde;
        if (c === 'N') return escStyles.noite;
        if (c === 'D') return escStyles.diurno;
        if (c.startsWith('HL')) return escStyles.hl;
        if (c.startsWith('HM') || c === 'M/HM' || c === 'T/HM') return escStyles.hm;
        if (c.startsWith('HT')) return escStyles.ht;
        if (c.startsWith('HF')) return escStyles.hf;
        if (c.startsWith('HJ')) return escStyles.hj;
        if (c.startsWith('HC')) return escStyles.hc;
        return escStyles.folga;
    };

    const getCellText = (code) => {
        if (!code) return '';
        return String(code);
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
    const handleSwapRequest = async () => {
        if (!swapModal || !currentUser) return;

        const { targetEmployeeId, targetEmployeeName, targetDate, targetShift, myShift } = swapModal;

        // Validação: não pode trocar se já trabalha nesse dia
        if (myShift !== 'Folga' && targetShift !== 'Folga') {
            // Ambos trabalham nesse dia - troca de turnos é válida
        }


        // Criar pedido de troca
        const dateFormatted = new Date(targetDate).toLocaleDateString('pt-PT', {
            weekday: 'short',
            day: 'numeric',
            month: 'short'
        });

        const newRequest = await addSwapRequest({
            requestorId: currentUser.id,
            requestor: currentUser.name,
            swapWithId: targetEmployeeId,
            swapWith: targetEmployeeName,
            date: targetDate,
            dateFormatted,
            fromShift: myShift,
            toShift: targetShift,
        });

        // Se é admin, aprova automaticamente a troca para refletir na escala de todos
        if (isAdmin || currentUser?.role === 'Administrador' || currentUser?.isAdmin) {
            await approveSwapRequest(newRequest.id);
        }

        setSwapModal(null);
    };

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

                        {/* Menu de Legenda Compacto */}
                        <div className={escStyles.legend} style={{ marginTop: '16px' }}>
                            <span><b className={escStyles.cM}>M</b> Manhã</span>
                            <span><b className={escStyles.cT}>T</b> Tarde</span>
                            <span><b className={escStyles.cN}>N</b> Noite</span>
                            <span><b className={escStyles.cD}>D</b> Diurno</span>
                            <span><b className={escStyles.cHL}>HL</b> Hor. Logístico</span>
                            <span><b className={escStyles.cHM}>HM</b> Hor. Manhã</span>
                            <span><b className={escStyles.cHT}>HT</b> Hor. Tarde</span>
                            <span><b className={escStyles.cHF}>HF</b> Fisio</span>
                            <span><b className={escStyles.cHJ}>HJ</b> Joel</span>
                            <span><b className={escStyles.cHC}>HC</b> Cozinha</span>
                            <span className={escStyles.folgaLegend}>— Folga</span>
                        </div>
                    </div>

                    {/* Full Team Schedule Table */}
                    {scheduleData ? (
                        <div className={escStyles.tableWrap}>
                            <table className={escStyles.table}>
                                <thead>
                                    <tr>
                                        <th className={escStyles.nameHeader}>Nome</th>
                                        {daysInMonth.map(d => (
                                            <th key={d.num} className={`${escStyles.dayHeader} ${d.isWeekend ? escStyles.weekendH : ''} ${d.isToday ? escStyles.todayH : ''} ${d.dow === 0 ? escStyles.sundayBorder : ''}`}>
                                                <span className={escStyles.dayLabel}>{d.label}</span>
                                                <span className={escStyles.dayNum}>{d.num}</span>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {scheduleData.sections.map((section, si) => (
                                        <React.Fragment key={`section-${si}`}>
                                            {/* Section divider */}
                                            <tr className={escStyles.sectionRow}>
                                                <td colSpan={daysInMonth.length + 1} className={escStyles.sectionLabel}>
                                                    {section.label}
                                                </td>
                                            </tr>
                                            {section.employees.map((emp, ei) => {
                                                const codes = emp.days;
                                                const isMe = emp.id === currentUser?.id;

                                                // Logica de trocas
                                                const canSwap = !isMe;

                                                return (
                                                    <tr key={`${si}-${ei}`} className={`${escStyles.empRow} ${isMe ? styles.myRowHighlight : ''}`}>
                                                        <td className={escStyles.nameCell}>
                                                            <span className={escStyles.empName} style={{ fontWeight: isMe ? 700 : 500 }}>
                                                                {emp.name.split(' ')[0]} {isMe && '(Eu)'}
                                                            </span>
                                                            <span className={escStyles.empCode}>{emp.code}</span>
                                                        </td>
                                                        {codes.map((code, di) => {
                                                            const d = daysInMonth[di];
                                                            if (!d) return <td key={di} className={escStyles.cell}></td>;

                                                            const formattedDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d.num).padStart(2, '0')}`;

                                                            let titleMsg = code || 'Folga';
                                                            if (canSwap) {
                                                                titleMsg = `Clique para pedir troca com ${emp.name.split(' ')[0]} - Turno original: ${code || 'Folga'}`;
                                                            }

                                                            return (
                                                                <td
                                                                    key={di}
                                                                    className={`
                                                                        ${escStyles.cell} 
                                                                        ${getCellClass(code)} 
                                                                        ${d.isWeekend ? escStyles.weekendC : ''} 
                                                                        ${d.isToday ? escStyles.todayC : ''} 
                                                                        ${d.dow === 0 ? escStyles.sundayBorder : ''}
                                                                        ${canSwap ? styles.swappableCell : ''}
                                                                    `}
                                                                    style={(!canSwap && !isMe) ? { opacity: 0.7, cursor: 'not-allowed' } : { cursor: canSwap ? 'pointer' : 'default' }}
                                                                    title={titleMsg}
                                                                    onClick={() => canSwap && handleCellClick(emp, formattedDate, code || 'Folga')}
                                                                >
                                                                    {getCellText(code)}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                );
                                            })}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
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
                                        <span className={`${styles.shiftTag} ${escStyles[getCellClass(swapModal.myShift)] || ''}`}>
                                            {swapModal.myShift}
                                        </span>
                                    </div>
                                </div>

                                <div className={styles.swapArrow}>⇄</div>

                                <div className={styles.swapParty}>
                                    <Avatar name={swapModal.targetEmployeeName} size="md" />
                                    <div>
                                        <strong>{swapModal.targetEmployeeName?.split(' ')[0] || '?'}</strong>
                                        <span className={`${styles.shiftTag} ${escStyles[getCellClass(swapModal.targetShift)] || ''}`}>
                                            {swapModal.targetShift}
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

                            <button
                                className={styles.sendSwapBtn}
                                onClick={handleSwapRequest}
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
