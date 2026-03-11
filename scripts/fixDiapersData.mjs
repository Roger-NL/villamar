import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc, updateDoc, setDoc } from "firebase/firestore";

const firebaseConfig = {
    projectId: "villamar-c5e82"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const officialList = [
    "Otílio Guerreiro",
    "Mário Almeida",
    "Zélia Oliveira",
    "Luísa Reis",
    "Amélia Marinho",
    "Maria Rodrigues",
    "Lourdes Correia",
    "Simão",
    "Babicha",
    "Zulmira Teixeira",
    "Carlos Almeida (Fraldas)",
    "Carlos Almeida (Cueca-fralda)",
    "Domingos Ventura",
    "Judite",
    "Teresa Almendra",
    "Lourdes Nunes",
    "Sofia Delgado",
    "Perpétua Pinto",
    "Maria Emília",
    "Ernestina Borges",
    "Fernanda Costa"
];

// Mapear nomes antigos para oficiais
function resolveName(name) {
    if (!name) return null;
    const n = name.trim();
    if (officialList.includes(n)) return n;

    const lowers = officialList.map(o => o.toLowerCase());
    const lowerN = n.toLowerCase();

    if (lowerN === 'amélia') return 'Amélia Marinho';
    if (lowerN === 'babixa') return 'Babicha';
    if (lowerN === 'emília') return 'Maria Emília';
    if (lowerN === 'fernanda') return 'Fernanda Costa';
    if (lowerN === 'fernanda c.') return 'Fernanda Costa';
    if (lowerN === 'judite') return 'Judite';
    if (lowerN === 'luísa') return 'Luísa Reis';
    if (lowerN === 'lurdes c.') return 'Lourdes Correia';
    if (lowerN === 'lurdes n.') return 'Lourdes Nunes';
    if (lowerN === 'm. rodrigues') return 'Maria Rodrigues';
    if (lowerN === 'm. zélia') return 'Zélia Oliveira';
    if (lowerN === 'mário') return 'Mário Almeida';
    if (lowerN === 'otílio') return 'Otílio Guerreiro';
    if (lowerN === 'perpétua') return 'Perpétua Pinto';
    if (lowerN === 'simão') return 'Simão';
    if (lowerN === 'sofia') return 'Sofia Delgado';
    if (lowerN === 'teresa') return 'Teresa Almendra';
    if (lowerN === 'ventura') return 'Domingos Ventura';
    if (lowerN === 'carlos fraldas') return 'Carlos Almeida (Fraldas)';
    if (lowerN === 'carlos cuecas fraldas') return 'Carlos Almeida (Cueca-fralda)';
    if (lowerN === 'ernestina') return 'Ernestina Borges';
    if (lowerN === 'zulmira') return 'Zulmira Teixeira';

    // Everything else not mapped is REMOVED
    return null;
}

async function run() {
    console.log("Fetching current patients...");
    const pSnap = await getDocs(collection(db, "diaperPatients"));
    const allPatients = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const officialPatientsMap = {}; // name -> docId
    const deletePatientPromises = [];

    // 1. Resolve and deduplicate patients
    for (const p of allPatients) {
        const officialName = resolveName(p.name);
        if (officialName) {
            if (!officialPatientsMap[officialName]) {
                officialPatientsMap[officialName] = p.id;
                // Update doc to exactly format the name
                console.log(`Renaming patient ${p.id} to ${officialName}`);
                await updateDoc(doc(db, "diaperPatients", p.id), { name: officialName });
            } else {
                console.log(`Deleting duplicate patient ${p.id} (${p.name})`);
                await deleteDoc(doc(db, "diaperPatients", p.id));
            }
        } else {
            console.log(`Deleting un-mapped patient ${p.id} (${p.name})`);
            await deleteDoc(doc(db, "diaperPatients", p.id));
        }
    }

    // Add missing official patients
    for (const name of officialList) {
        if (!officialPatientsMap[name]) {
            console.log(`Creating missing patient: ${name}`);
            const newId = Date.now().toString() + Math.random().toString().slice(2, 6);
            await setDoc(doc(db, "diaperPatients", newId), {
                name,
                origin: "Casa",
                diaperId: "",
                wardrobeStock: 10,
                createdAt: new Date().toISOString()
            });
            officialPatientsMap[name] = newId;
        }
    }

    console.log("Fetching logs...");
    const logsSnap = await getDocs(collection(db, "diaperLogs"));
    const allLogs = logsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // 2. Clear invalid logs & update patient IDs
    for (const l of allLogs) {
        const officialName = resolveName(l.patientName);
        if (!officialName) {
            console.log(`Deleting log ${l.id} for removed patient ${l.patientName}`);
            await deleteDoc(doc(db, "diaperLogs", l.id));
            continue;
        }

        const officialId = officialPatientsMap[officialName];
        let needsUpdate = l.patientName !== officialName || l.patientId !== officialId;

        // Remove ALL replenishments on 09-03 and 10-03 so we can rewrite them cleanly
        if (l.type === 'replenishment' && (l.date === '2026-03-09' || l.date === '2026-03-10')) {
            console.log(`Deleting old replenishment log ${l.id} on ${l.date}`);
            await deleteDoc(doc(db, "diaperLogs", l.id));
            continue;
        }

        if (needsUpdate) {
            await updateDoc(doc(db, "diaperLogs", l.id), {
                patientName: officialName,
                patientId: officialId
            });
        }
    }

    // 3. Insert specific replenishments
    const rep09 = {
        "Luísa Reis": 5,
        "Amélia Marinho": 9,
        "Maria Rodrigues": 6,
        "Simão": 3,
        "Babicha": 6,
        "Zulmira Teixeira": 4,
        "Carlos Almeida (Cueca-fralda)": 1,
        "Domingos Ventura": 4,
        "Judite": 7,
        "Teresa Almendra": 5,
        "Sofia Delgado": 7,
        "Perpétua Pinto": 7,
        "Ernestina Borges": 1,
        "Fernanda Costa": 10
    };

    const rep10 = {
        "Luísa Reis": 6,
        "Amélia Marinho": 6,
        "Maria Rodrigues": 6,
        "Simão": 2,
        "Babicha": 4,
        "Zulmira Teixeira": 5,
        "Carlos Almeida (Cueca-fralda)": 1,
        "Domingos Ventura": 5,
        "Judite": 4,
        "Teresa Almendra": 4,
        "Sofia Delgado": 6,
        "Perpétua Pinto": 8,
        "Ernestina Borges": 4,
        "Fernanda Costa": 4
    };

    async function insertReps(dateStr, repsObj) {
        for (const [name, amountAdded] of Object.entries(repsObj)) {
            const pId = officialPatientsMap[name];
            if (!pId) {
                console.error("Missing ID for", name);
                continue;
            }
            const logId = Date.now().toString() + Math.random().toString().slice(2, 6);
            console.log(`Inserting Rep on ${dateStr} for ${name}: +${amountAdded}`);
            await setDoc(doc(db, "diaperLogs", logId), {
                type: 'replenishment',
                patientId: pId,
                patientName: name,
                diaperId: '',
                diaperName: '',
                date: dateStr,
                time: "10:00", // Default dummy time
                amountAdded: amountAdded,
                previousStock: 10 - amountAdded,
                newStock: 10,
                executorId: 'admin',
                executorName: 'Admin',
                timestamp: `${dateStr}T10:00:00.000Z`
            });
        }
    }

    await insertReps('2026-03-09', rep09);
    await insertReps('2026-03-10', rep10);

    console.log("Done!");
    process.exit(0);
}
run().catch(console.error);
