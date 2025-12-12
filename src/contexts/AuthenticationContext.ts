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
  type User,
} from "firebase/auth";

type AuthenticationState =
  | {
      isAuthenticating: true;
      user: null;
    }
  | {
      isAuthenticating: false;
      user: null;
    }
  | {
      isAuthenticating: false;
      user: User;
    };

export const AuthenticationContext = createContext(() => {
  const firebase = FirebaseContext.use();
  const state = useState<AuthenticationState>({
    isAuthenticating: true,
    user: null,
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

  function handleOnAuthChanged(user: User | null) {
    if (user) {
      assignState(state, {
        isAuthenticating: false,
        user,
      });
    } else {
      assignState(state, {
        isAuthenticating: false,
        user: null,
      });
    }
  }

  async function handleLogin() {
    const provider = new OAuthProvider("oidc.workos");

    console.log("ORG ID", import.meta.env.VITE_WORK_OS_ORGANIZATION_ID);
    provider.setCustomParameters({
      organization: import.meta.env.VITE_WORK_OS_ORGANIZATION_ID,
    });

    assignState(state, {
      isAuthenticating: true,
      user: null,
    });

    try {
      await signInWithPopup(firebase.auth, provider);
    } catch (error) {
      assignState(state, {
        isAuthenticating: false,
        user: null,
      });

      throw error;
    }
  }
});
