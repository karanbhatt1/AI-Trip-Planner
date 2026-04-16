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

const requiredFirebaseEnv = [
	"VITE_FIREBASEAPI",
	"VITE_AUTHDOMAIN",
	"VITE_PROJECTID",
	"VITE_STORAGEBUCKET",
	"VITE_MESSAGINGSENDERID",
	"VITE_APPID",
];

for (const key of requiredFirebaseEnv) {
	if (!import.meta.env[key]) {
		throw new Error(`Missing required Firebase env variable: ${key}`);
	}
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
