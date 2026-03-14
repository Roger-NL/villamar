import { getFirebaseAdminProjectId, getIdentityToolkitAccessToken } from '@/server/firebaseAdmin';
import { isSuperAdminEmail } from '@/lib/authRoles';

function getBearerToken(req) {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) return '';
    return header.slice(7);
}

function unwrapFirestoreValue(value) {
    if (value.stringValue !== undefined) return value.stringValue;
    if (value.integerValue !== undefined) return Number(value.integerValue);
    if (value.doubleValue !== undefined) return Number(value.doubleValue);
    if (value.booleanValue !== undefined) return value.booleanValue;
    if (value.nullValue !== undefined) return null;
    if (value.arrayValue !== undefined) return (value.arrayValue.values || []).map(unwrapFirestoreValue);
    if (value.mapValue !== undefined) {
        const result = {};
        Object.entries(value.mapValue.fields || {}).forEach(([key, nestedValue]) => {
            result[key] = unwrapFirestoreValue(nestedValue);
        });
        return result;
    }
    return undefined;
}

function unwrapFirestoreDocument(document) {
    const result = {};
    Object.entries(document.fields || {}).forEach(([key, value]) => {
        result[key] = unwrapFirestoreValue(value);
    });
    return result;
}

async function lookupFirebaseUser(idToken) {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
    });
    const payload = await response.json();
    if (!response.ok || !payload.users?.[0]) {
        throw new Error('INVALID_ID_TOKEN');
    }
    return payload.users[0];
}

async function getEmployeeDocument(docId, idToken) {
    const projectId = getFirebaseAdminProjectId();
    const response = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/employees/${encodeURIComponent(docId)}`,
        {
            headers: {
                Authorization: `Bearer ${idToken}`
            }
        }
    );

    if (!response.ok) {
        return null;
    }

    return unwrapFirestoreDocument(await response.json());
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Método não permitido.' });
    }

    try {
        const idToken = getBearerToken(req);

        if (!idToken) {
            return res.status(401).json({ error: 'Sessão inválida. Entre novamente como administrador.' });
        }

        const actingUser = await lookupFirebaseUser(idToken);
        const actingEmployee = await getEmployeeDocument(actingUser.localId, idToken);
        const canManagePasswords = Boolean(
            isSuperAdminEmail(actingUser.email) ||
            actingEmployee?.isSuperAdmin ||
            actingEmployee?.isAdmin
        );

        if (!canManagePasswords) {
            return res.status(403).json({ error: 'Só administradores podem definir passwords.' });
        }

        const { employeeId, newPassword } = req.body || {};

        if (!employeeId || typeof employeeId !== 'string') {
            return res.status(400).json({ error: 'Utilizador inválido.' });
        }

        if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
            return res.status(400).json({ error: 'A password deve ter pelo menos 6 caracteres.' });
        }

        const targetEmployee = await getEmployeeDocument(employeeId, idToken);
        if (!targetEmployee) {
            return res.status(404).json({ error: 'Utilizador não encontrado.' });
        }

        const targetUid = typeof targetEmployee.id === 'string' ? targetEmployee.id : employeeId;

        if (!targetEmployee?.email || !targetUid || targetUid.length < 20) {
            return res.status(400).json({ error: 'Este utilizador não tem login por email configurado.' });
        }

        const accessToken = await getIdentityToolkitAccessToken();
        const updateResponse = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:update', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                localId: targetUid,
                password: newPassword,
                targetProjectId: getFirebaseAdminProjectId()
            })
        });

        const updatePayload = await updateResponse.json();
        if (!updateResponse.ok) {
            throw new Error(updatePayload.error?.message || 'PASSWORD_UPDATE_FAILED');
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('set-password api error', error);

        if (error.message === 'FIREBASE_ADMIN_NOT_CONFIGURED') {
            return res.status(500).json({
                error: 'Falta configurar as credenciais privadas do Firebase Admin para redefinir passwords.'
            });
        }

        return res.status(500).json({ error: 'Não foi possível definir a nova password.' });
    }
}
