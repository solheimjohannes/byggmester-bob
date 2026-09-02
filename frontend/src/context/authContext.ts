import { createContext } from 'react';
import type { User } from '../types';

export interface AuthContextValue {
  user: User | null | undefined;
  setUser: (user: User | null) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
