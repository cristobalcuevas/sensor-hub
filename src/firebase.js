import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue } from "firebase/database";







const firebaseConfig = {
  apiKey: "AIzaSyC6MX8Vw9xZz3OTQCce1P7a2PBF7NFAG8E",
  authDomain: "esp32-project-88df0.firebaseapp.com",
  databaseURL: "https://esp32-project-88df0-default-rtdb.firebaseio.com",
  projectId: "esp32-project-88df0",
  storageBucket: "esp32-project-88df0.appspot.com"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);


