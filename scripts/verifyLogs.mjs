import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
    projectId: "villamar-c5e82"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
    console.log("Fetching logs...");
    const logsSnap = await getDocs(collection(db, "diaperLogs"));
    const allLogs = logsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Sort by date/timestamp
    allLogs.sort((a, b) => (a.date > b.date ? -1 : 1));
    console.log("Total logs:", allLogs.length);
    let count09 = 0;
    let count10 = 0;

    for (let l of allLogs) {
        if (l.date === '2026-03-09' && l.type === 'replenishment') count09++;
        if (l.date === '2026-03-10' && l.type === 'replenishment') count10++;
    }

    console.log(`Replenishments on 09-03: ${count09}`);
    console.log(`Replenishments on 10-03: ${count10}`);

    // Print all logs for debugging
    for (let l of allLogs) {
        if (l.type === 'usage') {
            console.log(`[${l.type}] ${l.date} - ${l.patientName} (${l.amountUsed})`);
        } else if (l.type === 'replenishment') {
            console.log(`[${l.type}] ${l.date} - ${l.patientName} (+${l.amountAdded})`);
        } else {
            console.log(`[${l.type}] ${l.date} - ${l.patientName}`);
        }
    }
    process.exit(0);
}
run().catch(console.error);
