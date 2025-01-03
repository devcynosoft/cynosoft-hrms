"use client";
import React, { useEffect, useState } from "react";
import styles from "./leave.module.css";
import Select from "react-select";
import Image from "next/image";
import DatePicker from "react-datepicker";
import { Button } from "react-bootstrap";
import { supabase } from "@/utils/supabaseClient";
import { toast } from "react-toastify";
import { useForm } from "react-hook-form";
import { useEmployee } from "@/context/EmployeeContext";
import { useRouter } from "next/navigation";
import CalculateDaysDifference from "@/utils/daysDifference";
import useIsMobile from "@/utils/useIsMobile";
import ButtonLoader from "../ButtonLoader";

const LeaveCreateComponent = ({ leaveId }) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    getValues,
    setValue,
  } = useForm();
  const { employeeData } = useEmployee();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [selectedLeaveType, setSelectedLeaveType] = useState(null);
  const [selectedLeaveTypeDuration, setSelectedLeaveTypeDuration] =
    useState("Full Day");
  const [isApplicable, setIsApplicable] = useState(true);
  const [leavesUsed, setLeavesUsed] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const getSingleLeaveData = async () => {
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
        reset({
          leave_type: result?.data?.[0]?.leave_type || "",
          leave_type_duration: result?.data?.[0]?.leave_type_duration || "",
          start_date: result?.data?.[0]?.start_date
            ? new Date(result?.data?.[0]?.start_date)
            : null,
          end_date: result?.data?.[0]?.end_date
            ? new Date(result?.data?.[0]?.end_date)
            : null,
          content: result?.data?.[0]?.content || "",
        });
        setSelectedLeaveTypeDuration(
          result?.data?.[0]?.leave_type_duration || "Full Day"
        );
        setSelectedLeaveType(result?.data?.[0]?.leave_type || "");
      }
    };
    if (leaveId || employeeData) {
      getSingleLeaveData();
    }
  }, [leaveId, employeeData]);

  useEffect(() => {
    const getDaysOfLeaveSelected = async () => {
      try {
        const { data, error } = await supabase
          .from("leaves")
          .select("duration, leave_type_duration")
          .eq("supabase_user_id", employeeData?.supabase_user_id)
          .eq("approval_status", "Approved")
          .eq("leave_type", selectedLeaveType);

        if (error) {
          console.error("Error fetching leave data:", error);
        } else {
          // Map leave_duration to numeric values (HalfDay = 0.5, FullDay = 1)
          console.log(data, "data");
          const totalDuration = data?.reduce((sum, leave) => {
            const leaveMultiplier =
              leave?.leave_type_duration === "Half Day"
                ? 0.5
                : leave?.leave_type_duration === "Full Day"
                ? 1
                : 0; // Default to 0 if leave_type_duration is not defined

            // Calculate effective leave duration
            const effectiveLeaveDuration = leave?.duration * leaveMultiplier;
            return sum + effectiveLeaveDuration;
          }, 0);
          setLeavesUsed(totalDuration);
          const leaveTypes = {
            Annual: employeeData?.annual_leaves,
            Casual: employeeData?.casual_leaves,
            Sick: employeeData?.sick_leaves,
          };
          if (leaveTypes[selectedLeaveType] <= totalDuration) {
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
        }
      } catch (error) {
        console.error("Error fetching leave data:", error);
      }
    };
    if (employeeData && selectedLeaveType && selectedLeaveTypeDuration) {
      getDaysOfLeaveSelected();
    }
  }, [employeeData, selectedLeaveType, selectedLeaveTypeDuration]);

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
          const leaveData = {
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
              body: JSON.stringify(leaveData),
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
          const leaveData = {
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
            body: JSON.stringify(leaveData),
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
      }
    }
  };

  return (
    <div className="mainContainer">
      <div className={`${styles.formContainer} mt-4 mb-2 mt-md-0 mb-md-0`}>
        <div className={`${styles.title} mb-3`}>
          {isMobile ? (
            <div>
              <Image
                src="/assets/icons/back-arrow.svg"
                alt="Ball Pic"
                width={15}
                height={15}
                priority
                onClick={() => router.push("/hrms/employee/leave/list/")}
                style={{ objectFit: "contain", marginRight: "30px" }}
              />
              <span style={{ fontSize: "20px", fontWeight: "700" }}>
                Apply for leaves
              </span>
            </div>
          ) : (
            <span>Leave Form</span>
          )}
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
          <div>
            <span className={styles.text}>Select Leave Duration</span>
            <div className={`mt-1`}>
              <Select
                {...register("leave_type_duration", {
                  required: "Please select leave Duration.",
                })}
                classNamePrefix="leaveSelect"
                name="leave_type_duration"
                className={styles.leaveSelect}
                placeholder=""
                value={
                  getValues("leave_type_duration")
                    ? {
                        label: getValues("leave_type_duration"),
                        value: getValues("leave_type_duration"),
                      }
                    : null
                }
                onChange={(val) => {
                  setValue("leave_type_duration", val?.value, {
                    shouldValidate: true,
                  });
                  setSelectedLeaveTypeDuration(val?.value);
                }}
                options={[
                  { label: "Full Day", value: "Full Day" },
                  { label: "Half Day", value: "Half Day" },
                ]}
              />
              {errors?.leave_type_duration && (
                <p className="hrms-field-error">
                  {errors?.leave_type_duration?.message}
                </p>
              )}
            </div>
          </div>
          <div className="mt-2">
            <span className={styles.text}>Select Leave Type</span>
            <div className={`mt-1`}>
              <Select
                {...register("leave_type", {
                  required: "Please select leave type.",
                })}
                classNamePrefix="leaveSelect"
                name="leave_type"
                className={styles.leaveSelect}
                placeholder=""
                value={
                  getValues("leave_type")
                    ? {
                        label: getValues("leave_type"),
                        value: getValues("leave_type"),
                      }
                    : null
                }
                onChange={(val) => {
                  setValue("leave_type", val?.value, { shouldValidate: true });
                  setSelectedLeaveType(val?.value);
                }}
                options={[
                  { label: "Sick", value: "Sick" },
                  { label: "Casual", value: "Casual" },
                  { label: "Annual", value: "Annual" },
                ]}
              />
              {errors?.leave_type && (
                <p className="hrms-field-error">
                  {errors?.leave_type?.message}
                </p>
              )}
            </div>
          </div>
          <div className="mt-2">
            <span className={styles.text}>
              {selectedLeaveTypeDuration === "Full Day" ? "Start Date" : "Date"}
            </span>
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
                  {...register("start_date", {
                    required: "Please select date.",
                  })}
                  name="start_date"
                  selected={getValues("start_date")}
                  onChange={(date) =>
                    setValue("start_date", date, { shouldValidate: true })
                  }
                  // maxDate={getValues("end_date")}
                  minDate={new Date()}
                  autoComplete="off"
                />
              </div>
              {errors?.start_date && (
                <p className="hrms-field-error">
                  {errors?.start_date?.message}
                </p>
              )}
            </div>
          </div>
          {selectedLeaveTypeDuration === "Full Day" ? (
            <div className="mt-2">
              <span className={styles.text}>End Date</span>
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
                    {...register("end_date", {
                      required: "Please select date.",
                    })}
                    name="end_date"
                    selected={getValues("end_date")}
                    onChange={(date) =>
                      setValue("end_date", date, { shouldValidate: true })
                    }
                    minDate={getValues("start_date")}
                    autoComplete="off"
                  />
                </div>
                {errors?.end_date && (
                  <p className="hrms-field-error">
                    {errors?.end_date?.message}
                  </p>
                )}
              </div>
            </div>
          ) : (
            ""
          )}

          <div className="mt-2 form-group">
            <span className={styles.text}>Reason for leave:</span>
            <div className="mt-1">
              <textarea
                {...register("content", {
                  required: "Leave reason is required",
                })}
                class="form-control"
                id="exampleFormControlTextarea1"
                rows="5"
              ></textarea>
              {errors?.content && (
                <p className="hrms-field-error">{errors?.content?.message}</p>
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
                onClick={() => router.push("/hrms/employee/leave/list")}
              >
                Cancel
              </Button>
              <Button
                className={`w-25 hrms-button`}
                variant="primary"
                size="md"
                type="submit"
                disabled={!isApplicable || isLoading}
              >
                {isLoading ? <ButtonLoader /> : "Apply"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeaveCreateComponent;
