// Mock data for Villa Mar
// Dados realistas baseados na escala real (Escala.xlsx)

// ============================================================
// FUNCIONÁRIOS REAIS
// ============================================================
export const mockEmployees = [
    // Grupo D - Diretoras / Gestão
    { id: 1, name: 'Marta Almeida', role: 'Diretora', status: 'absent', pin: '1234', clockIn: null, clockOut: null, isAdmin: false },
    { id: 2, name: 'Vera Cordeiro', role: 'Diretora', status: 'absent', pin: '2345', clockIn: null, clockOut: null, isAdmin: false },
    { id: 3, name: 'João Pedro Belo', role: 'Diretor', status: 'absent', pin: '3456', clockIn: null, clockOut: null, isAdmin: false },
    { id: 4, name: 'Daniela Gomes', role: 'Fisioterapeuta', status: 'absent', pin: '4567', clockIn: null, clockOut: null, isAdmin: false },

    // Grupo Manhã/Tarde - Cuidadoras
    { id: 5, name: 'Deisy Ribeiro', role: 'Cuidadora', status: 'absent', pin: '5678', clockIn: null, clockOut: null, isAdmin: false },
    { id: 6, name: 'Camila Machado', role: 'Cuidadora', status: 'absent', pin: '6789', clockIn: null, clockOut: null, isAdmin: false },
    { id: 7, name: 'Tátá', role: 'Cuidadora', status: 'absent', pin: '7890', clockIn: null, clockOut: null, isAdmin: false },
    { id: 8, name: 'Marlene', role: 'Cuidadora', status: 'absent', pin: '8901', clockIn: null, clockOut: null, isAdmin: false },

    // Grupo G - Roger (Admin Operacional)
    { id: 9, name: 'Roger Antunes', role: 'Cuidador', status: 'absent', pin: '9012', clockIn: null, clockOut: null, isAdmin: true },

    // Auxiliar / Cozinha
    { id: 10, name: 'Anilsa Furtado', role: 'Auxiliar', status: 'absent', pin: '0123', clockIn: null, clockOut: null, isAdmin: false },

    // Fábio - Enfermeiro (só fins de semana)
    { id: 11, name: 'Fábio Martins', role: 'Enfermeiro', status: 'absent', pin: '1111', clockIn: null, clockOut: null, isAdmin: false },

    // Joel - Encarregado
    { id: 12, name: 'Joel Cortina', role: 'Encarregado', status: 'absent', pin: '2222', clockIn: null, clockOut: null, isAdmin: false },

    // Marcelina - Auxiliar fixo
    { id: 13, name: 'Marcelina', role: 'Auxiliar', status: 'absent', pin: '3333', clockIn: null, clockOut: null, isAdmin: false },

    // Cozinha
    { id: 14, name: 'Cozinha', role: 'Auxiliary_Cozinha', status: 'absent', pin: '4444', clockIn: null, clockOut: null, isAdmin: false },

    // Noite - Grupo I (pares)
    { id: 15, name: 'Meiry Santos', role: 'Cuidadora', status: 'absent', pin: '5555', clockIn: null, clockOut: null, isAdmin: false },
    { id: 16, name: 'Safira', role: 'Cuidadora', status: 'absent', pin: '6666', clockIn: null, clockOut: null, isAdmin: false },

    // Noite - Grupo J (pares alternativos)
    { id: 17, name: 'Viviane Aparecida', role: 'Cuidadora', status: 'absent', pin: '7777', clockIn: null, clockOut: null, isAdmin: false },
    { id: 18, name: 'Flávia Pagíola', role: 'Cuidadora', status: 'absent', pin: '8888', clockIn: null, clockOut: null, isAdmin: false },
];

// ============================================================
// FUNCIONÁRIO ATUAL (demo de membro - Deisy como padrão)
// ============================================================
export const mockCurrentUser = {
    id: 5,
    name: 'Deisy',
    role: 'Cuidadora',
    avatar: null,
    nextDayOff: '2026-03-09',
    daysOffThisMonth: 1,
    workedDaysThisMonth: 18,
};

// ============================================================
// PACIENTES (residentes do lar)
// ============================================================
export const patients = [
    'Lourdes C.', 'Tina', 'Luísa', 'Ventura', 'Babita',
    'Lourdes N.', 'Fernanda', 'Simão', 'Mário', 'Sofia',
    'Perpétua', 'Amélia', 'Otílio', 'António', 'M. Zélia',
    'Teresa', 'José Carlos'
];

// ============================================================
// TAREFAS (inicialmente vazias - populadas via sistema)
// ============================================================
export const mockTasks = [];

// ============================================================
// TURNOS (horários)
// ============================================================
export const shifts = {
    manha: { start: '08:00', end: '16:30', label: 'Manhã' },
    tarde: { start: '11:30', end: '20:00', label: 'Tarde' },
    noite: { start: '20:00', end: '07:00', label: 'Noite' },
};

// ============================================================
// ESCALA REAL - MARÇO 2026
// Mapeada diretamente do ficheiro Escala.xlsx (aba Março)
// Dias: 1-31, colunas C a AG (índice 2 a 32)
// Legenda original:
//   M  = Manhã (8h-16:30)
//   T  = Tarde (11:30-20h)
//   N  = Noite (20h-7h)
//   D  = Diurno Fábio (7h-15h, apenas fins de semana)
//   M/T= Manhã e Tarde (conta como Manhã para efeitos de visualização)
//   HL/HM/HT/HF/HJ/HC = Horários institucionais (mapeados para turno correspondente)
//   null = Folga
// ============================================================

// Dados brutos por employee ID → array de 31 posições (índice 0 = dia 1)
// Fonte: aba "Março" da Escala.xlsx (R8 a R28)
const marcoRawData = {
    // Marta Almeida (id:1) - R8: HL/HL/HL/HL/HL padrão M-Sex
    // [dom,seg,ter,qua,qui,sex,sab,dom,seg,ter,qua,qui,sex,sab,dom,seg,ter,qua,qui,sex,sab,dom,seg,ter,qua,qui,sex,sab,dom,seg,ter]
    //   1    2    3    4    5   6    7    8    9   10   11  12   13  14  15   16  17   18  19   20  21   22  23   24  25   26   27 28  29  30   31
    1: [null, 'HL', 'HL', 'HL', 'HL', 'HL', null, null, 'HL', 'HL', 'HL', 'HL', 'HL', null, null, 'HL', 'HL', 'HL', 'HL', 'HL', null, null, 'HL', 'HL', 'HL', 'HL', 'HL', null, null, 'HL', 'HL'],
    // Vera Cordeiro (id:2)
    2: [null, 'HM', 'HM', 'HM', 'HM', 'HM', null, null, 'HM', 'HM', 'HM', 'HM', 'HM', null, null, 'HM', 'HM', 'HM', 'HM', 'HM', null, null, 'HM', 'HM', 'HM', 'HM', 'HM', null, null, 'HM', 'HM'],
    // João Pedro Belo (id:3)
    3: [null, 'HM', 'HT', 'HM', 'HT', 'HM', null, null, 'HM', 'HT', 'HM', 'HT', 'HM', null, null, 'HM', 'HT', 'HM', 'HT', 'HM', null, null, 'HM', 'HT', 'HM', 'HT', 'HM', null, null, 'HM', 'HT'],
    // Daniela Gomes (id:4) - só terças e quintas
    4: [null, null, 'HF', null, 'HF', null, null, null, null, 'HF', null, 'HF', null, null, null, null, 'HF', null, 'HF', null, null, null, null, 'HF', null, 'HF', null, null, null, null, 'HF'],
    // Deisy Ribeiro (id:5) - aba Março R14
    5: [null, null, 'M', 'M', 'T', 'T', null, null, 'T', 'T', 'M', 'T', null, 'T', 'M', 'M', 'T', null, 'M', 'T', 'T', 'T', null, 'M', null, 'M', 'T', null, 'M', 'M', 'T'],
    // Camila Machado (id:6) - aba Março R15
    6: ['T', 'T', null, 'T', 'T', 'M', 'M', null, null, 'M', 'T', 'M', 'T', null, null, 'M', 'M', 'T', null, 'M', null, 'M', 'T', null, 'M', 'T', 'M', 'M', null, null, 'M'],
    // Tátá (id:7) - aba Março R16
    7: [null, 'M', 'M', 'T', null, 'M', 'T', 'T', 'T', null, 'T', 'M', 'T', null, 'M', null, 'T', 'T', 'M', 'M', null, null, 'M', 'M', 'T', 'T', null, null, 'M', 'T', null],
    // Marlene (id:8) - aba Março R17
    8: ['M', 'T', 'T', null, 'M', 'T', null, 'M', 'M', null, null, 'T', 'M', 'M', null, 'T', 'M', 'M', 'T', null, null, 'M', 'M', 'T', 'T', null, 'M', 'T', 'T', 'M', null],
    // Roger Antunes (id:9) - aba Março R18
    9: [null, 'M', 'T', 'M', 'M', null, null, 'M', 'M', 'M/T', 'M', null, 'M', null, 'T', 'T', null, 'M', 'T', 'T', 'M', null, 'T', 'T', 'M', 'M', 'T', null, null, 'T', 'M/T'],
    // Anilsa Furtado (id:10) - inativa em Março (campo vazio)
    10: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    // Fábio Martins (id:11) - aba Março R20 - D só fins de semana
    11: ['D', null, null, null, null, null, 'D', 'D', null, null, null, null, null, 'D', 'D', null, null, null, null, null, 'D', 'D', null, null, null, null, null, 'D', 'D', null, null],
    // Joel Cortina (id:12) - aba Março R21
    12: [null, null, null, 'HJ', 'HJ', 'HJ', null, null, 'HJ', 'HJ', null, null, null, null, null, null, null, null, null, null, null, null, 'HJ', 'HJ', 'HJ', 'HJ', 'HJ', null, null, 'HJ', 'HJ'],
    // Marcelina (id:13) - aba Março R22 - HM todos os dias menos domingo
    13: [null, 'HM', 'HM', 'HM', 'HM', 'HM', 'HM', null, 'HM', 'HM', 'HM', 'HM', 'HM', 'HM', null, 'HM', 'HM', 'HM', 'HM', 'HM', 'HM', null, 'HM', 'HM', 'HM', 'HM', 'HM', 'HM', null, 'HM', 'HM'],
    // Cozinha (id:14) - aba Março R23 - HC todos os dias menos domingo
    14: [null, 'HC', 'HC', 'HC', 'HC', 'HC', 'HC', null, 'HC', 'HC', 'HC', 'HC', 'HC', 'HC', null, 'HC', 'HC', 'HC', 'HC', 'HC', 'HC', null, 'HC', 'HC', 'HC', 'HC', 'HC', 'HC', null, 'HC', 'HC'],
    // Meiry Santos (id:15) - aba Março R25 - Noite
    15: [null, 'N', 'N', 'N', null, 'N', 'N', null, null, 'N', 'N', 'N', null, 'N', 'N', null, null, 'N', 'N', null, null, 'N', 'N', null, null, 'N', 'N', null, null, 'N', 'N'],
    // Safira (id:16) - aba Março R26 - Noite
    16: [null, 'N', 'N', null, null, 'N', 'N', 'N', null, 'N', 'N', null, null, 'N', 'N', null, null, 'N', 'N', null, null, 'N', 'N', null, null, 'N', 'N', null, null, 'N', 'N'],
    // Viviane Aparecida (id:17) - aba Março R27 - Noite
    17: ['N', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 'N', null, null, 'N', 'N', null, null, 'N', 'N', null, null, 'N', 'N', null],
    // Flávia Pagíola (id:18) - aba Março R28 - Noite
    18: ['N', null, null, 'N', 'N', null, null, 'N', 'N', null, null, 'N', 'N', null, null, 'N', 'N', null, null, 'N', 'N', null, null, 'N', 'N', null, null, 'N', 'N', null, null],
};

// Dados brutos Fevereiro 2026 (aba Fevereiro)
// Fevereiro 2026: começa domingo (dia 1 = dom), 28 dias
// R8-R28 índices alinhados com os dias 1-28
const fevereiroRawData = {
    // Marta Almeida
    1: [null, 'HL', 'HL', 'HL', 'HL', 'HL', null, null, 'HL', 'HL', 'HL', 'HL', 'HL', null, null, 'HL', 'HL', 'HL', 'HL', 'HL', null, null, 'HL', 'HL', 'HL', 'HL', 'HL', null],
    // Vera Cordeiro
    2: [null, 'HM', 'HM', 'HM', 'HM', 'HM', null, null, 'HM', 'HM', 'HM', 'HM', 'HM', null, null, 'HM', 'HM', 'HM', 'HM', 'HM', null, null, 'HM', 'HM', 'HM', 'HM', 'HM', null],
    // João Pedro Belo
    3: [null, 'HM', 'HT', 'HM', 'HT', 'HM', null, null, 'HM', 'HT', 'HM', 'HT', 'HM', null, null, 'HM', 'HT', 'HM', 'HT', 'HM', null, null, 'HM', 'HT', 'HM', 'HT', 'HM', null],
    // Daniela Gomes
    4: [null, null, 'HF', null, 'HF', null, null, null, null, 'HF', null, 'HF', null, null, null, null, 'HF', null, 'HF', null, null, null, null, 'HF', null, 'HF', null, null],
    // Deisy Ribeiro
    5: ['M', 'M/T', null, null, 'T', 'T', 'M', 'M', null, 'M/T', 'M', 'T', 'T', null, null, 'M', 'T', 'M/T', null, 'M', 'M', 'T', 'T', null, null, 'M', 'M', 'T'],
    // Camila Machado
    6: [null, 'M', 'T', 'T', 'M', null, 'T', 'M', 'M', null, null, 'M', 'M', 'T', 'T', null, null, 'M', 'T', 'T', null, 'M', 'M', 'M', 'T', null, 'M', 'M'],
    // Tátá
    7: [null, null, 'T', 'M', 'M/T', 'M', null, null, 'T', 'M', 'M', 'T', null, 'M', 'M', 'T', 'T', null, 'M', 'M', null, 'M', null, 'M', 'M', 'T', 'T', null],
    // Marlene
    8: ['T', null, null, null, null, 'T', null, null, 'M', 'T', 'M/T', null, 'T', 'M', 'M', 'T', 'M', null, 'M', 'T', 'T', null, null, 'T', 'T', 'M', null, 'M'],
    // Roger Antunes
    9: [null, 'T', 'M', 'T', null, 'M', 'M', 'T', 'T', null, 'T', 'M', 'M', null, null, 'M', 'M', 'T', 'T', null, 'M', 'T', 'M', null, 'M', 'T', 'T', null],
    // Anilsa Furtado
    10: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    // Fábio Martins
    11: ['D', null, null, null, null, null, 'D', 'D', null, null, null, null, null, 'D', 'D', null, null, null, null, null, 'D', 'D', null, null, null, null, null, 'D'],
    // Joel Cortina
    12: [null, 'HJ', null, null, null, 'HJ', null, null, 'HJ', 'HJ', 'HJ', 'HJ', 'HJ', null, null, 'HJ', 'HJ', 'HJ', 'HJ', 'HJ', null, null, 'HJ', 'HJ', 'HJ', 'HJ', 'HJ', null],
    // Marcelina
    13: [null, 'HM', 'M/HM', 'M/HM', 'HM', 'HM', 'HM', null, 'HM', 'HM', 'HM', 'HM', 'HM', 'HM', null, 'HM', 'HM', 'HM', 'HM', 'HM', 'HM', null, 'T/HM', 'T/HM', 'HM', 'HM', 'HM', 'HM'],
    // Cozinha
    14: [null, 'HC', 'HC', 'HC', 'HC', 'HC', 'HC', null, 'HC', 'HC', 'HC', 'HC', 'HC', 'HC', null, 'HC', 'HC', 'HC', 'HC', 'HC', 'HC', null, 'HC', 'HC', 'HC', 'HC', 'HC', 'HC'],
    // Meiry Santos
    15: [null, 'N', 'N', null, null, 'N', 'N', null, null, 'N', 'N', null, 'N', 'N', null, null, null, 'N', 'N', null, null, 'N', 'N', null, null, 'N', 'N', null],
    // Safira
    16: [null, 'N', 'N', null, null, 'N', 'N', null, null, 'N', 'N', 'N', null, null, 'N', null, null, 'N', 'N', null, null, 'N', 'N', null, null, 'N', 'N', null],
    // Tátá / Gregory → Viviane Aparecida
    17: ['N', null, null, 'N', 'N', null, null, 'N', 'N', null, null, 'N', 'N', null, null, 'N', 'N', null, null, 'N', 'N', null, null, 'N', 'N', null, null, 'N'],
    // Flávia Pagiola
    18: ['N', null, null, 'N', 'N', null, null, 'N', 'N', null, null, 'N', 'N', null, 'N', 'N', 'N', null, null, 'N', 'N', null, null, 'N', 'N', null, null, 'N'],
};

// ============================================================
// Mapeamento de código → turno
// ============================================================
function _mapCode(code) {
    if (!code || code === null) return { shift: 'Folga', hours: '', isOff: true };

    const c = String(code).trim().toUpperCase();

    // Noite
    if (c === 'N') return { shift: 'Noite', hours: '20h-7h', isOff: false };

    // Diurno Fábio (fins de semana)
    if (c === 'D') return { shift: 'Manhã', hours: '7h-15h', isOff: false };

    // Manhã simples
    if (c === 'M') return { shift: 'Manhã', hours: '8h-16:30', isOff: false };

    // Tarde simples
    if (c === 'T') return { shift: 'Tarde', hours: '11:30-20h', isOff: false };

    // Manhã+Tarde (duplo turno → Manhã para visualização)
    if (c === 'M/T' || c === 'T/M') return { shift: 'Manhã', hours: '8h-20h', isOff: false };

    // HL = Hospital Lirinha? → Manhã (gestão/direcão)
    if (c.startsWith('HL')) return { shift: 'Manhã', hours: '9h-17h', isOff: false };

    // HM = Horário administrativo manhã
    if (c.startsWith('HM') || c === 'M/HM') return { shift: 'Manhã', hours: '9h-17h', isOff: false };

    // T/HM = Tarde + Horário especial
    if (c === 'T/HM') return { shift: 'Tarde', hours: '11:30-20h', isOff: false };

    // HT = Horário tarde
    if (c.startsWith('HT')) return { shift: 'Tarde', hours: '11:30-20h', isOff: false };

    // HF = Fisioterapia (Daniela) → tarde
    if (c.startsWith('HF')) return { shift: 'Tarde', hours: '14h-19h', isOff: false };

    // HJ = Joel
    if (c.startsWith('HJ')) return { shift: 'Manhã', hours: '8h-16h', isOff: false };

    // HC = Cozinha
    if (c.startsWith('HC')) return { shift: 'Manhã', hours: '8h-20h', isOff: false };

    return { shift: 'Folga', hours: '', isOff: true };
}

function mapCode(code) {
    const result = _mapCode(code);
    result.rawCode = code || 'Folga';
    return result;
}

// ============================================================
// Converter raw data → formato de escala do sistema
// ============================================================
function buildScheduleFromRaw(rawData, year, month) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const schedules = {};

    for (const [empIdStr, dayArray] of Object.entries(rawData)) {
        const empId = parseInt(empIdStr, 10);
        schedules[empId] = {};

        for (let dayIndex = 0; dayIndex < Math.min(dayArray.length, daysInMonth); dayIndex++) {
            const day = dayIndex + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const code = dayArray[dayIndex];
            schedules[empId][dateStr] = mapCode(code);
        }
    }

    return schedules;
}

// ============================================================
// ESCALA PRÉ-CONSTRUÍDA PARA FEVEREIRO E MARÇO 2026
// Exportada para ser usada pelo sistema como escala inicial
// ============================================================
export function getPrebuiltSchedule(year, month) {
    // Março 2026
    if (year === 2026 && month === 2) {
        const schedules = buildScheduleFromRaw(marcoRawData, 2026, 2);
        const days = [];
        const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const d = new Date(2026, 2, 1);
        while (d.getMonth() === 2) {
            days.push({
                date: new Date(d),
                dayOfWeek: d.getDay(),
                dateStr: d.toISOString().split('T')[0],
                dayName: dayNames[d.getDay()],
                dayNum: d.getDate(),
            });
            d.setDate(d.getDate() + 1);
        }
        return {
            year: 2026, month: 2,
            monthName: 'março de 2026',
            days,
            schedules,
            employees: mockEmployees.map(e => ({ id: e.id, name: e.name })),
        };
    }

    // Fevereiro 2026
    if (year === 2026 && month === 1) {
        const schedules = buildScheduleFromRaw(fevereiroRawData, 2026, 1);
        const days = [];
        const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const d = new Date(2026, 1, 1);
        while (d.getMonth() === 1) {
            days.push({
                date: new Date(d),
                dayOfWeek: d.getDay(),
                dateStr: d.toISOString().split('T')[0],
                dayName: dayNames[d.getDay()],
                dayNum: d.getDate(),
            });
            d.setDate(d.getDate() + 1);
        }
        return {
            year: 2026, month: 1,
            monthName: 'fevereiro de 2026',
            days,
            schedules,
            employees: mockEmployees.map(e => ({ id: e.id, name: e.name })),
        };
    }

    return null;
}

// ============================================================
// ESCALA SEMANAL (legado)
// ============================================================
export const mockSchedule = {
    currentWeek: [],
    nextWeek: [],
};

// ============================================================
// PEDIDOS DE TROCA
// ============================================================
export const mockSwapRequests = [];

// ============================================================
// ESTATÍSTICAS
// ============================================================
export const mockStats = {
    totalEmployees: mockEmployees.length,
    presentToday: 0,
    onDayOff: 0,
    absent: 0,
    pendingSwaps: 0,
    tasksCompleted: 0,
    totalTasks: 0,
};

// ============================================================
// CATEGORIAS DE TAREFAS
// ============================================================
export const taskCategories = {
    levante: { label: 'Levante', emoji: '🌅', color: '#F59E0B' },
    hidratacao: { label: 'Hidratação', emoji: '💧', color: '#0077B6' },
    trocas: { label: 'Trocas', emoji: '🔄', color: '#8B5CF6' },
    refeicao: { label: 'Refeição', emoji: '🍽️', color: '#10B981' },
    cuidados: { label: 'Cuidados', emoji: '✂️', color: '#EC4899' },
    deitares: { label: 'Deitares', emoji: '🌙', color: '#6366F1' },
};

// ============================================================
// UTILITÁRIOS
// ============================================================
export const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-PT', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    });
};

export const formatTime = (date = new Date()) => {
    return date.toLocaleTimeString('pt-PT', {
        hour: '2-digit',
        minute: '2-digit',
    });
};

export const getShiftInfo = (shift) => {
    if (shift === 'Manhã') return { hours: '8h - 16:30', emoji: '☀️' };
    if (shift === 'Tarde') return { hours: '11:30 - 20h', emoji: '🌆' };
    if (shift === 'Noite') return { hours: '20h - 7h', emoji: '🌙' };
    if (shift === 'Folga') return { hours: '-', emoji: '☕' };
    return { hours: '', emoji: '' };
};

// ============================================================
// DADOS PARA A TABELA ESTILO EXCEL
// Retorna sections com employees e dias (códigos originais)
// ============================================================
export function getRealScheduleData(year, month) {
    let rawData = null;

    if (year === 2026 && month === 2) rawData = marcoRawData;
    else if (year === 2026 && month === 1) rawData = fevereiroRawData;
    else return null;

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Função auxiliar para pegar os dias de um funcionário
    const getDays = (empId) => {
        const arr = rawData[empId] || [];
        const result = [];
        for (let i = 0; i < daysInMonth; i++) {
            result.push(arr[i] || null);
        }
        return result;
    };

    return {
        year,
        month,
        sections: [
            {
                label: 'Direção / Gestão',
                employees: [
                    { name: 'Marta Almeida', code: 'D', id: 1, days: getDays(1) },
                    { name: 'Vera Cordeiro', code: 'D', id: 2, days: getDays(2) },
                    { name: 'João Pedro Belo', code: 'D', id: 3, days: getDays(3) },
                    { name: 'Daniela Gomes', code: 'F', id: 4, days: getDays(4) },
                ],
            },
            {
                label: 'Manhã / Tarde',
                employees: [
                    { name: 'Deisy Ribeiro', code: 'B', id: 5, days: getDays(5) },
                    { name: 'Camila Machado', code: 'C', id: 6, days: getDays(6) },
                    { name: 'Tátá', code: 'E', id: 7, days: getDays(7) },
                    { name: 'Marlene', code: 'M', id: 8, days: getDays(8) },
                    { name: 'Roger Antunes', code: 'G', id: 9, days: getDays(9) },
                    { name: 'Anilsa Furtado', code: 'K', id: 10, days: getDays(10) },
                    { name: 'Fábio Martins', code: 'H', id: 11, days: getDays(11) },
                    { name: 'Joel Cortina', code: 'EN', id: 12, days: getDays(12) },
                    { name: 'Marcelina', code: 'L', id: 13, days: getDays(13) },
                    { name: 'Cozinha', code: 'R', id: 14, days: getDays(14) },
                ],
            },
            {
                label: 'Noite',
                employees: [
                    { name: 'Meiry Santos', code: 'I', id: 15, days: getDays(15) },
                    { name: 'Safira', code: 'I', id: 16, days: getDays(16) },
                    { name: 'Viviane Aparecida', code: 'J', id: 17, days: getDays(17) },
                    { name: 'Flávia Pagíola', code: 'J', id: 18, days: getDays(18) },
                ],
            },
        ],
    };
}

