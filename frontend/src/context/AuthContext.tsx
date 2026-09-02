import { useState, useEffect, type ReactNode } from 'react';
import { fetchSession } from '../api';
import { AuthContext } from './authContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<import('../types').User | null | undefined>(undefined);

  useEffect(() => {
    fetchSession().then(setUser);
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}
