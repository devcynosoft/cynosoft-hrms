export const ATTENDANCE_PUNCH_EVENT = "hrms:attendance-punch";

/** Notify My Attendance (and other listeners) after check-in / check-out. */
export const notifyAttendancePunch = (detail = {}) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(ATTENDANCE_PUNCH_EVENT, {
      detail: {
        at: Date.now(),
        ...detail,
      },
    })
  );
};
