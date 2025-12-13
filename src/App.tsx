import { AuthenticationContext } from "./contexts/AuthenticationContext";
import { FirebaseContext } from "./contexts/FirebaseContext";
import { ThemeContext } from "./contexts/ThemeContext";
import { TopBar } from "./components/TopBar";
import { Calendar } from "./components/Calendar";
import { DataContext } from "./contexts/DataContext";

export function App() {
  FirebaseContext.inject();
  const theme = ThemeContext.inject();
  const authentication = AuthenticationContext.inject();

  return () => {
    return (
      console.log(authentication) || (
        <div class="min-h-screen bg-(--color-bg-primary) flex flex-col">
          <TopBar />
          <Calendar />
        </div>
      )
    );
  };
}
