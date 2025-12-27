import { createContext } from "rask-ui";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { collection, getFirestore } from "firebase/firestore";

export const FirebaseContext = createContext(() => {
  const firebaseConfig = {
    apiKey: "AIzaSyC5GI1C3wYXJdlU26bce9Tmfue60VGUzK8",
    authDomain: "divergent-teams-next.firebaseapp.com",
    projectId: "divergent-teams-next",
    storageBucket: "divergent-teams-next.firebasestorage.app",
    messagingSenderId: "693297574068",
    appId: "1:693297574068:web:c5a12572d68f37a6bfa7e1",
  };
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  const collections = {
    todos(organizationId: string) {
      return collection(firestore, "organizations", organizationId, "todos");
    },
    tasks(organizationId: string) {
      return collection(firestore, "organizations", organizationId, "tasks");
    },
    mentions(organizationId: string) {
      return collection(firestore, "organizations", organizationId, "mentions");
    },
    teams(organizationId: string) {
      return collection(firestore, "organizations", organizationId, "teams");
    },
    conversations(organizationId: string) {
      return collection(
        firestore,
        "organizations",
        organizationId,
        "conversations"
      );
    },
    conversationMessages(organizationId: string, conversationId: string) {
      return collection(
        firestore,
        "organizations",
        organizationId,
        "conversations",
        conversationId,
        "messages"
      );
    },
    users(organizationId: string) {
      return collection(firestore, "organizations", organizationId, "users");
    },
  };

  return { app, auth, firestore, collections };
});
