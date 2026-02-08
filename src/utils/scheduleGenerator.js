/**
 * Schedule Generator Utility
 * Gera escalas mensais automáticas seguindo as regras:
 * - 2 fins de semana consecutivos (Sáb+Dom) de folga por mês por pessoa
 * - Padrão geral: trabalha 3, folga 1, trabalha 4, folga 1 (aproximado)
 * - Alternância manhã/tarde
 */

// Obter todos os dias de um mês
export function getDaysInMonth(year, month) {
    const days = [];
    const date = new Date(year, month, 1);
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    while (date.getMonth() === month) {
        days.push({
            date: new Date(date),
            dayOfWeek: date.getDay(), // 0 = Dom, 6 = Sáb
            dateStr: date.toISOString().split('T')[0],
            dayName: dayNames[date.getDay()],
            dayNum: date.getDate(),
        });
        date.setDate(date.getDate() + 1);
    }

    return days;
}

// Obter fins de semana do mês (pares Sáb+Dom)
export function getWeekends(days) {
    const weekends = [];
    let currentWeekend = null;

    for (const day of days) {
        if (day.dayOfWeek === 6) { // Sábado
            currentWeekend = { sat: day };
        } else if (day.dayOfWeek === 0 && currentWeekend) { // Domingo
            currentWeekend.sun = day;
            weekends.push(currentWeekend);
            currentWeekend = null;
        }
    }

    return weekends;
}

// Gerar escala para um funcionário
function generateEmployeeSchedule(employee, days, assignedWeekends, allSchedules) {
    const schedule = {};
    let consecutiveWork = 0;
    let lastShift = Math.random() > 0.5 ? 'Manhã' : 'Tarde'; // Começa aleatório

    // Marcar fins de semana de folga
    const offDays = new Set();
    for (const weekend of assignedWeekends) {
        offDays.add(weekend.sat.dateStr);
        offDays.add(weekend.sun.dateStr);
    }

    // Gerar para cada dia
    for (let i = 0; i < days.length; i++) {
        const day = days[i];

        // Verificar se é folga de fim de semana
        if (offDays.has(day.dateStr)) {
            schedule[day.dateStr] = { shift: 'Folga', isOff: true };
            consecutiveWork = 0;
            continue;
        }

        // Padrão de trabalho/folga: trabalha 3-4 dias, folga 1
        // Verificar se precisa de folga (após 3-4 dias de trabalho)
        const needsBreak = consecutiveWork >= 3 && (consecutiveWork >= 4 || Math.random() > 0.6);

        if (needsBreak) {
            schedule[day.dateStr] = { shift: 'Folga', isOff: true };
            consecutiveWork = 0;
        } else {
            // Alternar turno
            const shift = lastShift === 'Manhã' ? 'Tarde' : 'Manhã';

            // Verificar cobertura mínima (pelo menos 2 pessoas por turno)
            const daySchedules = Object.values(allSchedules).map(s => s[day.dateStr]).filter(Boolean);
            const morningCount = daySchedules.filter(s => s.shift === 'Manhã').length;
            const afternoonCount = daySchedules.filter(s => s.shift === 'Tarde').length;

            // Ajustar se necessário para balancear
            let finalShift = shift;
            if (morningCount < 2 && afternoonCount >= 2) {
                finalShift = 'Manhã';
            } else if (afternoonCount < 2 && morningCount >= 2) {
                finalShift = 'Tarde';
            }

            schedule[day.dateStr] = {
                shift: finalShift,
                hours: finalShift === 'Manhã' ? '8h-16:30' : '11:30-20h',
                isOff: false
            };
            lastShift = finalShift;
            consecutiveWork++;
        }
    }

    return schedule;
}

// Distribuir fins de semana entre funcionários
function distributeWeekends(employees, weekends) {
    const distribution = {};
    const weekendPool = [...weekends];

    // Cada funcionário recebe 2 fins de semana (idealmente consecutivos)
    for (const emp of employees) {
        distribution[emp.id] = [];

        // Tentar dar 2 fins de semana consecutivos
        if (weekendPool.length >= 2) {
            // Escolher um índice aleatório que permita 2 consecutivos
            const maxIndex = weekendPool.length - 2;
            const startIndex = Math.floor(Math.random() * (maxIndex + 1));

            distribution[emp.id].push(weekendPool[startIndex]);
            distribution[emp.id].push(weekendPool[startIndex + 1]);

            // Remover do pool
            weekendPool.splice(startIndex, 2);
        } else if (weekendPool.length > 0) {
            // Dar o que sobrar
            distribution[emp.id].push(weekendPool.pop());
        }
    }

    return distribution;
}

/**
 * Função principal de geração de escala
 * @param {Array} employees - Lista de funcionários
 * @param {number} year - Ano
 * @param {number} month - Mês (0-11)
 * @returns {Object} Escala gerada { employeeId: { dateStr: { shift, hours, isOff } } }
 */
export function generateMonthlySchedule(employees, year, month) {
    const days = getDaysInMonth(year, month);
    const weekends = getWeekends(days);

    // Distribuir fins de semana
    const weekendDistribution = distributeWeekends(employees, weekends);

    // Gerar escala para cada funcionário
    const schedules = {};

    for (const emp of employees) {
        const assignedWeekends = weekendDistribution[emp.id] || [];
        schedules[emp.id] = generateEmployeeSchedule(emp, days, assignedWeekends, schedules);
    }

    return {
        year,
        month,
        monthName: new Date(year, month, 1).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' }),
        days,
        schedules,
        employees: employees.map(e => ({ id: e.id, name: e.name })),
    };
}

// Formatar para exibição em grelha
export function formatScheduleForGrid(generatedSchedule) {
    const { days, schedules, employees } = generatedSchedule;

    return {
        headers: days.map(d => ({
            date: d.dateStr,
            dayName: d.dayName,
            dayNum: d.dayNum,
            dayOfWeek: d.dayOfWeek,
            isWeekend: d.dayOfWeek === 0 || d.dayOfWeek === 6,
        })),
        rows: employees.map(emp => ({
            employee: emp,
            cells: days.map(d => {
                const schedule = schedules[emp.id]?.[d.dateStr];
                return {
                    date: d.dateStr,
                    shift: schedule?.shift || '-',
                    hours: schedule?.hours || '',
                    isOff: schedule?.isOff || false,
                    dayOfWeek: d.dayOfWeek,
                };
            }),
        })),
    };
}
