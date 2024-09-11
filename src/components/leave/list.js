"use client";
import React, { useEffect, useState } from "react";
import styles from "./leave.module.css";
import Select from "react-select";
import { Button } from "react-bootstrap";
import Image from "next/image";
import DatePicker from "react-datepicker";
import DynamicTable from "../table";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";
import { useEmployee } from "@/context/EmployeeContext";
import moment from "moment";
import { toast } from "react-toastify";
import SearchField from "../SearchField";
import useIsMobile from "@/utils/useIsMobile";

const LeaveListComponent = () => {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { employeeData } = useEmployee();
  const [name, setName] = useState("");
  const [leaveType, setLeaveType] = useState(null);
  const [leaveStatusFilter, setLeaveStatusFilter] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [leavesData, setLeavesData] = useState([]);
  const [totalRecord, setTotalRecord] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(5);
  const [modalVisible, setModalVisible] = useState(false);
  const [leaveStatus, setleaveStatus] = useState(false);
  const [selectedRowData, setSelectedRowData] = useState(null);
  const [annualUsed, setAnnualUsed] = useState(0);
  const [sickUsed, setSickUsed] = useState(0);
  const [casualUsed, setCasualUsed] = useState(0);

  useEffect(() => {
    const getLeavesData = async () => {
      const startOfToday = new Date(startDate);
      startOfToday.setHours(0, 0, 0, 0);
      const start = (currentPage - 1) * recordsPerPage;
      const end = start + recordsPerPage - 1;

      let query = supabase
        .from("leaves")
        .select(
          `
        id, 
        content, 
        start_date, 
        end_date, 
        approval_status,
        leave_type,
        created_at,
        duration,
        employees(name)

      `
        )

        .eq("employees.is_current", true)
        .not("employees", "is", null)
        .range(start, end)
        .order("created_at", { ascending: false });
      if (employeeData?.role !== "admin") {
        query = query.eq("supabase_user_id", employeeData?.supabase_user_id);
      }
      if (name) {
        query = query.ilike("employees.name", `%${name}%`);
      }
      if (leaveType) {
        if (leaveType?.value !== "all") {
          query = query.eq("leave_type", leaveType.value);
        }
      }
      if (leaveStatusFilter) {
        if (leaveStatusFilter?.value !== "all") {
          query = query.eq("approval_status", leaveStatusFilter.value);
        }
      }
      if (startDate) {
        query = query.gte("created_at", `${startOfToday.toISOString()}`);
      }
      const { data, error } = await query;
      if (data) {
        const updatedLeaveData = data?.map((leave) => {
          return {
            ...leave,
            name: leave?.employees?.name,
            start_date: moment(leave?.start_date).format("YYYY-MM-DD"),
            end_date: moment(leave?.end_date).format("YYYY-MM-DD"),
          };
        });
        setLeavesData(updatedLeaveData);
      }
      let secndQuery = supabase
        .from("leaves")
        .select(`id, employees!inner(name)`, { count: "exact", head: true })
        .eq("employees.is_current", true);
      if (name) {
        secndQuery = secndQuery.ilike("employees.name", `%${name}%`);
      }
      if (employeeData?.role !== "admin") {
        secndQuery = secndQuery.eq(
          "supabase_user_id",
          employeeData?.supabase_user_id
        );
      }
      if (leaveType) {
        if (leaveType?.value !== "all") {
          secndQuery = secndQuery.eq("leave_type", leaveType.value);
        }
      }
      if (leaveStatusFilter) {
        if (leaveStatusFilter?.value !== "all") {
          secndQuery = secndQuery.eq(
            "approval_status",
            leaveStatusFilter.value
          );
        }
      }
      if (startDate) {
        secndQuery = secndQuery.gte(
          "created_at",
          `${startOfToday.toISOString()}`
        );
      }
      const { count } = await secndQuery;

      if (count) setTotalRecord(count);
    };
    if (employeeData) {
      getLeavesData();
    }
  }, [
    employeeData,
    currentPage,
    recordsPerPage,
    name,
    leaveType,
    leaveStatusFilter,
    startDate,
    leaveStatus,
  ]);

  useEffect(() => {
    const getLeavesCount = async () => {
      const { data: leaveData, error } = await supabase
        .from("leaves")
        .select("leave_type, duration")
        .eq("approval_status", "Approved")
        .eq("supabase_user_id", employeeData?.supabase_user_id);
      if (error) {
        console.error("Error fetching leave data:", error);
      } else {
        let annualLeavesUsed = 0;
        let sickLeavesUsed = 0;
        let casualLeavesUsed = 0;

        leaveData?.forEach((leave) => {
          if (leave.leave_type === "Annual") {
            annualLeavesUsed += leave.duration;
          } else if (leave.leave_type === "Sick") {
            sickLeavesUsed += leave.duration;
          } else if (leave.leave_type === "Casual") {
            casualLeavesUsed += leave.duration;
          }
        });

        setAnnualUsed(annualLeavesUsed);
        setSickUsed(sickLeavesUsed);
        setCasualUsed(casualLeavesUsed);
      }
    };
    if (employeeData) getLeavesCount();
  }, [employeeData]);

  const employeeConfigData = [
    {
      label: "Applied On",
      key: "created_at",
    },
    {
      label: "From Date",
      key: "start_date",
    },
    {
      label: "To Date",
      key: "end_date",
    },
    {
      label: "Leave Type",
      key: "leave_type",
    },
    {
      label: "Days",
      key: "duration",
    },
    {
      label: "Status",
      key: "approval_status",
    },
    {
      label: "View",
      isIcon: true,
      icon: "/assets/icons/Vector-view.svg",
    },
  ];
  const adminConfigData = [
    {
      label: "Name",
      key: "name",
    },
    ...employeeConfigData,
  ];

  const handleIconClick = (rowData) => {
    setSelectedRowData(rowData);
    setModalVisible(true);
  };

  const handleApprovedLeave = async () => {
    const { data: updateData, error: updateError } = await supabase
      .from("leaves")
      .update({
        approval_status: "Approved",
      })
      .eq("id", selectedRowData?.id);
    if (updateError) {
      console.log(updateError, "updateError");
      // setcheckoutLoading(false);
    }
    toast.success(`${selectedRowData?.employees?.name} Leave Approved`, {
      position: "bottom-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "colored",
    });
    setleaveStatus(!leaveStatus);
    setModalVisible(false);
  };

  const handleRejectedLeave = async () => {
    const { data: updateData, error: updateError } = await supabase
      .from("leaves")
      .update({
        approval_status: "Rejected",
      })
      .eq("id", selectedRowData?.id);
    if (updateError) {
      console.log(updateError, "updateError");
      // setcheckoutLoading(false);
    }
    toast.success(`${selectedRowData?.employees?.name} Leave Rejected`, {
      position: "bottom-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "colored",
    });
    setleaveStatus(!leaveStatus);
    setModalVisible(false);
  };

  const deleteLeaveHandler = async () => {
    const { data: deleteData, error: deleteError } = await supabase
      .from("leaves")
      .delete()
      .eq("id", selectedRowData?.id);
    if (deleteError) {
      console.error("Error deleting leave:", deleteError);
    } else {
      toast.success(`Leave deleted successfully`, {
        position: "bottom-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
      setleaveStatus(!leaveStatus);
      setModalVisible(false);
    }
  };

  return (
    <div className="mainContainer">
      <div className={styles.container}>
        <span
          className="d-none d-sm-block"
          style={{ fontSize: "30px", fontWeight: "700" }}
        >
          Leaves History
        </span>
        <div
          className={`d-flex justify-content-between mt-4 ${styles.filterSection}`}
        >
          <div className={`d-flex ${styles.filter1}`}>
            <div className="me-2">
              <Select
                placeholder="Select leave type"
                value={leaveType}
                className="hrms-field"
                onChange={(val) => {
                  setLeaveType(val);
                }}
                options={[
                  { label: "All", value: "all" },
                  { label: "Sick", value: "Sick" },
                  { label: "Casual", value: "Casual" },
                  { label: "Annual", value: "Annual" },
                ]}
              />
            </div>
            <div className="me-2">
              <Select
                placeholder="Select leave Status"
                value={leaveStatusFilter}
                className="hrms-field"
                onChange={(val) => {
                  setLeaveStatusFilter(val);
                }}
                options={[
                  { label: "All", value: "all" },
                  { label: "Pending", value: "Pending" },
                  { label: "Approved", value: "Approved" },
                  { label: "Rejected", value: "Rejected" },
                ]}
              />
            </div>
            <div className={styles.datePicker}>
              <Image
                src="/assets/icons/Vector-dark.png"
                alt="Profile pic"
                width={16}
                height={16}
                className={styles.hrmsCalendarIcon}
                priority
              />
              <DatePicker
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                placeholderText="Search by date"
              />
            </div>
          </div>
          {employeeData?.role === "admin" ? (
            <SearchField
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Search by name"
            />
          ) : (
            ""
          )}
        </div>
        <div
          className={`d-flex justify-content-between align-items-center mt-3 mb-3 ${styles.btnCont}`}
        >
          <div>
            <div>
              <strong>Annual Leave : </strong>
              {annualUsed} / <strong>{employeeData?.annual_leaves}</strong>
            </div>
            <div>
              <strong>Sick Leave : </strong>
              {sickUsed} / <strong>{employeeData?.sick_leaves}</strong>
            </div>
            <div>
              <strong>Casual Leave : </strong>
              {casualUsed} / <strong>{employeeData?.casual_leaves}</strong>
            </div>
          </div>

          <Button
            className={`hrms-button`}
            variant="primary"
            size="md"
            type="submit"
            style={{ width: isMobile ? "170px" : "206px", height: "40px" }}
            onClick={() => router.push("/hrms/employee/leave/create")}
          >
            Apply Leave
          </Button>
        </div>
        <div className={styles.table}>
          <DynamicTable
            config={
              employeeData?.role === "admin"
                ? adminConfigData
                : employeeConfigData
            }
            data={leavesData}
            totalRecord={totalRecord}
            currentPage={currentPage}
            recordsPerPage={recordsPerPage}
            setCurrentPage={setCurrentPage}
            setRecordsPerPage={setRecordsPerPage}
            onIconClick={handleIconClick}
            tableHeight={isMobile ? "30" : "47"}
          />
        </div>
      </div>
      {modalVisible && (
        <div
          className="modal fade show"
          id="exampleModalCenter"
          tabIndex="-1"
          role="dialog"
          aria-labelledby="exampleModalCenterTitle"
          aria-hidden="true"
          style={{ display: "block", background: "rgba(0,0,0,0.5)" }} // Show modal
        >
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content" style={{ borderRadius: "25px" }}>
              <div className="modal-header justify-content-between">
                <h5 className="modal-title" id="exampleModalLongTitle">
                  <strong>Leave Detail</strong>
                </h5>
                <div className="d-flex align-items-center">
                  {employeeData?.role === "admin" ||
                  selectedRowData?.approval_status === "Pending" ? (
                    <div
                      className="me-3"
                      style={{ cursor: "pointer" }}
                      onClick={deleteLeaveHandler}
                    >
                      <span className="me-1">Delete</span>
                      <Image
                        src="/assets/icons/Delete.svg"
                        width={15}
                        height={15}
                        alt="search-icon"
                      />
                    </div>
                  ) : (
                    ""
                  )}
                  {employeeData?.role === "admin" ||
                  (employeeData?.role !== "admin" &&
                    selectedRowData?.approval_status === "Pending") ? (
                    <div
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        router.push(
                          `/hrms/employee/leave/edit/${selectedRowData?.id}`
                        );
                      }}
                    >
                      <span className="me-1">Edit</span>
                      <Image
                        src="/assets/icons/Edit.svg"
                        width={15}
                        height={15}
                        alt="search-icon"
                      />
                    </div>
                  ) : (
                    <></>
                  )}
                </div>
              </div>
              <div className="modal-body">
                {/* Display selected data here */}
                {selectedRowData && (
                  <div>
                    <div>
                      <strong>Name: </strong>
                      {selectedRowData?.employees?.name}
                    </div>
                    <div className="mt-2">
                      <strong>Applied on:</strong>{" "}
                      {moment(selectedRowData?.created_at).format(
                        "dddd, DD MMM, YYYY"
                      )}
                    </div>
                    <div className="mt-2">
                      <strong>Leave Type:</strong> {selectedRowData?.leave_type}
                    </div>
                    <div className="mt-2">
                      <strong>Start Date:</strong>{" "}
                      {moment(selectedRowData?.start_date).format(
                        "dddd, DD MMM, YYYY"
                      )}
                    </div>
                    <div className="mt-2">
                      <strong> End Date:</strong>{" "}
                      {moment(selectedRowData?.end_date).format(
                        "dddd, DD MMM, YYYY"
                      )}
                    </div>
                    <div className="mt-2">
                      <strong>Content:</strong> {selectedRowData?.content}
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer justify-content-center">
                {employeeData?.role === "admin" &&
                selectedRowData?.approval_status === "Pending" ? (
                  <>
                    <Button
                      type="button"
                      style={{
                        padding: "4px 15px",
                        width: "100px",
                        height: "35px",
                        color: "white",
                        background: "#349D27",
                        borderRadius: "15px",
                        borderColor: "#349D27",
                        boxShadow:
                          "0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19)",
                      }}
                      onClick={handleApprovedLeave}
                    >
                      Approve
                    </Button>
                    <Button
                      type="button"
                      onClick={handleRejectedLeave}
                      style={{
                        padding: "4px 15px",
                        width: "100px",
                        height: "35px",
                        color: "white",
                        background: "#FF0004",
                        borderRadius: "15px",
                        borderColor: "#E90000",
                        boxShadow:
                          "0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19)",
                      }}
                    >
                      Reject
                    </Button>
                  </>
                ) : (
                  <></>
                )}
                <Button
                  type="button"
                  className="hrms-button"
                  style={{
                    padding: "4px 30px",
                    width: "100px",
                    height: "35px",
                    color: "white",
                    boxShadow:
                      "0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19)",
                  }}
                  onClick={() => setModalVisible(false)} // Close modal
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveListComponent;
