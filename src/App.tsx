import { AuthenticationContext } from "./contexts/AuthenticationContext";
import { FirebaseContext } from "./contexts/FirebaseContext";
import { ThemeContext } from "./contexts/ThemeContext";
import { TopBar } from "./components/TopBar";
import { Calendar } from "./components/Calendar";
import { DataContext } from "./contexts/DataContext";
import { AuthModal } from "./components/AuthModal";
import { JSONStorageContext } from "./contexts/JSONStorageContext";
import { MentionsContext } from "./contexts/MentionsContext";

export function App() {
  FirebaseContext.inject();
  ThemeContext.inject();
  MentionsContext.inject();
  JSONStorageContext.inject("divergent-teams");
  const authentication = AuthenticationContext.inject();
  DataContext.inject();

  return () => {
    const showAuthModal =
      !authentication.isAuthenticating && !authentication.user;

    return (
      <div class="min-h-screen bg-(--color-bg-primary) flex flex-col">
        <TopBar />
        <Calendar />
        {showAuthModal ? <AuthModal /> : null}
      </div>
    );
  };
}
