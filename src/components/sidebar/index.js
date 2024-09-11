"use client";
import React, { useEffect, useState } from "react";
import styles from "./sidebar.module.css";
import { supabase } from "@/utils/supabaseClient";
import { Button } from "react-bootstrap";
import Image from "next/image";
import Cookies from "js-cookie";
import { useRouter, usePathname } from "next/navigation";
import calculateTimeDifference from "@/utils/timeDifference";
import { toast } from "react-toastify";
import Link from "next/link";
import NameBadge from "../NameBadge";
import { useEmployee } from "@/context/EmployeeContext";

const SidebarComponent = ({ employeeData }) => {
  const router = useRouter();
  const { logout } = useEmployee();
  const [isHide, setIsHide] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [checkoutLoading, setcheckoutLoading] = useState(false);
  const [signoutLoading, setSignoutLoading] = useState(false);

  const signoutHandler = async () => {
    setSignoutLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.log(error);
    }
    Cookies.remove("expires_at");
    Cookies.remove("user_id");
    Cookies.remove("signin_toast");
    Cookies.set("signout_toast", "true");
    setSignoutLoading(false);
    logout();
    router.push("/hrms/login");
  };
  const checkinHandler = async () => {
    setIsLoading(true);
    const today = new Date();
    const currentTime = new Date();

    // Set the start time to 10:00 AM today
    const startTime = new Date(today);
    startTime.setHours(0, 0, 0, 0);

    // Set the end time to 7:00 PM today
    const endTime = new Date(today);
    endTime.setHours(23, 59, 59, 999);
    const { data, error } = await supabase
      .from("attendance")
      .select("checkin_time")
      .eq("supabase_user_id", employeeData?.supabase_user_id)
      .gte("checkin_time", startTime.toISOString())
      .lte("checkin_time", endTime.toISOString());

    if (data?.length) {
      toast.warn("Already Checked In", {
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
      setIsHide(false);
    } else {
      const { data: insertData, error: insertError } = await supabase
        .from("attendance")
        .insert([
          {
            supabase_user_id: employeeData?.supabase_user_id,
            checkin_time: currentTime.toISOString(),
          },
        ]);
      toast.success(`${employeeData?.name} Successfully Checked In`, {
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
      setIsHide(false);
      try {
        let text = `Checked In - ${employeeData?.name}`;
        const response = await fetch("/api/slack/checkin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text }),
        });

        const result = await response.json();
        console.log(result, "Response from Slack");
      } catch (error) {
        console.log(error);
      }

      if (insertError) {
        console.log(insertError, "insertError");
        setIsLoading(false);
      }
    }
  };

  const checkoutHandler = async () => {
    setcheckoutLoading(true);
    const today = new Date();
    const currentTime = new Date();

    const startTime = new Date(today);
    startTime.setHours(0, 0, 0, 0);

    const { data: attendanceData, error: fetchError } = await supabase
      .from("attendance")
      .select("id, checkin_time")
      .eq("supabase_user_id", employeeData?.supabase_user_id)
      .gte("checkin_time", startTime.toISOString())
      .is("checkout_time", null)
      .single();

    if (attendanceData) {
      const { data: updateData, error: updateError } = await supabase
        .from("attendance")
        .update({
          checkout_time: currentTime,
          total_hour: calculateTimeDifference(attendanceData?.checkin_time),
        })
        .eq("id", attendanceData?.id);
      if (updateError) {
        console.log(updateError, "updateError");
        setcheckoutLoading(false);
        setIsHide(false)
      }
      toast.success(`${employeeData?.name} Successfully Checked Out`, {
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
      setIsHide(false)
      try {
        let text = `Checked Out - ${employeeData?.name}`;
        const response = await fetch("/api/slack/checkin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text }),
        });

        const result = await response.json();
        console.log(result, "Response from Slack");
      } catch (error) {
        console.log(error);
      }
    } else {
      toast.warn("Already Checked Out", {
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
      setIsHide(false)
    }
  };
  const hideHandler = () => {
    setIsHide(true);
  };
  const getHeading = () => {
    const pathname = usePathname();
    if (pathname?.includes("/dashboard/")) {
      return "My Attendance";
    } else if (pathname?.includes("/employee/edit/")) {
      return "Profile";
    } else if (pathname?.includes("/leave/list/")) {
      return "Leave History";
    } else if (pathname?.includes("/leave/create/")) {
      return "Leave Form";
    } else if (pathname?.includes("/employee/attendance/edit/")) {
      return "Attendance Edit Form";
    }else if (pathname?.includes("/employee/attendance/")) {
      return "Employee Attendance";
    }else {
      return ""; // Default heading
    }
  };
  return (
    <>
      <div
        style={{ background: "#0C2D57" }}
        className="d-flex align-items-center text-light d-block d-md-none"
      >
        <div className={styles.hamburgerIcon}>
          <Image
            onClick={hideHandler}
            src="/assets/icons/hamburger-light.svg"
            alt="Vercel Logo"
            width={24}
            height={24}
            style={{ cursor: "pointer" }}
            priority
          />
        </div>
        <span style={{ fontSize: "20px", fontWeight: "700" }}>
          {getHeading()}
        </span>
      </div>

      <div className={`${styles.sidebarLayout} ${isHide ? `${styles.show}` : ""}`}>
        <div className={`p-2`}>
          <div className={styles.crossBtn}>
            <Image
              onClick={() => setIsHide(false)}
              src="/assets/icons/Cross.svg"
              alt="Vercel Logo"
              width={24}
              height={24}
              style={{ cursor: "pointer" }}
              priority
            />
          </div>
          <div
            className={`d-flex justify-content-center mt-2 ${styles.sideLogo}`}
          >
            <Image
              src="/assets/images/logo-white.svg"
              alt="Vercel Logo"
              width={177}
              height={44}
              priority
            />
          </div>
        </div>
        <div className="w-100">
          <div className={`${styles.center}`}>
            {employeeData?.pic ? (
              <Image
                src={employeeData?.pic}
                alt="Profile pic"
                width={106}
                height={106}
                priority
                className="hrms-profileImage"
              />
            ) : (
              <NameBadge
                name={employeeData?.name}
                fontSize={40}
                height={106}
                width={108}
              />
            )}

            <div className={styles.profileName}>
              <span>
                {employeeData?.name
                  ? employeeData?.name?.length > 25
                    ? `${employeeData?.name?.substring(0, 25)} ...`
                    : employeeData?.name
                  : ""}
              </span>
            </div>
          </div>
          <div
            className={`${styles.checkInSection} d-flex justify-content-between`}
          >
            <Button
              onClick={checkinHandler}
              className={styles.bgWhite}
              size="sm"
              disabled={isLoading}
            >
              Check In
            </Button>
            <Button
              onClick={checkoutHandler}
              className={styles.bgWhite}
              size="sm"
              disabled={checkoutLoading}
            >
              Check Out
            </Button>
          </div>
          <div className={styles.sidebarText}>
            <Link
              href={`/hrms/employee/edit/${employeeData?.id}`}
              className={styles.sidebarLink}
              onClick={() => {
                setIsHide(false);
              }}
            >
              <Image
                src={"/assets/icons/profile.svg"}
                alt="Profile pic"
                className={styles.iconsSpace}
                width={20}
                height={20}
                priority
              />
              <div>Profile</div>
            </Link>
            <Link
              href="/hrms/dashboard"
              className={styles.sidebarLink}
              onClick={() => setIsHide(false)}
            >
              <Image
                src={"/assets/icons/Dashboard-icon.svg"}
                alt="Profile pic"
                className={styles.iconsSpace}
                width={20}
                height={20}
                priority
              />
              <div>My Attendance</div>
            </Link>
            <Link
              href="/hrms/employee/leave/list"
              className={styles.sidebarLink}
              onClick={() => setIsHide(false)}
            >
              <Image
                src={"/assets/icons/Leave-icon.svg"}
                alt="Profile pic"
                className={styles.iconsSpace}
                width={20}
                height={20}
                priority
              />
              <div>
                {employeeData?.role === "admin" ? "Leaves" : "My Leaves"}
              </div>
            </Link>
            {employeeData?.role === "admin" ? (
              <Link
                href="/hrms/employee/attendance"
                className={styles.sidebarLink}
                onClick={() => setIsHide(false)}
              >
                <Image
                  src={"/assets/icons/apply-leave.svg"}
                  alt="Profile pic"
                  className={styles.iconsSpace}
                  width={20}
                  height={20}
                  priority
                />
                <div>Employee Attendance</div>
              </Link>
            ) : (
              ""
            )}
            {employeeData?.role !== "admin" ? (
              <Link
                href="/hrms/employee/leave/create"
                className={styles.sidebarLink}
                onClick={() => setIsHide(false)}
              >
                <Image
                  src={"/assets/icons/apply-leave.svg"}
                  alt="Profile pic"
                  className={styles.iconsSpace}
                  width={20}
                  height={20}
                  priority
                />
                <div>Apply for Leave</div>
              </Link>
            ) : (
              ""
            )}
            {employeeData?.role === "admin" ? (
              <Link
                href="/hrms/employee/create"
                className={styles.sidebarLink}
                onClick={() => setIsHide(false)}
              >
                <Image
                  src={"/assets/icons/Add-employee.svg"}
                  alt="Profile pic"
                  className={styles.iconsSpace}
                  width={20}
                  height={20}
                  priority
                />

                <div>Add Employee</div>
              </Link>
            ) : (
              ""
            )}

            {employeeData?.role === "admin" ? (
              <Link
                href="/hrms/employee/list"
                className={styles.sidebarLink}
                onClick={() => setIsHide(false)}
              >
                <Image
                  src={"/assets/icons/Group 1000001947.svg"}
                  alt="Profile pic"
                  className={styles.iconsSpace}
                  width={20}
                  height={20}
                  priority
                />

                <div>Employee List</div>
              </Link>
            ) : (
              ""
            )}
          </div>
          <div className="d-flex justify-content-center">
            <Button
              onClick={signoutHandler}
              className={styles.bgWhite}
              style={{ width: "94px", height: "37px" }}
              size="sm"
              disabled={signoutLoading}
            >
              Log Out
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SidebarComponent;