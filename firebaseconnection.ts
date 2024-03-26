// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAbPMpCQ8Q1QM9FBfJyVUm4YzQc-lqgsHk",
  authDomain: "mashleprojects-d372c.firebaseapp.com",
  projectId: "mashleprojects-d372c",
  storageBucket: "mashleprojects-d372c.appspot.com",
  messagingSenderId: "545384514052",
  appId: "1:545384514052:web:c434549c0ee310e44beb51",
  measurementId: "G-WWDDVPSPE1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);