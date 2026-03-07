import Head from 'next/head';
import escStyles from '@/styles/EscalaReal.module.css';
import styles from '@/styles/AdminPages.module.css';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import { useApp } from '../_app';
import { useData } from '@/contexts/DataContext';
import { getRealScheduleData } from '@/data/mockData';
import { Calendar, ChevronLeft, ChevronRight, Save, ArrowLeftRight, Check, X } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';

export default function AdminEscalasPage() {
    const { isAdmin, toggleMode, currentUser } = useApp();
    const { saveSchedule } = useData();

    const today = new Date();
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const [localSchedule, setLocalSchedule] = useState(null);
    const [isSwapMode, setIsSwapMode] = useState(false);
    const [swapOrigin, setSwapOrigin] = useState(null);
    const [swapDest, setSwapDest] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // Buscar dados reais do mês
    useEffect(() => {
        setLocalSchedule(getRealScheduleData(selectedYear, selectedMonth));
        setIsSwapMode(false);
        setSwapOrigin(null);
        setSwapDest(null);
        setShowConfirmModal(false);
    }, [selectedYear, selectedMonth]);

    const handleCellClick = (sectionIdx, empIdx, dayIdx, code, empName, dateStr) => {
        if (!isSwapMode) return;

        if (!swapOrigin) {
            setSwapOrigin({ sectionIdx, empIdx, dayIdx, code, empName, dateStr });
        } else if (!swapDest) {
            // Não pode trocar a mesma célula
            if (swapOrigin.sectionIdx === sectionIdx && swapOrigin.empIdx === empIdx && swapOrigin.dayIdx === dayIdx) return;

            setSwapDest({ sectionIdx, empIdx, dayIdx, code, empName, dateStr });
            setShowConfirmModal(true);
        }
    };

    const confirmSwap = () => {
        if (!localSchedule) return;
        const newSchedule = { ...localSchedule };

        newSchedule.sections = newSchedule.sections.map(s => ({
            ...s,
            employees: s.employees.map(e => ({
                ...e,
                days: [...e.days]
            }))
        }));

        const oCode = swapOrigin.code;
        const dCode = swapDest.code;

        newSchedule.sections[swapOrigin.sectionIdx].employees[swapOrigin.empIdx].days[swapOrigin.dayIdx] = dCode;
        newSchedule.sections[swapDest.sectionIdx].employees[swapDest.empIdx].days[swapDest.dayIdx] = oCode;

        setLocalSchedule(newSchedule);
        setHasUnsavedChanges(true); // Opcional

        setIsSwapMode(false);
        setSwapOrigin(null);
        setSwapDest(null);
        setShowConfirmModal(false);
    };

    const goToPrevMonth = () => {
        if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
        else setSelectedMonth(m => m - 1);
    };
    const goToNextMonth = () => {
        if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
        else setSelectedMonth(m => m + 1);
    };

    const monthName = new Date(selectedYear, selectedMonth, 1)
        .toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });

    // Dias da semana curtos para o header
    const dayLabels = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

    // Gerar array de dias do mês
    const daysInMonth = useMemo(() => {
        const count = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        const days = [];
        for (let d = 1; d <= count; d++) {
            const date = new Date(selectedYear, selectedMonth, d);
            days.push({
                num: d,
                dow: date.getDay(), // 0=dom ... 6=sáb
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
                    {/* Título + Navegação mês */}
                    <div className={escStyles.topBar}>
                        <h1 className={escStyles.title}>
                            <Calendar size={24} />
                            Escalas
                        </h1>
                        <div className={escStyles.monthNav}>
                            <button onClick={goToPrevMonth} className={escStyles.navBtn}><ChevronLeft size={18} /></button>
                            <span className={escStyles.monthLabel}>{monthName}</span>
                            <button onClick={goToNextMonth} className={escStyles.navBtn}><ChevronRight size={18} /></button>
                        </div>

                        <div style={{ marginLeft: 'auto' }}>
                            <button
                                onClick={() => { setIsSwapMode(!isSwapMode); setSwapOrigin(null); setSwapDest(null); setShowConfirmModal(false); }}
                                style={{ background: isSwapMode ? '#EF4444' : '#E0F2FE', color: isSwapMode ? 'white' : '#0284C7', border: 'none', padding: '8px 16px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', transition: 'all 0.2s' }}
                            >
                                {isSwapMode ? <X size={18} /> : <ArrowLeftRight size={18} />}
                                {isSwapMode ? 'Cancelar Troca' : 'Modo Troca Visual'}
                            </button>
                        </div>
                    </div>

                    {isSwapMode && (
                        <div style={{ background: '#DBEAFE', color: '#1E3A8A', padding: '16px 20px', borderRadius: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 'bold' }}>
                            <ArrowLeftRight size={20} />
                            {!swapOrigin
                                ? 'Passo 1: Clique diretamente na grelha no turno que quer alterar.'
                                : `Passo 2: Clique no turno pelo qual pretende trocar o turno de ${swapOrigin.empName.split(' ')[0]}.`}
                        </div>
                    )}

                    {/* Legenda compacta */}
                    <div className={escStyles.legend}>
                        <span><b className={escStyles.cM}>M</b> Manhã</span>
                        <span><b className={escStyles.cT}>T</b> Tarde</span>
                        <span><b className={escStyles.cN}>N</b> Noite</span>
                        <span><b className={escStyles.cD}>D</b> Diurno</span>
                        <span><b className={escStyles.cHL}>HL</b> Horário Logístico</span>
                        <span><b className={escStyles.cHM}>HM</b> Horário Manhã</span>
                        <span><b className={escStyles.cHT}>HT</b> Horário T</span>
                        <span><b className={escStyles.cHF}>HF</b> Fisioterapia</span>
                        <span><b className={escStyles.cHJ}>HJ</b> Joel</span>
                        <span><b className={escStyles.cHC}>HC</b> Cozinha</span>
                        <span className={escStyles.folgaLegend}>— Folga</span>
                    </div>

                    {localSchedule ? (
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
                                        <th className={escStyles.statsHeader}>FDS</th>
                                        <th className={escStyles.statsHeader}>Flg</th>
                                        <th className={escStyles.statsHeader}>Dias</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {localSchedule.sections.map((section, si) => (
                                        <>
                                            {/* Section divider */}
                                            <tr key={`section-${si}`} className={escStyles.sectionRow}>
                                                <td colSpan={daysInMonth.length + 4} className={escStyles.sectionLabel}>
                                                    {section.label}
                                                </td>
                                            </tr>
                                            {section.employees.map((emp, ei) => {
                                                // Calcular stats
                                                const codes = emp.days;
                                                let fds = 0, folgas = 0, dias = 0;
                                                codes.forEach((code, idx) => {
                                                    const d = daysInMonth[idx];
                                                    if (!d) return;
                                                    if (!code) {
                                                        if (d.isWeekend) fds++;
                                                        else folgas++;
                                                    } else {
                                                        dias++;
                                                    }
                                                });

                                                return (
                                                    <tr key={`${si}-${ei}`} className={escStyles.empRow}>
                                                        <td className={escStyles.nameCell}>
                                                            <span className={escStyles.empName}>{emp.name.split(' ')[0]}</span>
                                                            <span className={escStyles.empCode}>{emp.code}</span>
                                                        </td>
                                                        {codes.map((code, di) => {
                                                            const d = daysInMonth[di];
                                                            if (!d) return <td key={di} className={escStyles.cell}></td>;

                                                            const isOrigin = swapOrigin && swapOrigin.sectionIdx === si && swapOrigin.empIdx === ei && swapOrigin.dayIdx === di;
                                                            const formattedDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d.num).padStart(2, '0')}`;

                                                            return (
                                                                <td
                                                                    key={di}
                                                                    onClick={() => handleCellClick(si, ei, di, code, emp.name, formattedDate)}
                                                                    className={`
                                                                        ${escStyles.cell} 
                                                                        ${getCellClass(code)} 
                                                                        ${d.isWeekend ? escStyles.weekendC : ''} 
                                                                        ${d.isToday ? escStyles.todayC : ''} 
                                                                        ${d.dow === 0 ? escStyles.sundayBorder : ''}
                                                                    `}
                                                                    style={{
                                                                        cursor: isSwapMode ? 'pointer' : 'default',
                                                                        border: isOrigin ? '2px dashed #3B82F6' : undefined,
                                                                        opacity: isSwapMode && !isOrigin && swapOrigin ? 0.7 : 1,
                                                                    }}
                                                                >
                                                                    {getCellText(code)}
                                                                </td>
                                                            );
                                                        })}
                                                        <td className={escStyles.statCell}>{fds}</td>
                                                        <td className={escStyles.statCell}>{folgas}</td>
                                                        <td className={escStyles.statCell}>{dias}</td>
                                                    </tr>
                                                );
                                            })}
                                        </>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className={escStyles.empty}>
                            <Calendar size={40} />
                            <h3>Sem escala para {monthName}</h3>
                            <p>Os meses de Fevereiro e Março de 2026 têm escala real carregada.</p>
                        </div>
                    )}

                    {/* Modal de Confirmação de Troca Visual */}
                    {showConfirmModal && swapOrigin && swapDest && (
                        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => { setSwapDest(null); setShowConfirmModal(false); }}>
                            <div style={{ background: 'white', padding: '32px', borderRadius: '24px', maxWidth: '400px', width: '90%', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
                                <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '0 0 24px 0', fontSize: '20px', color: '#0F172A' }}>
                                    <ArrowLeftRight color="#3B82F6" />
                                    Confirmar Troca?
                                </h2>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', padding: '16px', background: '#F8FAFC', borderRadius: '16px' }}>
                                    <div style={{ textAlign: 'center', width: '40%' }}>
                                        <div style={{ fontWeight: 'bold', color: '#1E293B', marginBottom: '4px' }}>{swapOrigin.empName.split(' ')[0]}</div>
                                        <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '8px' }}>Dia {parseInt(swapOrigin.dateStr.split('-')[2])}</div>
                                        <div className={`${escStyles[getCellClass(swapOrigin.code)] || escStyles.folga}`} style={{ padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold', display: 'inline-block', border: '1px solid #E2E8F0', background: !swapOrigin.code ? '#F1F5F9' : undefined }}>{swapOrigin.code || 'Folga'}</div>
                                    </div>

                                    <ArrowLeftRight size={24} color="#94A3B8" />

                                    <div style={{ textAlign: 'center', width: '40%' }}>
                                        <div style={{ fontWeight: 'bold', color: '#1E293B', marginBottom: '4px' }}>{swapDest.empName.split(' ')[0]}</div>
                                        <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '8px' }}>Dia {parseInt(swapDest.dateStr.split('-')[2])}</div>
                                        <div className={`${escStyles[getCellClass(swapDest.code)] || escStyles.folga}`} style={{ padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold', display: 'inline-block', border: '1px solid #E2E8F0', background: !swapDest.code ? '#F1F5F9' : undefined }}>{swapDest.code || 'Folga'}</div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button onClick={() => { setSwapDest(null); setShowConfirmModal(false); }} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: '#F1F5F9', color: '#475569', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
                                    <button onClick={confirmSwap} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: '#3B82F6', color: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                        <Check size={18} /> Trocar Turnos
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}
