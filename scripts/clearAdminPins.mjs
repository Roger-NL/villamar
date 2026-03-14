import { getFirebaseAdminProjectId, getIdentityToolkitAccessToken } from '../src/server/firebaseAdmin.js';

function unwrapFirestoreValue(value) {
    if (value?.stringValue !== undefined) return value.stringValue;
    if (value?.integerValue !== undefined) return Number(value.integerValue);
    if (value?.doubleValue !== undefined) return Number(value.doubleValue);
    if (value?.booleanValue !== undefined) return value.booleanValue;
    if (value?.nullValue !== undefined) return null;
    if (value?.mapValue !== undefined) {
        const result = {};
        Object.entries(value.mapValue.fields || {}).forEach(([key, nestedValue]) => {
            result[key] = unwrapFirestoreValue(nestedValue);
        });
        return result;
    }
    return undefined;
}

function unwrapDocument(document) {
    const result = {};
    Object.entries(document.fields || {}).forEach(([key, value]) => {
        result[key] = unwrapFirestoreValue(value);
    });
    result._documentName = document.name;
    return result;
}

async function listEmployees(accessToken, projectId) {
    const response = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/employees?pageSize=500`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        }
    );

    const payload = await response.json();
    if (!response.ok) {
        throw new Error(payload.error?.message || 'LIST_EMPLOYEES_FAILED');
    }

    return (payload.documents || []).map(unwrapDocument);
}

async function clearPin(accessToken, documentName) {
    const response = await fetch(`https://firestore.googleapis.com/v1/${documentName}?updateMask.fieldPaths=pin`, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            fields: {
                pin: { stringValue: '' }
            }
        })
    });

    const payload = await response.json();
    if (!response.ok) {
        throw new Error(payload.error?.message || 'CLEAR_PIN_FAILED');
    }

    return payload;
}

const projectId = getFirebaseAdminProjectId();
const accessToken = await getIdentityToolkitAccessToken();
const employees = await listEmployees(accessToken, projectId);
const admins = employees.filter((employee) => employee.isAdmin || employee.role === 'Administrador' || employee.role === 'Super Admin');

for (const admin of admins) {
    if (!admin._documentName) continue;
    await clearPin(accessToken, admin._documentName);
    console.log(`PIN limpo para: ${admin.name || admin.email || admin.id}`);
}

console.log(`Total de administradores atualizados: ${admins.length}`);
