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
 * Current-month attendance summary from raw API records.
 * Thresholds come from job type: fullTime 9h, partTime 4h.
 */
export const computeMonthMetrics = (records = [], requiredHours = 9) => {
  const monthStart = moment().startOf("month");
  const today = moment().endOf("day");
  const weekdaysSoFar = countWeekdaysInRange(monthStart, today) || 1;
  const requiredSeconds = Math.max(1, requiredHours) * 3600;

  const presentDates = new Set();
  let completedSecondsSum = 0;
  let completedCount = 0;
  let fullDayCount = 0;

  (records || []).forEach((att) => {
    if (!att?.checkin_time) return;
    presentDates.add(moment(att.checkin_time).format("YYYY-MM-DD"));

    if (!att?.total_hour) return;
    const seconds = parseHourToSeconds(att.total_hour);
    if (seconds <= 0) return;

    completedSecondsSum += seconds;
    completedCount += 1;

    if (seconds >= requiredSeconds) {
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
    avgVsTargetPct,
    completedCount,
    fullDayCount,
    fullDayPct,
    totalHours: totalHm.hours,
    totalMinutes: totalHm.minutes,
    requiredHours,
    monthLabel: moment().format("MMM YYYY"),
  };
};
