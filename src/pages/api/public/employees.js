import { getFirebaseAdminProjectId, getIdentityToolkitAccessToken } from '@/server/firebaseAdmin';

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
        const accessToken = await getIdentityToolkitAccessToken();
        const projectId = getFirebaseAdminProjectId();
        const employees = await listEmployeesAsAdmin(accessToken, projectId);

        return res.status(200).json({ employees });
    } catch (error) {
        console.error('public employees api error', error);

        if (error.message === 'FIREBASE_ADMIN_NOT_CONFIGURED') {
            return res.status(500).json({
                error: 'Falta configurar as credenciais privadas do Firebase Admin.'
            });
        }

        return res.status(500).json({ error: 'Não foi possível carregar a equipa.' });
    }
}
