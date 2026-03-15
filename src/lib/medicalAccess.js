export function isMedicalRole(role = '') {
    const normalizedRole = String(role).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return normalizedRole === 'medico' || normalizedRole === 'medica';
}
