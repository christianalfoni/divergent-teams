import { BackdropContext } from "../contexts/BackdropContext";

export function Backdrop() {
  const backdrop = BackdropContext.use();

  return () => {
    return (
      <div
        className={`fixed inset-0 bg-gray-500/75 dark:bg-gray-900/50 z-50 transition-opacity duration-300 ${
          backdrop.isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={() => backdrop.onClick?.()}
      />
    );
  };
}
