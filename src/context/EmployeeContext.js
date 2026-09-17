"use client";
import React, {
  useCallback,
  useEffect,
  useRef,
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

const isSameEmployee = (prev, next) => {
  if (prev === next) return true;
  if (!prev || !next) return false;
  return (
    prev.id === next.id &&
    prev.name === next.name &&
    prev.pic === next.pic &&
    prev.role === next.role &&
    prev.job_type === next.job_type &&
    prev.annual_leaves === next.annual_leaves &&
    prev.sick_leaves === next.sick_leaves &&
    prev.casual_leaves === next.casual_leaves &&
    prev.supabase_user_id === next.supabase_user_id &&
    prev.is_current === next.is_current
  );
};

export const EmployeeProvider = ({ children }) => {
  const router = useRouter();
  const [employeeData, setEmployeeData] = useState(null);
  // Same initial value on server and client — avoids cookie-based hydration mismatch
  const [isEmployeeLoading, setIsEmployeeLoading] = useState(true);
  const userIdRef = useRef(null);

  const applyEmployee = useCallback((next) => {
    setEmployeeData((prev) => (isSameEmployee(prev, next) ? prev : next));
  }, []);

  const getEmployeeDetail = useCallback(
    async ({ silent = false } = {}) => {
      const id = userIdRef.current || Cookies.get("user_id");
      if (!id) {
        applyEmployee(null);
        setIsEmployeeLoading(false);
        return;
      }

      if (!silent) setIsEmployeeLoading(true);
      try {
        const { data, error } = await supabase
          .from("employees")
          .select()
          .eq("supabase_user_id", id);

        if (error) {
          console.error("Error fetching employee details:", error.message);
          if (!silent) applyEmployee(null);
          return;
        }
        applyEmployee(data?.[0] || null);
      } catch (err) {
        console.error("Error fetching employee details:", err);
        if (!silent) applyEmployee(null);
      } finally {
        if (!silent) setIsEmployeeLoading(false);
      }
    },
    [applyEmployee]
  );

  useEffect(() => {
    const id = Cookies.get("user_id") || null;
    userIdRef.current = id;

    if (!id) {
      applyEmployee(null);
      setIsEmployeeLoading(false);
      return undefined;
    }

    let cancelled = false;

    const load = async () => {
      setIsEmployeeLoading(true);
      try {
        const { data, error } = await supabase
          .from("employees")
          .select()
          .eq("supabase_user_id", id);

        if (cancelled) return;
        if (error) {
          console.error("Error fetching employee details:", error.message);
          applyEmployee(null);
          return;
        }
        applyEmployee(data?.[0] || null);
      } catch (err) {
        if (!cancelled) {
          console.error("Error fetching employee details:", err);
          applyEmployee(null);
        }
      } finally {
        if (!cancelled) setIsEmployeeLoading(false);
      }
    };

    load();

    const channel = supabase
      .channel(`employee-self-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "employees",
          filter: `supabase_user_id=eq.${id}`,
        },
        () => {
          getEmployeeDetail({ silent: true });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [applyEmployee, getEmployeeDetail]);

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.log(error);
    }
    userIdRef.current = null;
    applyEmployee(null);
    setIsEmployeeLoading(false);
    Cookies.remove("user_id");
    Cookies.remove("signin_toast");
    Cookies.remove("access_token");
    Cookies.remove("refresh_token");
    Cookies.set("signout_toast", "true");
    router.push("/hrms/login");
  }, [router, applyEmployee]);

  return (
    <EmployeeContext.Provider
      value={{
        employeeData,
        logout,
        setEmployeeData,
        isEmployeeLoading,
      }}
    >
      {children}
    </EmployeeContext.Provider>
  );
};
