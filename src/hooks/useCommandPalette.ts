/**
 * Thin wrapper that fires a custom DOM event to open the command palette.
 * The CommandPalette component listens for this event alongside ⌘K.
 */
export function useCommandPalette() {
  return {
    open: () => {
      window.dispatchEvent(new CustomEvent("open-command-palette"));
    },
  };
}
