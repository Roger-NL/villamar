import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";

const firebaseConfig = {
    projectId: "villamar-c5e82"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
    console.log("Fetching logs...");
    const logsSnap = await getDocs(collection(db, "diaperLogs"));
    const allLogs = logsSnap.docs.map(d => ({id: d.id, ...d.data()}));
    
    let usages = allLogs.filter(l => l.type === 'usage');
    for (const u of usages) {
        console.log(`Found usage: ${u.patientName} - date: "${u.date}" - ${u.amountUsed} units`);
        if (u.date === '2026-03-09' || u.date === '2026-03-10') {
            await deleteDoc(doc(db, "diaperLogs", u.id));
            console.log("Deleted.");
        }
    }
    
    process.exit(0);
}
run().catch(console.error);
