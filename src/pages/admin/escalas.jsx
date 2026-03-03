import Head from 'next/head';
import escStyles from '@/styles/EscalaReal.module.css';
import styles from '@/styles/AdminPages.module.css';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import { useApp } from '../_app';
import { useData } from '@/contexts/DataContext';
import { getRealScheduleData } from '@/data/mockData';
import { Calendar, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { useState, useMemo } from 'react';

export default function AdminEscalasPage() {
    const { isAdmin, toggleMode, currentUser } = useApp();
    const { saveSchedule } = useData();

    const today = new Date();
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Buscar dados reais do mês
    const scheduleData = useMemo(() => {
        return getRealScheduleData(selectedYear, selectedMonth);
    }, [selectedYear, selectedMonth]);

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
                    </div>

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
                                        <th className={escStyles.statsHeader}>FDS</th>
                                        <th className={escStyles.statsHeader}>Flg</th>
                                        <th className={escStyles.statsHeader}>Dias</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {scheduleData.sections.map((section, si) => (
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
                                                            <span className={escStyles.empName}>{emp.name}</span>
                                                            <span className={escStyles.empCode}>{emp.code}</span>
                                                        </td>
                                                        {codes.map((code, di) => {
                                                            const d = daysInMonth[di];
                                                            if (!d) return <td key={di} className={escStyles.cell}></td>;
                                                            return (
                                                                <td key={di} className={`${escStyles.cell} ${getCellClass(code)} ${d.isWeekend ? escStyles.weekendC : ''} ${d.isToday ? escStyles.todayC : ''} ${d.dow === 0 ? escStyles.sundayBorder : ''}`}>
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
                </div>
            </main>
        </>
    );
}
