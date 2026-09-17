"use client";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Select from "react-select";
import { toast } from "react-toastify";
import { supabase } from "@/utils/supabaseClient";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useEmployee } from "@/context/EmployeeContext";
import ButtonLoader from "../ButtonLoader.jsx";
import NameBadge from "../NameBadge.jsx";
import moment from "moment";
import {
  SkeletonBone,
  SkeletonLine,
  TableSkeletonRows,
} from "../skeletons";
import styles from "./employee.module.css";

const ROLE_OPTIONS = [
  { label: "Admin", value: "admin" },
  { label: "Employee", value: "employee" },
];

const JOB_STATUS_OPTIONS = [
  { label: "Current", value: true },
  { label: "Left", value: false },
];

const selectStyles = {
  control: (base) => ({
    ...base,
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

const leaveDotClass = (type) => {
  if (type === "Sick") return styles.dotSick;
  if (type === "Casual") return styles.dotCasual;
  return styles.dotAnnual;
};

const EmployeeCreateComponent = ({ empId }) => {
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
      job_type: "fullTime",
      name: "",
      email: "",
      password: "",
      contact: "",
      role: "employee",
      annual_leaves: "",
      sick_leaves: "",
      casual_leaves: "",
      pic: "",
    },
  });

  const router = useRouter();
  const fileInputRef = useRef(null);
  const { employeeData, setEmployeeData } = useEmployee();

  const [jobStatus, setJobStatus] = useState({
    label: "Current",
    value: true,
  });
  const [pass, setPass] = useState("");
  const [supaId, setSupaId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [annualUsed, setAnnualUsed] = useState(0);
  const [sickUsed, setSickUsed] = useState(0);
  const [casualUsed, setCasualUsed] = useState(0);
  const [balancesLoading, setBalancesLoading] = useState(Boolean(empId));
  const [historyLoading, setHistoryLoading] = useState(Boolean(empId));
  const [createdAt, setCreatedAt] = useState(null);
  const [loadedSnapshot, setLoadedSnapshot] = useState(null);
  const [loadedJobStatus, setLoadedJobStatus] = useState(null);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdForm, setPwdForm] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [pwdError, setPwdError] = useState("");

  const isAdmin = employeeData?.role === "admin";
  const isEdit = Boolean(empId);

  console.log("isAdmin", isAdmin);

  const watchedName = watch("name");
  const watchedRole = watch("role");
  const watchedJobType = watch("job_type");
  const watchedPic = watch("pic");
  const watchedContact = watch("contact");
  const watchedAnnual = Number(watch("annual_leaves")) || 0;
  const watchedSick = Number(watch("sick_leaves")) || 0;
  const watchedCasual = Number(watch("casual_leaves")) || 0;

  useEffect(() => {
    const getSingleEmployeeData = async () => {
      const response = await fetch(`/api/employee/get-all?empId=${empId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const result = await response.json();
      if (response?.status === 200) {
        const emp = result?.data?.[0];
        const snapshot = {
          name: emp?.name || "",
          email: emp?.email || "",
          password: emp?.password || "",
          contact: emp?.contact || "",
          role: emp?.role || "",
          annual_leaves: emp?.annual_leaves ?? "",
          sick_leaves: emp?.sick_leaves ?? "",
          casual_leaves: emp?.casual_leaves ?? "",
          job_type: emp?.job_type || "fullTime",
          pic: emp?.pic || "",
        };
        reset(snapshot);
        setLoadedSnapshot(snapshot);
        const statusOpt = emp?.is_current
          ? { label: "Current", value: true }
          : { label: "Left", value: false };
        setJobStatus(statusOpt);
        setLoadedJobStatus(statusOpt);
        setPass(emp?.password || "");
        setSupaId(emp?.supabase_user_id || "");
        setCreatedAt(emp?.created_at || null);
      }
    };

    const getLeavesCount = async () => {
      setBalancesLoading(true);
      try {
        const response = await fetch(
          `/api/leave/get-all?count=${"count"}&userId=${supaId}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          }
        );
        const result = await response.json();

        if (response?.status === 200) {
          let annualLeavesUsed = 0;
          let sickLeavesUsed = 0;
          let casualLeavesUsed = 0;

          const today = new Date();
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

          result?.data?.data?.forEach((leave) => {
            const leaveStart = new Date(leave.start_date);
            const leaveEnd = new Date(leave.end_date);
            const overlapsFiscalYear =
              leaveStart <= fiscalYearEnd && leaveEnd >= fiscalYearStart;

            if (overlapsFiscalYear) {
              const multiplier =
                leave.leave_type_duration === "Half Day"
                  ? 0.5
                  : leave.leave_type_duration === "Full Day"
                    ? 1
                    : 0;
              const effectiveLeaveDays = leave.duration * multiplier;

              if (leave.leave_type === "Annual") {
                annualLeavesUsed += effectiveLeaveDays;
              } else if (leave.leave_type === "Sick") {
                sickLeavesUsed += effectiveLeaveDays;
              } else if (leave.leave_type === "Casual") {
                casualLeavesUsed += effectiveLeaveDays;
              }
            }
          });

          setAnnualUsed(annualLeavesUsed);
          setSickUsed(sickLeavesUsed);
          setCasualUsed(casualLeavesUsed);
        } else {
          console.error("Error fetching leave data:", result?.error);
        }
      } finally {
        setBalancesLoading(false);
      }
    };

    const getLeaveHistory = async () => {
      setHistoryLoading(true);
      try {
        const response = await fetch(
          `/api/leave/get-all?userId=${supaId}&start=0&end=4`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          }
        );
        const result = await response.json();
        if (response?.status === 200) {
          setLeaveHistory(result?.data?.data || []);
        }
      } finally {
        setHistoryLoading(false);
      }
    };

    if (empId) {
      getSingleEmployeeData();
    }
    if (supaId) {
      getLeavesCount();
      getLeaveHistory();
    } else if (!empId) {
      setBalancesLoading(false);
      setHistoryLoading(false);
    }
  }, [empId, supaId, reset]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPic(true);
    const name = `${new Date().toISOString()}-${file.name.split(".")[0]}`;
    const fileExt = file.name.split(".").pop();
    const uniqueFileName = `${name}.${fileExt}`;
    let { error } = await supabase.storage
      .from("cynosoft_employee_images")
      .upload(uniqueFileName, file);
    if (error) {
      console.log(error);
      setUploadingPic(false);
      toast.error("Image upload failed", {
        position: "bottom-right",
        autoClose: 5000,
        theme: "colored",
      });
      return;
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
      setValue("pic", url?.publicUrl, { shouldDirty: true });
    }
    setUploadingPic(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDiscard = () => {
    if (isEdit && loadedSnapshot) {
      reset(loadedSnapshot);
      if (loadedJobStatus) setJobStatus(loadedJobStatus);
      return;
    }
    reset({
      job_type: "fullTime",
      name: "",
      email: "",
      password: "",
      contact: "",
      role: "employee",
      annual_leaves: "",
      sick_leaves: "",
      casual_leaves: "",
      pic: "",
    });
    setJobStatus({ label: "Current", value: true });
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
      if (pass !== password && password) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
          setIsLoading(false);
          toast.error(error.message || "Password update failed", {
            position: "bottom-right",
            autoClose: 5000,
            theme: "colored",
          });
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
        is_current: jobStatus?.value,
        job_type,
      };

      const response = await fetch(
        `/api/employee/upsert?empId=${empId}&userId=${employeeData?.role !== "admin" ? employeeData?.supabase_user_id : null
        }`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
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
            password: password || employeeData.password,
            role,
            contact,
            annual_leaves,
            sick_leaves,
            casual_leaves,
            pic: pic ? pic : employeeData.pic,
            job_type,
          });
        }
        setLoadedSnapshot({
          name,
          email: getValues("email"),
          password: password || pass,
          contact,
          role,
          annual_leaves,
          sick_leaves,
          casual_leaves,
          job_type,
          pic: pic || "",
        });
        setLoadedJobStatus(jobStatus);
        setPass(password || pass);

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
          headers: { "Content-Type": "application/json" },
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
        setIsLoading(false);
      }
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwdError("");
    if (!pwdForm.next || pwdForm.next.length < 6) {
      setPwdError("Password must be at least 6 characters");
      return;
    }
    if (pwdForm.next !== pwdForm.confirm) {
      setPwdError("New passwords do not match");
      return;
    }
    setPwdLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: pwdForm.next,
    });
    if (error) {
      setPwdLoading(false);
      setPwdError(error.message || "Failed to update password");
      return;
    }
    setValue("password", pwdForm.next, { shouldDirty: true });
    setPass(pwdForm.next);
    setPwdLoading(false);
    setPasswordModalOpen(false);
    setPwdForm({ current: "", next: "", confirm: "" });
    toast.success("Password updated securely.", {
      position: "bottom-right",
      autoClose: 3500,
      theme: "colored",
    });
  };

  const formatLeaveDates = (leave) => {
    const start = leave?.start_date
      ? moment(leave.start_date).format("MMM DD, YYYY")
      : "";
    const end = leave?.end_date
      ? moment(leave.end_date).format("MMM DD, YYYY")
      : "";
    if (!start) return "—";
    if (!end || start === end) return start;
    return `${start} - ${end}`;
  };

  const formatDuration = (leave) => {
    const days = leave?.duration ?? 0;
    const half = leave?.leave_type_duration === "Half Day";
    if (half) return `${days} (Half Day)`;
    return `${days} Day${days === 1 ? "" : "s"}`;
  };

  const balanceAvailable = (total, used) =>
    Math.max(0, Number(total) - Number(used));

  const balancePercent = (total, used) => {
    const t = Number(total);
    if (!t || t <= 0) return 0;
    return Math.min(100, Math.round((Number(used) / t) * 100));
  };

  const jobTypeLabel =
    watchedJobType === "partTime" ? "Part Time" : "Full Time";
  const statusLabel = jobStatus?.value ? "Current" : "Left";
  const displayName = watchedName || (isEdit ? "Employee" : "New Employee");

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.eyebrow}>
            <span className={styles.eyebrowAccent}>Account Settings</span>
            <span className={styles.eyebrowDot}>•</span>
            <span className={styles.eyebrowMuted}>
              {isEdit ? "Employee Directory" : "Add Employee"}
            </span>
          </div>
          <h1 className={styles.title}>
            {isEdit ? "Employee Profile" : "Add New Employee"}
          </h1>
          <p className={styles.subtitle}>
            {isEdit
              ? "View and update personal credentials, employment records, and leave entitlements."
              : "Create a new employee account with role, job type, and leave entitlements."}
          </p>
        </div>
        {
          isAdmin ? (
            <div className={styles.headerActions}>
              <button
                type="button"
                className={styles.btnGhost}
                onClick={handleDiscard}
                disabled={isLoading}
              >
                Discard
              </button>
              <button
                type="submit"
                form="employeeProfileForm"
                className={styles.btnPrimary}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ButtonLoader />
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      save
                    </span>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          ) : <></>
        }
      </div>

      <div className={styles.grid}>
        <div
          className={`${styles.card} ${styles.cardClip} ${styles.cardPad} ${styles.colFull}`}
        >
          <div className={styles.heroBlurA} />
          <div className={styles.heroBlurB} />
          <div className={styles.heroInner}>
            <div className={styles.heroIdentity}>
              <div className={styles.avatarWrap}>
                <div className={styles.avatar}>
                  {watchedPic ? (
                    <Image
                      src={watchedPic}
                      alt={displayName}
                      width={112}
                      height={112}
                      className={styles.avatarImg}
                      unoptimized
                    />
                  ) : watchedName ? (
                    <NameBadge
                      name={watchedName}
                      fontSize={28}
                      height={112}
                      width={112}
                    />
                  ) : (
                    <div className={styles.avatarFallback}>
                      <span className="material-symbols-outlined">person</span>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUpload}
                  className={styles.hiddenInput}
                />
                <button
                  type="button"
                  className={styles.cameraBtn}
                  aria-label="Upload profile image"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPic}
                >
                  {uploadingPic ? (
                    <ButtonLoader />
                  ) : (
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 18 }}
                    >
                      photo_camera
                    </span>
                  )}
                </button>
              </div>

              <div className={styles.heroMeta}>
                <div className={styles.heroNameRow}>
                  <h2 className={styles.heroName}>{displayName}</h2>
                  <span className={styles.jobBadge}>
                    <span className={styles.jobBadgeDot} />
                    {jobTypeLabel}
                    {isEdit ? ` • ${statusLabel}` : ""}
                  </span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaItem}>
                    <span className="material-symbols-outlined">badge</span>
                    {watchedRole
                      ? watchedRole.charAt(0).toUpperCase() +
                      watchedRole.slice(1)
                      : "—"}
                  </span>
                  {/* {isEdit && empId ? (
                    <span className={styles.metaItem}>
                      <span className="material-symbols-outlined">tag</span>
                      ID {empId}
                    </span>
                  ) : null} */}
                  {watchedContact ? (
                    <span className={styles.metaItem}>
                      <span className="material-symbols-outlined">call</span>
                      {watchedContact}
                    </span>
                  ) : null}
                </div>
                {createdAt ? (
                  <div className={styles.joinedRow}>
                    <span className={styles.metaItem}>
                      <span className="material-symbols-outlined">
                        calendar_month
                      </span>
                      Joined {moment(createdAt).format("MMM YYYY")}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            {isEdit ? (
              <div className={styles.heroStatus}>
                <span className={styles.statusLabel}>Employment Status</span>
                <div className={styles.statusPill}>
                  <span
                    className={
                      jobStatus?.value
                        ? styles.statusDot
                        : styles.statusDotMuted
                    }
                  />
                  {statusLabel}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className={styles.colMain}>
          <div className={`${styles.card} ${styles.cardPad}`}>
            <div className={styles.cardHeaderBar}>
              <div className={styles.cardTitleRow}>
                <span className={`material-symbols-outlined ${styles.cardIcon}`}>
                  badge
                </span>
                <h3 className={styles.cardTitle}>Personal & Contact Details</h3>
              </div>
              <span className={`${styles.badge} ${styles.badgeSecondary}`}>
                Editable by User
              </span>
            </div>

            <form
              id="employeeProfileForm"
              className={styles.form}
              onSubmit={handleSubmit(onSubmit)}
            >
              <div className={styles.fieldsGrid}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="fullName">
                    Employee Name
                  </label>
                  <div className={styles.inputWrap}>
                    <span
                      className={`material-symbols-outlined ${styles.inputIcon}`}
                    >
                      person
                    </span>
                    <input
                      id="fullName"
                      {...register("name", { required: "Name is required" })}
                      className={`${styles.input} ${styles.inputWithIcon}`}
                      type="text"
                    />
                  </div>
                  <span className={styles.helper}>
                    Legal name as stated on corporate contract.
                  </span>
                  {errors?.name && (
                    <p className={styles.error}>{errors.name.message}</p>
                  )}
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="workEmail">
                    Employee Email
                  </label>
                  <div className={styles.inputWrap}>
                    <span
                      className={`material-symbols-outlined ${styles.inputIcon}`}
                    >
                      mail
                    </span>
                    <input
                      id="workEmail"
                      {...register("email", {
                        required: "Email is required",
                        pattern: {
                          value:
                            /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                          message: "Invalid email address",
                        },
                      })}
                      className={`${styles.input} ${styles.inputWithIcon}`}
                      type="email"
                      disabled={Boolean(empId)}
                    />
                  </div>
                  <span className={styles.helper}>
                    Used for all official Cynosoft notifications.
                  </span>
                  {errors?.email && (
                    <p className={styles.error}>{errors.email.message}</p>
                  )}
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="phoneNumber">
                    Phone Number
                  </label>
                  <div className={styles.inputWrap}>
                    <span
                      className={`material-symbols-outlined ${styles.inputIcon}`}
                    >
                      call
                    </span>
                    <input
                      id="phoneNumber"
                      {...register("contact", {
                        required: "Contact number is required",
                        pattern: {
                          value: /^[0-9]{11}$/,
                          message: "Contact number must be exactly 11 digits",
                        },
                      })}
                      className={`${styles.input} ${styles.inputWithIcon}`}
                      type="text"
                    />
                  </div>
                  <span className={styles.helper}>
                    Mobile number for urgent HR broadcasts and SMS alerts.
                  </span>
                  {errors?.contact && (
                    <p className={styles.error}>{errors.contact.message}</p>
                  )}
                </div>

                <div className={styles.field}>
                  <div className={styles.fieldHeader}>
                    <label className={styles.label} htmlFor="passwordField">
                      Password & Security
                    </label>
                    {isEdit ? (
                      <button
                        type="button"
                        className={styles.btnLink}
                        onClick={() => {
                          setPwdError("");
                          setPwdForm({ current: "", next: "", confirm: "" });
                          setPasswordModalOpen(true);
                        }}
                      >
                        Change Password
                      </button>
                    ) : null}
                  </div>
                  {isEdit ? (
                    <>
                      <div className={styles.inputWrap}>
                        <span
                          className={`material-symbols-outlined ${styles.inputIcon}`}
                        >
                          lock
                        </span>
                        <input
                          id="passwordField"
                          className={`${styles.input} ${styles.inputWithIcon} ${styles.inputReadonly}`}
                          type="password"
                          value="••••••••••••"
                          readOnly
                          tabIndex={-1}
                        />
                      </div>
                      <input
                        type="hidden"
                        {...register("password", {
                          minLength: {
                            value: 6,
                            message: "Password must be at least 6 characters",
                          },
                        })}
                      />
                      <span className={styles.helper}>
                        Use Change Password to renew credentials securely.
                      </span>
                    </>
                  ) : (
                    <>
                      <div className={styles.inputWrap}>
                        <span
                          className={`material-symbols-outlined ${styles.inputIcon}`}
                        >
                          lock
                        </span>
                        <input
                          id="passwordField"
                          {...register("password", {
                            required: "Password is required",
                            minLength: {
                              value: 6,
                              message: "Password must be at least 6 characters",
                            },
                          })}
                          className={`${styles.input} ${styles.inputWithIcon}`}
                          type="password"
                          autoComplete="new-password"
                        />
                      </div>
                      <span className={styles.helper}>
                        Minimum 6 characters. Shared with the new account login.
                      </span>
                      {errors?.password && (
                        <p className={styles.error}>{errors.password.message}</p>
                      )}
                    </>
                  )}
                </div>
              </div>
              {
                !isAdmin ? (
                  <div className={styles.formFooter}>
                    <div className={styles.footerActions}>
                      <button
                        type="button"
                        className={styles.btnText}
                        onClick={handleDiscard}
                        disabled={isLoading}
                      >
                        Discard Changes
                      </button>
                      <button
                        type="submit"
                        className={styles.btnSecondary}
                        disabled={isLoading}
                      >
                        {isLoading ? <ButtonLoader /> : "Save & Update"}
                      </button>
                    </div>
                  </div>
                ) : <></>
              }
            </form>
          </div>

          {isEdit ? (
            <div className={`${styles.card} ${styles.cardPad}`}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitleRow}>
                  <span
                    className={`material-symbols-outlined ${styles.cardIcon}`}
                    style={{ fontSize: 20 }}
                  >
                    calendar_month
                  </span>
                  <h4 className={styles.cardTitle}>Recent Leave Log History</h4>
                </div>
                <Link
                  href="/hrms/employee/leave/list"
                  className={styles.viewAllLink}
                >
                  View All Leaves →
                </Link>
              </div>
              <div className={styles.tableWrap}>
                {historyLoading ? (
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Leave Type</th>
                        <th>Duration</th>
                        <th>Dates</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      <TableSkeletonRows
                        rows={3}
                        columns={[
                          { type: "badge" },
                          { type: "text", width: "45%" },
                          { type: "text", width: "60%" },
                          { type: "badge" },
                          { type: "actions", count: 1 },
                        ]}
                      />
                    </tbody>
                  </table>
                ) : leaveHistory.length === 0 ? (
                  <div className={styles.emptyTable}>No leave records yet.</div>
                ) : (
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Leave Type</th>
                        <th>Duration</th>
                        <th>Dates</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaveHistory.map((leave) => (
                        <tr key={leave.id}>
                          <td>
                            <span className={styles.typeCell}>
                              <span
                                className={leaveDotClass(leave.leave_type)}
                              />
                              {leave.leave_type
                                ? `${leave.leave_type} Leave`
                                : "Leave"}
                            </span>
                          </td>
                          <td className={styles.mutedCell}>
                            {formatDuration(leave)}
                          </td>
                          <td>{formatLeaveDates(leave)}</td>
                          <td>
                            <span
                              className={`${styles.badge} ${styles.badgeTertiary}`}
                            >
                              {leave.approval_status || "—"}
                            </span>
                          </td>
                          <td className={styles.actionCell}>
                            <Link
                              href={`/hrms/employee/leave/edit/${leave.id}`}
                              className={styles.viewBtn}
                              aria-label="View leave details"
                            >
                              <span className="material-symbols-outlined">
                                visibility
                              </span>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className={styles.colSide}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitleRow}>
                <span
                  className={`material-symbols-outlined ${styles.cardIcon}`}
                  style={{ fontSize: 20 }}
                >
                  corporate_fare
                </span>
                <h3 className={styles.cardTitle}>Employment Policy</h3>
              </div>
              <span className={`${styles.badge} ${styles.badgeMuted}`}>
                {isAdmin ? "HR Editable" : "HR Locked"}
              </span>
            </div>

            <div className={styles.roleCard}>
              <span className={styles.roleCardLabel}>Assigned Role</span>
              {isAdmin ? (
                <div className={styles.select}>
                  <Select
                    {...register("role", { required: "Role is required" })}
                    name="role"
                    classNamePrefix="hrms-select"
                    placeholder="Select role"
                    value={
                      getValues("role")
                        ? {
                            label:
                              getValues("role") === "admin"
                                ? "Admin"
                                : "Employee",
                            value: getValues("role"),
                          }
                        : null
                    }
                    onChange={(val) =>
                      setValue("role", val?.value, { shouldValidate: true })
                    }
                    options={ROLE_OPTIONS}
                    styles={selectStyles}
                    isDisabled={!isAdmin}
                    menuPortalTarget={
                      typeof document !== "undefined" ? document.body : null
                    }
                    menuPosition="fixed"
                  />
                </div>
              ) : (
                <div className={styles.roleDisplay}>
                  <div className={styles.roleDisplayLeft}>
                    <span className={styles.roleIcon}>
                      <span className="material-symbols-outlined">
                        engineering
                      </span>
                    </span>
                    <div>
                      <span className={styles.roleName}>
                        {watchedRole
                          ? watchedRole.charAt(0).toUpperCase() +
                          watchedRole.slice(1)
                          : "Employee"}
                      </span>
                      <span className={styles.roleHint}>
                        Assigned by HR administration
                      </span>
                    </div>
                  </div>
                  <span className={`material-symbols-outlined ${styles.lockIcon}`}>
                    lock
                  </span>
                </div>
              )}
              {errors?.role && (
                <p className={styles.error}>{errors.role.message}</p>
              )}
            </div>

            <div className={styles.field} style={{ marginTop: "1rem" }}>
              <label className={styles.label}>Job Engagement Type</label>
              <div className={styles.jobTypeGrid}>
                <label
                  className={`${styles.jobTypeOption} ${watchedJobType === "fullTime"
                    ? styles.jobTypeOptionActive
                    : ""
                    } ${!isAdmin ? styles.jobTypeOptionDisabled : ""}`}
                >
                  <input
                    {...register("job_type")}
                    type="radio"
                    value="fullTime"
                    disabled={!isAdmin}
                  />
                  <span>
                    <span className={styles.jobTypeTitle}>Full Time</span>
                    <span className={styles.jobTypeHint}>9 hrs / day</span>
                  </span>
                </label>
                <label
                  className={`${styles.jobTypeOption} ${watchedJobType === "partTime"
                    ? styles.jobTypeOptionActive
                    : ""
                    } ${!isAdmin ? styles.jobTypeOptionDisabled : ""}`}
                >
                  <input
                    {...register("job_type")}
                    type="radio"
                    value="partTime"
                    disabled={!isAdmin}
                  />
                  <span>
                    <span className={styles.jobTypeTitle}>Part Time</span>
                    <span className={styles.jobTypeHint}>4 hrs / day</span>
                  </span>
                </label>
              </div>
              {errors?.job_type && (
                <p className={styles.error}>{errors.job_type.message}</p>
              )}
            </div>

            {isEdit && isAdmin ? (
              <div className={`${styles.field} ${styles.jobStatusField}`}>
                <label className={styles.label}>Job Status</label>
                <div className={styles.select}>
                  <Select
                    value={jobStatus}
                    name="jobStatus"
                    classNamePrefix="hrms-select"
                    placeholder="Status"
                    onChange={(val) => setJobStatus(val)}
                    options={JOB_STATUS_OPTIONS}
                    styles={selectStyles}
                    menuPortalTarget={
                      typeof document !== "undefined" ? document.body : null
                    }
                    menuPosition="fixed"
                  />
                </div>
              </div>
            ) : null}
          </div>

          {isEdit ? (
            <>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitleRow}>
                    <span
                      className={`material-symbols-outlined ${styles.cardIcon}`}
                      style={{ fontSize: 20 }}
                    >
                      donut_large
                    </span>
                    <h3 className={styles.cardTitle}>Leave Balances</h3>
                  </div>
                  <span className={`${styles.badge} ${styles.badgeSecondary}`}>
                    Fiscal Cycle
                  </span>
                </div>

                <div className={styles.balanceList}>
                  {balancesLoading ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={`bal-skel-${i}`} className={styles.balanceCard}>
                          <SkeletonLine width="40%" size="sm" />
                          <SkeletonLine width="55%" size="lg" />
                          <SkeletonBone style={{ height: "0.375rem", width: "100%", marginTop: "0.5rem" }} />
                          <SkeletonLine width="65%" size="sm" />
                        </div>
                      ))}
                    </div>
                  ) : (
                  <>
                  <div className={styles.balanceCard}>
                    <div className={styles.balanceHeader}>
                      <div className={styles.balanceLabel}>
                        <span className={styles.dotAnnual} />
                        Annual Leaves
                      </div>
                      <span className={styles.balanceValue}>
                        {balanceAvailable(watchedAnnual, annualUsed)
                          .toString()
                          .padStart(2, "0")}{" "}
                        <span className={styles.balanceTotal}>
                          / {watchedAnnual || 0} Days
                        </span>
                      </span>
                    </div>
                    <div className={styles.progressTrack}>
                      <div
                        className={styles.progressFill}
                        style={{
                          width: `${balancePercent(watchedAnnual, annualUsed)}%`,
                        }}
                      />
                    </div>
                    <span className={styles.balanceMeta}>
                      {annualUsed} days utilized •{" "}
                      {balanceAvailable(watchedAnnual, annualUsed)} available
                    </span>
                    {isAdmin ? (
                      <input
                        {...register("annual_leaves", {
                          required: "Annual leaves are required",
                        })}
                        className={styles.entitleInput}
                        type="number"
                        min="0"
                        title="Edit annual entitlement"
                      />
                    ) : (
                      <input
                        type="hidden"
                        {...register("annual_leaves", {
                          required: "Annual leaves are required",
                        })}
                      />
                    )}
                    {errors?.annual_leaves && (
                      <p className={styles.error}>
                        {errors.annual_leaves.message}
                      </p>
                    )}
                  </div>

                  <div className={styles.balanceCard}>
                    <div className={styles.balanceHeader}>
                      <div className={styles.balanceLabel}>
                        <span className={styles.dotSick} />
                        Sick Leaves
                      </div>
                      <span
                        className={`${styles.balanceValue} ${styles.balanceValueSick}`}
                      >
                        {balanceAvailable(watchedSick, sickUsed)
                          .toString()
                          .padStart(2, "0")}{" "}
                        <span className={styles.balanceTotal}>
                          / {watchedSick || 0} Days
                        </span>
                      </span>
                    </div>
                    <div className={styles.progressTrack}>
                      <div
                        className={`${styles.progressFill} ${styles.progressFillSick}`}
                        style={{
                          width: `${balancePercent(watchedSick, sickUsed)}%`,
                        }}
                      />
                    </div>
                    <span className={styles.balanceMeta}>
                      {sickUsed} days utilized •{" "}
                      {balanceAvailable(watchedSick, sickUsed)} available
                    </span>
                    {isAdmin ? (
                      <input
                        {...register("sick_leaves", {
                          required: "Sick leaves are required",
                        })}
                        className={styles.entitleInput}
                        type="number"
                        min="0"
                        title="Edit sick entitlement"
                      />
                    ) : (
                      <input
                        type="hidden"
                        {...register("sick_leaves", {
                          required: "Sick leaves are required",
                        })}
                      />
                    )}
                    {errors?.sick_leaves && (
                      <p className={styles.error}>
                        {errors.sick_leaves.message}
                      </p>
                    )}
                  </div>

                  <div className={styles.balanceCard}>
                    <div className={styles.balanceHeader}>
                      <div className={styles.balanceLabel}>
                        <span className={styles.dotCasual} />
                        Casual Leaves
                      </div>
                      <span
                        className={`${styles.balanceValue} ${styles.balanceValueCasual}`}
                      >
                        {balanceAvailable(watchedCasual, casualUsed)
                          .toString()
                          .padStart(2, "0")}{" "}
                        <span className={styles.balanceTotal}>
                          / {watchedCasual || 0} Days
                        </span>
                      </span>
                    </div>
                    <div className={styles.progressTrack}>
                      <div
                        className={`${styles.progressFill} ${styles.progressFillCasual}`}
                        style={{
                          width: `${balancePercent(
                            watchedCasual,
                            casualUsed
                          )}%`,
                        }}
                      />
                    </div>
                    <span className={styles.balanceMeta}>
                      {casualUsed} days utilized •{" "}
                      {balanceAvailable(watchedCasual, casualUsed)} available
                    </span>
                    {isAdmin ? (
                      <input
                        {...register("casual_leaves", {
                          required: "Casual leaves required",
                        })}
                        className={styles.entitleInput}
                        type="number"
                        min="0"
                        title="Edit casual entitlement"
                      />
                    ) : (
                      <input
                        type="hidden"
                        {...register("casual_leaves", {
                          required: "Casual leaves required",
                        })}
                      />
                    )}
                    {errors?.casual_leaves && (
                      <p className={styles.error}>
                        {errors.casual_leaves.message}
                      </p>
                    )}
                  </div>
                  </>
                  )}
                </div>

                <Link
                  href="/hrms/employee/leave/create"
                  className={styles.requestLeaveBtn}
                >
                  <span className="material-symbols-outlined">add_task</span>
                  Request New Leave
                </Link>
              </div>

              <div className={styles.infoCallout}>
                <span className="material-symbols-outlined">info</span>
                <div>
                  Leave entitlements follow the Cynosoft fiscal cycle (July 1 –
                  June 30). For discrepancies, contact your HR business partner.
                </div>
              </div>
            </>
          ) : (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitleRow}>
                  <span
                    className={`material-symbols-outlined ${styles.cardIcon}`}
                    style={{ fontSize: 20 }}
                  >
                    donut_large
                  </span>
                  <h3 className={styles.cardTitle}>Leave Entitlements</h3>
                </div>
              </div>
              <div className={styles.fieldsGrid} style={{ gridTemplateColumns: "1fr" }}>
                <div className={styles.field}>
                  <label className={styles.label}>Annual Leaves</label>
                  <input
                    {...register("annual_leaves", {
                      required: "Annual leaves are required",
                    })}
                    className={styles.input}
                    type="number"
                    min="0"
                    disabled={!isAdmin}
                  />
                  {errors?.annual_leaves && (
                    <p className={styles.error}>
                      {errors.annual_leaves.message}
                    </p>
                  )}
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Sick Leaves</label>
                  <input
                    {...register("sick_leaves", {
                      required: "Sick leaves are required",
                    })}
                    className={styles.input}
                    type="number"
                    min="0"
                    disabled={!isAdmin}
                  />
                  {errors?.sick_leaves && (
                    <p className={styles.error}>{errors.sick_leaves.message}</p>
                  )}
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Casual Leaves</label>
                  <input
                    {...register("casual_leaves", {
                      required: "Casual leaves required",
                    })}
                    className={styles.input}
                    type="number"
                    min="0"
                    disabled={!isAdmin}
                  />
                  {errors?.casual_leaves && (
                    <p className={styles.error}>
                      {errors.casual_leaves.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {passwordModalOpen ? (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwdModalTitle"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPasswordModalOpen(false);
          }}
        >
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleRow}>
                <span className={styles.modalIcon}>
                  <span className="material-symbols-outlined">vpn_key</span>
                </span>
                <h3 id="pwdModalTitle" className={styles.modalTitle}>
                  Change Password
                </h3>
              </div>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setPasswordModalOpen(false)}
                aria-label="Close"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <p className={styles.modalDesc}>
              Your new password must be at least 6 characters long.
            </p>
            <form className={styles.modalForm} onSubmit={handlePasswordSubmit}>
              <div className={styles.field}>
                <label className={styles.label}>Current Password</label>
                <input
                  className={styles.input}
                  type="password"
                  placeholder="Enter current password"
                  value={pwdForm.current}
                  onChange={(e) =>
                    setPwdForm((p) => ({ ...p, current: e.target.value }))
                  }
                  autoComplete="current-password"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>New Password</label>
                <input
                  className={styles.input}
                  type="password"
                  placeholder="Enter new password"
                  required
                  value={pwdForm.next}
                  onChange={(e) =>
                    setPwdForm((p) => ({ ...p, next: e.target.value }))
                  }
                  autoComplete="new-password"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Confirm New Password</label>
                <input
                  className={styles.input}
                  type="password"
                  placeholder="Re-enter new password"
                  required
                  value={pwdForm.confirm}
                  onChange={(e) =>
                    setPwdForm((p) => ({ ...p, confirm: e.target.value }))
                  }
                  autoComplete="new-password"
                />
              </div>
              {pwdError ? <p className={styles.error}>{pwdError}</p> : null}
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.btnText}
                  onClick={() => setPasswordModalOpen(false)}
                  disabled={pwdLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={pwdLoading}
                >
                  {pwdLoading ? <ButtonLoader /> : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default EmployeeCreateComponent;
