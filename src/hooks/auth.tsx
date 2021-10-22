import React, { createContext, useContext, useEffect, useState } from 'react';
import * as AuthSessions from 'expo-auth-session';
import { api } from '../Services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setStatusBarStyle } from 'expo-status-bar';

const CLIENT_ID = '5b580cd845a95845dadb';
const SCOPE = 'read:user';
const USER_STORAGE = '@nlwheat:user';
const TOKEN_STORAGE = '@nlwheat:token';

type User = {
    id: string;
    avatar_url: string;
    name: string;
    login: string;
}

type AuthContextData = {
    user: User | null;
    isSigningIn: boolean;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
}

type AuthProviderProps = {
    children: React.ReactNode;
}

type AuthResponse = {
    token: string;
    user: User;
}

type AuthorizationResponse = {
    params: {
        code?: string;
        error?: string;
    },
    type?: string;
}

export const AuthContext = createContext({} as AuthContextData);

function AuthProvider({ children }: AuthProviderProps) {
    const [isSigningIn, setIsSigningIn] = useState(true);
    const [user, setUser] = useState<User | null>(null);

    async function signIn() {
        try {
            setIsSigningIn(true);
            const authUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=${SCOPE}`;
            const authSessionReponse = await AuthSessions.startAsync({ authUrl }) as AuthorizationResponse;

            if (authSessionReponse.type === 'success' && authSessionReponse.params.error !== 'access_denied') {
                const authResponse = await api.post('/authenticate', { code: authSessionReponse.params.code });
                const { user, token } = authResponse.data as AuthResponse;

                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                await AsyncStorage.setItem(USER_STORAGE, JSON.stringify(user));
                await AsyncStorage.setItem(TOKEN_STORAGE, token);

                setUser(user);
            }
        } catch (err) {
            console.log(err);
        }finally{
            setIsSigningIn(false);
        }
    }

    async function signOut() {
        setUser(null);
        await AsyncStorage.removeItem(USER_STORAGE); 
        await AsyncStorage.removeItem(TOKEN_STORAGE); 
    }

    useEffect(() => {
        async function loadUserStorageData() {
            const userStorage = await AsyncStorage.getItem(USER_STORAGE);
            const tokenStorage = await AsyncStorage.getItem(TOKEN_STORAGE);

            if (userStorage && tokenStorage) {
                api.defaults.headers.common['Authorization'] = `Bearer ${tokenStorage}`;
                setUser(JSON.parse(userStorage));
            }

            setIsSigningIn(false);
        }

        loadUserStorageData();
    }, []);

    return (
        <AuthContext.Provider value={{
            signIn,
            signOut,
            user,
            isSigningIn
        }}>
            {children}

        </AuthContext.Provider>
    )
}

function useAuth() {
    const context = useContext(AuthContext);

    return context;
}

export { AuthProvider, useAuth }