"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import DatePicker from "react-datepicker";
import styles from "./attendance.module.css";
import "react-datepicker/dist/react-datepicker.css";
import Cookies from "js-cookie";
import { toast } from "react-toastify";
import { useEmployee } from "@/context/EmployeeContext";
import moment from "moment";
import { generateAttendancePdf } from "@/utils/pdfGenerator";
import ButtonLoader from "../ButtonLoader.jsx";
import calculateTimeDifference from "@/utils/timeDifference";
import {
  formatDayLabel,
  getAttendanceStatus,
  isActiveSession,
  parseTotalHoursToProgress,
  computeMonthMetrics,
  formatOvertimeLabel,
  getRequiredHours,
  isEarlyOutHours,
} from "@/utils/attendanceDisplay";

function AttendanceComponent() {
  const { employeeData, logout } = useEmployee();
  const exportRef = useRef(null);
  const [attendanceList, setAttendanceList] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [totalRecord, setTotalRecord] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(5);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [elapsed, setElapsed] = useState("");
  const [todaySession, setTodaySession] = useState(null);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [monthMetrics, setMonthMetrics] = useState(() =>
    computeMonthMetrics([])
  );

  const requiredHours = getRequiredHours(employeeData?.job_type);

  const totalPages = Math.max(1, Math.ceil(totalRecord / recordsPerPage) || 1);

  const getEmployeeDetail = async () => {
    if (!employeeData?.supabase_user_id) return;
    const startOfToday = new Date(startDate);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date(endDate);
    endOfToday.setHours(23, 59, 59, 999);
    const start = (currentPage - 1) * recordsPerPage;
    const end = start + recordsPerPage - 1;
    setIsLoading(true);
    const response = await fetch(
      `/api/attendance/get-all?start=${start}&end=${end}&user_id=${employeeData?.supabase_user_id}&startOfToday=${startOfToday}&endOfToday=${endOfToday}&startDate=${startDate}&endDate=${endDate}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    const result = await response.json();
    if (response.status === 200) {
      const formattedData = result?.data?.data?.map((att) => ({
        id: att?.id,
        date: att?.checkin_time
          ? moment(att?.checkin_time).format("YYYY-MM-DD")
          : "",
        checkIn: att?.checkin_time
          ? moment.utc(att?.checkin_time).local().format("hh:mm:ss A")
          : "",
        checkOut: att?.checkout_time
          ? moment.utc(att?.checkout_time).local().format("hh:mm:ss A")
          : "",
        hour: att?.total_hour,
        rawCheckin: att?.checkin_time,
        rawCheckout: att?.checkout_time,
        earlyOut: att?.early_out === true || att?.early_out === "true",
      }));
      setIsLoading(false);
      setAttendanceList(formattedData || []);
      setTotalRecord(result?.data?.count || 0);
    } else {
      setIsLoading(false);
    }
  };

  const fetchTodaySession = async () => {
    if (!employeeData?.supabase_user_id) return;
    const startOfToday = moment().startOf("day").toDate();
    const endOfToday = moment().endOf("day").toDate();
    try {
      const response = await fetch(
        `/api/attendance/get-all?start=0&end=0&user_id=${employeeData.supabase_user_id}&startOfToday=${startOfToday}&endOfToday=${endOfToday}&startDate=${startOfToday}&endDate=${endOfToday}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );
      const result = await response.json();
      if (response.status === 200) {
        setTodaySession(result?.data?.data?.[0] || null);
      }
    } catch (e) {
      // ignore
    }
  };

  const fetchMonthMetrics = async () => {
    if (!employeeData?.supabase_user_id) return;
    const monthStart = moment().startOf("month").toDate();
    const monthEnd = moment().endOf("month").toDate();
    const startOfRange = new Date(monthStart);
    startOfRange.setHours(0, 0, 0, 0);
    const endOfRange = new Date(monthEnd);
    endOfRange.setHours(23, 59, 59, 999);

    try {
      // No pagination range → API returns all month rows for this user
      const response = await fetch(
        `/api/attendance/get-all?user_id=${employeeData.supabase_user_id}&startOfToday=${startOfRange}&endOfToday=${endOfRange}&startDate=${monthStart}&endDate=${monthEnd}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );
      const result = await response.json();
      if (response.status === 200) {
        setMonthMetrics(
          computeMonthMetrics(
            result?.data?.data || [],
            getRequiredHours(employeeData?.job_type)
          )
        );
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    if (employeeData) {
      getEmployeeDetail();
      fetchTodaySession();
      fetchMonthMetrics();
    }
  }, [currentPage, recordsPerPage, startDate, endDate, employeeData]);

  useEffect(() => {
    if (!employeeData?.supabase_user_id) return;

    const subscription = supabase
      .channel("table-db-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance",
        },
        (payload) => {
          if (
            payload.new?.supabase_user_id === employeeData?.supabase_user_id
          ) {
            getEmployeeDetail();
            fetchTodaySession();
            fetchMonthMetrics();
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [employeeData?.supabase_user_id]);

  useEffect(() => {
    const loginToast = Cookies.get("signin_toast");
    if (loginToast === "true") {
      toast.success(`Successfully Logged In`, {
        position: "bottom-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
      setTimeout(() => {
        Cookies.remove("signin_toast");
      }, 500);
    }
  }, []);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!exportOpen) return;
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setExportOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [exportOpen]);

  const activeToday =
    todaySession?.checkin_time && !todaySession?.checkout_time;

  const punchStatus = useMemo(() => {
    if (todaySession?.checkin_time && !todaySession?.checkout_time) {
      return "checked_in";
    }
    if (todaySession?.checkin_time && todaySession?.checkout_time) {
      return "checked_out";
    }
    return "none";
  }, [todaySession?.checkin_time, todaySession?.checkout_time]);

  useEffect(() => {
    if (!activeToday || !todaySession?.checkin_time) {
      setElapsed("");
      return;
    }
    const tick = () => {
      const diff = calculateTimeDifference(todaySession.checkin_time);
      if (diff && diff !== "Invalid Date") {
        const [h, m, s] = diff.split(":");
        setElapsed(`${h}h ${m}m ${s}s`);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeToday, todaySession?.checkin_time]);

  const todayCheckInLabel = useMemo(() => {
    if (!todaySession?.checkin_time) return null;
    return moment.utc(todaySession.checkin_time).local().format("hh:mm A");
  }, [todaySession?.checkin_time]);

  const refreshAfterPunch = async () => {
    await Promise.all([fetchTodaySession(), getEmployeeDetail(), fetchMonthMetrics()]);
  };

  const checkinHandler = async () => {
    if (!employeeData) {
      logout();
      return;
    }
    setCheckinLoading(true);
    try {
      const response = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(employeeData),
      });
      const result = await response.json();
      if (response?.status === 200) {
        toast.success(result?.data, {
          position: "bottom-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "colored",
        });
        await refreshAfterPunch();
      } else if (response?.status === 201 || response?.status === 403) {
        toast.warn(result?.data, {
          position: "bottom-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "colored",
        });
      } else {
        toast.error(result?.error, {
          position: "bottom-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "colored",
        });
      }
    } finally {
      setCheckinLoading(false);
    }
  };

  const checkoutHandler = async () => {
    if (!employeeData) {
      logout();
      return;
    }
    setCheckoutLoading(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(employeeData),
      });
      const result = await response.json();
      if (response?.status === 200) {
        toast.success(result?.data, {
          position: "bottom-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "colored",
        });
        await refreshAfterPunch();
      } else if (response?.status === 201 || response?.status === 403) {
        toast.warn(result?.data, {
          position: "bottom-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "colored",
        });
      } else {
        toast.error(result?.error, {
          position: "bottom-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "colored",
        });
      }
    } finally {
      setCheckoutLoading(false);
    }
  };

  const filteredPdfHandler = async () => {
    try {
      if (startDate || endDate) {
        setPdfLoading(true);
        setExportOpen(false);
        const startOfToday = new Date(startDate);
        startOfToday.setHours(0, 0, 0, 0);

        const endOfToday = new Date(endDate);
        endOfToday.setHours(23, 59, 59, 999);

        const response = await fetch(
          `/api/attendance/get-all?user_id=${employeeData?.supabase_user_id}&startOfToday=${startOfToday}&endOfToday=${endOfToday}&startDate=${startDate}&endDate=${endDate}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        const result = await response.json();
        if (response.status === 200) {
          generateAttendancePdf(result?.data?.data);
        } else {
          toast.error(`Something went wrong`, {
            position: "bottom-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "colored",
          });
        }
        setPdfLoading(false);
      } else {
        setExportOpen(false);
        toast.error(`Please select filters`, {
          position: "bottom-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "colored",
        });
      }
    } catch (error) {
      setPdfLoading(false);
      toast.error(`Something went wrong`, {
        position: "bottom-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
    }
  };

  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = new Set([1, totalPages, currentPage]);
    if (currentPage > 1) pages.add(currentPage - 1);
    if (currentPage < totalPages) pages.add(currentPage + 1);
    return Array.from(pages).sort((a, b) => a - b);
  }, [totalPages, currentPage]);

  const renderElapsedForRow = (row) => {
    if (!isActiveSession(row) || !row.rawCheckin) return row.hour || "—";
    const diff = calculateTimeDifference(row.rawCheckin);
    return diff && diff !== "Invalid Date" ? diff : row.hour || "—";
  };

  return (
    <div className={styles.page}>
      <div className={styles.mobilePunch}>
        <div className={styles.mobilePunchTop}>
          <div className={styles.mobilePunchInfo}>
            <span className={styles.mobilePunchLabel}>Today&apos;s punch</span>
            <span className={styles.mobilePunchStatus}>
              {punchStatus === "checked_in" && todayCheckInLabel
                ? `Checked in at ${todayCheckInLabel}`
                : punchStatus === "checked_out"
                  ? "Checked out for today"
                  : "Not checked in yet"}
            </span>
          </div>
          {(punchStatus === "checked_in" || punchStatus === "checked_out") && (
            <div className={styles.mobilePunchElapsed}>
              {punchStatus === "checked_in" ? (
                <>
                  <span className={styles.liveDotWrap}>
                    <span className={styles.liveDot} />
                    <span className={styles.liveDotPing} />
                  </span>
                  <div>
                    <span className={styles.mobilePunchElapsedLabel}>
                      Elapsed
                    </span>
                    <span className={styles.mobilePunchElapsedValue}>
                      {elapsed || "—"}
                    </span>
                  </div>
                </>
              ) : (
                <div>
                  <span className={styles.mobilePunchElapsedLabel}>
                    Total hours
                  </span>
                  <span className={styles.mobilePunchElapsedValue}>
                    {todaySession?.total_hour || "—"}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        <div className={styles.mobilePunchGrid}>
          <button
            type="button"
            className={`${styles.punchBtn} ${styles.checkInBtn}`}
            onClick={checkinHandler}
            disabled={
              checkinLoading ||
              !employeeData ||
              punchStatus === "checked_in" ||
              punchStatus === "checked_out"
            }
          >
            {checkinLoading ? (
              <ButtonLoader />
            ) : (
              <>
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: 16,
                    color: "var(--hrms-tertiary-container)",
                  }}
                >
                  check_circle
                </span>
                Check In
              </>
            )}
          </button>
          <button
            type="button"
            className={`${styles.punchBtn} ${styles.checkOutBtn}`}
            onClick={checkoutHandler}
            disabled={
              checkoutLoading || !employeeData || punchStatus !== "checked_in"
            }
          >
            {checkoutLoading ? (
              <ButtonLoader />
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  logout
                </span>
                Check Out
              </>
            )}
          </button>
        </div>
      </div>

      <div className={styles.pageHeader}>
        <div>
          <div className={styles.eyebrow}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 16, color: "var(--hrms-on-tertiary-container)" }}
            >
              schedule
            </span>
            <span>Time & Attendance</span>
            <span>•</span>
            <span className={styles.eyebrowAccent}>
              Fiscal Year {moment().year()}
            </span>
          </div>
          <h1 className={styles.title}>My Attendance</h1>
          <p className={styles.subtitle}>
            Monitor your daily punch records, work hours, and monthly
            timesheets.
          </p>
        </div>

        <div className={styles.headerActions}>
          {activeToday && todayCheckInLabel && (
            <div className={styles.shiftPill}>
              <div className={styles.liveDotWrap}>
                <span className={styles.liveDot} />
                <span className={styles.liveDotPing} />
              </div>
              <div>
                <div className={styles.shiftLabel}>Today&apos;s Shift</div>
                <div className={styles.shiftValue}>
                  {todayCheckInLabel} • Active
                </div>
              </div>
            </div>
          )}

          <div className={styles.exportWrap} ref={exportRef}>
            <button
              type="button"
              className={styles.exportBtn}
              onClick={() => setExportOpen((v) => !v)}
              disabled={pdfLoading}
            >
              {pdfLoading ? (
                <ButtonLoader />
              ) : (
                <>
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: 18,
                      color: "var(--hrms-secondary-container)",
                    }}
                  >
                    file_download
                  </span>
                  <span>Download PDF</span>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 16 }}
                  >
                    expand_more
                  </span>
                </>
              )}
            </button>
            {exportOpen && (
              <div className={styles.exportMenu}>
                <button
                  type="button"
                  className={styles.exportItem}
                  onClick={filteredPdfHandler}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 18, color: "var(--hrms-error)" }}
                  >
                    picture_as_pdf
                  </span>
                  Export as PDF
                </button>
                <button type="button" className={styles.exportItem}>
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: 18,
                      color: "var(--hrms-on-tertiary-container)",
                    }}
                  >
                    table_view
                  </span>
                  Export to Excel (.xlsx)
                </button>
                <button type="button" className={styles.exportItem}>
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: 18,
                      color: "var(--hrms-on-surface-variant)",
                    }}
                  >
                    description
                  </span>
                  Comma Separated (.csv)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricTop}>
            <div className={styles.metricTopText}>
              <div className={styles.metricLabel}>Present Days</div>
              <div className={styles.metricValueRow}>
                <span className={styles.metricValue}>
                  {monthMetrics.presentDays}
                </span>
                <span className={styles.metricSuffix}>
                  / {monthMetrics.weekdaysSoFar} Days
                </span>
              </div>
            </div>
            <div className={styles.metricIcon}>
              <span className="material-symbols-outlined">calendar_month</span>
            </div>
          </div>
          <div className={styles.metricFooter}>
            <div className={styles.metricTrend}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                trending_up
              </span>
              {monthMetrics.presentPct}% of weekdays so far
            </div>
            <span className={styles.metricMeta}>{monthMetrics.monthLabel}</span>
          </div>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{ width: `${monthMetrics.presentPct}%` }}
            />
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricTop}>
            <div className={styles.metricTopText}>
              <div className={styles.metricLabel}>Avg. Working Hours</div>
              <div className={styles.metricValueRow}>
                <span className={styles.metricValue}>
                  {monthMetrics.completedCount > 0 ? (
                    <>
                      {monthMetrics.avgHours}
                      <span className={styles.metricSuffix}>h</span>{" "}
                      {monthMetrics.avgMinutes}
                      <span className={styles.metricSuffix}>m</span>
                    </>
                  ) : (
                    "—"
                  )}
                </span>
              </div>
            </div>
            <div
              className={styles.metricIcon}
              style={{ color: "var(--hrms-secondary)" }}
            >
              <span className="material-symbols-outlined">timer</span>
            </div>
          </div>
          <div className={styles.metricFooter}>
            <div className={styles.metricTrend}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                arrow_upward
              </span>
              From {monthMetrics.completedCount} completed day
              {monthMetrics.completedCount === 1 ? "" : "s"}
            </div>
            <span className={styles.metricMeta}>
              Target: {requiredHours}h
            </span>
          </div>
          <div className={styles.progressTrack}>
            <div
              className={`${styles.progressFill} ${styles.progressFillOrange}`}
              style={{ width: `${monthMetrics.avgVsTargetPct || 0}%` }}
            />
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricTop}>
            <div className={styles.metricTopText}>
              <div className={styles.metricLabel}>Full Day Rate</div>
              <div className={styles.metricValueRow}>
                <span className={styles.metricValue}>
                  {monthMetrics.completedCount > 0
                    ? `${monthMetrics.fullDayPct}%`
                    : "—"}
                </span>
                <span
                  className={styles.metricSuffix}
                  style={{ color: "var(--hrms-on-tertiary-container)" }}
                >
                  {monthMetrics.completedCount > 0
                    ? `${monthMetrics.fullDayCount}/${monthMetrics.completedCount}`
                    : "No checkouts"}
                </span>
              </div>
            </div>
            <div
              className={styles.metricIcon}
              style={{ color: "var(--hrms-tertiary-container)" }}
            >
              <span className="material-symbols-outlined">verified_user</span>
            </div>
          </div>
          <div className={styles.metricFooter}>
            <div
              className={styles.metricTrend}
              style={{ color: "var(--hrms-on-surface-variant)" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                info
              </span>
              Days without early out
            </div>
            <span className={styles.metricMeta}>
              {monthMetrics.totalHours}h {monthMetrics.totalMinutes}m total
            </span>
          </div>
          <div className={styles.progressTrack}>
            <div
              className={`${styles.progressFill} ${styles.progressFillTeal}`}
              style={{ width: `${monthMetrics.fullDayPct || 0}%` }}
            />
          </div>
        </div>

        <div className={`${styles.metricCard} ${styles.metricCardHero}`}>
          <div className={styles.heroBlur} />
          <div className={styles.metricTop} style={{ position: "relative", zIndex: 1 }}>
            <div className={styles.metricTopText}>
              <div className={styles.metricLabel}>Live Punch</div>
              <div className={styles.metricValueRow}>
                <span className={styles.metricValue}>
                  {activeToday ? "Checked In" : "Not Checked In"}
                </span>
              </div>
            </div>
            {activeToday && (
              <span className={styles.liveDotWrap} style={{ marginTop: 4 }}>
                <span className={styles.liveDotPing} />
                <span
                  className={styles.liveDot}
                  style={{ background: "var(--hrms-tertiary-fixed)" }}
                />
              </span>
            )}
          </div>
          <div style={{ marginTop: "1rem", position: "relative", zIndex: 1 }}>
            <div className={styles.heroRow}>
              <span className={styles.heroRowLabel}>In Time:</span>
              <span className={styles.heroValue}>
                {activeToday && todaySession?.checkin_time
                  ? moment
                      .utc(todaySession.checkin_time)
                      .local()
                      .format("hh:mm:ss A")
                  : "—"}
              </span>
            </div>
            <div className={styles.heroRow}>
              <span className={styles.heroRowLabel}>Time Elapsed:</span>
              <span className={styles.heroElapsed}>{elapsed || "—"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.filtersCard}>
        <div className={styles.dateFilters}>
          <div className={styles.datePill}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 18, color: "var(--hrms-tertiary-fixed)" }}
            >
              calendar_today
            </span>
            <div>
              <div className={styles.datePillLabel}>Start Date</div>
              <DatePicker
                selected={startDate}
                onChange={(date) => {
                  setStartDate(date);
                  setCurrentPage(1);
                }}
                placeholderText="Select"
                dateFormat="yyyy-MM-dd"
              />
            </div>
          </div>
          <span className={styles.toLabel}>to</span>
          <div className={styles.datePill}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 18, color: "var(--hrms-tertiary-fixed)" }}
            >
              event
            </span>
            <div>
              <div className={styles.datePillLabel}>End Date</div>
              <DatePicker
                selected={endDate}
                onChange={(date) => {
                  setEndDate(date);
                  setCurrentPage(1);
                }}
                placeholderText="Select"
                dateFormat="yyyy-MM-dd"
              />
            </div>
          </div>
          {/* <button type="button" className={styles.filterIconBtn} aria-label="Filter">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              filter_alt
            </span>
          </button> */}
        </div>

        {/* <div className={styles.chips}>
          <button type="button" className={`${styles.chip} ${styles.chipActive}`}>
            All ({totalRecord})
          </button>
          <button type="button" className={styles.chip}>
            On Time
          </button>
          <button type="button" className={styles.chip}>
            Late Arrival
          </button>
          <button type="button" className={styles.chip}>
            Half Day
          </button>
          <button type="button" className={styles.chip}>
            Absent
          </button>
        </div> */}
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableHeaderBar}>
          <div className={styles.tableHeaderLeft}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 20, color: "var(--hrms-primary-container)" }}
            >
              view_list
            </span>
            <h2 className={styles.tableTitle}>Daily Punch Records</h2>
          </div>
          <span className={styles.tableHint}>
            Showing latest synchronized entries
          </span>
        </div>

        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Date & Day</th>
                <th scope="col">Check In</th>
                <th scope="col">Check Out</th>
                <th scope="col">Total Working Hours</th>
                <th scope="col">Status</th>
                {/* <th scope="col">Actions</th> */}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className={styles.emptyRow}>
                    Data Loading...
                  </td>
                </tr>
              ) : attendanceList?.length > 0 ? (
                attendanceList.map((row) => {
                  const active = isActiveSession(row);
                  const earlyOut =
                    !active && isEarlyOutHours(row.hour, requiredHours);
                  const status = getAttendanceStatus({ ...row, earlyOut });
                  const progress = active
                    ? parseTotalHoursToProgress(
                        row.rawCheckin
                          ? calculateTimeDifference(row.rawCheckin)
                          : null,
                        requiredHours
                      )
                    : parseTotalHoursToProgress(row.hour, requiredHours);
                  const overtimeLabel =
                    !active && !earlyOut
                      ? formatOvertimeLabel(row.hour, requiredHours)
                      : null;
                  return (
                    <tr key={row.id}>
                      <td>
                        <div className={styles.dateCell}>
                          <span
                            className={`${styles.rowDot} ${
                              active ? styles.rowDotActive : ""
                            }`}
                          />
                          <div>
                            <div className={styles.dateMain}>{row.date}</div>
                            <div className={styles.dateSub}>
                              {formatDayLabel(row.date)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className={styles.timeCell}>
                          <span
                            className="material-symbols-outlined"
                            style={{
                              fontSize: 16,
                              color: active
                                ? "var(--hrms-on-tertiary-container)"
                                : "var(--hrms-outline)",
                            }}
                          >
                            login
                          </span>
                          <span style={{ fontWeight: active ? 600 : 400 }}>
                            {row.checkIn || "—"}
                          </span>
                        </div>
                      </td>
                      <td>
                        {active ? (
                          <span className={styles.inProgress}>In Progress</span>
                        ) : (
                          <div className={styles.timeCell}>
                            <span
                              className="material-symbols-outlined"
                              style={{
                                fontSize: 16,
                                color: "var(--hrms-secondary)",
                              }}
                            >
                              logout
                            </span>
                            <span>{row.checkOut || "—"}</span>
                          </div>
                        )}
                      </td>
                      <td>
                        <div className={styles.hoursCell}>
                          <div className={styles.hoursTop}>
                            <span
                              style={{
                                fontFamily: "ui-monospace, monospace",
                                color: active
                                  ? "var(--hrms-on-tertiary-container)"
                                  : earlyOut
                                    ? "var(--hrms-error)"
                                    : "var(--hrms-on-surface)",
                                fontWeight: 600,
                              }}
                            >
                              {active
                                ? renderElapsedForRow(row)
                                : row.hour || "—"}
                            </span>
                            <span
                              style={{
                                color: active
                                  ? "var(--hrms-on-surface-variant)"
                                  : earlyOut
                                    ? "var(--hrms-error)"
                                    : overtimeLabel
                                      ? "var(--hrms-on-tertiary-container)"
                                      : "var(--hrms-on-surface-variant)",
                                fontWeight: overtimeLabel ? 600 : undefined,
                              }}
                            >
                              {active
                                ? "In Office"
                                : earlyOut
                                  ? "Early out"
                                  : overtimeLabel || ""}
                            </span>
                          </div>
                          <div className={styles.progressTrack}>
                            <div
                              className={`${styles.progressFill} ${
                                earlyOut && !active
                                  ? styles.progressFillRed
                                  : ""
                              }`}
                              style={{
                                width: `${progress}%`,
                                ...(active
                                  ? {
                                      background:
                                        "var(--hrms-on-tertiary-container)",
                                    }
                                  : {}),
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            earlyOut && !active
                              ? styles.statusBadgeEarly
                              : ""
                          }`}
                        >
                          <span
                            className={`${styles.statusDot} ${
                              earlyOut && !active
                                ? styles.statusDotEarly
                                : ""
                            }`}
                          />
                          {status}
                        </span>
                      </td>
                      {/* <td>
                        <button
                          type="button"
                          className={styles.viewBtn}
                          title="View details"
                          aria-label="View details"
                        >
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: 18 }}
                          >
                            visibility
                          </span>
                        </button>
                      </td> */}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className={styles.emptyRow}>
                    No attendance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.paginationBar}>
          <div className={styles.paginationInfo}>
            <span>Showing</span>
            <select
              className={styles.pageSelect}
              value={recordsPerPage}
              onChange={(e) => {
                setRecordsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>
              records out of{" "}
              <span className={styles.totalBold}>{totalRecord}</span>
            </span>
          </div>
          <div className={styles.pageBtns}>
            <button
              type="button"
              className={styles.pageBtn}
              aria-label="Previous Page"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                chevron_left
              </span>
            </button>
            {pageNumbers.map((num, idx) => {
              const prev = pageNumbers[idx - 1];
              const showEllipsis = prev && num - prev > 1;
              return (
                <React.Fragment key={num}>
                  {showEllipsis && (
                    <span className={styles.pageEllipsis}>…</span>
                  )}
                  <button
                    type="button"
                    className={`${styles.pageBtn} ${
                      num === currentPage ? styles.pageBtnActive : ""
                    }`}
                    onClick={() => setCurrentPage(num)}
                  >
                    {num}
                  </button>
                </React.Fragment>
              );
            })}
            <button
              type="button"
              className={styles.pageBtn}
              aria-label="Next Page"
              disabled={currentPage >= totalPages}
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                chevron_right
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className={styles.banner}>
        <div className={styles.bannerLeft}>
          <div className={styles.bannerIcon}>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
              contact_support
            </span>
          </div>
          <div>
            <p className={styles.bannerTitle}>
              Missed a punch or noticed a discrepancy?
            </p>
            <p className={styles.bannerText}>
              Submit a timesheet adjustment request within 72 hours for manager
              regularization.
            </p>
          </div>
        </div>
        <button type="button" className={styles.bannerBtn}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            edit_calendar
          </span>
          Request Regularization
        </button>
      </div>
    </div>
  );
}

export default AttendanceComponent;
