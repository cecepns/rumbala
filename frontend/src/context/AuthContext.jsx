import React, { createContext, useContext, useState, useEffect } from "react";
import { request } from "../utils/request";
import { API_ENDPOINTS } from "../utils/endpoints";
import toast from "react-hot-toast";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("rumbala_token") || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("rumbala_user");
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("rumbala_user");
      }
    }
    setLoading(false);
  }, [token]);

  const login = async (username, password) => {
    try {
      const res = await request.post(API_ENDPOINTS.AUTH.LOGIN, { username, password });
      if (res.success) {
        setUser(res.user);
        setToken(res.token);
        localStorage.setItem("rumbala_token", res.token);
        localStorage.setItem("rumbala_user", JSON.stringify(res.user));
        toast.success(`Selamat datang kembali, ${res.user.name}!`);
        return true;
      } else {
        toast.error(res.message || "Gagal masuk");
        return false;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Kombinasi username/password salah.");
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("rumbala_token");
    localStorage.removeItem("rumbala_user");
    toast.success("Anda berhasil logout.");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token && !!user,
        role: user?.role || null,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
