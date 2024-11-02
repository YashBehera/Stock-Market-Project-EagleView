// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {getAuth} from "firebase/auth";
import {getFirestore} from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCpBtqBv752ObRWzr6YFFgaR8H5DiU2OaM",
  authDomain: "eagleview-8de27.firebaseapp.com",
  projectId: "eagleview-8de27",
  storageBucket: "eagleview-8de27.appspot.com",
  messagingSenderId: "122300295070",
  appId: "1:122300295070:web:f5838eb584d8b39c7c588f",
  measurementId: "G-N7VQGZFHK0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth=getAuth();
export const db=getFirestore(app);
export default app;