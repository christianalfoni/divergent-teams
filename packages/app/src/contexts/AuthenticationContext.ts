import {
  assignState,
  createContext,
  useAction,
  useCleanup,
  useState,
  useView,
} from "rask-ui";
import { FirebaseContext } from "./FirebaseContext";
import {
  OAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  type User as FirebaseUser,
} from "firebase/auth";
import { collection, doc, getDoc } from "firebase/firestore";
import type { User } from "@divergent-teams/shared";

type AuthenticationState =
  | {
      isAuthenticating: true;
      user: null;
      error: null;
    }
  | {
      isAuthenticating: false;
      user: null;
      error: null;
    }
  | {
      isAuthenticating: false;
      user: User & { organizationId: string };
      error: null;
    }
  | {
      isAuthenticating: false;
      user: null;
      error: string;
    };

export const AuthenticationContext = createContext(() => {
  const firebase = FirebaseContext.use();
  const state = useState<AuthenticationState>({
    isAuthenticating: true,
    user: null,
    error: null,
  });
  const [loginState, login] = useAction(handleLogin);
  const disposeOnAuthChanged = onAuthStateChanged(
    firebase.auth,
    handleOnAuthChanged
  );

  useCleanup(disposeOnAuthChanged);

  return useView(state, {
    login,
    get loginError() {
      return loginState.error;
    },
  });

  async function handleOnAuthChanged(firebaseUser: FirebaseUser | null) {
    if (!firebaseUser) {
      assignState(state, {
        isAuthenticating: false,
        user: null,
        error: null,
      });
      return;
    }

    try {
      const idTokenResult = await firebaseUser.getIdTokenResult(true);

      if (typeof idTokenResult.claims.organizationId !== "string") {
        throw new Error("No organization id claim found on user");
      }

      const organizationId = idTokenResult.claims.organizationId;
      const usersCollection = collection(
        firebase.firestore,
        "organizations",
        organizationId,
        "users"
      );
      const userDocRef = doc(usersCollection, firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        throw new Error("Can not find user document in Firestore");
      }

      assignState(state, {
        isAuthenticating: false,
        user: {
          ...(userDoc.data() as User),
          id: userDoc.id,
          organizationId,
        },
        error: null,
      });
    } catch (error) {
      assignState(state, {
        isAuthenticating: false,
        user: null,
        error: String(error),
      });
    }
  }

  async function handleLogin() {
    const provider = new OAuthProvider("oidc.workos");

    provider.setCustomParameters({
      organization: import.meta.env.VITE_WORK_OS_ORGANIZATION_ID,
    });

    assignState(state, {
      isAuthenticating: true,
      user: null,
      error: null,
    });

    try {
      await signInWithPopup(firebase.auth, provider);
    } catch (error) {
      assignState(state, {
        isAuthenticating: false,
        user: null,
        error: null,
      });

      throw error;
    }
  }
});
