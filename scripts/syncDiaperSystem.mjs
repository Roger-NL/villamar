import { initializeApp } from 'firebase/app';
import { collection, deleteDoc, doc, getDocs, getFirestore, setDoc } from 'firebase/firestore';
import {
    DIAPER_INVENTORY_CATALOG,
    OFFICIAL_DIAPER_PATIENTS,
    getPatientDiaperAssignment
} from '../src/data/diaperConfig.mjs';

const firebaseConfig = {
    projectId: 'villamar-c5e82'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function isDiaperInventoryItem(item) {
    return item.category === 'fralda'
        || /fralda|cueca/i.test(item.name || '')
        || item.patientName;
}

async function syncPatients() {
    const snapshot = await getDocs(collection(db, 'diaperPatients'));
    const existingPatients = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    const byName = new Map(existingPatients.map((patient) => [patient.name, patient]));

    for (const patientName of OFFICIAL_DIAPER_PATIENTS) {
        const existing = byName.get(patientName);
        const assignment = getPatientDiaperAssignment(patientName);
        const docId = existing?.id || `${Date.now()}-${Math.random().toString().slice(2, 8)}`;

        await setDoc(doc(db, 'diaperPatients', docId), {
            name: patientName,
            diaperId: assignment.diaperId,
            origin: assignment.origin,
            wardrobeStock: existing?.wardrobeStock ?? 10,
            hasAnomaly: existing?.hasAnomaly ?? false,
            createdAt: existing?.createdAt || new Date().toISOString()
        }, { merge: true });
    }
}

async function syncInventory() {
    const snapshot = await getDocs(collection(db, 'inventoryItems'));
    const existingItems = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    const expectedIds = new Set(DIAPER_INVENTORY_CATALOG.map((item) => item.id));

    for (const item of existingItems) {
        if (isDiaperInventoryItem(item) && !expectedIds.has(item.id)) {
            await deleteDoc(doc(db, 'inventoryItems', item.id));
        }
    }

    for (const item of DIAPER_INVENTORY_CATALOG) {
        const current = existingItems.find((existing) => existing.id === item.id);
        await setDoc(doc(db, 'inventoryItems', item.id), {
            ...item,
            createdAt: current?.createdAt || new Date().toISOString()
        }, { merge: true });
    }
}

async function run() {
    console.log('Synchronizing diaper patients...');
    await syncPatients();
    console.log('Synchronizing diaper inventory...');
    await syncInventory();
    console.log('Diaper system synchronized successfully.');
    process.exit(0);
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
