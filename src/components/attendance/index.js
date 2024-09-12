"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import DatePicker from "react-datepicker";
import { Dropdown } from "react-bootstrap";
import styles from "./attendance.module.css";
import "react-datepicker/dist/react-datepicker.css";
import Image from "next/image";
import Cookies from "js-cookie";
import { toast } from "react-toastify";
import { useEmployee } from "@/context/EmployeeContext";
import DynamicTable from "../table";
import useIsMobile from "@/utils/useIsMobile";
import moment from "moment";
import { generateAttendancePdf } from "@/utils/pdfGenerator";
import ButtonLoader from "../ButtonLoader";

function AttendanceComponent() {
  const { employeeData } = useEmployee();
  const isMobile = useIsMobile();
  const [attendanceList, setAttendanceList] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [totalRecord, setTotalRecord] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(5);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const getEmployeeDetail = async () => {
      const startOfToday = new Date(startDate);
      startOfToday.setHours(0, 0, 0, 0);

      const endOfToday = new Date(endDate);
      endOfToday.setHours(23, 59, 59, 999);
      const start = (currentPage - 1) * recordsPerPage;
      const end = start + recordsPerPage - 1;
      setIsLoading(true);
      const response = await fetch(
        `/api/attendance/get-all?start=${start}&end=${end}&user_id=${employeeData?.supabase_user_id}&startOfToday=${startOfToday}&endOfToday=${endOfToday}&startDate=${startDate}&endDate=${endDate}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const result = await response.json();
      if (response.status === 200) {
        const formattedData = result?.data?.data?.map((att, index) => ({
          id: att?.id,
          date: att?.checkin_time
            ? moment(att?.checkin_time).format("YYYY-MM-DD")
            : "",
          checkIn: att?.checkin_time
            ? moment.utc(att?.checkin_time).local().format("hh:mm:ss A")
            : "",
          checkOut: att?.checkout_time
            ? moment.utc(att?.checkout_time).local().format("hh:mm:ss A")
            : "",
          hour: att?.total_hour,
        }));
        setIsLoading(false);
        setAttendanceList(formattedData);
        setTotalRecord(result?.data?.count);
      }
    };
    if (employeeData) {
      getEmployeeDetail();
    }
    supabase
      .channel("table-db-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance",
        },
        (payload) => {
          getEmployeeDetail();
        }
      )
      .subscribe();
  }, [currentPage, recordsPerPage, startDate, endDate, employeeData]);

  useEffect(() => {
    const loginToast = Cookies.get("signin_toast");
    if (loginToast === "true") {
      toast.success(`Successfully Logged In`, {
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
        Cookies.remove("signin_toast");
      }, 500);
    }
  }, []);

  const configData = [
    {
      label: "Date",
      key: "date",
    },
    {
      label: "Check In",
      key: "checkIn",
    },
    {
      label: "Check Out",
      key: "checkOut",
    },
    {
      label: "Total Hour",
      key: "hour",
    },
  ];

  // const allPdfHandler = async () => {
  //   const { data, error } = await supabase
  //     .from("attendance")
  //     .select(
  //       `
  //       id,
  //       checkin_time,
  //       checkout_time,
  //       total_hour,
  //       employees(name)
  //     `
  //     )
  //     .eq("supabase_user_id", employeeData?.supabase_user_id)
  //     .order("checkin_time", { ascending: false })
  //     .eq("employees.is_current", true);
  //   generateAttendancePdf(data);
  // };
  const filteredPdfHandler = async () => {
    try {
      if (startDate || endDate) {
        setPdfLoading(true);
        const startOfToday = new Date(startDate);
        startOfToday.setHours(0, 0, 0, 0);

        const endOfToday = new Date(endDate);
        endOfToday.setHours(23, 59, 59, 999);

        const response = await fetch(
          `/api/attendance/get-all?user_id=${employeeData?.supabase_user_id}&startOfToday=${startOfToday}&endOfToday=${endOfToday}&startDate=${startDate}&endDate=${endDate}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        const result = await response.json();
        if (response.status === 200) {
          generateAttendancePdf(result?.data?.data);
        } else {
          toast.error(`Something went wrong`, {
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
        setPdfLoading(false);
      } else {
        toast.error(`Please select filters`, {
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
    } catch (error) {
      toast.error(`Something went wrong`, {
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
  };

  return (
    <div className="mainContainer">
      <div className={styles.listForms}>
        <span
          className="d-none d-sm-block"
          style={{ fontSize: "30px", fontWeight: "700" }}
        >
          My Attendance
        </span>
        <div className="d-flex justify-content-between align-items-sm-start mt-4 align-items-md-center mb-3 flex-md-row flex-column">
          <div className="d-flex">
            <div className={styles.datePicker}>
              <Image
                src="/assets/images/Vector.png"
                alt="Profile pic"
                width={16}
                height={16}
                className="hrms-calendar-icon"
                priority
              />
              <DatePicker
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                placeholderText="Start Date"
              />
            </div>
            <div className={`${styles.datePicker} ${styles.marginStart}`}>
              <Image
                src="/assets/images/Vector.png"
                alt="Profile pic"
                width={16}
                height={16}
                className="hrms-calendar-icon"
                priority
              />
              <DatePicker
                selected={endDate}
                onChange={(date) => setEndDate(date)}
                placeholderText="End Date"
              />
            </div>
          </div>
          <Dropdown className="mt-3 mt-md-0">
            <Dropdown.Toggle
              onClick={filteredPdfHandler}
              variant="success"
              id="dropdown-basic"
              disabled={pdfLoading}
              style={{ width: "140px" }}
            >
              {pdfLoading ? <ButtonLoader /> : "Download PDF"}
            </Dropdown.Toggle>
          </Dropdown>
        </div>
        <DynamicTable
          config={configData}
          data={attendanceList}
          totalRecord={totalRecord}
          currentPage={currentPage}
          recordsPerPage={recordsPerPage}
          setCurrentPage={setCurrentPage}
          setRecordsPerPage={setRecordsPerPage}
          tableHeight={isMobile ? "46" : "50"}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

export default AttendanceComponent;
