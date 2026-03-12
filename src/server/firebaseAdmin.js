import crypto from 'node:crypto';

function readServiceAccount() {
    if (process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON) {
        const parsed = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON);
        return {
            projectId: parsed.project_id || parsed.projectId,
            clientEmail: parsed.client_email || parsed.clientEmail,
            privateKey: (parsed.private_key || parsed.privateKey || '').replace(/\\n/g, '\n')
        };
    }

    if (
        process.env.FIREBASE_ADMIN_PROJECT_ID &&
        process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
        process.env.FIREBASE_ADMIN_PRIVATE_KEY
    ) {
        return {
            projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
            clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n')
        };
    }

    return null;
}

function base64UrlEncode(value) {
    return Buffer.from(value)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
}

function createSignedJwt(serviceAccount) {
    const now = Math.floor(Date.now() / 1000);
    const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payload = base64UrlEncode(JSON.stringify({
        iss: serviceAccount.clientEmail,
        sub: serviceAccount.clientEmail,
        aud: 'https://oauth2.googleapis.com/token',
        scope: 'https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/cloud-platform',
        iat: now,
        exp: now + 3600
    }));

    const unsignedJwt = `${header}.${payload}`;
    const signature = crypto
        .createSign('RSA-SHA256')
        .update(unsignedJwt)
        .sign(serviceAccount.privateKey, 'base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');

    return `${unsignedJwt}.${signature}`;
}

export async function getIdentityToolkitAccessToken() {
    const serviceAccount = readServiceAccount();
    if (!serviceAccount) {
        throw new Error('FIREBASE_ADMIN_NOT_CONFIGURED');
    }

    const assertion = createSignedJwt(serviceAccount);
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion
        })
    });

    const payload = await response.json();
    if (!response.ok || !payload.access_token) {
        throw new Error(payload.error_description || payload.error || 'GOOGLE_TOKEN_EXCHANGE_FAILED');
    }

    return payload.access_token;
}

export function getFirebaseAdminProjectId() {
    return process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '';
}
