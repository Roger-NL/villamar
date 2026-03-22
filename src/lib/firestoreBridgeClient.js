async function parseJson(response) {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload?.error || 'FIRESTORE_BRIDGE_REQUEST_FAILED');
    }
    return payload;
}

export async function listCollectionViaBridge(collectionName) {
    const response = await fetch(`/api/public/firestore-collection?name=${encodeURIComponent(collectionName)}`);
    const payload = await parseJson(response);
    return Array.isArray(payload?.items) ? payload.items : [];
}

export async function clearCollectionViaBridge(collectionName) {
    const response = await fetch('/api/public/firestore-collection', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ collectionName })
    });
    return parseJson(response);
}

export async function setDocumentViaBridge(collectionName, docId, data, merge = true) {
    const response = await fetch('/api/public/firestore-doc', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            collectionName,
            docId: String(docId),
            data,
            merge
        })
    });
    const payload = await parseJson(response);
    return payload?.document || null;
}

export async function deleteDocumentViaBridge(collectionName, docId) {
    const response = await fetch('/api/public/firestore-doc', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            collectionName,
            docId: String(docId)
        })
    });
    return parseJson(response);
}
