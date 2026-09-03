// TODO: MOCK SESSION — restore the two imports below and remove the MOCK_SESSION import before production
// import { useState, useEffect, type ReactNode } from 'react';
// import { fetchSession } from '../api';
import { useState, type ReactNode } from 'react';
import { AuthContext } from './authContext';
import { MOCK_SESSION } from '../lib/mock/session';

export function AuthProvider({ children }: { children: ReactNode }) {
  // TODO: MOCK SESSION — replace initialization below with real fetchSession() before production
  // const [user, setUser] = useState<import('../types').User | null | undefined>(undefined);
  // useEffect(() => {
  //   fetchSession().then(setUser);
  // }, []);
  const [user, setUser] = useState<import('../types').User | null | undefined>(MOCK_SESSION.user);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}
