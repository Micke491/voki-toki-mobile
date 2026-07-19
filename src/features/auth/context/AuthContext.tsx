import React, { createContext, useCallback, useContext, useState, useEffect, PropsWithChildren } from 'react';
import { User } from '../../../types';
import { getToken, saveToken, removeToken } from '../../../utils/storage';
import { authApi } from '../api';

interface AuthContextData {
  user: User | null;
  isLoading: boolean;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const token = await getToken();
        if (token) {
          const data = await authApi.getCurrentUser();
          setUser(data.user);
        }
      } catch (error) {
        await removeToken();
      } finally {
        setIsLoading(false);
      }
    };
    loadSession();
  }, []);

  const signIn = async (token: string, userData: User) => {
    await saveToken(token);
    setUser(userData);
  };

  const signOut = async () => {
    await removeToken();
    setUser(null);
  };

  const updateUser = useCallback((userData: User) => {
    setUser((currentUser) => (
      currentUser?._id === userData._id ? userData : currentUser
    ));
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => useContext(AuthContext);
