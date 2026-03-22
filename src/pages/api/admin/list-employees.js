import { getFirebaseAdminProjectId, getIdentityToolkitAccessToken } from '@/server/firebaseAdmin';
import { isSuperAdminEmail } from '@/lib/authRoles';

function getBearerToken(req) {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) return '';
    return header.slice(7);
}

function unwrapFirestoreValue(value) {
    if (value?.stringValue !== undefined) return value.stringValue;
    if (value?.integerValue !== undefined) return Number(value.integerValue);
    if (value?.doubleValue !== undefined) return Number(value.doubleValue);
    if (value?.booleanValue !== undefined) return value.booleanValue;
    if (value?.nullValue !== undefined) return null;
    if (value?.arrayValue !== undefined) return (value.arrayValue.values || []).map(unwrapFirestoreValue);
    if (value?.mapValue !== undefined) {
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

async function getEmployeeDocumentAsAdmin(uid, accessToken, projectId) {
    const response = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/employees/${encodeURIComponent(uid)}`,
        {
            headers: { Authorization: `Bearer ${accessToken}` }
        }
    );
    if (!response.ok) return null;
    return unwrapFirestoreDocument(await response.json());
}

async function listEmployeesAsAdmin(accessToken, projectId) {
    const response = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/employees?pageSize=1000`,
        {
            headers: { Authorization: `Bearer ${accessToken}` }
        }
    );
    const payload = await response.json();
    if (!response.ok) {
        throw new Error(payload.error?.message || 'FIRESTORE_LIST_FAILED');
    }
    const docs = Array.isArray(payload.documents) ? payload.documents : [];
    return docs.map((document) => {
        const data = unwrapFirestoreDocument(document);
        const idFromPath = String(document.name || '').split('/').pop() || '';
        return { ...data, id: data.id || idFromPath };
    });
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Método não permitido.' });
    }

    try {
        const idToken = getBearerToken(req);
        if (!idToken) {
            return res.status(401).json({ error: 'Sessão inválida.' });
        }

        const actingUser = await lookupFirebaseUser(idToken);
        const accessToken = await getIdentityToolkitAccessToken();
        const projectId = getFirebaseAdminProjectId();

        const isSuperAdmin = isSuperAdminEmail(actingUser.email);
        let hasAdminAccess = isSuperAdmin;

        if (!hasAdminAccess) {
            const actingEmployee = await getEmployeeDocumentAsAdmin(actingUser.localId, accessToken, projectId);
            hasAdminAccess = Boolean(actingEmployee?.isAdmin || actingEmployee?.isSuperAdmin || actingEmployee?.role === 'Administrador');
        }

        if (!hasAdminAccess) {
            return res.status(403).json({ error: 'Acesso restrito a administradores.' });
        }

        const employees = await listEmployeesAsAdmin(accessToken, projectId);
        return res.status(200).json({ employees });
    } catch (error) {
        console.error('list-employees api error', error);

        if (error.message === 'FIREBASE_ADMIN_NOT_CONFIGURED') {
            return res.status(500).json({
                error: 'Falta configurar as credenciais privadas do Firebase Admin.'
            });
        }

        return res.status(500).json({ error: 'Não foi possível carregar funcionários.' });
    }
}
