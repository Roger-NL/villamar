import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getFirebaseAdminProjectId, getIdentityToolkitAccessToken } from '../src/server/firebaseAdmin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

async function createRuleset(projectId, accessToken, rulesContent) {
    const response = await fetch(`https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            source: {
                files: [
                    {
                        name: 'firestore.rules',
                        content: rulesContent
                    }
                ]
            }
        })
    });

    const payload = await response.json();
    if (!response.ok || !payload?.name) {
        throw new Error(payload?.error?.message || 'RULESET_CREATE_FAILED');
    }

    return payload.name;
}

async function createRelease(projectId, accessToken, rulesetName) {
    const releaseName = `projects/${projectId}/releases/cloud.firestore`;
    const response = await fetch(`https://firebaserules.googleapis.com/v1/projects/${projectId}/releases`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: releaseName,
            rulesetName
        })
    });

    const payload = await response.json();
    if (!response.ok || payload?.rulesetName !== rulesetName) {
        throw new Error(payload?.error?.message || 'RELEASE_PATCH_FAILED');
    }

    return payload;
}

async function deleteRelease(projectId, accessToken) {
    const releaseName = `projects/${projectId}/releases/cloud.firestore`;
    const response = await fetch(`https://firebaserules.googleapis.com/v1/${releaseName}`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });

    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error?.message || 'RELEASE_DELETE_FAILED');
    }
}

async function publishRelease(projectId, accessToken, rulesetName) {
    try {
        return await createRelease(projectId, accessToken, rulesetName);
    } catch (error) {
        if (!String(error.message || '').includes('already exists')) {
            throw error;
        }

        await deleteRelease(projectId, accessToken);
        return createRelease(projectId, accessToken, rulesetName);
    }
}

async function main() {
    const projectId = getFirebaseAdminProjectId();
    if (!projectId) {
        throw new Error('FIREBASE_ADMIN_PROJECT_ID_MISSING');
    }

    const rulesPath = path.join(projectRoot, 'firestore.rules');
    const rulesContent = await fs.readFile(rulesPath, 'utf8');
    const accessToken = await getIdentityToolkitAccessToken();
    const rulesetName = await createRuleset(projectId, accessToken, rulesContent);
    const release = await publishRelease(projectId, accessToken, rulesetName);

    console.log(JSON.stringify({
        ok: true,
        projectId,
        rulesetName,
        releaseName: release.name,
        releaseRulesetName: release.rulesetName
    }, null, 2));
}

main().catch((error) => {
    console.error('[deploy-firestore-rules] failed:', error);
    process.exit(1);
});
