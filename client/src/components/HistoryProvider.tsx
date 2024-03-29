import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

// The idea is that after a user logs in or signs up, we want to redirect
// them to the last page they visited *before* the login/signup page.
const doNotRedirectToThesePaths = [
  '/signup', '/login', '/verify-email', '/confirm-password-reset', '/error'
];

export type HistoryContextType = {
  lastNonAuthPath: string;
};

export const HistoryContext = React.createContext<HistoryContextType>({
  lastNonAuthPath: '/',
});

export default function HistoryProvider({children}: React.PropsWithChildren<{}>) {
  const location = useLocation();
  const [lastNonAuthPath, setLastNonAuthPath] = useState('/');
  useEffect(() => {
    if (doNotRedirectToThesePaths.every(authPath => location.pathname !== authPath)) {
      setLastNonAuthPath(location.pathname);
    }
  }, [location.pathname]);
  return (
    <HistoryContext.Provider value={{lastNonAuthPath}}>
      {children}
    </HistoryContext.Provider>
  );
}
