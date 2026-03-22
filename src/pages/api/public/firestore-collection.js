import { getFirebaseAdminProjectId, getIdentityToolkitAccessToken } from '@/server/firebaseAdmin';
import { deleteDocument, listCollection } from '@/server/firestoreRest';

export default async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'DELETE') {
        res.setHeader('Allow', 'GET, DELETE');
        return res.status(405).json({ error: 'Método não permitido.' });
    }

    try {
        const accessToken = await getIdentityToolkitAccessToken();
        const projectId = getFirebaseAdminProjectId();
        const collectionName = req.method === 'GET'
            ? req.query.name
            : req.body?.collectionName;

        if (!collectionName || typeof collectionName !== 'string') {
            return res.status(400).json({ error: 'Coleção inválida.' });
        }

        if (req.method === 'GET') {
            const items = await listCollection(collectionName, accessToken, projectId);
            return res.status(200).json({ items });
        }

        const items = await listCollection(collectionName, accessToken, projectId);
        await Promise.all(items.map((item) => deleteDocument(collectionName, item.id, accessToken, projectId)));
        return res.status(200).json({ ok: true, deletedCount: items.length });
    } catch (error) {
        console.error('public firestore-collection api error', error);

        if (error.message === 'FIREBASE_ADMIN_NOT_CONFIGURED') {
            return res.status(500).json({
                error: 'Falta configurar as credenciais privadas do Firebase Admin.'
            });
        }

        if (error.message === 'COLLECTION_NOT_ALLOWED') {
            return res.status(403).json({ error: 'Coleção não autorizada.' });
        }

        return res.status(500).json({ error: 'Não foi possível processar a coleção.' });
    }
}
