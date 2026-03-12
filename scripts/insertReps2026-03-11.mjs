import { initializeApp } from 'firebase/app';
import { collection, deleteDoc, doc, getDocs, getFirestore, setDoc } from 'firebase/firestore';

const firebaseConfig = {
    projectId: 'villamar-c5e82'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const DATE_STR = '2026-03-11';
const TIME_STR = '18:00';
const EXECUTOR_ID = 'admin';
const EXECUTOR_NAME = 'Admin';

const manualEntries = [
    { name: 'Otílio Guerreiro', previousStock: 10, amountAdded: 0 },
    { name: 'Mário Almeida', previousStock: 10, amountAdded: 0 },
    { name: 'Zélia Oliveira', previousStock: 10, amountAdded: 0 },
    { name: 'Luísa Reis', previousStock: 7, amountAdded: 3 },
    { name: 'Amélia Marinho', previousStock: 8, amountAdded: 2 },
    { name: 'Maria Rodrigues', previousStock: 5, amountAdded: 5 },
    { name: 'Lourdes Correia', previousStock: 10, amountAdded: 0 },
    { name: 'Simão', previousStock: 5, amountAdded: 5 },
    { name: 'Babicha', previousStock: 6, amountAdded: 4 },
    { name: 'Zulmira Teixeira', previousStock: 9, amountAdded: 0 },
    { name: 'Carlos Almeida (Fraldas)', previousStock: 10, amountAdded: 0 },
    { name: 'Carlos Almeida (Cueca-fralda)', previousStock: 9, amountAdded: 0 },
    { name: 'Domingos Ventura', previousStock: 7, amountAdded: 3 },
    { name: 'Judite', previousStock: 7, amountAdded: 3 },
    { name: 'Teresa Almendra', previousStock: 5, amountAdded: 5 },
    { name: 'Sofia Delgado', previousStock: 6, amountAdded: 4 },
    { name: 'Perpétua Pinto', previousStock: 5, amountAdded: 5 },
    { name: 'Maria Emília', previousStock: 10, amountAdded: 0 },
    { name: 'Ernestina Borges', previousStock: 5, amountAdded: 5 },
    { name: 'Fernanda Costa', previousStock: 4, amountAdded: 3 }
];

function buildId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString().slice(2, 8)}`;
}

async function run() {
    const patientSnapshot = await getDocs(collection(db, 'diaperPatients'));
    const inventorySnapshot = await getDocs(collection(db, 'inventoryItems'));
    const logsSnapshot = await getDocs(collection(db, 'diaperLogs'));

    const patients = patientSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    const inventory = inventorySnapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    const logs = logsSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }));

    const patientByName = new Map(patients.map((patient) => [patient.name, patient]));
    const inventoryById = new Map(inventory.map((item) => [item.id, item]));
    const targetNames = new Set(manualEntries.map((entry) => entry.name));

    for (const log of logs) {
        if (log.date !== DATE_STR) continue;
        if (!targetNames.has(log.patientName)) continue;
        if (log.type !== 'replenishment' && log.type !== 'audit') continue;
        await deleteDoc(doc(db, 'diaperLogs', log.id));
    }

    for (const entry of manualEntries) {
        const patient = patientByName.get(entry.name);
        if (!patient) {
            console.log(`Utente não encontrado: ${entry.name}`);
            continue;
        }

        const diaperItem = inventoryById.get(patient.diaperId || '');
        const newStock = entry.previousStock + entry.amountAdded;

        if (entry.previousStock !== 10) {
            await setDoc(doc(db, 'diaperLogs', buildId('audit')), {
                type: 'audit',
                patientId: patient.id,
                patientName: patient.name,
                date: DATE_STR,
                time: TIME_STR,
                expectedStock: 10,
                actualStock: entry.previousStock,
                deviance: 10 - entry.previousStock,
                executorId: EXECUTOR_ID,
                executorName: EXECUTOR_NAME,
                timestamp: `${DATE_STR}T${TIME_STR}:00.000Z`
            });
        }

        await setDoc(doc(db, 'diaperLogs', buildId('replenishment')), {
            type: 'replenishment',
            patientId: patient.id,
            patientName: patient.name,
            diaperId: patient.diaperId || '',
            diaperName: diaperItem?.name || '',
            date: DATE_STR,
            time: TIME_STR,
            amountAdded: entry.amountAdded,
            previousStock: entry.previousStock,
            newStock,
            executorId: EXECUTOR_ID,
            executorName: EXECUTOR_NAME,
            timestamp: `${DATE_STR}T${TIME_STR}:00.000Z`,
            skipDepotAdjustment: true
        });
    }

    console.log('Reposições manuais de 11/03/2026 inseridas sem mexer no depósito.');
    process.exit(0);
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
