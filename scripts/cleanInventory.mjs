import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";

const firebaseConfig = {
    projectId: "villamar-c5e82"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
    console.log("Fetching inventory items...");
    const snap = await getDocs(collection(db, "inventoryItems"));
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    let count = 0;
    for (const item of items) {
        if (item.category === 'fralda') {
            console.log(`Deleting fake diaper inventory: ${item.name}`);
            await deleteDoc(doc(db, "inventoryItems", item.id));
            count++;
        }
    }
    console.log(`Deleted ${count} items.`);
    process.exit(0);
}
run().catch(console.error);
