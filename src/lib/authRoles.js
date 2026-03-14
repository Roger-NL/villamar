export const SUPER_ADMIN_EMAIL = 'admin@villamar.pt';

export function isSuperAdminEmail(email = '') {
    return String(email).trim().toLowerCase() === SUPER_ADMIN_EMAIL;
}
