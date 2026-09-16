import moment from "moment";

export const isActiveSession = (row) => {
  const hasCheckIn = Boolean(row?.checkIn || row?.rawCheckin || row?.checkin_time);
  const hasCheckOut = Boolean(
    row?.checkOut || row?.rawCheckout || row?.checkout_time
  );
  if (!hasCheckIn || hasCheckOut) return false;
  const date = row?.date || row?.rawCheckin || row?.checkin_time;
  if (!date) return false;
  return moment(date).isSame(moment(), "day");
};

export const formatDayLabel = (dateStr) => {
  if (!dateStr) return "";
  const m = moment(dateStr);
  if (m.isSame(moment(), "day")) {
    return `${m.format("dddd")} • Today`;
  }
  return m.format("dddd");
};

/** Required daily hours: fullTime = 9, partTime = 4 */
export const getRequiredHours = (jobType) => {
  if (jobType === "partTime") return 4;
  return 9;
};

export const getAttendanceStatus = (row) => {
  if (isActiveSession(row)) return "Present";
  if (!row?.checkIn) return "Absent";
  if (row?.earlyOut) return "Early Out";
  return "On Time";
};

/** Parse "HH:MM:SS" / "HH:MM" into total seconds */
export const parseHourToSeconds = (hourStr) => {
  if (!hourStr || typeof hourStr !== "string") return 0;
  const parts = hourStr.split(":").map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n))) return 0;
  const [h = 0, m = 0, s = 0] = parts;
  return h * 3600 + m * 60 + s;
};

export const formatSecondsToHm = (totalSeconds) => {
  const safe = Math.max(0, Math.floor(totalSeconds || 0));
  return {
    hours: Math.floor(safe / 3600),
    minutes: Math.floor((safe % 3600) / 60),
  };
};

/** True when completed hours are below the job-type requirement */
export const isEarlyOutHours = (hourStr, requiredHours = 9) => {
  const seconds = parseHourToSeconds(hourStr);
  if (seconds <= 0) return false;
  return seconds < requiredHours * 3600;
};

export const parseTotalHoursToProgress = (hourStr, requiredHours = 9) => {
  if (!hourStr || typeof hourStr !== "string" || hourStr === "Invalid Date") {
    return 0;
  }
  const totalSeconds = parseHourToSeconds(hourStr);
  if (totalSeconds <= 0) return 0;
  const target = Math.max(1, requiredHours) * 3600;
  return Math.min(100, Math.round((totalSeconds / target) * 100));
};

/** Overtime label when total_hour exceeds required hours. e.g. "+1h 30m OT" */
export const formatOvertimeLabel = (hourStr, requiredHours = 9) => {
  const totalSeconds = parseHourToSeconds(hourStr);
  const thresholdSeconds = requiredHours * 3600;
  if (totalSeconds <= thresholdSeconds) return null;

  const otSeconds = totalSeconds - thresholdSeconds;
  const { hours, minutes } = formatSecondsToHm(otSeconds);

  if (hours > 0 && minutes > 0) return `+${hours}h ${minutes}m OT`;
  if (hours > 0) return `+${hours}h OT`;
  if (minutes > 0) return `+${minutes}m OT`;
  return null;
};

/** Weekdays (Mon–Fri) from start through end inclusive */
export const countWeekdaysInRange = (startMoment, endMoment) => {
  let count = 0;
  const cursor = startMoment.clone().startOf("day");
  const end = endMoment.clone().startOf("day");
  while (cursor.isSameOrBefore(end, "day")) {
    const day = cursor.day();
    if (day !== 0 && day !== 6) count += 1;
    cursor.add(1, "day");
  }
  return count;
};

/**
 * Attendance summary for an arbitrary date range from raw attendance records.
 * Thresholds come from job type: fullTime 9h, partTime 4h.
 */
export const computeRangeMetrics = (
  records = [],
  requiredHours = 9,
  rangeStart = moment().startOf("month"),
  rangeEnd = moment().endOf("day"),
  monthLabel = moment().format("MMM YYYY")
) => {
  const start = moment(rangeStart).startOf("day");
  const end = moment(rangeEnd).endOf("day");
  const weekdaysSoFar = countWeekdaysInRange(start, end) || 1;
  const requiredSeconds = Math.max(1, requiredHours) * 3600;

  const presentDates = new Set();
  let completedSecondsSum = 0;
  let completedCount = 0;
  let fullDayCount = 0;

  (records || []).forEach((att) => {
    if (!att?.checkin_time) return;
    const checkin = moment(att.checkin_time);
    if (checkin.isBefore(start) || checkin.isAfter(end)) return;

    presentDates.add(checkin.format("YYYY-MM-DD"));

    if (!att?.total_hour) return;
    const seconds = parseHourToSeconds(att.total_hour);
    if (seconds <= 0) return;

    completedSecondsSum += seconds;
    completedCount += 1;

    // Full day = completed day without early out (flag or hours below target)
    const isEarlyOut =
      att.early_out === true ||
      att.early_out === "true" ||
      isEarlyOutHours(att.total_hour, requiredHours);
    if (!isEarlyOut) {
      fullDayCount += 1;
    }
  });

  const presentDays = presentDates.size;
  const avgSeconds =
    completedCount > 0 ? completedSecondsSum / completedCount : 0;
  const avgHm = formatSecondsToHm(avgSeconds);
  const totalHm = formatSecondsToHm(completedSecondsSum);
  const presentPct = Math.min(
    100,
    Math.round((presentDays / weekdaysSoFar) * 100)
  );
  const earlyOutCount = Math.max(0, completedCount - fullDayCount);
  const fullDayPct =
    completedCount > 0
      ? Math.round((fullDayCount / completedCount) * 100)
      : 0;
  const avgVsTargetPct = Math.min(
    100,
    Math.round((avgSeconds / requiredSeconds) * 100) || 0
  );

  return {
    presentDays,
    weekdaysSoFar,
    presentPct,
    avgHours: avgHm.hours,
    avgMinutes: avgHm.minutes,
    avgHoursDecimal: Math.round((avgSeconds / 3600) * 10) / 10,
    avgVsTargetPct,
    completedCount,
    fullDayCount,
    fullDayPct,
    earlyOutCount,
    totalHours: totalHm.hours,
    totalMinutes: totalHm.minutes,
    requiredHours,
    monthLabel,
  };
};

/**
 * Current-month attendance summary from raw API records.
 * Thresholds come from job type: fullTime 9h, partTime 4h.
 */
export const computeMonthMetrics = (records = [], requiredHours = 9) => {
  return computeRangeMetrics(
    records,
    requiredHours,
    moment().startOf("month"),
    moment().endOf("day"),
    moment().format("MMM YYYY")
  );
};

export const ATTENDANCE_PERIODS = [
  { id: "6months", label: "Last 6 months", granularity: "month", months: 6 },
  { id: "1month", label: "Last month", granularity: "day", days: null },
  // { id: "15days", label: "Last 15 days", granularity: "day", days: 15 },
  // { id: "7days", label: "Last week", granularity: "day", days: 7 },
];

const pushTrendPoint = (trend, key, label, fullLabel, metrics) => {
  trend.push({
    key,
    label,
    fullLabel,
    presentDays: metrics.presentDays,
    avgHours: metrics.avgHoursDecimal,
    avgHoursLabel:
      metrics.completedCount > 0
        ? `${metrics.avgHours}h ${metrics.avgMinutes}m`
        : "—",
    completedCount: metrics.completedCount,
    weekdaysSoFar: metrics.weekdaysSoFar,
    fullDayCount: metrics.fullDayCount,
    fullDayPct: metrics.fullDayPct,
    earlyOutCount: metrics.earlyOutCount,
  });
};

/**
 * Last N calendar months of present-days and average working hours.
 * Oldest month first for chart display.
 */
export const computeMonthlyTrend = (
  records = [],
  requiredHours = 9,
  months = 6
) => {
  const trend = [];
  const now = moment();

  for (let i = months - 1; i >= 0; i -= 1) {
    const monthMoment = now.clone().subtract(i, "months");
    const rangeStart = monthMoment.clone().startOf("month");
    const rangeEnd =
      i === 0
        ? now.clone().endOf("day")
        : monthMoment.clone().endOf("month");

    const metrics = computeRangeMetrics(
      records,
      requiredHours,
      rangeStart,
      rangeEnd,
      monthMoment.format("MMM YYYY")
    );

    pushTrendPoint(
      trend,
      monthMoment.format("YYYY-MM"),
      monthMoment.format("MMM"),
      metrics.monthLabel,
      metrics
    );
  }

  return trend;
};

/**
 * Daily present-days and working hours for a rolling day window
 * (or the current calendar month when days is null).
 */
export const computeDailyTrend = (
  records = [],
  requiredHours = 9,
  days = 7
) => {
  const trend = [];
  const now = moment().endOf("day");
  const start =
    days == null
      ? moment().startOf("month")
      : moment().subtract(days - 1, "days").startOf("day");

  const cursor = start.clone();
  while (cursor.isSameOrBefore(now, "day")) {
    const dayStart = cursor.clone().startOf("day");
    const dayEnd = cursor.clone().endOf("day");
    const metrics = computeRangeMetrics(
      records,
      requiredHours,
      dayStart,
      dayEnd,
      cursor.format("MMM D, YYYY")
    );

    pushTrendPoint(
      trend,
      cursor.format("YYYY-MM-DD"),
      cursor.format("MMM D"),
      metrics.monthLabel,
      metrics
    );

    cursor.add(1, "day");
  }

  return trend;
};

/** Build chart trend points for a named attendance period. */
export const computeAttendanceTrend = (
  records = [],
  requiredHours = 9,
  periodId = "6months"
) => {
  const period =
    ATTENDANCE_PERIODS.find((item) => item.id === periodId) ||
    ATTENDANCE_PERIODS[0];

  if (period.granularity === "month") {
    return {
      periodId: period.id,
      label: period.label,
      granularity: "month",
      points: computeMonthlyTrend(records, requiredHours, period.months),
    };
  }

  return {
    periodId: period.id,
    label: period.label,
    granularity: "day",
    points: computeDailyTrend(records, requiredHours, period.days),
  };
};

/** July–June fiscal year bounds used across leave balance screens */
export const getFiscalYearBounds = (referenceDate = new Date()) => {
  const today = new Date(referenceDate);
  const fiscalYearStart =
    today.getMonth() + 1 >= 7
      ? new Date(today.getFullYear(), 6, 1)
      : new Date(today.getFullYear() - 1, 6, 1);
  const fiscalYearEnd = new Date(
    fiscalYearStart.getFullYear() + 1,
    5,
    30,
    23,
    59,
    59,
    999
  );
  return { fiscalYearStart, fiscalYearEnd };
};

/**
 * Approved leave usage and remaining balances for the current fiscal year.
 * Half Day = 0.5 × duration, Full Day = 1 × duration.
 */
export const computeLeaveBalances = (leaves = [], entitlements = {}) => {
  const annualTotal = Number(entitlements?.annual_leaves) || 0;
  const sickTotal = Number(entitlements?.sick_leaves) || 0;
  const casualTotal = Number(entitlements?.casual_leaves) || 0;

  const { fiscalYearStart, fiscalYearEnd } = getFiscalYearBounds();

  let annualUsed = 0;
  let sickUsed = 0;
  let casualUsed = 0;

  (leaves || []).forEach((leave) => {
    if (!leave?.start_date || !leave?.end_date) return;

    const leaveStart = new Date(leave.start_date);
    const leaveEnd = new Date(leave.end_date);
    const overlapsFiscalYear =
      leaveStart <= fiscalYearEnd && leaveEnd >= fiscalYearStart;
    if (!overlapsFiscalYear) return;

    const multiplier =
      leave.leave_type_duration === "Half Day"
        ? 0.5
        : leave.leave_type_duration === "Full Day"
          ? 1
          : 0;
    const effectiveLeaveDays = (Number(leave.duration) || 0) * multiplier;

    if (leave.leave_type === "Annual") {
      annualUsed += effectiveLeaveDays;
    } else if (leave.leave_type === "Sick") {
      sickUsed += effectiveLeaveDays;
    } else if (leave.leave_type === "Casual") {
      casualUsed += effectiveLeaveDays;
    }
  });

  const annualRemaining = Math.max(0, annualTotal - annualUsed);
  const sickRemaining = Math.max(0, sickTotal - sickUsed);
  const casualRemaining = Math.max(0, casualTotal - casualUsed);
  const totalUsed = annualUsed + sickUsed + casualUsed;
  const totalRemaining = annualRemaining + sickRemaining + casualRemaining;
  const totalAllowance = annualTotal + sickTotal + casualTotal;

  return {
    annual: {
      total: annualTotal,
      used: annualUsed,
      remaining: annualRemaining,
    },
    sick: {
      total: sickTotal,
      used: sickUsed,
      remaining: sickRemaining,
    },
    casual: {
      total: casualTotal,
      used: casualUsed,
      remaining: casualRemaining,
    },
    totalUsed,
    totalRemaining,
    totalAllowance,
    fiscalYearStart: fiscalYearStart.toISOString(),
    fiscalYearEnd: fiscalYearEnd.toISOString(),
  };
};
