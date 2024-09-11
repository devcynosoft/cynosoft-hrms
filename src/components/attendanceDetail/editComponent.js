"use client";
import React, { useEffect, useState } from "react";
import styles from "./attendanceDetail.module.css";
import { Button } from "react-bootstrap";
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

const AttendanceEditComponent = ({ attendId }) => {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
    getValues,
    setValue,
  } = useForm();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [userList, setUserList] = useState([]);

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
        };
      });
      setUserList(users);
    };
    getUserData();
  }, []);

  useEffect(() => {
    const getSingleAttendanceData = async () => {
      try {
        const { data, error } = await supabase
          .from("attendance")
          .select(
            `
        id, 
        checkin_time, 
        checkout_time, 
        total_hour, 
        created_at,
        employees(name)
      `
          )
          .eq("id", attendId);
        if (error) {
          console.error("Error fetching leave data:", error);
        }
        reset({
          name: data?.[0]?.employees?.name || "",
          checkin_time: moment
            .utc(data?.[0]?.checkin_time)
            .local()
            .format("hh:mm:ss A"),
          checkout_time: data?.[0]?.checkout_time
            ? moment.utc(data?.[0]?.checkout_time).local().format("hh:mm:ss A")
            : null,
          date: moment(data?.[0]?.checkin_time).format("YYYY-MM-DD"),
        });
      } catch (error) {
        console.log(error);
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
    const dbCheckinTime = convertToFullDateString(
      checkin_time,
      moment(date).format("YYYY-MM-DD")
    );
    const dbCheckoutTime = convertToFullDateString(
      checkout_time,
      moment(date).format("YYYY-MM-DD")
    );
    if (attendId) {
      try {
        const { data: updateData, error: updateError } = await supabase
          .from("attendance")
          .update({
            checkin_time: dbCheckinTime,
            checkout_time: checkout_time ? dbCheckoutTime : null,
            total_hour:
              checkin_time && checkout_time
                ? calculateTimeDifference(dbCheckinTime, dbCheckoutTime)
                : "",
          })
          .eq("id", attendId);
        if (updateError) {
          console.log(updateError, "updateError");
          setIsLoading(false);
        }
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
      } catch (error) {
        console.log(error);
        setIsLoading(false);
      }
    } else {
      try {
        const { data: attendanceData, error: attendanceError } = await supabase
          .from("attendance")
          .insert([
            {
              supabase_user_id: name.value,
              checkin_time: dbCheckinTime,
              checkout_time: dbCheckoutTime,
              total_hour: calculateTimeDifference(
                dbCheckinTime,
                dbCheckoutTime
              ),
            },
          ]);
        if (attendanceError) {
          setIsLoading(false);
          console.log(attendanceError);
          return;
        }
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
      } catch (error) {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="mainContainer">
      <div className={`${styles.formContainer} mt-4 mt-md-0`}>
        <div className={`${styles.title} d-none d-md-block mb-3`}>
          <span>
            {attendId ? "Attendance Edit Form" : "Attendance Add Form"}
          </span>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <div className={`${styles.ballsImage} d-none d-md-block`}>
            <Image
              src="/assets/images/round-balls.png"
              alt="Ball Pic"
              width={125}
              height={125}
              priority
              style={{ objectFit: "contain" }}
            />
          </div>
          {attendId ? (
            <div className="mt-2">
              <span className={styles.text}>Date</span>
              <div className={`mt-1`}>
                <input
                  {...register("date", {
                    required: "Date is required",
                  })}
                  className={`${styles.field} w-100`}
                  type="text"
                  disabled={true}
                />
                {errors?.date && (
                  <p className="hrms-field-error">{errors?.date?.message}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-2">
              <span className={styles.text}>Date</span>
              <div className="mt-1">
                <div className={styles.datePickers}>
                  <Image
                    src="/assets/icons/Vector-dark.png"
                    alt="Profile pic"
                    width={19}
                    height={18}
                    className="hrms-calendar-icon"
                    priority
                  />
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
                  />
                </div>
                {errors?.date && (
                  <p className="hrms-field-error">{errors?.date?.message}</p>
                )}
              </div>
            </div>
          )}
          <div>
            <span className={styles.text}>Employee Name</span>
            {attendId ? (
              <div className={`mt-1`}>
                <input
                  {...register("name", {
                    required: "Name is required",
                  })}
                  className={`${styles.field} w-100`}
                  type="text"
                  disabled={true}
                />
                {errors?.name && (
                  <p className="hrms-field-error">{errors?.name?.message}</p>
                )}
              </div>
            ) : (
              <div className={`mt-2 w-100`}>
                <Select
                  {...register("name", {
                    required: "Name is required",
                  })}
                  name="name"
                  className="w-100"
                  placeholder=""
                  value={
                    getValues("name")
                      ? {
                          label: getValues("name").label,
                          value: getValues("name").value,
                        }
                      : null
                  }
                  onChange={(val) =>
                    setValue(
                      "name",
                      { value: val?.value, label: val?.label },
                      { shouldValidate: true }
                    )
                  }
                  options={userList}
                />
                {errors?.name && (
                  <p className="hrms-field-error">{errors?.name?.message}</p>
                )}
              </div>
            )}
          </div>
          <div className="mt-2">
            <span className={styles.text}>Checkin Time:</span>
            <div className="mt-1">
              <Controller
                name="checkin_time"
                control={control}
                rules={{ required: "Check-in time is required" }}
                render={({ field }) => (
                  <TimePicker
                    className="w-100"
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
              {errors.checkin_time && (
                <span className="hrms-field-error">
                  {errors.checkin_time.message}
                </span>
              )}
            </div>
          </div>
          <div className="mt-2">
            <span className={styles.text}>Checkout Time:</span>
            <div className="mt-1">
              <Controller
                name="checkout_time"
                control={control}
                rules={{ required: !attendId && "Check-out time is required" }}
                render={({ field }) => (
                  <TimePicker
                    className="w-100"
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
              {errors.checkout_time && (
                <span className="hrms-field-error">
                  {errors.checkout_time.message}
                </span>
              )}
            </div>
          </div>
          <div className="mt-3">
            <div
              className="d-flex"
              style={{ width: "108%", justifyContent: "space-around" }}
            >
              <Button
                className={`w-25 hrms-button`}
                variant="primary"
                size="md"
                type="button"
                onClick={() => router.push("/hrms/employee/attendance")}
              >
                Cancel
              </Button>
              <Button
                className={`w-25 hrms-button`}
                variant="primary"
                size="md"
                type="submit"
                disabled={isLoading}
              >
                {attendId ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AttendanceEditComponent;
