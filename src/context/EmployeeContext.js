"use client";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  createContext,
  useContext,
} from "react";
import { supabase } from "@/utils/supabaseClient";
import Cookies from "js-cookie";

const EmployeeContext = createContext(null);

// Create a custom hook for easy access
export const useEmployee = () => useContext(EmployeeContext);

export const EmployeeProvider = ({ children }) => {
  const [employeeData, setEmployeeData] = useState(null);
  const userId = Cookies.get("user_id");

  const getEmployeeDetail = useCallback(async () => {
    const { data, error } = await supabase
      .from("employees")
      .select()
      .eq("supabase_user_id", userId);

    if (error) {
      console.error("Error fetching employee details:", error.message);
      return;
    }
    setEmployeeData(data?.[0]);
  }, [userId]);

  useEffect(() => {
    if (userId) {
      supabase
        .channel("table-db-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "employees",
          },
          (payload) => {
            getEmployeeDetail();
          }
        )
        .subscribe();
      getEmployeeDetail();
    }
  }, [userId, getEmployeeDetail]);

  const logout = useCallback(() => {
    setEmployeeData(null);
  }, []);

  return (
    <EmployeeContext.Provider value={{ employeeData, logout, setEmployeeData }}>
      {children}
    </EmployeeContext.Provider>
  );
};
