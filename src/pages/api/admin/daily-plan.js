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

function encodeFirestoreValue(value) {
    if (value === null || value === undefined) return { nullValue: null };
    if (Array.isArray(value)) {
        return {
            arrayValue: {
                values: value.map((entry) => encodeFirestoreValue(entry))
            }
        };
    }
    if (typeof value === 'object') {
        const fields = {};
        Object.entries(value).forEach(([key, nested]) => {
            fields[key] = encodeFirestoreValue(nested);
        });
        return { mapValue: { fields } };
    }
    if (typeof value === 'boolean') return { booleanValue: value };
    if (typeof value === 'number') {
        if (Number.isInteger(value)) return { integerValue: String(value) };
        return { doubleValue: value };
    }
    return { stringValue: String(value) };
}

function encodeFirestoreDocument(data) {
    const fields = {};
    Object.entries(data || {}).forEach(([key, value]) => {
        fields[key] = encodeFirestoreValue(value);
    });
    return { fields };
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

async function writeDailyPlanAsAdmin(dateStr, plan, accessToken, projectId) {
    const response = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/dailyPlans/${encodeURIComponent(dateStr)}`,
        {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(encodeFirestoreDocument(plan))
        }
    );

    const payload = await response.json();
    if (!response.ok) {
        throw new Error(payload.error?.message || 'DAILY_PLAN_WRITE_FAILED');
    }
    return unwrapFirestoreDocument(payload);
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Método não permitido.' });
    }

    try {
        const idToken = getBearerToken(req);
        if (!idToken) {
            return res.status(401).json({ error: 'Sessão inválida.' });
        }

        const { dateStr, plan } = req.body || {};
        if (!dateStr || typeof dateStr !== 'string') {
            return res.status(400).json({ error: 'Data inválida.' });
        }
        if (!plan || typeof plan !== 'object') {
            return res.status(400).json({ error: 'Plano inválido.' });
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

        const normalizedPlan = {
            id: dateStr,
            date: dateStr,
            assignments: plan.assignments || {},
            statuses: plan.statuses || {},
            customLabels: plan.customLabels || {},
            groupResidents: plan.groupResidents || {},
            residentStatuses: plan.residentStatuses || {},
            customResidentNames: plan.customResidentNames || {},
            publishedAt: plan.publishedAt || null
        };

        const savedPlan = await writeDailyPlanAsAdmin(dateStr, normalizedPlan, accessToken, projectId);
        return res.status(200).json({ success: true, plan: savedPlan });
    } catch (error) {
        console.error('daily-plan api error', error);

        if (error.message === 'FIREBASE_ADMIN_NOT_CONFIGURED') {
            return res.status(500).json({
                error: 'Falta configurar as credenciais privadas do Firebase Admin.'
            });
        }

        return res.status(500).json({ error: 'Não foi possível guardar/publicar o plano diário.' });
    }
}
