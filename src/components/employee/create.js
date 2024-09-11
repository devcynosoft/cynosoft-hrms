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
  } = useForm();
  const router = useRouter();
  const { employeeData, setEmployeeData } = useEmployee();
  const [jobStatus, setJobStatus] = useState(null);
  const [pass, setPass] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const getSingleEmployeeData = async () => {
      try {
        let query = supabase.from("employees").select("*").eq("id", empId);
        if (employeeData?.role !== "admin") {
          query = query.eq("supabase_user_id", employeeData?.supabase_user_id);
        }
        const { data, error } = await query;

        if (error) {
          console.error("Error fetching leave data:", error);
        }
        reset({
          name: data?.[0]?.name || "",
          email: data?.[0]?.email || "",
          password: data?.[0]?.password || "",
          contact: data?.[0]?.contact || "",
          role: data?.[0]?.role || "",
          annual_leaves: data?.[0]?.annual_leaves || "",
          sick_leaves: data?.[0]?.sick_leaves || "",
          casual_leaves: data?.[0]?.casual_leaves || "",
        });
        setJobStatus(
          data?.[0]?.is_current
            ? { label: "Current", value: true }
            : { label: "Left", value: false }
        );
        setPass(data?.[0]?.password || "");
      } catch (error) {}
    };
    if (empId || employeeData) {
      getSingleEmployeeData();
    }
  }, [empId, employeeData]);

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

      let query = supabase
        .from("employees")
        .update({
          name,
          role,
          pic,
          contact,
          annual_leaves,
          sick_leaves,
          casual_leaves,
          is_current: jobStatus.value,
        })
        .eq("id", empId);
      if (employeeData?.role !== "admin") {
        query = query.eq("supabase_user_id", employeeData?.supabase_user_id);
      }
      const { data: updateData, error: updateError } = await query;
      if (updateError) {
        setIsLoading(false);
        console.log(updateError, "updateError");
      }
      toast.success(`Successfully Employee updated`, {
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
        });
      }

      setIsLoading(false);
      if (employeeData?.role === "admin") {
        setTimeout(() => {
          router.push("/hrms/employee/list");
        }, 500);
      }
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) {
        setIsLoading(false);
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
        return;
      }
      const { data: employeeData, error: employeeError } = await supabase
        .from("employees")
        .insert([
          {
            supabase_user_id: data?.user?.id,
            email,
            password,
            name,
            role,
            contact,
            pic,
            annual_leaves,
            sick_leaves,
            casual_leaves,
          },
        ]);
      if (employeeError) {
        setIsLoading(false);
        toast.error(employeeError.message, {
          position: "bottom-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "colored",
        });
        return;
      } else {
        toast.success("Successfully Added Employee", {
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
