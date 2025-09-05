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
import { useRouter } from "next/navigation";

const EmployeeContext = createContext(null);

// Create a custom hook for easy access
export const useEmployee = () => useContext(EmployeeContext);

export const EmployeeProvider = ({ children }) => {
  const router = useRouter();
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

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.log(error);
    }
    setEmployeeData(null);
    Cookies.remove("user_id");
    Cookies.remove("signin_toast");
    Cookies.remove("access_token");
    Cookies.set("signout_toast", "true");
    router.push("/hrms/login");
  }, []);

  return (
    <EmployeeContext.Provider value={{ employeeData, logout, setEmployeeData }}>
      {children}
    </EmployeeContext.Provider>
  );
};
