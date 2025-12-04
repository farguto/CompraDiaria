import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// IMPORTANTE: Esta configuración es un ejemplo.
// Para que el Login funcione, tenés que:
// 1. Crear un proyecto en https://console.firebase.google.com
// 2. Copiar tu configuración (Project Settings -> General -> Your apps)
// 3. Pegarla acá abajo reemplazando "firebaseConfig"
// 4. Habilitar "Email/Password" y "Google" en Authentication -> Sign-in method
// 5. Agregar tu dominio en Authentication -> Settings -> Authorized Domains

const firebaseConfig = {
  apiKey: "AIzaSyAFiqgQQkNAunu-9TXYbg7GLpYtpO0Ubhg",
  authDomain: "auth-b5086.firebaseapp.com",
  projectId: "auth-b5086",
  storageBucket: "auth-b5086.firebasestorage.app",
  messagingSenderId: "169468984245",
  appId: "1:169468984245:web:ae10bcfa0c78d2162077fc"
};

// Detectar si se está usando la config por defecto
const isDefaultConfig = firebaseConfig.apiKey === "AIzaSyAFiqgQQkNAunu-9TXYbg7GLpYtpO0Ubhg";

// Inicializar Firebase solo si la config es válida, sino mostrar error en consola
let app;
let auth;
let googleProvider;

try {
  if (isDefaultConfig) {
      console.warn("⚠️ Firebase no está configurado. Por favor edita services/firebase.ts");
  }
  
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
} catch (error) {
  console.error("Error inicializando Firebase:", error);
}

export { auth, googleProvider, isDefaultConfig };