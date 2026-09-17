"use client";
import React, { useEffect, useState } from "react";
import styles from "./header.module.css";
import moment from "moment";
import UserActions from "./UserActions";
import useIsMobile from "@/utils/useIsMobile";
import { StatusPillSkeleton } from "../skeletons";

const HeaderComponent = ({ empData }) => {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(null);
  const [onDuty, setOnDuty] = useState(false);
  const [dutyLoading, setDutyLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    setNow(moment());
  }, []);

  const fetchOnDuty = async () => {
    if (!empData?.supabase_user_id) {
      setOnDuty(false);
      setDutyLoading(false);
      return;
    }
    setDutyLoading(true);
    const startOfToday = moment().startOf("day").toDate();
    const endOfToday = moment().endOf("day").toDate();
    try {
      const response = await fetch(
        `/api/attendance/get-all?start=0&end=0&user_id=${empData.supabase_user_id}&startOfToday=${startOfToday}&endOfToday=${endOfToday}&startDate=${startOfToday}&endDate=${endOfToday}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );
      const result = await response.json();
      if (response.status === 200) {
        const today = result?.data?.data?.[0];
        setOnDuty(Boolean(today?.checkin_time && !today?.checkout_time));
      }
    } catch (e) {
      // ignore
    } finally {
      setDutyLoading(false);
    }
  };

  useEffect(() => {
    fetchOnDuty();
  }, [empData?.supabase_user_id]);

  useEffect(() => {
    if (!mounted) return undefined;
    const timer = setInterval(() => setNow(moment()), 30000);
    return () => clearInterval(timer);
  }, [mounted]);

  // Avoid SSR/client mismatch from useIsMobile (false on server, true on phone)
  if (!mounted || isMobile) {
    return null;
  }

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <h4 className={styles.title}>Cynosoft Workspace</h4>
      </div>

      <div className={styles.right}>
        <div className={styles.clockPill}>
          <span className={`material-symbols-outlined ${styles.clockIcon}`}>
            calendar_today
          </span>
          <span>
            {now ? now.format("ddd, MMM D • h:mm A") : "—"}
          </span>
        </div>

        {dutyLoading || !empData?.id ? (
          <StatusPillSkeleton />
        ) : (
          <div className={styles.statusPill}>
            <span
              className={`${styles.statusDot} ${
                onDuty ? "" : styles.statusDotOff
              }`}
            />
            <span>{onDuty ? "On Duty" : "Off Duty"}</span>
          </div>
        )}

        <UserActions
          empData={empData}
          isEmployeeLoading={!empData?.id}
          variant="default"
        />
      </div>
    </header>
  );
};

export default HeaderComponent;
