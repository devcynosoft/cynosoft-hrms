"use client";
import React, { useEffect, useRef, useState } from "react";
import styles from "./sidebar.module.css";
import { supabase } from "@/utils/supabaseClient";
import { Button, Spinner } from "react-bootstrap";
import Image from "next/image";
import Cookies from "js-cookie";
import { useRouter, usePathname } from "next/navigation";
import calculateTimeDifference from "@/utils/timeDifference";
import { toast } from "react-toastify";
import Link from "next/link";
import NameBadge from "../NameBadge";
import { useEmployee } from "@/context/EmployeeContext";
import { Trash2, Upload } from "lucide-react";

const SidebarComponent = () => {
  const fileInputRef = useRef(null);
  const router = useRouter();
  const { logout, employeeData, setEmployeeData } = useEmployee();
  // const { employeeData, setEmployeeData } = useEmployee();

  const [isHide, setIsHide] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [checkoutLoading, setcheckoutLoading] = useState(false);
  const [signoutLoading, setSignoutLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleUploadClick = () => {
    fileInputRef.current.click(); // Trigger hidden file input
  };

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
    const response = await fetch("/api/checkin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
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
      setIsHide(false);
    } else if (response?.status === 201) {
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
      setIsHide(false);
    } else if (response?.status === 403) {
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
      setIsHide(false);
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
      setIsHide(false);
    }
  };

  const checkoutHandler = async () => {
    setcheckoutLoading(true);
    const response = await fetch("/api/checkout", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
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
      setIsHide(false);
    } else if (response?.status === 201) {
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
      setIsHide(false);
    } else if (response?.status === 403) {
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
      setIsHide(false);
    }
  };
  const hideHandler = () => {
    setIsHide(true);
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
        console.log("File does not exist in the bucket:", decodedFilePath);
        return false;
      }
      const { error: deleteError } = await supabase.storage
        .from("cynosoft_employee_images")
        .remove([decodedFilePath]);

      if (deleteError) {
        console.log("Error deleting file:", deleteError);
        return false;
      } else {
        console.log("Old file deleted successfully");
        return true;
      }
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
          headers: {
            "Content-Type": "application/json",
          },
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
          headers: {
            "Content-Type": "application/json",
          },
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
    } else if (pathname?.includes("/employee/attendance/")) {
      return "Employee Attendance";
    } else {
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

      <div
        className={`${styles.sidebarLayout} ${isHide ? `${styles.show}` : ""}`}
      >
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
            <div className={`position-relative ${styles.logoContainer}`}>
              {employeeData?.pic ? (
                <>
                  <Image
                    src={employeeData?.pic}
                    alt="Profile pic"
                    width={106}
                    height={106}
                    priority
                    className="hrms-profileImage"
                  />
                  <div className="d-flex">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={uploadImage}
                      className="d-none" // Hides default file input but still works
                    />
                    <Button className={styles.deleteBtn}>
                      {loading ? (
                        <Spinner animation="border" size="sm" />
                      ) : (
                        <div
                          style={{
                            background: "black",
                            height: "30px",
                            width: "30px",
                            borderRadius: "5px",
                            opacity: "0.5",
                          }}
                        >
                          <Upload
                            onClick={handleUploadClick}
                            className="w-5 h-5"
                          />
                        </div>
                      )}
                      <div
                        style={{
                          background: "black",
                          height: "30px",
                          width: "30px",
                          borderRadius: "5px",
                          opacity: "0.5",
                        }}
                      >
                        {deleting ? (
                          <Spinner animation="border" size="sm" />
                        ) : (
                          <Trash2
                            onClick={() => deleteImage(employeeData?.pic)}
                            className="w-5 h-5"
                          />
                        )}
                      </div>
                    </Button>
                  </div>
                </>
              ) : (
                <div className={`position-relative ${styles.logoContainer}`}>
                  <>
                    <NameBadge
                      name={employeeData?.name}
                      fontSize={40}
                      height={106}
                      width={108}
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={uploadImage}
                      className="d-none"
                    />
                    <Button className={styles.deleteBtn}>
                      {loading ? (
                        <Spinner animation="border" size="sm" />
                      ) : (
                        <div
                          style={{
                            background: "black",
                            height: "30px",
                            width: "30px",
                            borderRadius: "5px",
                            opacity: "0.5",
                          }}
                        >
                          <Upload
                            onClick={handleUploadClick}
                            className="w-5 h-5"
                          />
                        </div>
                      )}
                    </Button>
                  </>
                </div>
              )}
            </div>

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
