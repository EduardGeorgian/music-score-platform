import React, { createContext, useState, useEffect, useContext } from "react";
import { Amplify } from "aws-amplify";
import {
  signIn,
  signUp,
  signOut,
  confirmSignUp,
  getCurrentUser,
  fetchAuthSession,
} from "aws-amplify/auth";
import { cognitoConfig } from "../config/cognito";

// Configure Amplify
Amplify.configure(cognitoConfig);

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is already logged in
  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();

      setUser({
        ...currentUser,
        token: session.tokens?.idToken?.toString(),
      });
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Login
  const login = async (email, password) => {
    try {
      setError(null);
      const result = await signIn({
        username: email,
        password,
      });

      await checkUser();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Register
  const register = async (email, password, name) => {
    try {
      setError(null);
      const result = await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            name,
          },
        },
      });

      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Confirm Sign Up (with verification code)
  const confirmRegistration = async (email, code) => {
    try {
      setError(null);
      await confirmSignUp({
        username: email,
        confirmationCode: code,
      });
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Logout
  const logout = async () => {
    try {
      await signOut();
      setUser(null);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    confirmRegistration,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
