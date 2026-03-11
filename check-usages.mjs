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
    
    // find usages on 09-03 and 10-03
    let usages = allLogs.filter(l => l.type === 'usage' && (l.date === '2026-03-09' || l.date === '2026-03-10'));
    console.log("Fake usages found:", usages.length);
    for (const u of usages) {
        console.log(`Deleting usage: ${u.patientName} - ${u.date} - ${u.amountUsed} units`);
        await deleteDoc(doc(db, "diaperLogs", u.id));
    }
    
    process.exit(0);
}
run().catch(console.error);
