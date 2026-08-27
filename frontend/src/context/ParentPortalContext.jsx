import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { request } from "../utils/request";
import { API_ENDPOINTS } from "../utils/endpoints";

const ParentPortalContext = createContext(null);

export const ParentPortalProvider = ({ children }) => {
  const { role, user } = useAuth();
  const [childrenList, setChildrenList] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [selectedProgram, setSelectedProgram] = useState("Semua Program");
  const [loading, setLoading] = useState(false);

  const fetchChildren = useCallback(async () => {
    if (role !== "parent") return;
    try {
      setLoading(true);
      const res = await request.get(API_ENDPOINTS.PARENT.CHILDREN);
      if (res.success && res.data && res.data.length > 0) {
        setChildrenList(res.data);
        if (!selectedChildId || !res.data.some(c => c.id === selectedChildId)) {
          setSelectedChildId(res.data[0].id);
        }
      }
    } catch (err) {
      console.error("Error fetching parent children:", err);
    } finally {
      setLoading(false);
    }
  }, [role, selectedChildId]);

  useEffect(() => {
    if (role === "parent") {
      fetchChildren();
    }
  }, [role, fetchChildren]);

  // When child changes, reset program to "Semua Program"
  const handleSelectChildId = (id) => {
    setSelectedChildId(Number(id));
    setSelectedProgram("Semua Program");
  };

  const selectedChild = childrenList.find(c => c.id === selectedChildId) || childrenList[0] || null;
  const childPrograms = selectedChild?.programs || [];

  return (
    <ParentPortalContext.Provider
      value={{
        childrenList,
        selectedChild,
        selectedChildId: selectedChild?.id || null,
        setSelectedChildId: handleSelectChildId,
        selectedProgram,
        setSelectedProgram,
        childPrograms,
        loadingChildren: loading,
        refreshParentData: fetchChildren,
      }}
    >
      {children}
    </ParentPortalContext.Provider>
  );
};

export const useParentPortal = () => {
  const context = useContext(ParentPortalContext);
  if (!context) {
    return {
      childrenList: [],
      selectedChild: null,
      selectedChildId: null,
      setSelectedChildId: () => {},
      selectedProgram: "Semua Program",
      setSelectedProgram: () => {},
      childPrograms: [],
      loadingChildren: false,
      refreshParentData: () => {},
    };
  }
  return context;
};
