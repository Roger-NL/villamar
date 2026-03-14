import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

function normalizeServiceAccount(parsed) {
    if (!parsed) return null;

    const projectId = parsed.project_id || parsed.projectId || '';
    const clientEmail = parsed.client_email || parsed.clientEmail || '';
    const privateKey = (parsed.private_key || parsed.privateKey || '').replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
        return null;
    }

    return {
        projectId,
        clientEmail,
        privateKey
    };
}

function readServiceAccountFromFile(filePath) {
    if (!filePath) return null;

    try {
        if (!fs.existsSync(filePath)) return null;
        const raw = fs.readFileSync(filePath, 'utf8');
        return normalizeServiceAccount(JSON.parse(raw));
    } catch {
        return null;
    }
}

function findDownloadedServiceAccount() {
    const homeDir = process.env.HOME;
    if (!homeDir) return null;

    const downloadsDir = path.join(homeDir, 'Downloads');
    if (!fs.existsSync(downloadsDir)) return null;

    try {
        const match = fs
            .readdirSync(downloadsDir)
            .find((fileName) => /^villamar-c5e82-firebase-adminsdk-.*\.json$/i.test(fileName));

        if (!match) return null;
        return readServiceAccountFromFile(path.join(downloadsDir, match));
    } catch {
        return null;
    }
}

function readServiceAccount() {
    if (process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON) {
        return normalizeServiceAccount(JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON));
    }

    if (
        process.env.FIREBASE_ADMIN_PROJECT_ID &&
        process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
        process.env.FIREBASE_ADMIN_PRIVATE_KEY
    ) {
        return normalizeServiceAccount({
            projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
            clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n')
        });
    }

    const credentialsPath = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const fromConfiguredPath = readServiceAccountFromFile(credentialsPath);
    if (fromConfiguredPath) return fromConfiguredPath;

    const downloadedAccount = findDownloadedServiceAccount();
    if (downloadedAccount) return downloadedAccount;

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
    return (
        process.env.FIREBASE_ADMIN_PROJECT_ID ||
        readServiceAccount()?.projectId ||
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
        ''
    );
}
