"use client";
import React, { useEffect, useMemo, useState } from "react";
import DatePicker from "react-datepicker";
import Link from "next/link";
import { supabase } from "@/utils/supabaseClient";
import { toast } from "react-toastify";
import { useForm } from "react-hook-form";
import { useEmployee } from "@/context/EmployeeContext";
import { useRouter } from "next/navigation";
import CalculateDaysDifference from "@/utils/daysDifference";
import ButtonLoader from "../ButtonLoader.jsx";
import moment from "moment";
import styles from "./leaveCreate.module.css";

const getFiscalBounds = () => {
  const currentDate = moment();
  const currentYear = currentDate.year();
  const fiscalYearStart =
    currentDate.month() >= 6
      ? moment(`${currentYear}-07-01`).startOf("day")
      : moment(`${currentYear - 1}-07-01`).startOf("day");
  const fiscalYearEnd = fiscalYearStart
    .clone()
    .add(1, "year")
    .subtract(1, "day")
    .endOf("day");
  return { fiscalYearStart, fiscalYearEnd };
};

const LeaveCreateComponent = ({ leaveId }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    getValues,
    setValue,
    watch,
  } = useForm({
    defaultValues: {
      leave_type: "",
      leave_type_duration: "Full Day",
      start_date: null,
      end_date: null,
      content: "",
    },
  });

  const { employeeData } = useEmployee();
  const router = useRouter();
  const isEdit = Boolean(leaveId);

  const [selectedLeaveType, setSelectedLeaveType] = useState("");
  const [selectedLeaveTypeDuration, setSelectedLeaveTypeDuration] =
    useState("Full Day");
  const [isApplicable, setIsApplicable] = useState(true);
  const [leavesUsed, setLeavesUsed] = useState(0);
  const [annualUsed, setAnnualUsed] = useState(0);
  const [sickUsed, setSickUsed] = useState(0);
  const [casualUsed, setCasualUsed] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const watchedStart = watch("start_date");
  const watchedEnd = watch("end_date");
  const watchedContent = watch("content") || "";

  const fiscalInfo = useMemo(() => {
    const today = new Date();
    const fiscalStartYear =
      today.getMonth() + 1 >= 7 ? today.getFullYear() : today.getFullYear() - 1;
    const fiscalEndYear = fiscalStartYear + 1;
    const shortEnd = String(fiscalEndYear).slice(-2);
    return {
      label: `Fiscal ${fiscalStartYear}–${shortEnd}`,
      yearLabel: String(fiscalStartYear),
      renewsOn: `Jul 01, ${fiscalEndYear}`,
    };
  }, []);

  const annualTotal = Number(employeeData?.annual_leaves) || 0;
  const sickTotal = Number(employeeData?.sick_leaves) || 0;
  const casualTotal = Number(employeeData?.casual_leaves) || 0;

  const annualRemaining = Math.max(0, annualTotal - annualUsed);
  const sickRemaining = Math.max(0, sickTotal - sickUsed);
  const casualRemaining = Math.max(0, casualTotal - casualUsed);
  const totalRemaining =
    annualRemaining + sickRemaining + casualRemaining;

  const percentUsed = (used, total) => {
    if (!total || total <= 0) return 0;
    return Math.min(100, Math.round((Number(used) / total) * 100));
  };

  const leaveEntitlement = useMemo(() => {
    const map = {
      Annual: annualTotal,
      Sick: sickTotal,
      Casual: casualTotal,
    };
    return map[selectedLeaveType] ?? 0;
  }, [selectedLeaveType, annualTotal, sickTotal, casualTotal]);

  const usedForSelected = useMemo(() => {
    if (selectedLeaveType === "Annual") return annualUsed;
    if (selectedLeaveType === "Sick") return sickUsed;
    if (selectedLeaveType === "Casual") return casualUsed;
    return leavesUsed;
  }, [selectedLeaveType, annualUsed, sickUsed, casualUsed, leavesUsed]);

  const availableForSelected = Math.max(
    0,
    leaveEntitlement - usedForSelected
  );

  const calculatedDays = useMemo(() => {
    if (selectedLeaveTypeDuration === "Half Day") {
      if (!watchedStart) return null;
      return 0.5;
    }
    if (!watchedStart || !watchedEnd) return null;
    return CalculateDaysDifference(watchedStart, watchedEnd);
  }, [watchedStart, watchedEnd, selectedLeaveTypeDuration]);

  const calcBannerMeta = useMemo(() => {
    if (!watchedStart) return "Select dates to calculate working days";
    if (selectedLeaveTypeDuration === "Half Day") {
      return `${moment(watchedStart).format("MMM DD, YYYY")} · Half Day`;
    }
    if (!watchedEnd) return "Select an end date";
    return `${moment(watchedStart).format("MMM DD, YYYY")} → ${moment(
      watchedEnd
    ).format("MMM DD, YYYY")} (Excludes Saturday & Sunday)`;
  }, [watchedStart, watchedEnd, selectedLeaveTypeDuration]);

  useEffect(() => {
    const getSingleLeaveData = async () => {
      if (!leaveId) return;
      const response = await fetch(
        `/api/leave/get-all?leaveId=${leaveId}&userId=${
          employeeData?.role !== "admin" ? employeeData?.supabase_user_id : null
        }`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const result = await response.json();
      if (response?.status === 200) {
        const leave = result?.data?.[0];
        const duration = leave?.leave_type_duration || "Full Day";
        const type = leave?.leave_type || "";
        reset({
          leave_type: type,
          leave_type_duration: duration,
          start_date: leave?.start_date ? new Date(leave.start_date) : null,
          end_date: leave?.end_date ? new Date(leave.end_date) : null,
          content: leave?.content || "",
        });
        setSelectedLeaveTypeDuration(duration);
        setSelectedLeaveType(type);
      }
    };
    if (leaveId && employeeData) {
      getSingleLeaveData();
    }
  }, [leaveId, employeeData, reset]);

  useEffect(() => {
    const getAllLeaveBalances = async () => {
      if (!employeeData?.supabase_user_id) return;
      try {
        const { fiscalYearStart, fiscalYearEnd } = getFiscalBounds();
        const { data, error } = await supabase
          .from("leaves")
          .select("duration, leave_type_duration, leave_type")
          .eq("supabase_user_id", employeeData.supabase_user_id)
          .eq("approval_status", "Approved")
          .gte("created_at", fiscalYearStart.toISOString())
          .lte("created_at", fiscalYearEnd.toISOString());

        if (error) {
          console.error("Error fetching leave balances:", error);
          return;
        }

        let annual = 0;
        let sick = 0;
        let casual = 0;

        data?.forEach((leave) => {
          const multiplier =
            leave?.leave_type_duration === "Half Day"
              ? 0.5
              : leave?.leave_type_duration === "Full Day"
              ? 1
              : 0;
          const effective = (leave?.duration || 0) * multiplier;
          if (leave.leave_type === "Annual") annual += effective;
          else if (leave.leave_type === "Sick") sick += effective;
          else if (leave.leave_type === "Casual") casual += effective;
        });

        setAnnualUsed(annual);
        setSickUsed(sick);
        setCasualUsed(casual);
      } catch (error) {
        console.error("Error fetching leave balances:", error);
      }
    };

    if (employeeData) getAllLeaveBalances();
  }, [employeeData]);

  useEffect(() => {
    if (!employeeData || !selectedLeaveType) return;

    const usedMap = {
      Annual: annualUsed,
      Sick: sickUsed,
      Casual: casualUsed,
    };
    const used = usedMap[selectedLeaveType] ?? 0;
    setLeavesUsed(used);

    const entitlementMap = {
      Annual: employeeData?.annual_leaves,
      Casual: employeeData?.casual_leaves,
      Sick: employeeData?.sick_leaves,
    };
    const entitlement = Number(entitlementMap[selectedLeaveType]) || 0;

    if (entitlement > 0 && entitlement <= used) {
      toast.error(
        `You reached the max limit of ${selectedLeaveType.toLowerCase()} leave`,
        {
          position: "bottom-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "colored",
        }
      );
      setIsApplicable(false);
    } else {
      setIsApplicable(true);
    }
  }, [
    employeeData,
    selectedLeaveType,
    selectedLeaveTypeDuration,
    annualUsed,
    sickUsed,
    casualUsed,
  ]);

  const onSubmit = async (leaveData) => {
    setIsLoading(true);
    const { content, end_date, leave_type, start_date, leave_type_duration } =
      leaveData;
    let leaveDays = 0;
    if (selectedLeaveTypeDuration === "Half Day") {
      leaveDays = CalculateDaysDifference(start_date, start_date);
    } else {
      leaveDays = CalculateDaysDifference(start_date, end_date);
    }
    const leaveTypes = {
      Annual: employeeData?.annual_leaves,
      Casual: employeeData?.casual_leaves,
      Sick: employeeData?.sick_leaves,
    };

    const daysLeave =
      selectedLeaveTypeDuration === "Half Day" ? leaveDays * 0.5 : leaveDays;
    const totalLeaves = leavesUsed + daysLeave;

    if (totalLeaves > leaveTypes[leave_type]) {
      toast.error(`You dont have enough leaves`, {
        position: "bottom-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
      setIsLoading(false);
    } else {
      try {
        if (leaveId) {
          const payload = {
            leave_type,
            leave_type_duration,
            start_date,
            end_date:
              selectedLeaveTypeDuration === "Half Day" ? start_date : end_date,
            content,
            duration: leaveDays,
          };
          const response = await fetch(
            `/api/leave/upsert?leaveId=${leaveId}&userId=${
              employeeData?.role !== "admin"
                ? employeeData?.supabase_user_id
                : null
            }`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            }
          );
          const result = await response.json();
          if (response.status === 200) {
            setIsLoading(false);
            toast.success(`Successfully leave updated`, {
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
              router.push("/hrms/employee/leave/list");
            }, 500);
          } else {
            setIsLoading(false);
            toast.error(result.error, {
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
        } else {
          const payload = {
            leave_type,
            leave_type_duration,
            start_date,
            end_date:
              selectedLeaveTypeDuration === "Half Day" ? start_date : end_date,
            content,
            duration: leaveDays,
            supabase_user_id: employeeData?.supabase_user_id,
          };
          const response = await fetch("/api/leave/upsert", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });
          const result = await response.json();
          if (response.status === 200) {
            setIsLoading(false);
            toast.success("Successfully Leave Submitted", {
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
              router.push("/hrms/employee/leave/list");
            }, 500);
          } else {
            setIsLoading(false);
            toast.error(result.error, {
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
        }
      } catch (error) {
        console.log(error);
        setIsLoading(false);
      }
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.breadcrumb}>
            <Link
              href="/hrms/employee/leave/list"
              className={styles.breadcrumbLink}
            >
              Leaves
            </Link>
            <span>/</span>
            <span className={styles.breadcrumbCurrent}>
              {isEdit ? "Edit Request" : "New Request"}
            </span>
          </div>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>
              {isEdit ? "Edit Leave Request" : "Apply for Leave"}
            </h1>
            <span className={styles.fiscalBadge}>
              <span className={styles.fiscalDot} />
              Policy Year {fiscalInfo.label.replace("Fiscal ", "")}
            </span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.btnGhost}
            onClick={() => router.push("/hrms/employee/leave/list")}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              history
            </span>
            My History
          </button>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.colMain}>
          <div className={styles.formCard}>
            <div className={styles.formCardHeader}>
              <div>
                <h3 className={styles.formCardTitle}>Leave Request Details</h3>
                <p className={styles.formCardSubtitle}>
                  Fill in the accurate period and coverage notes
                </p>
              </div>
              <span className={styles.mandatoryHint}>
                <span className="material-symbols-outlined">info</span>
                Fields with * are mandatory
              </span>
            </div>

            <form
              className={styles.form}
              onSubmit={handleSubmit(onSubmit)}
              noValidate
            >
              <div className={styles.fieldsRow}>
                <div className={styles.field}>
                  <div className={styles.fieldHeader}>
                    <label className={styles.label} htmlFor="leaveType">
                      Leave Type <span className={styles.required}>*</span>
                    </label>
                    {selectedLeaveType ? (
                      <span className={styles.quotaChip}>
                        {availableForSelected} days available
                      </span>
                    ) : null}
                  </div>
                  <div className={styles.selectWrap}>
                    <select
                      id="leaveType"
                      className={styles.select}
                      {...register("leave_type", {
                        required: "Please select leave type.",
                      })}
                      value={selectedLeaveType || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setValue("leave_type", value, { shouldValidate: true });
                        setSelectedLeaveType(value);
                      }}
                    >
                      <option value="" disabled>
                        Select leave type
                      </option>
                      <option value="Annual">Annual</option>
                      <option value="Sick">Sick</option>
                      <option value="Casual">Casual</option>
                    </select>
                    <span
                      className={`material-symbols-outlined ${styles.selectChevron}`}
                    >
                      expand_more
                    </span>
                  </div>
                  {errors?.leave_type ? (
                    <p className={styles.error}>{errors.leave_type.message}</p>
                  ) : null}
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="leaveDuration">
                    Select Leave Duration{" "}
                    <span className={styles.required}>*</span>
                  </label>
                  <div className={styles.selectWrap}>
                    <select
                      id="leaveDuration"
                      className={styles.select}
                      {...register("leave_type_duration", {
                        required: "Please select leave Duration.",
                      })}
                      value={selectedLeaveTypeDuration || "Full Day"}
                      onChange={(e) => {
                        const value = e.target.value;
                        setValue("leave_type_duration", value, {
                          shouldValidate: true,
                        });
                        setSelectedLeaveTypeDuration(value);
                        if (value === "Half Day") {
                          const start = getValues("start_date");
                          if (start) {
                            setValue("end_date", start, {
                              shouldValidate: true,
                            });
                          }
                        }
                      }}
                    >
                      <option value="Full Day">Full Day</option>
                      <option value="Half Day">Half Day</option>
                    </select>
                    <span
                      className={`material-symbols-outlined ${styles.selectChevron}`}
                    >
                      schedule
                    </span>
                  </div>
                  {errors?.leave_type_duration ? (
                    <p className={styles.error}>
                      {errors.leave_type_duration.message}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className={styles.fieldsRow}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="startDate">
                    {selectedLeaveTypeDuration === "Full Day"
                      ? "Start Date"
                      : "Date"}{" "}
                    <span className={styles.required}>*</span>
                  </label>
                  <div className={styles.dateWrap}>
                    <DatePicker
                      id="startDate"
                      selected={watchedStart}
                      onChange={(date) => {
                        setValue("start_date", date, { shouldValidate: true });
                        if (selectedLeaveTypeDuration === "Half Day") {
                          setValue("end_date", date, { shouldValidate: true });
                        }
                      }}
                      placeholderText="Select date"
                      autoComplete="off"
                    />
                    <span
                      className={`material-symbols-outlined ${styles.dateIcon}`}
                    >
                      calendar_month
                    </span>
                  </div>
                  <input
                    type="hidden"
                    {...register("start_date", {
                      required: "Please select date.",
                    })}
                  />
                  {errors?.start_date ? (
                    <p className={styles.error}>{errors.start_date.message}</p>
                  ) : null}
                </div>

                {selectedLeaveTypeDuration === "Full Day" ? (
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="endDate">
                      End Date <span className={styles.required}>*</span>
                    </label>
                    <div className={styles.dateWrap}>
                      <DatePicker
                        id="endDate"
                        selected={watchedEnd}
                        onChange={(date) =>
                          setValue("end_date", date, { shouldValidate: true })
                        }
                        placeholderText="Select end date"
                        autoComplete="off"
                      />
                      <span
                        className={`material-symbols-outlined ${styles.dateIcon}`}
                      >
                        calendar_month
                      </span>
                    </div>
                    <input
                      type="hidden"
                      {...register("end_date", {
                        required: "Please select date.",
                      })}
                    />
                    {errors?.end_date ? (
                      <p className={styles.error}>{errors.end_date.message}</p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className={styles.calcBanner}>
                <div className={styles.calcLeft}>
                  <span className={styles.calcIcon}>
                    <span className="material-symbols-outlined">date_range</span>
                  </span>
                  <div>
                    <span className={styles.calcTitle}>
                      {calculatedDays == null
                        ? "Calculated: —"
                        : calculatedDays === 0.5
                        ? "Calculated: 0.5 Working Day"
                        : `Calculated: ${calculatedDays} Working Day${
                            calculatedDays === 1 ? "" : "s"
                          }`}
                    </span>
                    <span className={styles.calcMeta}>{calcBannerMeta}</span>
                  </div>
                </div>
              </div>

              <div className={styles.field}>
                <div className={styles.fieldHeader}>
                  <label className={styles.label} htmlFor="leaveReason">
                    Reason for Leave <span className={styles.required}>*</span>
                  </label>
                  <span className={styles.charCount}>
                    {watchedContent.length} / 300
                  </span>
                </div>
                <textarea
                  id="leaveReason"
                  className={styles.textarea}
                  rows={4}
                  maxLength={300}
                  placeholder="Please provide a brief reason for your leave request..."
                  {...register("content", {
                    required: "Leave reason is required",
                  })}
                />
                {errors?.content ? (
                  <p className={styles.error}>{errors.content.message}</p>
                ) : null}
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.btnCancel}
                  onClick={() => router.push("/hrms/employee/leave/list")}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.btnSubmit}
                  disabled={!isApplicable || isLoading}
                >
                  {isLoading ? (
                    <ButtonLoader />
                  ) : (
                    <>
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: 20 }}
                      >
                        send
                      </span>
                      {isEdit
                        ? "Update Leave Request"
                        : "Submit Leave Request"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className={styles.colSide}>
          <div className={styles.balanceCard}>
            <div className={styles.balanceHeader}>
              <div className={styles.balanceTitleRow}>
                <span className="material-symbols-outlined">pie_chart</span>
                <h3 className={styles.balanceTitle}>Leave Balances</h3>
              </div>
              <span className={styles.yearBadge}>{fiscalInfo.yearLabel}</span>
            </div>

            <div className={styles.meter}>
              <div className={styles.meterHeader}>
                <span className={styles.meterLabel}>Annual Leave</span>
                <span className={styles.meterValue}>
                  <strong>{annualRemaining}</strong> / {annualTotal} days
                  remaining
                </span>
              </div>
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressFill}
                  style={{
                    width: `${percentUsed(annualUsed, annualTotal)}%`,
                  }}
                />
              </div>
            </div>

            <div className={styles.meter}>
              <div className={styles.meterHeader}>
                <span className={styles.meterLabel}>Sick Leave</span>
                <span className={styles.meterValue}>
                  <strong>{sickRemaining}</strong> / {sickTotal} days remaining
                </span>
              </div>
              <div className={styles.progressTrack}>
                <div
                  className={`${styles.progressFill} ${styles.progressFillSick}`}
                  style={{
                    width: `${percentUsed(sickUsed, sickTotal)}%`,
                  }}
                />
              </div>
            </div>

            <div className={styles.meter}>
              <div className={styles.meterHeader}>
                <span className={styles.meterLabel}>Casual Leave</span>
                <span className={styles.meterValue}>
                  <strong>{casualRemaining}</strong> / {casualTotal} days
                  remaining
                </span>
              </div>
              <div className={styles.progressTrack}>
                <div
                  className={`${styles.progressFill} ${styles.progressFillCasual}`}
                  style={{
                    width: `${percentUsed(casualUsed, casualTotal)}%`,
                  }}
                />
              </div>
            </div>

            <div className={styles.balanceFooter}>
              <div className={styles.totalRemaining}>
                <span className={styles.totalLabel}>Total remaining</span>
                <span className={styles.totalValue}>
                  {totalRemaining} days
                </span>
              </div>
              <span className={styles.renewalNote}>
                Quota renews {fiscalInfo.renewsOn}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveCreateComponent;
