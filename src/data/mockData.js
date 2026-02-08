// Mock data for Villa Mar demo
// Dados realistas baseados no plano de trabalho diário real

// Funcionários reais
export const mockEmployees = [
    { id: 1, name: 'Deisy', role: 'Cuidadora', avatar: null, status: 'present', clockIn: '08:02', clockOut: null },
    { id: 2, name: 'Roger', role: 'Cuidador', avatar: null, status: 'present', clockIn: '07:58', clockOut: null },
    { id: 3, name: 'Fábio', role: 'Cuidador', avatar: null, status: 'present', clockIn: '08:05', clockOut: null },
    { id: 4, name: 'Marlene', role: 'Cuidadora', avatar: null, status: 'dayoff', clockIn: null, clockOut: null },
    { id: 5, name: 'Camilla', role: 'Auxiliar', avatar: null, status: 'present', clockIn: '11:28', clockOut: null },
    { id: 6, name: 'Teresa', role: 'Cuidadora', avatar: null, status: 'absent', clockIn: null, clockOut: null },
    { id: 7, name: 'Babita', role: 'Cuidadora', avatar: null, status: 'present', clockIn: '08:00', clockOut: null },
    { id: 8, name: 'Ventura', role: 'Auxiliar', avatar: null, status: 'dayoff', clockIn: null, clockOut: null },
    { id: 9, name: 'Judite', role: 'Cuidadora', avatar: null, status: 'present', clockIn: '11:32', clockOut: null },
    { id: 10, name: 'José Carlos', role: 'Cuidador', avatar: null, status: 'present', clockIn: '08:01', clockOut: null },
    { id: 11, name: 'M. Rodrigues', role: 'Enfermeira', avatar: null, status: 'present', clockIn: '08:00', clockOut: null },
    { id: 12, name: 'Carlos A.', role: 'Auxiliar', avatar: null, status: 'dayoff', clockIn: null, clockOut: null },
];

// Funcionário atual (para demo da área de membro)
export const mockCurrentUser = {
    id: 1,
    name: 'Deisy',
    role: 'Cuidadora',
    avatar: null,
    nextDayOff: '2026-02-09',
    daysOffThisMonth: 4,
    workedDaysThisMonth: 18,
};

// Pacientes reais (residentes do lar)
export const patients = [
    'Lourdes C.', 'Tina', 'Luísa', 'Ventura', 'Babita',
    'Lourdes N.', 'Fernanda', 'Simão', 'Mário', 'Sofia',
    'Perpétua', 'Amélia', 'Otílio', 'António', 'M. Zélia',
    'Teresa', 'José Carlos'
];

// Tarefas reais do dia - Turno Manhã (8h - 16:30)
export const mockTasks = [
    {
        id: 1,
        title: 'Levante - Lourdes C.',
        time: '08:00',
        description: 'Auxiliar no levante e higiene',
        completed: true,
        photo: 'uploaded',
        priority: 'high',
        category: 'levante'
    },
    {
        id: 2,
        title: 'Levante - Tina',
        time: '08:15',
        description: 'Auxiliar no levante e higiene',
        completed: true,
        photo: null,
        priority: 'high',
        category: 'levante'
    },
    {
        id: 3,
        title: 'Reforço Hídrico - Sala Comum',
        time: '10:00',
        description: 'Oferecer água/chá a todos os residentes',
        completed: false,
        photo: null,
        priority: 'high',
        category: 'hidratacao'
    },
    {
        id: 4,
        title: 'Hidratação Pele - Lourdes N.',
        time: '10:30',
        description: 'Aplicar creme hidratante',
        completed: false,
        photo: null,
        priority: 'normal',
        category: 'hidratacao'
    },
    {
        id: 5,
        title: 'Hidratação Pele - Fernanda',
        time: '10:45',
        description: 'Aplicar creme hidratante',
        completed: false,
        photo: null,
        priority: 'normal',
        category: 'hidratacao'
    },
    {
        id: 6,
        title: 'Trocas 11h - Simão',
        time: '11:00',
        description: 'Troca de fralda e posicionamento',
        completed: false,
        photo: null,
        priority: 'high',
        category: 'trocas'
    },
    {
        id: 7,
        title: 'Trocas 11h - Sofia',
        time: '11:15',
        description: 'Troca de fralda e posicionamento',
        completed: false,
        photo: null,
        priority: 'high',
        category: 'trocas'
    },
    {
        id: 8,
        title: 'Almoço - Refeitório',
        time: '12:30',
        description: 'Auxiliar residentes durante almoço',
        completed: false,
        photo: null,
        priority: 'normal',
        category: 'refeicao'
    },
    {
        id: 9,
        title: 'Reforço Hídrico Tarde',
        time: '15:00',
        description: 'Oferecer água/chá a todos',
        completed: false,
        photo: null,
        priority: 'high',
        category: 'hidratacao'
    },
    {
        id: 10,
        title: 'Unhas - António',
        time: '14:00',
        description: 'Cortar e limar unhas',
        completed: false,
        photo: null,
        priority: 'low',
        category: 'cuidados'
    },
    {
        id: 11,
        title: 'Barba - Otílio',
        time: '14:30',
        description: 'Fazer a barba',
        completed: false,
        photo: null,
        priority: 'low',
        category: 'cuidados'
    },
    {
        id: 12,
        title: 'Trocas 15h - Perpétua',
        time: '15:00',
        description: 'Troca de fralda e posicionamento',
        completed: false,
        photo: null,
        priority: 'high',
        category: 'trocas'
    },
];

// Turnos reais
export const shifts = {
    manha: { start: '08:00', end: '16:30', label: 'Manhã' },
    tarde: { start: '11:30', end: '20:00', label: 'Tarde' },
};

// Escala semanal
export const mockSchedule = {
    currentWeek: [
        { date: '2026-02-02', day: 'Seg', shift: 'Manhã', isToday: false, hours: '8h-16:30' },
        { date: '2026-02-03', day: 'Ter', shift: 'Manhã', isToday: false, hours: '8h-16:30' },
        { date: '2026-02-04', day: 'Qua', shift: 'Tarde', isToday: false, hours: '11:30-20h' },
        { date: '2026-02-05', day: 'Qui', shift: 'Folga', isToday: false, isDayOff: true },
        { date: '2026-02-06', day: 'Sex', shift: 'Manhã', isToday: false, hours: '8h-16:30' },
        { date: '2026-02-07', day: 'Sáb', shift: 'Manhã', isToday: true, hours: '8h-16:30' },
        { date: '2026-02-08', day: 'Dom', shift: 'Tarde', isToday: false, hours: '11:30-20h' },
    ],
    nextWeek: [
        { date: '2026-02-09', day: 'Seg', shift: 'Folga', isDayOff: true },
        { date: '2026-02-10', day: 'Ter', shift: 'Manhã', hours: '8h-16:30' },
        { date: '2026-02-11', day: 'Qua', shift: 'Manhã', hours: '8h-16:30' },
        { date: '2026-02-12', day: 'Qui', shift: 'Tarde', hours: '11:30-20h' },
        { date: '2026-02-13', day: 'Sex', shift: 'Manhã', hours: '8h-16:30' },
        { date: '2026-02-14', day: 'Sáb', shift: 'Folga', isDayOff: true },
        { date: '2026-02-15', day: 'Dom', shift: 'Tarde', hours: '11:30-20h' },
    ],
};

// Pedidos de troca - COM DETALHES COMPLETOS
export const mockSwapRequests = [
    {
        id: 1,
        requestor: 'Camilla',
        requestorId: 5,
        // Dia que quer trocar
        targetDate: '2026-02-10',
        targetShift: 'Tarde', // Turno original dela nesse dia
        targetHours: '11:30-20h',
        // Com quem quer trocar
        swapWith: 'Marlene',
        swapWithId: 4,
        // Dia/turno que vai fazer em troca
        swapDate: '2026-02-12',
        swapShift: 'Manhã', // Turno que vai assumir
        swapHours: '8h-16:30',
        reason: 'Consulta médica',
        status: 'pending',
        createdAt: '2026-02-06',
    },
    {
        id: 2,
        requestor: 'Babita',
        requestorId: 7,
        targetDate: '2026-02-14',
        targetShift: 'Manhã',
        targetHours: '8h-16:30',
        swapWith: 'Roger',
        swapWithId: 2,
        swapDate: '2026-02-16',
        swapShift: 'Tarde',
        swapHours: '11:30-20h',
        reason: 'Evento familiar',
        status: 'approved',
        createdAt: '2026-02-05',
    },
    {
        id: 3,
        requestor: 'Deisy',
        requestorId: 1,
        targetDate: '2026-02-15',
        targetShift: 'Tarde',
        targetHours: '11:30-20h',
        swapWith: 'Fábio',
        swapWithId: 3,
        swapDate: '2026-02-17',
        swapShift: 'Manhã',
        swapHours: '8h-16:30',
        reason: 'Preciso do dia livre',
        status: 'pending',
        createdAt: '2026-02-07',
    },
];

// Estatísticas
export const mockStats = {
    totalEmployees: 12,
    presentToday: 8,
    onDayOff: 3,
    absent: 1,
    pendingSwaps: 1,
    tasksCompleted: 5,
    totalTasks: 12,
};

// Categorias de tarefas com ícones
export const taskCategories = {
    levante: { label: 'Levante', emoji: '🌅', color: '#F59E0B' },
    hidratacao: { label: 'Hidratação', emoji: '💧', color: '#0077B6' },
    trocas: { label: 'Trocas', emoji: '🔄', color: '#8B5CF6' },
    refeicao: { label: 'Refeição', emoji: '🍽️', color: '#10B981' },
    cuidados: { label: 'Cuidados', emoji: '✂️', color: '#EC4899' },
    deitares: { label: 'Deitares', emoji: '🌙', color: '#6366F1' },
};

// Utilitários
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
    if (shift === 'Tarde') return { hours: '11:30 - 20h', emoji: '🌙' };
    if (shift === 'Folga') return { hours: '-', emoji: '☕' };
    return { hours: '', emoji: '' };
};
