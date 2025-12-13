import { AuthenticationContext } from "./contexts/AuthenticationContext";
import { FirebaseContext } from "./contexts/FirebaseContext";
import { ThemeContext } from "./contexts/ThemeContext";
import { TopBar } from "./components/TopBar";
import { Calendar } from "./components/Calendar";

export function App() {
  FirebaseContext.inject();
  const theme = ThemeContext.inject();
  const authentication = AuthenticationContext.inject();

  return () => {
    if (authentication.user) {
      return (
        <div class="min-h-screen bg-(--color-bg-primary) flex flex-col">
          <TopBar />
          <Calendar />
        </div>
      );
    }

    if (authentication.loginError) {
      console.log(authentication.loginError);
      return <h4>Oh oh, {String(authentication.loginError)}</h4>;
    }

    return (
      <div class="min-h-screen bg-(--color-bg-primary) text-(--color-text-primary) flex items-center justify-center">
        <button
          class="bg-(--color-accent-primary) hover:bg-(--color-accent-hover) text-(--color-text-inverse) px-4 py-2 rounded-md disabled:opacity-50 transition-colors"
          onClick={authentication.login}
          disabled={authentication.isAuthenticating}
        >
          Log In
        </button>
      </div>
    );
  };
}
