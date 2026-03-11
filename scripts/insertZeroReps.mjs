import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
    projectId: "villamar-c5e82"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const noReplacementList = [
    "Otílio Guerreiro",
    "Mário Almeida",
    "Zélia Oliveira",
    "Lourdes Correia",
    "Carlos Almeida (Fraldas)",
    "Maria Emília",
    "Lourdes Nunes"
];

async function run() {
    const pSnap = await getDocs(collection(db, "diaperPatients"));
    const patients = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const officialPatientsMap = {}; // name -> docId
    for (const p of patients) {
        officialPatientsMap[p.name] = p;
    }

    async function insertRep(dateStr, p) {
        if (!p) {
            console.log("Patient not found!");
            return;
        }
        const logId = Date.now().toString() + Math.random().toString().slice(2, 6);
        console.log(`Inserting 0 Rep on ${dateStr} for ${p.name}`);
        await setDoc(doc(db, "diaperLogs", logId), {
            type: 'replenishment',
            patientId: p.id,
            patientName: p.name,
            diaperId: p.diaperId || '',
            diaperName: p.diaperName || '', // We don't have diaperName here, but it's ok, maybe empty or we fetch it
            date: dateStr,
            time: "10:00",
            amountAdded: 0,
            previousStock: 10,
            newStock: 10,
            executorId: 'admin',
            executorName: 'Admin',
            timestamp: `${dateStr}T10:00:00.000Z`
        });
    }

    for (const name of noReplacementList) {
        const p = officialPatientsMap[name];
        await insertRep('2026-03-09', p);
        await insertRep('2026-03-10', p);
    }

    console.log("Done inserting 0 replenishments.");
    process.exit(0);
}

run().catch(console.error);
