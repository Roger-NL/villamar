import { getFirebaseAdminProjectId, getIdentityToolkitAccessToken } from '@/server/firebaseAdmin';
import { deleteDocument, setDocument } from '@/server/firestoreRest';

export default async function handler(req, res) {
    if (req.method !== 'POST' && req.method !== 'DELETE') {
        res.setHeader('Allow', 'POST, DELETE');
        return res.status(405).json({ error: 'Método não permitido.' });
    }

    try {
        const accessToken = await getIdentityToolkitAccessToken();
        const projectId = getFirebaseAdminProjectId();
        const { collectionName, docId, data, merge } = req.body || {};

        if (!collectionName || !docId) {
            return res.status(400).json({ error: 'Documento inválido.' });
        }

        if (req.method === 'POST') {
            const document = await setDocument(collectionName, docId, data || {}, accessToken, projectId, merge !== false);
            return res.status(200).json({ ok: true, document });
        }

        await deleteDocument(collectionName, docId, accessToken, projectId);
        return res.status(200).json({ ok: true });
    } catch (error) {
        console.error('public firestore-doc api error', error);

        if (error.message === 'FIREBASE_ADMIN_NOT_CONFIGURED') {
            return res.status(500).json({
                error: 'Falta configurar as credenciais privadas do Firebase Admin.'
            });
        }

        if (error.message === 'COLLECTION_NOT_ALLOWED') {
            return res.status(403).json({ error: 'Coleção não autorizada.' });
        }

        return res.status(500).json({ error: 'Não foi possível guardar o documento.' });
    }
}
