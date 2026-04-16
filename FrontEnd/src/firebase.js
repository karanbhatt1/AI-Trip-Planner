import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";


const firebaseConfig = {
apiKey: import.meta.env.VITE_FIREBASEAPI,
authDomain: import.meta.env.VITE_AUTHDOMAIN,
projectId:import.meta.env.VITE_PROJECTID,
storageBucket:import.meta.env.VITE_STORAGEBUCKET,
messagingSenderId: import.meta.env.VITE_MESSAGINGSENDERID,
appId : import.meta.env.VITE_APPID,
measurementId: import.meta.env.VITE_MEASUREMENTID
};

const app = initializeApp(firebaseConfig);
console.log("Firebase config:", firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
