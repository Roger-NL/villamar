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
    const allLogs = logsSnap.docs.map(d => ({id: d.id, ...d.data()}));
    
    // Sort by date/timestamp
    allLogs.sort((a,b) => (a.date > b.date ? -1 : 1));
    for (let l of allLogs) {
        if(l.type==='usage') {
            console.log(`[${l.type}] ${l.date} - ${l.patientName} (${l.amountUsed})`);
        } else {
            console.log(`[${l.type}] ${l.date} - ${l.patientName}");
        }
    }
    process.exit(0);
}
run().catch(console.error);
