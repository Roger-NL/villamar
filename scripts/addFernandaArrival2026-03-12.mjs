import { initializeApp } from 'firebase/app';
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';

const firebaseConfig = {
    projectId: 'villamar-c5e82'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const ITEM_ID = 'propria-fernanda-costa-fraldas-m';
const DATE_STR = '2026-03-12';
const QUANTITY = 104;

async function run() {
    const itemRef = doc(db, 'inventoryItems', ITEM_ID);
    const snapshot = await getDoc(itemRef);

    if (!snapshot.exists()) {
        throw new Error(`Item não encontrado: ${ITEM_ID}`);
    }

    const item = snapshot.data();
    const arrivalHistory = Array.isArray(item.arrivalHistory) ? item.arrivalHistory : [];
    const alreadyExists = arrivalHistory.some((entry) => entry.date === DATE_STR && Number(entry.quantity) === QUANTITY);

    if (alreadyExists) {
        console.log('Chegada da Fernanda já estava registada.');
        process.exit(0);
    }

    const newEntry = {
        id: `arrival-${DATE_STR}-fernanda-104`,
        date: DATE_STR,
        quantity: QUANTITY,
        note: '2 pacotoes de 52 fraldas',
        createdAt: new Date().toISOString(),
        createdBy: 'Codex'
    };

    await setDoc(itemRef, {
        stockDepot: Number(item.stockDepot || 0) + QUANTITY,
        arrivalHistory: [...arrivalHistory, newEntry]
    }, { merge: true });

    console.log('Chegada de 104 fraldas para Fernanda Costa registada com sucesso.');
    process.exit(0);
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
