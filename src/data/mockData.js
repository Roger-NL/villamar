// Mock data for Villa Mar demo
// Dados realistas baseados no plano de trabalho diário real

// Funcionários reais
export const mockEmployees = [];

// ... (other exports remain the same but omitted here for brevity if they are not changed, but replace_file_content needs context)
// Wait, I can't skip content. I will target the mockEmployees specifically.

// ... skipping to swap requests ...

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
export const mockTasks = [];

// Turnos reais
export const shifts = {
    manha: { start: '08:00', end: '16:30', label: 'Manhã' },
    tarde: { start: '11:30', end: '20:00', label: 'Tarde' },
};

// Escala semanal
export const mockSchedule = {
    currentWeek: [],
    nextWeek: [],
};

// Pedidos de troca - COM DETALHES COMPLETOS
export const mockSwapRequests = [];

// Estatísticas
export const mockStats = {
    totalEmployees: 0,
    presentToday: 0,
    onDayOff: 0,
    absent: 0,
    pendingSwaps: 0,
    tasksCompleted: 0,
    totalTasks: 0,
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
