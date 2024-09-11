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
  const [isApplicable, setIsApplicable] = useState(true);
  const [leavesUsed, setLeavesUsed] = useState(0);

  useEffect(() => {
    const getSingleLeaveData = async () => {
      try {
        let query = supabase.from("leaves").select("*").eq("id", leaveId);
        if (employeeData?.role !== "admin") {
          query = query.eq("supabase_user_id", employeeData?.supabase_user_id);
        }
        const { data, error } = await query;
        if (error) {
          console.error("Error fetching leave data:", error);
        }
        reset({
          leave_type: data?.[0]?.leave_type || "",
          start_date: data?.[0]?.start_date
            ? new Date(data?.[0]?.start_date)
            : null,
          end_date: data?.[0]?.end_date ? new Date(data?.[0]?.end_date) : null,
          content: data?.[0]?.content || "",
        });
      } catch (error) {
        console.log(error);
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
          .select("duration")
          .eq("supabase_user_id", employeeData?.supabase_user_id)
          .eq("approval_status", "Approved")
          .eq("leave_type", selectedLeaveType);

        if (error) {
          console.error("Error fetching leave data:", error);
        } else {
          const totalDuration = data?.reduce(
            (sum, leave) => sum + leave?.duration,
            0
          );
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
    if (employeeData && selectedLeaveType) {
      getDaysOfLeaveSelected();
    }
  }, [employeeData, selectedLeaveType]);

  const onSubmit = async (leaveData) => {
    const { content, end_date, leave_type, start_date } = leaveData;
    const leaveDays = CalculateDaysDifference(start_date, end_date);
    const leaveTypes = {
      Annual: employeeData?.annual_leaves,
      Casual: employeeData?.casual_leaves,
      Sick: employeeData?.sick_leaves,
    };
    const totalLeaves = leavesUsed + leaveDays;
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
    } else {
      try {
        if (leaveId) {
          let query = supabase
            .from("leaves")
            .update({
              leave_type,
              start_date,
              end_date,
              content,
              duration: leaveDays,
            })
            .eq("id", leaveId);
          if (employeeData?.role !== "admin") {
            query = query.eq(
              "supabase_user_id",
              employeeData?.supabase_user_id
            );
          }
          const { data: updateData, error: updateError } = await query;

          if (updateError) {
            console.log(updateError, "updateError");
          }
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
          const { error } = await supabase.from("leaves").insert({
            leave_type,
            start_date,
            end_date,
            content,
            duration: leaveDays,
            supabase_user_id: employeeData?.supabase_user_id,
          });
          if (error) {
            toast.error(error?.message, {
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
          <div className="mt-2">
            <span className={styles.text}>Start Date</span>
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
                    required: "Please select start date.",
                  })}
                  name="start_date"
                  selected={getValues("start_date")}
                  onChange={(date) =>
                    setValue("start_date", date, { shouldValidate: true })
                  }
                  maxDate={getValues("end_date")}
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
                    required: "Please select end date.",
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
                <p className="hrms-field-error">{errors?.end_date?.message}</p>
              )}
            </div>
          </div>
          <div>
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
                disabled={!isApplicable}
              >
                Apply
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeaveCreateComponent;
