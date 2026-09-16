"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import moment from "moment";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Chart } from "react-chartjs-2";
import {
  ATTENDANCE_PERIODS,
  computeAttendanceTrend,
} from "@/utils/attendanceDisplay";
import styles from "./employeeDetails.module.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const formatJobType = (jobType) => {
  if (jobType === "partTime") return "Part Time";
  if (jobType === "fullTime") return "Full Time";
  return jobType || "—";
};

const formatDays = (value) => {
  const num = Number(value) || 0;
  if (Number.isInteger(num)) return String(num);
  return num.toFixed(1).replace(/\.0$/, "");
};

const EmployeeDetailsComponent = ({ empId }) => {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [periodId, setPeriodId] = useState("6months");

  useEffect(() => {
    let cancelled = false;

    const loadDetails = async () => {
      if (!empId) {
        setError("Invalid employee id.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/employee/details/${empId}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });
        const result = await response.json();

        if (cancelled) return;

        if (response.status === 404) {
          setError(result?.error || "Employee not found.");
          setData(null);
          return;
        }

        if (response.status === 403 || response.status === 401) {
          setError(result?.error || "You do not have access to this page.");
          setData(null);
          return;
        }

        if (!response.ok || !result?.success) {
          setError(result?.error || "Failed to load employee details.");
          setData(null);
          return;
        }

        setData(result.data);
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Failed to load employee details.");
          setData(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadDetails();
    return () => {
      cancelled = true;
    };
  }, [empId]);

  const employee = data?.employee;
  const currentMonth = data?.currentMonth;
  const leaveBalances = data?.leaveBalances;
  const requiredHours = data?.requiredHours ?? 9;

  const attendanceTrend = useMemo(() => {
    if (!data) return { periodId, label: "Last 6 months", points: [] };
    return computeAttendanceTrend(
      data.attendanceRecords || [],
      requiredHours,
      periodId
    );
  }, [data, periodId, requiredHours]);

  const trendPoints = attendanceTrend.points || [];
  const selectedPeriodLabel =
    ATTENDANCE_PERIODS.find((item) => item.id === periodId)?.label ||
    attendanceTrend.label;
  const presentAxisLabel =
    attendanceTrend.granularity === "day" ? "Present" : "Present Days";
  const hoursAxisLabel =
    attendanceTrend.granularity === "day" ? "Working Hours" : "Avg Hours";

  const chartData = useMemo(
    () => ({
      labels: trendPoints.map((item) => item.label),
      datasets: [
        {
          type: "bar",
          label: presentAxisLabel,
          data: trendPoints.map((item) => item.presentDays),
          backgroundColor: "rgba(37, 99, 235, 0.55)",
          borderColor: "rgba(37, 99, 235, 0.9)",
          borderWidth: 1,
          borderRadius: 6,
          yAxisID: "y",
          order: 2,
        },
        {
          type: "line",
          label:
            attendanceTrend.granularity === "day"
              ? "Working Hours"
              : "Avg Working Hours",
          data: trendPoints.map((item) => item.avgHours),
          borderColor: "rgba(234, 88, 12, 0.95)",
          backgroundColor: "rgba(234, 88, 12, 0.12)",
          pointBackgroundColor: "rgba(234, 88, 12, 1)",
          pointBorderColor: "#fff",
          pointRadius: 4,
          pointHoverRadius: 5,
          borderWidth: 2,
          tension: 0.35,
          fill: false,
          yAxisID: "y1",
          order: 1,
        },
      ],
    }),
    [trendPoints, presentAxisLabel, attendanceTrend.granularity]
  );

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          position: "top",
          align: "end",
          labels: {
            boxWidth: 12,
            boxHeight: 12,
            usePointStyle: true,
            pointStyle: "circle",
            color: "var(--hrms-on-surface-variant)",
            font: { size: 12, weight: "500" },
          },
        },
        tooltip: {
          callbacks: {
            title: (items) => {
              const index = items?.[0]?.dataIndex;
              return trendPoints[index]?.fullLabel || items?.[0]?.label || "";
            },
            label: (context) => {
              const index = context.dataIndex;
              const point = trendPoints[index];
              if (context.dataset.yAxisID === "y1") {
                return attendanceTrend.granularity === "day"
                  ? `Working hours: ${point?.avgHoursLabel || "—"}`
                  : `Avg hours: ${point?.avgHoursLabel || "—"}`;
              }
              if (attendanceTrend.granularity === "day") {
                return point?.presentDays > 0 ? "Present" : "Absent";
              }
              return `Present days: ${context.parsed.y ?? 0}`;
            },
            afterBody: (items) => {
              const index = items?.[0]?.dataIndex;
              const point = trendPoints[index];
              if (!point || !(point.completedCount > 0)) {
                return ["Early outs: 0"];
              }

              if (
                attendanceTrend.granularity === "day" &&
                point.completedCount <= 1
              ) {
                return [
                  point.earlyOutCount > 0
                    ? "Early out: Yes"
                    : "Early out: No",
                ];
              }

              return [`Early outs: ${point.earlyOutCount ?? 0}`];
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: "var(--hrms-on-surface-variant)",
            font: { size: 12, weight: "500" },
            maxRotation: attendanceTrend.granularity === "day" ? 45 : 0,
            autoSkip: true,
            maxTicksLimit: attendanceTrend.granularity === "day" ? 12 : 6,
          },
        },
        y: {
          type: "linear",
          position: "left",
          beginAtZero: true,
          suggestedMax: attendanceTrend.granularity === "day" ? 1 : undefined,
          title: {
            display: true,
            text: presentAxisLabel,
            color: "var(--hrms-on-surface-variant)",
            font: { size: 11, weight: "600" },
          },
          ticks: {
            precision: 0,
            stepSize: attendanceTrend.granularity === "day" ? 1 : undefined,
            color: "var(--hrms-on-surface-variant)",
          },
          grid: {
            color: "rgba(148, 163, 184, 0.2)",
          },
        },
        y1: {
          type: "linear",
          position: "right",
          beginAtZero: true,
          suggestedMax: Math.max(requiredHours + 1, 10),
          title: {
            display: true,
            text: hoursAxisLabel,
            color: "var(--hrms-on-surface-variant)",
            font: { size: 11, weight: "600" },
          },
          ticks: {
            color: "var(--hrms-on-surface-variant)",
          },
          grid: {
            drawOnChartArea: false,
          },
        },
      },
    }),
    [
      trendPoints,
      requiredHours,
      attendanceTrend.granularity,
      presentAxisLabel,
      hoursAxisLabel,
    ]
  );

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.stateCard}>Loading employee analytics…</div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.title}>Employee Details</h1>
            <p className={styles.subtitle}>
              Attendance and leave analytics for a selected employee.
            </p>
          </div>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => router.push("/hrms/employee/list")}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              arrow_back
            </span>
            Back to list
          </button>
        </div>
        <div className={`${styles.stateCard} ${styles.stateError}`}>
          {error || "Employee not found."}
        </div>
      </div>
    );
  }

  const leaveTypes = [
    { key: "annual", label: "Annual", icon: "beach_access" },
    { key: "sick", label: "Sick", icon: "medical_services" },
    { key: "casual", label: "Casual", icon: "event_available" },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>Employee Details</h1>
          </div>
          <p className={styles.subtitle}>
            Full attendance and leave analytics with selectable trend periods.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => router.push("/hrms/employee/list")}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              arrow_back
            </span>
            Back
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => router.push(`/hrms/employee/edit/${employee.id}`)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              edit
            </span>
            Edit Employee
          </button>
        </div>
      </div>

      <section className={styles.profileCard}>
        <div className={styles.profileMain}>
          <Image
            src={employee.pic || "/assets/images/emp-static-pic.png"}
            width={72}
            height={72}
            className={styles.avatar}
            alt=""
          />
          <div className={styles.profileText}>
            <h2 className={styles.profileName}>{employee.name || "—"}</h2>
            <p className={styles.profileEmail}>{employee.email || "—"}</p>
            <div className={styles.badgeRow}>
              <span className={styles.roleBadge}>{employee.role || "—"}</span>
              <span className={styles.statusBadge}>
                <span
                  className={`${styles.statusDot} ${
                    employee.is_current
                      ? styles.statusCurrent
                      : styles.statusLeft
                  }`}
                />
                {employee.is_current ? "Current" : "Left"}
              </span>
            </div>
          </div>
        </div>
        <div className={styles.profileMeta}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Contact</span>
            <span className={styles.metaValue}>{employee.contact || "—"}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Job Type</span>
            <span className={styles.metaValue}>
              {formatJobType(employee.job_type)}
            </span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Joining Date</span>
            <span className={styles.metaValue}>
              {employee.created_at
                ? moment(employee.created_at).format("YYYY-MM-DD")
                : "—"}
            </span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Daily Target</span>
            <span className={styles.metaValue}>{requiredHours}h</span>
          </div>
        </div>
      </section>

      <section className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricTop}>
            <div>
              <div className={styles.metricLabel}>Present Days</div>
              <div className={styles.metricValueRow}>
                <span className={styles.metricValue}>
                  {currentMonth?.presentDays ?? 0}
                </span>
                <span className={styles.metricSuffix}>
                  / {currentMonth?.weekdaysSoFar ?? 0} Days
                </span>
              </div>
            </div>
            <span className={`material-symbols-outlined ${styles.metricIcon}`}>
              calendar_month
            </span>
          </div>
          <div className={styles.metricFooter}>
            {currentMonth?.presentPct ?? 0}% of weekdays so far
            <span>{currentMonth?.monthLabel}</span>
          </div>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{ width: `${currentMonth?.presentPct ?? 0}%` }}
            />
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricTop}>
            <div>
              <div className={styles.metricLabel}>Avg. Working Hours</div>
              <div className={styles.metricValueRow}>
                <span className={styles.metricValue}>
                  {(currentMonth?.completedCount ?? 0) > 0 ? (
                    <>
                      {currentMonth.avgHours}
                      <span className={styles.metricSuffix}>h</span>{" "}
                      {currentMonth.avgMinutes}
                      <span className={styles.metricSuffix}>m</span>
                    </>
                  ) : (
                    "—"
                  )}
                </span>
              </div>
            </div>
            <span
              className={`material-symbols-outlined ${styles.metricIcon}`}
              style={{ color: "var(--hrms-secondary)" }}
            >
              timer
            </span>
          </div>
          <div className={styles.metricFooter}>
            From {currentMonth?.completedCount ?? 0} completed day
            {(currentMonth?.completedCount ?? 0) === 1 ? "" : "s"}
            <span>Target: {requiredHours}h</span>
          </div>
          <div className={styles.progressTrack}>
            <div
              className={`${styles.progressFill} ${styles.progressFillOrange}`}
              style={{ width: `${currentMonth?.avgVsTargetPct ?? 0}%` }}
            />
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricTop}>
            <div>
              <div className={styles.metricLabel}>Full Day Rate</div>
              <div className={styles.metricValueRow}>
                <span className={styles.metricValue}>
                  {(currentMonth?.completedCount ?? 0) > 0
                    ? `${currentMonth.fullDayPct}%`
                    : "—"}
                </span>
                <span
                  className={styles.metricSuffix}
                  style={{ color: "var(--hrms-on-tertiary-container)" }}
                >
                  {(currentMonth?.completedCount ?? 0) > 0
                    ? `${currentMonth.fullDayCount}/${currentMonth.completedCount}`
                    : "No checkouts"}
                </span>
              </div>
            </div>
            <span
              className={`material-symbols-outlined ${styles.metricIcon}`}
              style={{ color: "var(--hrms-tertiary-container)" }}
            >
              verified_user
            </span>
          </div>
          <div className={styles.metricFooter}>
            Days without early out
            <span>
              {currentMonth?.totalHours ?? 0}h {currentMonth?.totalMinutes ?? 0}
              m total
            </span>
          </div>
          <div className={styles.progressTrack}>
            <div
              className={`${styles.progressFill} ${styles.progressFillTeal}`}
              style={{ width: `${currentMonth?.fullDayPct ?? 0}%` }}
            />
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricTop}>
            <div>
              <div className={styles.metricLabel}>Leaves Used</div>
              <div className={styles.metricValueRow}>
                <span className={styles.metricValue}>
                  {formatDays(leaveBalances?.totalUsed)}
                </span>
                <span className={styles.metricSuffix}>days</span>
              </div>
            </div>
            <span className={`material-symbols-outlined ${styles.metricIcon}`}>
              event_busy
            </span>
          </div>
          <div className={styles.metricFooter}>
            Approved leaves this fiscal year
            <span>
              of {formatDays(leaveBalances?.totalAllowance)} allowance
            </span>
          </div>
        </div>

        <div className={`${styles.metricCard} ${styles.metricCardHero}`}>
          <div className={styles.metricTop}>
            <div>
              <div className={styles.metricLabel}>Remaining Leaves</div>
              <div className={styles.metricValueRow}>
                <span className={styles.metricValue}>
                  {formatDays(leaveBalances?.totalRemaining)}
                </span>
                <span className={styles.metricSuffix}>days</span>
              </div>
            </div>
            <span className={`material-symbols-outlined ${styles.metricIcon}`}>
              event_available
            </span>
          </div>
          <div className={styles.metricFooter}>
            Total remaining across all leave types
          </div>
        </div>
      </section>

      <section className={styles.chartCard}>
        <div className={styles.sectionHeader}>
          <div>
            <h3 className={styles.sectionTitle}>Attendance Trend</h3>
            <p className={styles.sectionSubtitle}>
              Present days (bars) and working hours (line) for{" "}
              {selectedPeriodLabel.toLowerCase()}.
            </p>
          </div>
          <div className={styles.periodFilters} role="group" aria-label="Trend period">
            {ATTENDANCE_PERIODS.map((period) => (
              <button
                key={period.id}
                type="button"
                className={`${styles.periodBtn} ${
                  periodId === period.id ? styles.periodBtnActive : ""
                }`}
                onClick={() => setPeriodId(period.id)}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.chartWrap}>
          {trendPoints.some(
            (item) => item.presentDays > 0 || item.completedCount > 0
          ) ? (
            <Chart type="bar" data={chartData} options={chartOptions} />
          ) : (
            <div className={styles.emptyChart}>
              No attendance data available for {selectedPeriodLabel.toLowerCase()}.
            </div>
          )}
        </div>
      </section>

      <section className={styles.leaveSection}>
        <div className={styles.sectionHeader}>
          <div>
            <h3 className={styles.sectionTitle}>Leave Balances</h3>
            <p className={styles.sectionSubtitle}>
              Used and remaining allowance by leave type for the current fiscal
              year (Jul–Jun).
            </p>
          </div>
        </div>
        <div className={styles.leaveGrid}>
          {leaveTypes.map(({ key, label, icon }) => {
            const item = leaveBalances?.[key] || {
              total: 0,
              used: 0,
              remaining: 0,
            };
            const usedPct =
              item.total > 0
                ? Math.min(100, Math.round((item.used / item.total) * 100))
                : 0;

            return (
              <div key={key} className={styles.leaveCard}>
                <div className={styles.leaveTop}>
                  <div>
                    <div className={styles.leaveLabel}>{label}</div>
                    <div className={styles.leaveValue}>
                      {formatDays(item.remaining)}
                      <span> remaining</span>
                    </div>
                  </div>
                  <span className={`material-symbols-outlined ${styles.leaveIcon}`}>
                    {icon}
                  </span>
                </div>
                <div className={styles.leaveMeta}>
                  {formatDays(item.used)} / {formatDays(item.total)} used
                </div>
                <div className={styles.progressTrack}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${usedPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default EmployeeDetailsComponent;
