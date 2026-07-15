import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDYojzPVtmFLs-SPCGNmpR5EBdmY5kJipw",
  authDomain: "essarfab-admin-panel.firebaseapp.com",
  projectId: "essarfab-admin-panel",
  storageBucket: "essarfab-admin-panel.firebasestorage.app",
  messagingSenderId: "514815494001",
  appId: "1:514815494001:web:0d7dfaf656099d79c1d8d0",
  measurementId: "G-5G4JBR3C4P"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);