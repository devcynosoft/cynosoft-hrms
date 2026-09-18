"use client";
import React, { useEffect, useState } from "react";
import styles from "./attendanceEdit.module.css";
import { supabase } from "@/utils/supabaseClient";
import { toast } from "react-toastify";
import { useForm, Controller } from "react-hook-form";
import Select from "react-select";
import { useRouter } from "next/navigation";
import TimePicker from "react-time-picker";
import moment from "moment";
import calculateTimeDifference from "@/utils/timeDifference";
import DatePicker from "react-datepicker";
import Image from "next/image";
import ButtonLoader from "../ButtonLoader.jsx";

const selectStyles = {
  container: (base) => ({
    ...base,
    width: "100%",
  }),
  control: (base) => ({
    ...base,
    width: "100%",
    minHeight: "2.75rem",
    border: "none",
    borderRadius: "0.5rem",
    boxShadow: "0 1px 3px rgba(0, 32, 70, 0.04)",
    backgroundColor: "#eff4ff",
  }),
  menu: (base) => ({
    ...base,
    zIndex: 50,
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 120,
  }),
};

const AttendanceEditComponent = ({ attendId }) => {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    getValues,
    setValue,
  } = useForm();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [userList, setUserList] = useState([]);
  const [employeeJobType, setEmployeeJobType] = useState("fullTime");

  const getRequiredJobHour = (jobType) => {
    if (jobType === "partTime") return "04:00:00";
    return "09:00:00";
  };

  const isEarlyOut = (timeDifference, jobType) => {
    if (!timeDifference) return null;
    return timeDifference < getRequiredJobHour(jobType);
  };

  useEffect(() => {
    const getUserData = async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("is_current", true);

      if (error) {
        console.error("Error fetching employee details:", error.message);
        return;
      }
      const users = data?.map((item) => {
        return {
          label: item.name,
          value: item.supabase_user_id,
          jobType: item.job_type || "fullTime",
        };
      });
      setUserList(users);
    };
    getUserData();
  }, []);

  useEffect(() => {
    const getSingleAttendanceData = async () => {
      const response = await fetch(
        `/api/attendance/get-all?attendId=${attendId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const result = await response.json();
      if (response?.status === 200) {
        setEmployeeJobType(
          result?.data?.[0]?.employees?.job_type || "fullTime"
        );
        reset({
          name: result?.data?.[0]?.employees?.name || "",
          checkin_time: moment
            .utc(result?.data?.[0]?.checkin_time)
            .local()
            .format("hh:mm:ss A"),
          checkout_time: result?.data?.[0]?.checkout_time
            ? moment
                .utc(result?.data?.[0]?.checkout_time)
                .local()
                .format("hh:mm:ss A")
            : null,
          date: moment(result?.data?.[0]?.checkin_time).format("YYYY-MM-DD"),
        });
      }
    };
    if (attendId) {
      getSingleAttendanceData();
    }
  }, [attendId]);

  function convertToFullDateString(timeString, date) {
    const combinedDateTime = `${date} ${timeString}`;
    const momentDate = moment(combinedDateTime, "YYYY-MM-DD hh:mm:ss A");
    const isoString = momentDate.toISOString();
    return isoString;
  }

  const onSubmit = async (attendData) => {
    setIsLoading(true);
    const { name, checkin_time, checkout_time, date } = attendData;
    let dbCheckinTime = null;
    let dbCheckoutTime = null;
    if (checkin_time) {
      dbCheckinTime = convertToFullDateString(
        checkin_time,
        moment(date).format("YYYY-MM-DD")
      );
    }
    if (checkout_time) {
      dbCheckoutTime = convertToFullDateString(
        checkout_time,
        moment(date).format("YYYY-MM-DD")
      );
    }

    const jobType =
      attendId
        ? employeeJobType
        : name?.jobType || employeeJobType || "fullTime";

    if (attendId) {
      let timeDifference = null;
      if (dbCheckinTime && dbCheckoutTime) {
        timeDifference = calculateTimeDifference(dbCheckinTime, dbCheckoutTime);
      }

      let atendData = {
        checkin_time: dbCheckinTime,
        checkout_time: dbCheckoutTime,
        total_hour: timeDifference,
        early_out: isEarlyOut(timeDifference, jobType),
      };
      const response = await fetch(
        `/api/attendance/upsert?attendId=${attendId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(atendData),
        }
      );
      const result = await response.json();
      if (response.status === 200) {
        toast.success(`${name} attendance successfully updated`, {
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
        setTimeout(() => {
          router.push("/hrms/employee/attendance");
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
      let timeDifference = null;
      if (dbCheckinTime && dbCheckoutTime) {
        timeDifference = calculateTimeDifference(dbCheckinTime, dbCheckoutTime);
      }

      let atendData = {
        supabase_user_id: name.value,
        checkin_time: dbCheckinTime,
        checkout_time: dbCheckoutTime,
        total_hour: timeDifference,
        early_out: isEarlyOut(timeDifference, jobType),
      };
      const response = await fetch("/api/attendance/upsert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(atendData),
      });
      const result = await response.json();
      if (response.status === 200) {
        toast.success(`${name.label} attendance successfully added`, {
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
        setTimeout(() => {
          router.push("/hrms/employee/attendance");
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
  };

  const pageTitle = attendId ? "Edit Attendance" : "Add Attendance";
  const formTitle = attendId
    ? "Attendance Edit Form"
    : "Attendance Add Form";

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.breadcrumb}>
            <button
              type="button"
              className={styles.breadcrumbLink}
              onClick={() => router.push("/hrms/employee/attendance")}
            >
              Attendance
            </button>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              chevron_right
            </span>
            <span className={styles.breadcrumbCurrent}>
              {attendId ? "Edit" : "Create"}
            </span>
          </div>
          <h1 className={styles.title}>{pageTitle}</h1>
          <p className={styles.subtitle}>
            {attendId
              ? "Update check-in and check-out times for this record."
              : "Create a new attendance entry for an employee."}
          </p>
        </div>
      </div>

      <div className={styles.formCard}>


        <div className={styles.formCardHeader}>
          <div>
            <h2 className={styles.formCardTitle}>{formTitle}</h2>
            <p className={styles.formCardSubtitle}>
              Fill in the fields below to {attendId ? "update" : "save"}{" "}
              attendance.
            </p>
          </div>
          <span className={styles.mandatoryHint}>
            <span className="material-symbols-outlined">info</span>
            Required fields marked
          </span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.fieldsRow}>
            <div className={styles.field}>
              <label className={styles.label}>
                Date <span className={styles.required}>*</span>
              </label>
              {attendId ? (
                <>
                  <input
                    {...register("date", {
                      required: "Date is required",
                    })}
                    className={styles.input}
                    type="text"
                    disabled
                  />
                  {errors?.date ? (
                    <p className={styles.error}>{errors?.date?.message}</p>
                  ) : null}
                </>
              ) : (
                <>
                  <div className={styles.dateWrap}>
                    <DatePicker
                      {...register("date", {
                        required: "Please select start date.",
                      })}
                      name="start_date"
                      selected={getValues("date")}
                      onChange={(date) =>
                        setValue("date", date, { shouldValidate: true })
                      }
                      autoComplete="off"
                      placeholderText="Select date"
                    />
                    <span
                      className={`material-symbols-outlined ${styles.dateIcon}`}
                    >
                      calendar_month
                    </span>
                  </div>
                  {errors?.date ? (
                    <p className={styles.error}>{errors?.date?.message}</p>
                  ) : null}
                </>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                Employee Name <span className={styles.required}>*</span>
              </label>
              {attendId ? (
                <>
                  <input
                    {...register("name", {
                      required: "Name is required",
                    })}
                    className={styles.input}
                    type="text"
                    disabled
                  />
                  {errors?.name ? (
                    <p className={styles.error}>{errors?.name?.message}</p>
                  ) : null}
                </>
              ) : (
                <>
                  <div className={styles.selectFull}>
                    <Select
                      {...register("name", {
                        required: "Name is required",
                      })}
                      name="name"
                      placeholder="Select employee"
                      value={
                        getValues("name")
                          ? {
                              label: getValues("name").label,
                              value: getValues("name").value,
                            }
                          : null
                      }
                      onChange={(val) => {
                        setEmployeeJobType(val?.jobType || "fullTime");
                        setValue(
                          "name",
                          {
                            value: val?.value,
                            label: val?.label,
                            jobType: val?.jobType || "fullTime",
                          },
                          { shouldValidate: true }
                        );
                      }}
                      options={userList}
                      styles={selectStyles}
                      menuPortalTarget={
                        typeof document !== "undefined" ? document.body : null
                      }
                      menuPosition="fixed"
                    />
                  </div>
                  {errors?.name ? (
                    <p className={styles.error}>{errors?.name?.message}</p>
                  ) : null}
                </>
              )}
            </div>
          </div>

          <div className={styles.fieldsRow}>
            <div className={styles.field}>
              <label className={styles.label}>
                Check-in Time <span className={styles.required}>*</span>
              </label>
              <div className={styles.timeWrap}>
                <Controller
                  name="checkin_time"
                  control={control}
                  rules={{ required: "Check-in time is required" }}
                  render={({ field }) => (
                    <TimePicker
                      {...field}
                      value={
                        field.value
                          ? moment(field.value, "hh:mm:ss A").toDate()
                          : null
                      }
                      format="hh:mm:ss a"
                      disableClock
                    />
                  )}
                />
              </div>
              {errors.checkin_time ? (
                <p className={styles.error}>{errors.checkin_time.message}</p>
              ) : null}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Check-out Time</label>
              <div className={styles.timeWrap}>
                <Controller
                  name="checkout_time"
                  control={control}
                  render={({ field }) => (
                    <TimePicker
                      {...field}
                      value={
                        field.value
                          ? moment(field.value, "hh:mm:ss A").toDate()
                          : null
                      }
                      format="hh:mm:ss a"
                      disableClock
                    />
                  )}
                />
              </div>
            </div>
          </div>

          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.btnCancel}
              onClick={() => router.push("/hrms/employee/attendance")}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.btnSubmit}
              disabled={isLoading}
            >
              {isLoading ? <ButtonLoader /> : attendId ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AttendanceEditComponent;
