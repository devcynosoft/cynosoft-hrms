"use client";
import { supabase } from "@/utils/supabaseClient";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import DynamicTable from "../table";
import styles from "./attendanceDetail.module.css";
import moment from "moment";
import DatePicker from "react-datepicker";
import SearchField from "../SearchField";
import { useRouter } from "next/navigation";
import useIsMobile from "@/utils/useIsMobile";
import { Button } from "react-bootstrap";

const AttendanceDetailComponent = () => {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [employeeData, setEmployeeData] = useState([]);
  const [name, setName] = useState("");
  const [totalRecord, setTotalRecord] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(5);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  useEffect(() => {
    const getEmployeeDetail = async () => {
      const startOfToday = new Date(startDate);
      startOfToday.setHours(0, 0, 0, 0);

      const endOfToday = new Date(endDate);
      endOfToday.setHours(23, 59, 59, 999);
      const start = (currentPage - 1) * recordsPerPage;
      const end = start + recordsPerPage - 1;
      let query = supabase
        .from("attendance")
        .select(
          `
        id, 
        checkin_time, 
        checkout_time, 
        total_hour, 
        employees(name)
      `
        )
        .eq("employees.is_current", true)
        .not("employees", "is", null)
        .order("checkin_time", { ascending: false })
        .range(start, end);
      if (name) {
        query = query.ilike("employees.name", `%${name}%`);
      }
      if (startDate) {
        query = query.gte("checkin_time", `${startOfToday.toISOString()}`);
      }
      if (endDate) {
        query = query.lte("checkin_time", `${endOfToday.toISOString()}`);
      }
      const { data, error } = await query;

      if (data) {
        const formattedData = data?.map((att, index) => ({
          id: att?.id,
          date: att?.checkin_time
            ? moment(att?.checkin_time).format("YYYY-MM-DD")
            : "",
          name: att?.employees?.name,
          checkIn: att?.checkin_time
            ? moment.utc(att?.checkin_time).local().format("hh:mm:ss A")
            : "",
          checkOut: att?.checkout_time
            ? moment.utc(att?.checkout_time).local().format("hh:mm:ss A")
            : "",
          hour: att?.total_hour,
        }));
        setEmployeeData(formattedData);
      }
      let secndQuery = supabase
        .from("attendance")
        .select(`id, employees!inner(name)`, { count: "exact", head: true })
        .eq("employees.is_current", true);
      if (name) {
        secndQuery = secndQuery.ilike("employees.name", `%${name}%`);
      }
      if (startDate) {
        secndQuery = secndQuery.gte(
          "checkin_time",
          `${startOfToday.toISOString()}`
        );
      }
      if (endDate) {
        secndQuery = secndQuery.lte(
          "checkin_time",
          `${endOfToday.toISOString()}`
        );
      }
      const { count } = await secndQuery;

      if (count) setTotalRecord(count);
    };
    getEmployeeDetail();
  }, [currentPage, recordsPerPage, name, startDate, endDate]);

  const configData = [
    {
      label: "Date",
      key: "date",
    },
    {
      label: "Employee Name",
      key: "name",
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
    {
      label: "Action",
      isIcon: true,
      icon: "/assets/icons/Edit.svg",
    },
  ];

  const handleIconClick = (rowData) => {
    router.push(`/hrms/employee/attendance/edit/${rowData?.id}`);
  };

  return (
    <div className="mainContainer">
      <div className={styles.listForms}>
        <span className="d-none d-sm-block" style={{ fontSize: "30px", fontWeight: "700" }}>
          Employee Attendance
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
          <div className="mt-md-0 mt-3">
            <SearchField
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Search by name"
            />
          </div>
        </div>
        <div
          className={`d-flex justify-content-start justify-content-md-end mt-3 mb-3 ${styles.btnCont}`}
        >
          <Button
            className={`hrms-button`}
            variant="primary"
            size="md"
            type="submit"
            style={{ width: "206px", height: "40px" }}
            onClick={() => router.push("/hrms/employee/attendance/create")}
          >
            Add Attendance
          </Button>
        </div>
        <DynamicTable
          config={configData}
          data={employeeData}
          totalRecord={totalRecord}
          currentPage={currentPage}
          recordsPerPage={recordsPerPage}
          setCurrentPage={setCurrentPage}
          setRecordsPerPage={setRecordsPerPage}
          onIconClick={handleIconClick}
          tableHeight={isMobile ? "46" : "50"}
        />
      </div>
    </div>
  );
};

export default AttendanceDetailComponent;