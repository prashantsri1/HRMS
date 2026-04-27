import { useEffect } from 'react';

const useTallyShortcuts = (actions) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Alt + C : Create New (Tally Style)
      if (event.altKey && (event.key === 'c' || event.key === 'C')) {
        event.preventDefault();
        if (actions.onCreate) actions.onCreate();
      }

      // Ctrl + S : Save
      if (event.ctrlKey && (event.key === 's' || event.key === 'S')) {
        event.preventDefault();
        if (actions.onSave) actions.onSave();
      }

      // Esc : Cancel / Back
      if (event.key === 'Escape') {
        event.preventDefault();
        if (actions.onCancel) actions.onCancel();
      }
      
      // Ctrl + P : Print
      if (event.ctrlKey && (event.key === 'p' || event.key === 'P')) {
        event.preventDefault();
        if (actions.onPrint) actions.onPrint();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions]);
};

export default useTallyShortcuts;