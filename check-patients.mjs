import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
    projectId: "villamar-c5e82"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
    const pSnap = await getDocs(collection(db, "diaperPatients"));
    const patients = pSnap.docs.map(d => ({id: d.id, ...d.data()}));
    
    console.log("Patients:", patients.map(p => p.name));
    
    process.exit(0);
}
run().catch(console.error);
