"use client";
import React, { useEffect, useRef, useState } from "react";
import styles from "./sidebar.module.css";
import { supabase } from "@/utils/supabaseClient";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { toast } from "react-toastify";
import Link from "next/link";
import NameBadge from "../NameBadge";
import { useEmployee } from "@/context/EmployeeContext";
import { Upload } from "lucide-react";
import moment from "moment";
import ButtonLoader from "../ButtonLoader.jsx";

const SidebarComponent = () => {
  const fileInputRef = useRef(null);
  const pathname = usePathname();
  const { logout, employeeData, setEmployeeData } = useEmployee();

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [checkoutLoading, setcheckoutLoading] = useState(false);
  const [signoutLoading, setSignoutLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [checkedInTime, setCheckedInTime] = useState(null);
  const [punchStatus, setPunchStatus] = useState("none"); // none | checked_in | checked_out

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const isActive = (href) => {
    if (!pathname || !href) return false;
    if (href === "/hrms/dashboard") {
      return pathname.includes("/dashboard");
    }
    return pathname.includes(href.replace(/\/$/, ""));
  };

  const fetchTodayCheckin = async () => {
    if (!employeeData?.supabase_user_id) return;
    const startOfToday = moment().startOf("day").toDate();
    const endOfToday = moment().endOf("day").toDate();
    try {
      const response = await fetch(
        `/api/attendance/get-all?start=0&end=0&user_id=${employeeData.supabase_user_id}&startOfToday=${startOfToday}&endOfToday=${endOfToday}&startDate=${startOfToday}&endDate=${endOfToday}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );
      const result = await response.json();
      if (response.status === 200) {
        const today = result?.data?.data?.[0];
        if (today?.checkin_time && !today?.checkout_time) {
          setCheckedInTime(
            moment.utc(today.checkin_time).local().format("hh:mm A")
          );
          setPunchStatus("checked_in");
        } else if (today?.checkin_time && today?.checkout_time) {
          setCheckedInTime(
            moment.utc(today.checkin_time).local().format("hh:mm A")
          );
          setPunchStatus("checked_out");
        } else {
          setCheckedInTime(null);
          setPunchStatus("none");
        }
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    if (employeeData?.supabase_user_id) {
      fetchTodayCheckin();
    }
  }, [employeeData?.supabase_user_id, isLoading, checkoutLoading]);

  const signoutHandler = async () => {
    setSignoutLoading(true);
    logout();
  };

  const checkinHandler = async () => {
    if (!employeeData) {
      logout();
      return;
    }
    setIsLoading(true);
    const response = await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(employeeData),
    });
    const result = await response.json();
    if (response?.status === 200) {
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
      setIsOpen(false);
    } else if (response?.status === 201 || response?.status === 403) {
      toast.warn(result?.data, {
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
      setIsOpen(false);
    } else {
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
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  const checkoutHandler = async () => {
    if (!employeeData) {
      logout();
      return;
    }
    setcheckoutLoading(true);
    const response = await fetch("/api/checkout", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(employeeData),
    });
    const result = await response.json();
    if (response?.status === 200) {
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
      setcheckoutLoading(false);
      setIsOpen(false);
    } else if (response?.status === 201 || response?.status === 403) {
      toast.warn(result?.data, {
        position: "bottom-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
      setcheckoutLoading(false);
      setIsOpen(false);
    } else {
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
      setcheckoutLoading(false);
      setIsOpen(false);
    }
  };

  const removeImageFromStorage = async (oldFileName) => {
    if (oldFileName) {
      const filePath = oldFileName.replace(
        "https://oxdipgxlwrvifvdifnfj.supabase.co/storage/v1/object/public/cynosoft_employee_images/",
        ""
      );
      const decodedFilePath = decodeURIComponent(filePath);
      const { data: fileList, error: listError } = await supabase.storage
        .from("cynosoft_employee_images")
        .list();

      if (listError) {
        console.log("Error listing files:", listError);
        return false;
      }

      const fileExists = fileList.some((file) => file.name === decodedFilePath);
      if (!fileExists) {
        return false;
      }
      const { error: deleteError } = await supabase.storage
        .from("cynosoft_employee_images")
        .remove([decodedFilePath]);

      if (deleteError) {
        console.log("Error deleting file:", deleteError);
        return false;
      }
      return true;
    }
  };

  const uploadImageToStorage = async (file) => {
    if (employeeData?.pic) {
      await removeImageFromStorage(employeeData?.pic);
    }
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
      return url?.publicUrl;
    }
  };

  const deleteImage = async (picUrl) => {
    setDeleting(true);
    const isPicDeleted = await removeImageFromStorage(picUrl);
    if (isPicDeleted) {
      const response = await fetch(
        `/api/employee/upsert?empId=${employeeData?.id}&userId=${null}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pic: null }),
        }
      );
      await response.json();
      if (response.status === 200) {
        setEmployeeData({ ...employeeData, pic: null });
        toast.success(`Successfully Image Updated`, {
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
    setDeleting(false);
  };

  const uploadImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    const newImageUrl = await uploadImageToStorage(file);
    if (newImageUrl) {
      const response = await fetch(
        `/api/employee/upsert?empId=${employeeData?.id}&userId=${null}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pic: newImageUrl }),
        }
      );
      await response.json();
      if (response.status === 200) {
        setEmployeeData({ ...employeeData, pic: newImageUrl });
        setLoading(false);
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
      }
    }
  };

  const getHeading = () => {
    if (pathname?.includes("/dashboard")) return "My Attendance";
    if (pathname?.includes("/employee/edit/")) return "Profile";
    if (pathname?.includes("/leave/list")) return "Leave History";
    if (pathname?.includes("/leave/create")) return "Leave Form";
    if (pathname?.includes("/employee/attendance/edit/"))
      return "Attendance Edit Form";
    if (pathname?.includes("/employee/attendance")) return "Employee Attendance";
    return "HRMS";
  };

  const closeDrawer = () => setIsOpen(false);

  const profileHref = employeeData?.id
    ? `/hrms/employee/edit/${employeeData.id}`
    : "#";

  return (
    <>
      <div className={styles.mobileBar}>
        <button
          type="button"
          className={styles.hamburgerBtn}
          onClick={() => setIsOpen(true)}
          aria-label="Open menu"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <span className={styles.mobileTitle}>{getHeading()}</span>
      </div>

      {isOpen && (
        <div
          className={styles.overlay}
          onClick={closeDrawer}
          aria-hidden="true"
        />
      )}

      <aside
        className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ""}`}
      >
        <div className={styles.sidebarTop}>
          <div className={styles.brandRow}>
            <div className={styles.brandLeft}>
              <Image
                src="/assets/images/logo-white.svg"
                alt="Cynosoft Logo"
                width={140}
                height={32}
                className={styles.brandLogo}
                priority
              />
            </div>
            <span className={styles.hrmsBadge}>HRMS</span>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={closeDrawer}
              aria-label="Close menu"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className={styles.profileCard}>
            <div className={styles.profileRow}>
              <div className={styles.avatarWrap}>
                {employeeData?.pic ? (
                  <Image
                    src={employeeData.pic}
                    alt="Profile"
                    width={40}
                    height={40}
                    className={styles.avatar}
                    priority
                  />
                ) : (
                  <div className={styles.avatarFallback}>
                    {employeeData?.name ? (
                      <NameBadge
                        name={employeeData.name}
                        fontSize={14}
                        height={40}
                        width={40}
                      />
                    ) : (
                      <span className="material-symbols-outlined">person</span>
                    )}
                  </div>
                )}
                <span className={styles.onlineDot} />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={uploadImage}
                  className={styles.hiddenInput}
                />
                <button
                  type="button"
                  className={styles.avatarUploadBtn}
                  onClick={handleUploadClick}
                  disabled={loading}
                  aria-label="Upload photo"
                >
                  {loading ? <ButtonLoader /> : <Upload size={14} />}
                </button>
              </div>
              <div className={styles.profileInfo}>
                <span className={styles.profileName}>
                  {employeeData?.name || "Employee"}
                </span>
                <span className={styles.profileRole}>
                  {employeeData?.role || "Employee"}
                </span>
              </div>
            </div>

            {/* {checkedInTime && (
              <div className={styles.checkedIn}>
                <span className={styles.pulseDot} />
                Checked in: {checkedInTime}
              </div>
            )} */}

            <div className={styles.punchGrid}>
              <button
                type="button"
                className={`${styles.punchBtn} ${styles.checkInBtn}`}
                onClick={checkinHandler}
                disabled={
                  isLoading ||
                  !employeeData ||
                  punchStatus === "checked_in" ||
                  punchStatus === "checked_out"
                }
              >
                {isLoading ? (
                  <ButtonLoader />
                ) : (
                  <>
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 14, color: "var(--hrms-tertiary-container)" }}
                    >
                      check_circle
                    </span>
                    Check In
                  </>
                )}
              </button>
              <button
                type="button"
                className={`${styles.punchBtn} ${styles.checkOutBtn}`}
                onClick={checkoutHandler}
                disabled={
                  checkoutLoading ||
                  !employeeData ||
                  punchStatus !== "checked_in"
                }
              >
                {checkoutLoading ? (
                  <ButtonLoader />
                ) : (
                  <>
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 14 }}
                    >
                      logout
                    </span>
                    Check Out
                  </>
                )}
              </button>
            </div>
          </div>

          <nav className={styles.nav}>
            <Link
              href="/hrms/dashboard"
              className={`${styles.navLink} ${
                isActive("/hrms/dashboard") ? styles.navLinkActive : ""
              }`}
              onClick={closeDrawer}
            >
              <span className={`material-symbols-outlined ${styles.navIcon}`}>
                schedule
              </span>
              My Attendance
            </Link>
            <Link
              href={profileHref}
              className={`${styles.navLink} ${
                pathname?.includes("/employee/edit/") ? styles.navLinkActive : ""
              }`}
              onClick={closeDrawer}
            >
              <span className={`material-symbols-outlined ${styles.navIcon}`}>
                badge
              </span>
              Profile
            </Link>
            <Link
              href="/hrms/employee/leave/list"
              className={`${styles.navLink} ${
                pathname?.includes("/leave/list") ? styles.navLinkActive : ""
              }`}
              onClick={closeDrawer}
            >
              <span className={`material-symbols-outlined ${styles.navIcon}`}>
                event_note
              </span>
              {employeeData?.role === "admin" ? "Leaves" : "Leaves Management"}
            </Link>
            {employeeData?.role !== "admin" && (
              <Link
                href="/hrms/employee/leave/create"
                className={`${styles.navLink} ${
                  pathname?.includes("/leave/create")
                    ? styles.navLinkActive
                    : ""
                }`}
                onClick={closeDrawer}
              >
                <span className={`material-symbols-outlined ${styles.navIcon}`}>
                  add_task
                </span>
                Apply for Leave
              </Link>
            )}
            {employeeData?.role === "admin" && (
              <>
                <Link
                  href="/hrms/employee/attendance"
                  className={`${styles.navLink} ${
                    pathname?.includes("/employee/attendance") &&
                    !pathname?.includes("/edit/")
                      ? styles.navLinkActive
                      : ""
                  }`}
                  onClick={closeDrawer}
                >
                  <span
                    className={`material-symbols-outlined ${styles.navIcon}`}
                  >
                    groups
                  </span>
                  Employee Attendance
                </Link>
                <Link
                  href="/hrms/employee/create"
                  className={`${styles.navLink} ${
                    pathname?.includes("/employee/create")
                      ? styles.navLinkActive
                      : ""
                  }`}
                  onClick={closeDrawer}
                >
                  <span
                    className={`material-symbols-outlined ${styles.navIcon}`}
                  >
                    person_add
                  </span>
                  Add Employee
                </Link>
                <Link
                  href="/hrms/employee/list"
                  className={`${styles.navLink} ${
                    pathname?.includes("/employee/list")
                      ? styles.navLinkActive
                      : ""
                  }`}
                  onClick={closeDrawer}
                >
                  <span
                    className={`material-symbols-outlined ${styles.navIcon}`}
                  >
                    list_alt
                  </span>
                  Employee List
                </Link>
              </>
            )}
          </nav>
        </div>

        <div className={styles.sidebarBottom}>
          <a
            href="#help"
            className={styles.navLink}
            onClick={(e) => e.preventDefault()}
          >
            <span className={`material-symbols-outlined ${styles.navIcon}`}>
              support
            </span>
            Help & Support
          </a>
          <button
            type="button"
            className={`${styles.navLink} ${styles.logoutLink}`}
            onClick={signoutHandler}
            disabled={signoutLoading}
            style={{
              background: "transparent",
              border: "none",
              width: "100%",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <span className={`material-symbols-outlined ${styles.navIcon}`}>
              power_settings_new
            </span>
            {signoutLoading ? "Logging out..." : "Log Out"}
          </button>
        </div>
      </aside>
    </>
  );
};

export default SidebarComponent;
