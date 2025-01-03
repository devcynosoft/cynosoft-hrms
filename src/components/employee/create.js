"use client";
import React, { useEffect, useRef, useState } from "react";
import styles from "./employee.module.css";
import { Button, Col, Row } from "react-bootstrap";
import Select from "react-select";
import Dropzone from "react-dropzone";
import { toast } from "react-toastify";
import { supabase } from "@/utils/supabaseClient";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useEmployee } from "@/context/EmployeeContext";
import ButtonLoader from "../ButtonLoader";

const EmployeeCreateComponent = ({ empId }) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    getValues,
    setValue,
  } = useForm({
    defaultValues: {
      job_type: "fullTime",
    },
  });
  const router = useRouter();
  const { employeeData, setEmployeeData } = useEmployee();
  const [jobStatus, setJobStatus] = useState(null);
  const [pass, setPass] = useState("");
  const [supaId, setSupaId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [annualUsed, setAnnualUsed] = useState(0);
  const [sickUsed, setSickUsed] = useState(0);
  const [casualUsed, setCasualUsed] = useState(0);

  useEffect(() => {
    const getSingleEmployeeData = async () => {
      const response = await fetch(
        `/api/employee/get-all?empId=${empId}
        `,
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
          name: result?.data?.[0]?.name || "",
          email: result?.data?.[0]?.email || "",
          password: result?.data?.[0]?.password || "",
          contact: result?.data?.[0]?.contact || "",
          role: result?.data?.[0]?.role || "",
          annual_leaves: result?.data?.[0]?.annual_leaves || "",
          sick_leaves: result?.data?.[0]?.sick_leaves || "",
          casual_leaves: result?.data?.[0]?.casual_leaves || "",
          job_type: result?.data?.[0]?.job_type || "",
        });
        setJobStatus(
          result?.data?.[0]?.is_current
            ? { label: "Current", value: true }
            : { label: "Left", value: false }
        );
        setPass(result?.data?.[0]?.password || "");
        setSupaId(result?.data?.[0]?.supabase_user_id || "");
      }
    };
    const getLeavesCount = async () => {
      const response = await fetch(
        `/api/leave/get-all?count=${"count"}&userId=${supaId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (response?.status === 200) {
        let annualLeavesUsed = 0;
        let sickLeavesUsed = 0;
        let casualLeavesUsed = 0;

        result?.data?.data?.forEach((leave) => {
          const multiplier =
            leave.leave_type_duration === "Half Day"
              ? 0.5
              : leave.leave_type_duration === "Full Day"
              ? 1
              : 0; // Default to 0 for unrecognized leave_type_duration
          // Calculate the effective leave days
          const effectiveLeaveDays = leave.duration * multiplier;
          if (leave.leave_type === "Annual") {
            annualLeavesUsed += effectiveLeaveDays;
          } else if (leave.leave_type === "Sick") {
            sickLeavesUsed += effectiveLeaveDays;
          } else if (leave.leave_type === "Casual") {
            casualLeavesUsed += effectiveLeaveDays;
          }
        });

        setAnnualUsed(annualLeavesUsed);
        setSickUsed(sickLeavesUsed);
        setCasualUsed(casualLeavesUsed);
      } else {
        console.error("Error fetching leave data:", result?.error);
      }
    };
    if (empId) {
      getSingleEmployeeData();
    }
    if (supaId) {
      getLeavesCount();
    }
  }, [empId, supaId]);

  const handleUpload = async (acceptedFile) => {
    const file = acceptedFile[0];
    const name = `${new Date().toISOString()}-${file.name.split(".")[0]}`;
    const fileExt = file.name.split(".").pop();
    const uniqueFileName = `${name}.${fileExt}`;
    let { error } = await supabase.storage
      .from("cynosoft_employee_images")
      .upload(uniqueFileName, file);
    if (error) {
      console.log(error);
    }
    const { data: url } = await supabase.storage
      .from("cynosoft_employee_images")
      .getPublicUrl(uniqueFileName);
    if (url) {
      toast.success(`Successfully Image Uploaded`, {
        position: "bottom-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
      setValue("pic", url?.publicUrl);
    }
  };

  const onSubmit = async (submitData) => {
    setIsLoading(true);
    const {
      email,
      password,
      name,
      role,
      pic,
      contact,
      annual_leaves,
      sick_leaves,
      casual_leaves,
      job_type,
    } = submitData;
    if (empId) {
      if (pass !== password) {
        const { data, error } = await supabase.auth.updateUser({
          password,
        });

        if (error) {
          setIsLoading(false);
          console.error("Error updating password:", error.message);
          return false;
        }
      }

      const updateBody = {
        name,
        role,
        pic,
        contact,
        annual_leaves,
        sick_leaves,
        casual_leaves,
        is_current: jobStatus.value,
        job_type,
      };

      const response = await fetch(
        `/api/employee/upsert?empId=${empId}&userId=${
          employeeData?.role !== "admin" ? employeeData?.supabase_user_id : null
        }`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateBody),
        }
      );
      const result = await response.json();
      if (response.status === 200) {
        setIsLoading(false);
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
        if (+employeeData?.id === +empId) {
          setEmployeeData({
            ...employeeData,
            name,
            password,
            role,
            contact,
            annual_leaves,
            sick_leaves,
            casual_leaves,
            pic: pic ? pic : employeeData.pic,
            job_type,
          });
        }

        if (employeeData?.role === "admin") {
          setTimeout(() => {
            router.push("/hrms/employee/list");
          }, 500);
        }
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
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (!error) {
        let empData = {
          ...submitData,
          supabase_user_id: data?.user?.id,
        };
        const response = await fetch("/api/employee/upsert", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(empData),
        });
        const result = await response.json();
        if (response.status === 200) {
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
          setIsLoading(false);
          setTimeout(() => {
            router.push("/hrms/employee/list");
          }, 500);
        } else {
          setIsLoading(false);
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
      } else {
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
      }
    }
  };

  return (
    <div className="mainContainer">
      <div className={`${styles.mainForm} mt-4 mb-2 mt-md-0 mb-md-0`}>
        <div className={styles.box}>
          <div className={styles.header}>
            <span style={{ fontSize: "22px", fontWeight: "700" }}>
              Profile Form
            </span>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
            <Row>
              <Col xl={6} lg={6} md={12} sm={12}>
                <div className="d-flex align-items-center">
                  <span className={styles.fieldText}>Employee Name:</span>
                  <div className="mt-2 w-100">
                    <input
                      {...register("name", {
                        required: "Name is required",
                      })}
                      className={`${styles.field} w-100`}
                      type="text"
                    />
                    {errors?.name && (
                      <p className="hrms-field-error">
                        {errors?.name?.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="d-flex align-items-center mt-md-3 mt-1">
                  <span className={styles.fieldText}>Employee Email:</span>
                  <div className="mt-2 w-100">
                    <input
                      {...register("email", {
                        required: "Email is required",
                        pattern: {
                          value:
                            /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                          message: "Invalid email address",
                        },
                      })}
                      className={`${styles.field} w-100`}
                      disabled={empId ? true : false}
                    />
                    {errors?.email && (
                      <p className="hrms-field-error">
                        {errors?.email?.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="d-flex align-items-center mt-md-3 mt-1">
                  <span className={styles.fieldText}>Password:</span>
                  <div className="mt-2 w-100">
                    <input
                      {...register("password", {
                        required: "Password is required",
                        minLength: {
                          value: 6,
                          message: "Password must be at least 6 characters",
                        },
                      })}
                      className={`${styles.field} w-100`}
                      type="password"
                      // disabled={
                      //   empId && +empId === +employeeData?.id ? false : true
                      // }
                    />
                    {errors?.password && (
                      <p className="hrms-field-error">
                        {errors?.password?.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="d-flex align-items-center mt-md-3 mt-1">
                  <span className={styles.fieldText}>Phone No:</span>
                  <div className="mt-2 w-100">
                    <input
                      {...register("contact", {
                        required: "Contact number is required",
                        pattern: {
                          value: /^[0-9]{11}$/,
                          message: "Contact number must be exactly 11 digits",
                        },
                      })}
                      className={`${styles.field} w-100`}
                      type="text"
                    />
                    {errors?.contact && (
                      <p className="hrms-field-error">
                        {errors?.contact?.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="d-flex align-items-center mt-md-3 mt-1">
                  <span className={styles.fieldText}>Role:</span>
                  <div className={`mt-2 w-100`}>
                    <Select
                      {...register("role", { required: "Role is required" })}
                      name="role"
                      className="hrms-fields"
                      placeholder=""
                      value={
                        getValues("role")
                          ? {
                              label: getValues("role"),
                              value: getValues("role"),
                            }
                          : null
                      }
                      onChange={(val) =>
                        setValue("role", val?.value, { shouldValidate: true })
                      }
                      options={[
                        { label: "Admin", value: "admin" },
                        { label: "Employee", value: "employee" },
                      ]}
                      isDisabled={employeeData?.role !== "admin" ? true : false}
                    />
                    {errors?.role && (
                      <p className="hrms-field-error">
                        {errors?.role?.message}
                      </p>
                    )}
                  </div>
                </div>
                {empId && employeeData?.role === "admin" ? (
                  <div className="d-flex align-items-center mt-md-3 mt-1">
                    <span className={styles.fieldText}>Job Status</span>
                    <div className={`mt-2 w-100`}>
                      <Select
                        value={jobStatus}
                        name="role"
                        className="hrms-fields"
                        placeholder=""
                        onChange={(val) => {
                          setJobStatus(val);
                        }}
                        options={[
                          { label: "Current", value: true },
                          { label: "Left", value: false },
                        ]}
                      />
                    </div>
                  </div>
                ) : (
                  <></>
                )}
                <div className="d-flex align-items-center mt-md-3 mt-1">
                  <span className={styles.fieldText}>Job Type:</span>
                  <div className="mt-2 w-100 d-flex">
                    <div className="form-check me-3">
                      <input
                        {...register("job_type")}
                        className="form-check-input"
                        type="radio"
                        value="fullTime"
                        name="job_type"
                        id="fullTime"
                        disabled={employeeData?.role === "admin" ? false : true}
                      />
                      <label className="form-check-label" htmlFor="fullTime">
                        Full Time
                      </label>
                    </div>
                    <div className="form-check">
                      <input
                        {...register("job_type")}
                        className="form-check-input"
                        type="radio"
                        value="partTime"
                        name="job_type"
                        id="partTime"
                        disabled={employeeData?.role === "admin" ? false : true}
                      />
                      <label className="form-check-label" htmlFor="partTime">
                        Part Time
                      </label>
                    </div>

                    {errors?.job_type && (
                      <p className="hrms-field-error">
                        {errors?.job_type?.message}
                      </p>
                    )}
                  </div>
                </div>
              </Col>
              <Col
                xl={6}
                lg={6}
                md={12}
                sm={12}
                // className="d-flex flex-column align-items-center justify-content-center"
              >
                <div className="d-flex align-items-center">
                  <span className={styles.fieldText}>Annual Leaves:</span>
                  <div className="mt-2 w-100">
                    <input
                      {...register("annual_leaves", {
                        required: "Annual leaves are required",
                      })}
                      className={`${styles.field} w-100`}
                      type="number"
                      disabled={employeeData?.role !== "admin" ? true : false}
                    />
                    {errors?.annual_leaves && (
                      <p className="hrms-field-error">
                        {errors?.annual_leaves?.message}
                      </p>
                    )}
                  </div>
                </div>
                {empId && employeeData?.role === "admin" ? (
                  <div className="d-flex align-items-center mt-md-3 mt-1">
                    <span className={styles.fieldText}>
                      Used Annual Leaves:
                    </span>
                    <div className="mt-2 w-100">
                      <input
                        value={annualUsed}
                        className={`${styles.field} w-100`}
                        type="number"
                        disabled={true}
                      />
                    </div>
                  </div>
                ) : (
                  ""
                )}
                <div className="d-flex align-items-center mt-md-3 mt-1">
                  <span className={styles.fieldText}>Sick Leaves:</span>
                  <div className="mt-2 w-100">
                    <input
                      {...register("sick_leaves", {
                        required: "Sick leaves are required",
                      })}
                      className={`${styles.field} w-100`}
                      type="number"
                      disabled={employeeData?.role !== "admin" ? true : false}
                    />
                    {errors?.sick_leaves && (
                      <p className="hrms-field-error">
                        {errors?.sick_leaves?.message}
                      </p>
                    )}
                  </div>
                </div>
                {empId && employeeData?.role === "admin" ? (
                  <div className="d-flex align-items-center mt-md-3 mt-1">
                    <span className={styles.fieldText}>Used Sick Leaves:</span>
                    <div className="mt-2 w-100">
                      <input
                        value={sickUsed}
                        className={`${styles.field} w-100`}
                        type="number"
                        disabled={true}
                      />
                    </div>
                  </div>
                ) : (
                  ""
                )}
                <div className="d-flex align-items-center mt-md-3 mt-1">
                  <span className={styles.fieldText}>Casual Leaves:</span>
                  <div className="mt-2 w-100">
                    <input
                      {...register("casual_leaves", {
                        required: "Casual leaves required",
                      })}
                      className={`${styles.field} w-100`}
                      type="number"
                      disabled={employeeData?.role !== "admin" ? true : false}
                    />
                    {errors?.casual_leaves && (
                      <p className="hrms-field-error">
                        {errors?.casual_leaves?.message}
                      </p>
                    )}
                  </div>
                </div>
                {empId && employeeData?.role === "admin" ? (
                  <div className="d-flex align-items-center mt-md-3 mt-1">
                    <span className={styles.fieldText}>
                      Used Casual Leaves:
                    </span>
                    <div className="mt-2 w-100">
                      <input
                        className={`${styles.field} w-100`}
                        type="number"
                        value={casualUsed}
                        disabled={true}
                      />
                    </div>
                  </div>
                ) : (
                  ""
                )}

                <div className="d-flex align-items-center mt-md-3 mt-1">
                  <span className={`${styles.fieldText}`}>Image Upload:</span>
                  <Dropzone
                    onDrop={handleUpload}
                    accept="image/*"
                    minSize={1024}
                    maxSize={3072000}
                  >
                    {({
                      getRootProps,
                      getInputProps,
                      isDragActive,
                      isDragAccept,
                      isDragReject,
                    }) => {
                      const additionalClass = isDragAccept
                        ? "accept"
                        : isDragReject
                        ? "reject"
                        : "";

                      return (
                        <div
                          {...getRootProps({
                            className: `dropzone ${additionalClass}`,
                          })}
                        >
                          <input {...getInputProps()} />
                          <p>Drag'n'drop images, or click to select files</p>
                        </div>
                      );
                    }}
                  </Dropzone>
                </div>
                <div className="d-flex justify-content-end">
                  <div className="w-25 mt-2">
                    <Button
                      className={`w-100 hrms-button`}
                      variant="primary"
                      size="md"
                      type="submit"
                      disabled={isLoading}
                    >
                      {isLoading ? <ButtonLoader /> : "Submit"}
                    </Button>
                  </div>
                </div>
              </Col>
            </Row>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EmployeeCreateComponent;
