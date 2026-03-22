export const ALLOWED_FIRESTORE_COLLECTIONS = new Set([
    'employees',
    'tasks',
    'swapRequests',
    'notifications',
    'timeRecords',
    'activeSessions',
    'schedules',
    'leaves',
    'inventoryItems',
    'insulinPatients',
    'insulinLogs',
    'medicalNotes',
    'diaperPatients',
    'diaperLogs',
    'dailyPlans',
    'dailyAnnouncements',
]);

export function assertAllowedCollection(collectionName) {
    if (!ALLOWED_FIRESTORE_COLLECTIONS.has(collectionName)) {
        throw new Error('COLLECTION_NOT_ALLOWED');
    }
}

export function unwrapFirestoreValue(value) {
    if (value?.stringValue !== undefined) return value.stringValue;
    if (value?.integerValue !== undefined) return Number(value.integerValue);
    if (value?.doubleValue !== undefined) return Number(value.doubleValue);
    if (value?.booleanValue !== undefined) return value.booleanValue;
    if (value?.nullValue !== undefined) return null;
    if (value?.timestampValue !== undefined) return value.timestampValue;
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

export function unwrapFirestoreDocument(document) {
    const result = {};
    Object.entries(document.fields || {}).forEach(([key, value]) => {
        result[key] = unwrapFirestoreValue(value);
    });
    return result;
}

export function encodeFirestoreValue(value) {
    if (value === null) return { nullValue: null };
    if (value === undefined) return undefined;
    if (Array.isArray(value)) {
        return {
            arrayValue: {
                values: value.map(encodeFirestoreValue).filter(Boolean)
            }
        };
    }
    if (value instanceof Date) {
        return { timestampValue: value.toISOString() };
    }
    if (typeof value === 'boolean') return { booleanValue: value };
    if (typeof value === 'number') {
        return Number.isInteger(value)
            ? { integerValue: String(value) }
            : { doubleValue: value };
    }
    if (typeof value === 'string') return { stringValue: value };
    if (typeof value === 'object') {
        const fields = {};
        Object.entries(value).forEach(([key, nestedValue]) => {
            const encoded = encodeFirestoreValue(nestedValue);
            if (encoded !== undefined) {
                fields[key] = encoded;
            }
        });
        return { mapValue: { fields } };
    }
    return { stringValue: String(value) };
}

export function encodeFirestoreDocument(data) {
    const fields = {};
    Object.entries(data || {}).forEach(([key, value]) => {
        const encoded = encodeFirestoreValue(value);
        if (encoded !== undefined) {
            fields[key] = encoded;
        }
    });
    return fields;
}

export async function listCollection(collectionName, accessToken, projectId, pageSize = 1000) {
    assertAllowedCollection(collectionName);

    const response = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}?pageSize=${pageSize}`,
        {
            headers: { Authorization: `Bearer ${accessToken}` }
        }
    );
    const payload = await response.json();
    if (!response.ok) {
        throw new Error(`${collectionName}:${payload.error?.message || 'FIRESTORE_LIST_FAILED'}`);
    }

    const docs = Array.isArray(payload.documents) ? payload.documents : [];
    return docs.map((document) => {
        const data = unwrapFirestoreDocument(document);
        const idFromPath = String(document.name || '').split('/').pop() || '';
        return { ...data, id: data.id || idFromPath };
    });
}

export async function getDocument(collectionName, docId, accessToken, projectId) {
    assertAllowedCollection(collectionName);

    const response = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}/${encodeURIComponent(String(docId))}`,
        {
            headers: { Authorization: `Bearer ${accessToken}` }
        }
    );

    if (response.status === 404) return null;

    const payload = await response.json();
    if (!response.ok) {
        throw new Error(`${collectionName}:${payload.error?.message || 'FIRESTORE_GET_FAILED'}`);
    }

    const data = unwrapFirestoreDocument(payload);
    const idFromPath = String(payload.name || '').split('/').pop() || '';
    return { ...data, id: data.id || idFromPath };
}

export async function setDocument(collectionName, docId, data, accessToken, projectId, merge = true) {
    assertAllowedCollection(collectionName);

    const stringDocId = String(docId);
    const fields = encodeFirestoreDocument(data);
    const fieldNames = Object.keys(fields);

    const params = new URLSearchParams();
    if (merge) {
        fieldNames.forEach((fieldName) => {
            params.append('updateMask.fieldPaths', fieldName);
        });
    }

    const query = params.toString();
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}/${encodeURIComponent(stringDocId)}${query ? `?${query}` : ''}`;

    const response = await fetch(url, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields })
    });
    const payload = await response.json();

    if (!response.ok) {
        throw new Error(`${collectionName}:${payload.error?.message || 'FIRESTORE_SET_FAILED'}`);
    }

    const saved = unwrapFirestoreDocument(payload);
    return { ...saved, id: saved.id || stringDocId };
}

export async function deleteDocument(collectionName, docId, accessToken, projectId) {
    assertAllowedCollection(collectionName);

    const response = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}/${encodeURIComponent(String(docId))}`,
        {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` }
        }
    );

    if (response.status === 404) return true;

    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(`${collectionName}:${payload.error?.message || 'FIRESTORE_DELETE_FAILED'}`);
    }

    return true;
}
