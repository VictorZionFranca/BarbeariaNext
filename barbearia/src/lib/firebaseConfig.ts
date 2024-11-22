// Importar os módulos do Firebase necessários
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyC1L8icCO16S5So61SMpv9QYtcRAdFi0mU",
  authDomain: "gestaobarbearia-153fc.firebaseapp.com",
  databaseURL: "https://gestaobarbearia-153fc-default-rtdb.firebaseio.com",
  projectId: "gestaobarbearia-153fc",
  messagingSenderId: "432065485404",
  appId: "1:432065485404:web:ea586cfc3332edbcdc2499",
  measurementId: "G-8JZH0RF52R",
};

// Inicializar o Firebase
const app = initializeApp(firebaseConfig);

// Configurar os serviços que você deseja usar
const auth = getAuth(app);
const firestore = getFirestore(app);

// Exportar os serviços para uso no restante do projeto
export { app, auth, firestore };
