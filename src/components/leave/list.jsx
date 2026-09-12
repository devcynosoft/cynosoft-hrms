"use client";
import React, { useEffect, useMemo, useState } from "react";
import DatePicker from "react-datepicker";
import { supabase } from "@/utils/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";
import { useEmployee } from "@/context/EmployeeContext";
import moment from "moment";
import { toast } from "react-toastify";
import styles from "./leaveList.module.css";

const getTypeDotClass = (type) => {
  if (type === "Sick") return styles.dotSick;
  if (type === "Casual") return styles.dotCasual;
  return styles.dotAnnual;
};

const getStatusDotClass = (status) => {
  if (status === "Pending") return styles.statusPending;
  if (status === "Rejected") return styles.statusRejected;
  return styles.statusApproved;
};

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (
    parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
  ).toUpperCase();
};

const LeaveListComponent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { employeeData } = useEmployee();
  const [name, setName] = useState("");
  const [debouncedName, setDebouncedName] = useState(name);
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
  const [isLoading, setIsLoading] = useState(false);
  const [autoOpenedLeaveId, setAutoOpenedLeaveId] = useState(null);

  const isAdmin = employeeData?.role === "admin";

  const openLeaveIdFromQuery = searchParams?.get("openLeaveId")
    ? Number(searchParams.get("openLeaveId"))
    : null;

  const fiscalInfo = useMemo(() => {
    const today = new Date();
    const fiscalStartYear =
      today.getMonth() + 1 >= 7 ? today.getFullYear() : today.getFullYear() - 1;
    const fiscalEndYear = fiscalStartYear + 1;
    const shortEnd = String(fiscalEndYear).slice(-2);
    return {
      label: `Fiscal ${fiscalStartYear}–${shortEnd}`,
      renewsOn: `Jul 01, ${fiscalEndYear}`,
    };
  }, []);

  const annualTotal = Number(employeeData?.annual_leaves) || 0;
  const sickTotal = Number(employeeData?.sick_leaves) || 0;
  const casualTotal = Number(employeeData?.casual_leaves) || 0;

  const annualRemaining = Math.max(0, annualTotal - annualUsed);
  const sickRemaining = Math.max(0, sickTotal - sickUsed);
  const casualRemaining = Math.max(0, casualTotal - casualUsed);
  const totalAllowance = annualTotal + sickTotal + casualTotal;
  const totalRemaining =
    annualRemaining + sickRemaining + casualRemaining;

  const percentUsed = (used, total) => {
    if (!total || total <= 0) return 0;
    return Math.min(100, Math.round((Number(used) / total) * 100));
  };

  const totalPages = Math.max(1, Math.ceil(totalRecord / recordsPerPage) || 1);

  const pageNumbers = useMemo(() => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    let start = Math.max(2, currentPage - 1);
    let end = Math.min(totalPages - 1, currentPage + 1);
    if (currentPage <= 2) end = 3;
    if (currentPage >= totalPages - 1) start = totalPages - 2;
    for (let i = start; i <= end; i++) {
      if (i > 1 && i < totalPages) pages.push(i);
    }
    pages.push(totalPages);
    return [...new Set(pages)];
  }, [currentPage, totalPages]);

  const showingFrom =
    totalRecord === 0 ? 0 : (currentPage - 1) * recordsPerPage + 1;
  const showingTo = Math.min(currentPage * recordsPerPage, totalRecord);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedName(name);
    }, process.env.NEXT_PUBLIC_DEBOUNCE_DELAY);

    return () => {
      clearTimeout(handler);
    };
  }, [name]);

  useEffect(() => {
    const getLeavesData = async () => {
      const startOfToday = new Date(startDate);
      startOfToday.setHours(0, 0, 0, 0);
      const start = (currentPage - 1) * recordsPerPage;
      const end = start + recordsPerPage - 1;
      setIsLoading(true);
      const response = await fetch(
        `/api/leave/get-all?start=${start}&end=${end}&name=${debouncedName}&startOfToday=${startOfToday}&startDate=${startDate}&leaveType=${JSON.stringify(
          leaveType
        )}&leaveStatusFilter=${JSON.stringify(leaveStatusFilter)}&userId=${
          employeeData?.role !== "admin" ? employeeData?.supabase_user_id : null
        }`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const result = await response.json();
      if (response?.status === 200) {
        setIsLoading(false);
        const updatedLeaveData = result?.data?.data?.map((leave) => {
          return {
            ...leave,
            name: leave?.employees?.name,
            start_date: moment(leave?.start_date).format("YYYY-MM-DD"),
            end_date: moment(leave?.end_date).format("YYYY-MM-DD"),
          };
        });
        setLeavesData(updatedLeaveData);
        setTotalRecord(result?.data?.count);
      } else {
        setIsLoading(false);
      }
    };
    if (employeeData) {
      getLeavesData();
    }
  }, [
    employeeData,
    currentPage,
    recordsPerPage,
    debouncedName,
    leaveType,
    leaveStatusFilter,
    startDate,
    leaveStatus,
  ]);

  useEffect(() => {
    const autoOpen = async () => {
      if (!openLeaveIdFromQuery) return;
      if (!employeeData) return;
      if (autoOpenedLeaveId === openLeaveIdFromQuery) return;

      const existing = leavesData?.find((l) => +l.id === +openLeaveIdFromQuery);
      if (existing) {
        setSelectedRowData(existing);
        setModalVisible(true);
        setAutoOpenedLeaveId(openLeaveIdFromQuery);
        return;
      }

      const response = await fetch(
        `/api/leave/get-all?leaveId=${openLeaveIdFromQuery}&userId=${
          employeeData?.role !== "admin" ? employeeData?.supabase_user_id : null
        }`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );
      const result = await response.json();
      if (response.status === 200 && result?.data?.[0]) {
        const leave = result.data[0];
        const normalized = {
          ...leave,
          name: leave?.employees?.name,
          start_date: moment(leave?.start_date).format("YYYY-MM-DD"),
          end_date: moment(leave?.end_date).format("YYYY-MM-DD"),
        };
        setSelectedRowData(normalized);
        setModalVisible(true);
        setAutoOpenedLeaveId(openLeaveIdFromQuery);
      }
    };

    autoOpen();
  }, [openLeaveIdFromQuery, employeeData, leavesData, autoOpenedLeaveId]);

  useEffect(() => {
    const getLeavesCount = async () => {
      const response = await fetch(
        `/api/leave/get-all?count=${"count"}&userId=${
          employeeData?.supabase_user_id
        }`,
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
    };
    if (employeeData) getLeavesCount();
  }, [employeeData]);

  useEffect(() => {
    if (!modalVisible) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") closeModal();
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [modalVisible]);

  const closeModal = () => {
    setModalVisible(false);
    setSelectedRowData(null);
  };

  const handleIconClick = (rowData) => {
    setSelectedRowData(rowData);
    setModalVisible(true);
  };

  const handleLeaveTypeChange = (e) => {
    const value = e.target.value;
    setCurrentPage(1);
    if (value === "all") {
      setLeaveType({ label: "All", value: "all" });
    } else {
      setLeaveType({ label: value, value });
    }
  };

  const handleStatusChange = (e) => {
    const value = e.target.value;
    setCurrentPage(1);
    if (value === "all") {
      setLeaveStatusFilter({ label: "All", value: "all" });
    } else {
      setLeaveStatusFilter({ label: value, value });
    }
  };

  const handleApprovedLeave = async () => {
    const { error: updateError } = await supabase
      .from("leaves")
      .update({
        approval_status: "Approved",
      })
      .eq("id", selectedRowData?.id);
    if (updateError) {
      console.log(updateError, "updateError");
      return;
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
    closeModal();
  };

  const handleRejectedLeave = async () => {
    const { error: updateError } = await supabase
      .from("leaves")
      .update({
        approval_status: "Rejected",
      })
      .eq("id", selectedRowData?.id);
    if (updateError) {
      console.log(updateError, "updateError");
      return;
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
    closeModal();
  };

  const deleteLeaveHandler = async () => {
    const { error: deleteError } = await supabase
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
      closeModal();
    }
  };

  const canEdit =
    isAdmin ||
    (employeeData?.role !== "admin" &&
      selectedRowData?.approval_status === "Pending");

  const canDelete =
    isAdmin || selectedRowData?.approval_status === "Pending";

  const showApproveReject =
    isAdmin && selectedRowData?.approval_status === "Pending";

  const leaveTypeSelectValue = leaveType?.value || "all";
  const statusSelectValue = leaveStatusFilter?.value || "all";

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>Leaves History</h1>
            <span className={styles.fiscalBadge}>{fiscalInfo.label}</span>
          </div>
          <p className={styles.subtitle}>
            Track, monitor, and submit your annual, sick, and casual workplace
            leave requests.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => router.push("/hrms/employee/leave/create")}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              add
            </span>
            Apply for Leave
          </button>
        </div>
      </div>

      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricTop}>
            <div>
              <span className={styles.metricLabel}>Annual Leaves</span>
              <div className={styles.metricValueRow}>
                <span className={styles.metricValue}>{annualUsed}</span>
                <span className={styles.metricSuffix}>
                  / {annualTotal} used
                </span>
              </div>
            </div>
            <div className={styles.metricIcon}>
              <span className="material-symbols-outlined">beach_access</span>
            </div>
          </div>
          <div className={styles.metricProgress}>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{ width: `${percentUsed(annualUsed, annualTotal)}%` }}
              />
            </div>
            <div className={styles.progressMeta}>
              <span>{annualRemaining} remaining</span>
              <span>{percentUsed(annualUsed, annualTotal)}% consumed</span>
            </div>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricTop}>
            <div>
              <span className={styles.metricLabel}>Sick Leaves</span>
              <div className={styles.metricValueRow}>
                <span className={styles.metricValue}>{sickUsed}</span>
                <span className={styles.metricSuffix}>/ {sickTotal} used</span>
              </div>
            </div>
            <div className={`${styles.metricIcon} ${styles.metricIconSick}`}>
              <span className="material-symbols-outlined">
                medical_services
              </span>
            </div>
          </div>
          <div className={styles.metricProgress}>
            <div className={styles.progressTrack}>
              <div
                className={`${styles.progressFill} ${styles.progressFillSick}`}
                style={{ width: `${percentUsed(sickUsed, sickTotal)}%` }}
              />
            </div>
            <div className={styles.progressMeta}>
              <span>{sickRemaining} remaining</span>
              <span>{percentUsed(sickUsed, sickTotal)}% consumed</span>
            </div>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricTop}>
            <div>
              <span className={styles.metricLabel}>Casual Leaves</span>
              <div className={styles.metricValueRow}>
                <span className={styles.metricValue}>{casualUsed}</span>
                <span className={styles.metricSuffix}>
                  / {casualTotal} used
                </span>
              </div>
            </div>
            <div className={`${styles.metricIcon} ${styles.metricIconCasual}`}>
              <span className="material-symbols-outlined">event_available</span>
            </div>
          </div>
          <div className={styles.metricProgress}>
            <div className={styles.progressTrack}>
              <div
                className={`${styles.progressFill} ${styles.progressFillCasual}`}
                style={{ width: `${percentUsed(casualUsed, casualTotal)}%` }}
              />
            </div>
            <div className={styles.progressMeta}>
              <span>{casualRemaining} remaining</span>
              <span>{percentUsed(casualUsed, casualTotal)}% consumed</span>
            </div>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricTop}>
            <div>
              <span className={styles.metricLabel}>Total Leave Allowance</span>
              <div className={styles.metricValueRow}>
                <span className={styles.metricValue}>{totalRemaining}</span>
                <span className={styles.metricSuffix}>days available</span>
              </div>
            </div>
            <div className={`${styles.metricIcon} ${styles.metricIconTotal}`}>
              <span className="material-symbols-outlined">balance</span>
            </div>
          </div>
          <div className={styles.renewalNote}>
            <span className={styles.renewalDot} />
            <span>
              Quota renews {fiscalInfo.renewsOn}
              {totalAllowance > 0 ? ` · ${totalAllowance} total` : ""}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.filterBar}>
          <div className={styles.filterLeft}>
            <div className={styles.selectWrap}>
              <select
                className={styles.select}
                value={leaveTypeSelectValue}
                onChange={handleLeaveTypeChange}
                aria-label="Leave type"
              >
                <option value="all">All Leave Types</option>
                <option value="Annual">Annual Leave</option>
                <option value="Sick">Sick Leave</option>
                <option value="Casual">Casual Leave</option>
              </select>
              <span
                className={`material-symbols-outlined ${styles.selectChevron}`}
              >
                expand_more
              </span>
            </div>

            <div className={styles.selectWrap}>
              <select
                className={styles.select}
                value={statusSelectValue}
                onChange={handleStatusChange}
                aria-label="Leave status"
              >
                <option value="all">All Statuses</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
                <option value="Rejected">Rejected</option>
              </select>
              <span
                className={`material-symbols-outlined ${styles.selectChevron}`}
              >
                expand_more
              </span>
            </div>

            <div className={styles.dateWrap}>
              <DatePicker
                selected={startDate}
                onChange={(date) => {
                  setCurrentPage(1);
                  setStartDate(date);
                }}
                placeholderText="Search by date..."
                isClearable
              />
              <span className={`material-symbols-outlined ${styles.dateIcon}`}>
                calendar_month
              </span>
            </div>

            {isAdmin ? (
              <input
                className={styles.searchInput}
                type="text"
                value={name}
                onChange={(e) => {
                  setCurrentPage(1);
                  setName(e.target.value);
                }}
                placeholder="Search by name"
                aria-label="Search by name"
              />
            ) : null}
          </div>

          <div className={styles.filterRight}>
            <span>Showing</span>
            <select
              className={styles.pageSelect}
              value={recordsPerPage}
              onChange={(e) => {
                setRecordsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              aria-label="Records per page"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
            </select>
            <span>records</span>
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                {isAdmin ? <th>Name</th> : null}
                <th>Applied On</th>
                <th>From Date</th>
                <th>To Date</th>
                <th>Leave Type</th>
                <th>Duration</th>
                <th>Days</th>
                <th>Status</th>
                <th>View</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 9 : 8}
                    className={styles.loadingRow}
                  >
                    Loading leave records…
                  </td>
                </tr>
              ) : leavesData?.length > 0 ? (
                leavesData.map((leave, index) => (
                  <tr
                    key={leave.id}
                    className={index % 2 === 1 ? styles.rowAlt : undefined}
                  >
                    {isAdmin ? (
                      <td className={styles.cellStrong}>
                        {leave.name || leave?.employees?.name || "—"}
                      </td>
                    ) : null}
                    <td className={styles.cellStrong}>
                      {leave.created_at
                        ? moment(leave.created_at).format("YYYY-MM-DD")
                        : "—"}
                    </td>
                    <td className={styles.cellMuted}>
                      {leave.start_date || "—"}
                    </td>
                    <td className={styles.cellMuted}>
                      {leave.end_date || "—"}
                    </td>
                    <td>
                      <span className={styles.typeCell}>
                        <span
                          className={getTypeDotClass(leave.leave_type)}
                        />
                        {leave.leave_type || "—"}
                      </span>
                    </td>
                    <td className={styles.cellMuted}>
                      {leave.leave_type_duration || "—"}
                    </td>
                    <td className={styles.daysCell}>
                      {leave.duration ?? "—"}
                    </td>
                    <td>
                      <span className={styles.statusBadge}>
                        <span
                          className={`${styles.statusDot} ${getStatusDotClass(
                            leave.approval_status
                          )}`}
                        />
                        {leave.approval_status || "—"}
                      </span>
                    </td>
                    <td className={styles.actionCell}>
                      <button
                        type="button"
                        className={styles.viewBtn}
                        title="View details"
                        aria-label="View leave details"
                        onClick={() => handleIconClick(leave)}
                      >
                        <span className="material-symbols-outlined">
                          open_in_new
                        </span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={isAdmin ? 9 : 8}
                    className={styles.emptyRow}
                  >
                    No leave records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.paginationBar}>
          <span className={styles.paginationInfo}>
            Showing{" "}
            <span className={styles.paginationBold}>{showingFrom}</span> to{" "}
            <span className={styles.paginationBold}>{showingTo}</span> of{" "}
            <span className={styles.paginationBold}>{totalRecord}</span>{" "}
            entries
          </span>
          <div className={styles.pageBtns}>
            <button
              type="button"
              className={styles.pageBtn}
              aria-label="Previous page"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 16 }}
              >
                chevron_left
              </span>
            </button>
            {pageNumbers.map((num, idx) => {
              const prev = pageNumbers[idx - 1];
              const showEllipsis = prev && num - prev > 1;
              return (
                <React.Fragment key={num}>
                  {showEllipsis ? (
                    <span className={styles.pageEllipsis}>…</span>
                  ) : null}
                  <button
                    type="button"
                    className={`${styles.pageBtn} ${
                      num === currentPage ? styles.pageBtnActive : ""
                    }`}
                    onClick={() => setCurrentPage(num)}
                  >
                    {num}
                  </button>
                </React.Fragment>
              );
            })}
            <button
              type="button"
              className={styles.pageBtn}
              aria-label="Next page"
              disabled={currentPage >= totalPages}
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 16 }}
              >
                chevron_right
              </span>
            </button>
          </div>
        </div>
      </div>

      {modalVisible && selectedRowData ? (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="leaveModalTitle"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleRow}>
                <span className={styles.modalIcon}>
                  <span className="material-symbols-outlined">description</span>
                </span>
                <h2 id="leaveModalTitle" className={styles.modalTitle}>
                  Leave Request Details
                </h2>
              </div>
              <button
                type="button"
                className={styles.modalClose}
                onClick={closeModal}
                aria-label="Close"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.employeeStrip}>
                <div className={styles.employeeLeft}>
                  <span className={styles.avatarInitial}>
                    {getInitials(
                      selectedRowData?.employees?.name || selectedRowData?.name
                    )}
                  </span>
                  <div>
                    <span className={styles.employeeName}>
                      {selectedRowData?.employees?.name ||
                        selectedRowData?.name ||
                        "Employee"}
                    </span>
                    <span className={styles.employeeHint}>
                      Leave request #{selectedRowData?.id}
                    </span>
                  </div>
                </div>
                <span className={styles.statusBadge}>
                  <span
                    className={`${styles.statusDot} ${getStatusDotClass(
                      selectedRowData?.approval_status
                    )}`}
                  />
                  {selectedRowData?.approval_status || "—"}
                </span>
              </div>

              <div className={styles.infoGrid}>
                <div className={styles.infoCell}>
                  <span className={styles.infoLabel}>Applied On</span>
                  <span className={styles.infoValue}>
                    {selectedRowData?.created_at
                      ? moment(selectedRowData.created_at).format(
                          "dddd, DD MMM, YYYY"
                        )
                      : "—"}
                  </span>
                </div>
                <div className={styles.infoCell}>
                  <span className={styles.infoLabel}>Leave Classification</span>
                  <span className={styles.infoValue}>
                    {selectedRowData?.leave_type || "—"}
                    {selectedRowData?.leave_type_duration
                      ? ` (${selectedRowData.leave_type_duration})`
                      : ""}
                  </span>
                </div>
                <div className={styles.infoCell}>
                  <span className={styles.infoLabel}>Start Date</span>
                  <span className={styles.infoValue}>
                    {selectedRowData?.start_date
                      ? moment(selectedRowData.start_date).format(
                          "dddd, DD MMM, YYYY"
                        )
                      : "—"}
                  </span>
                </div>
                <div className={styles.infoCell}>
                  <span className={styles.infoLabel}>End Date</span>
                  <span className={styles.infoValue}>
                    {selectedRowData?.end_date
                      ? moment(selectedRowData.end_date).format(
                          "dddd, DD MMM, YYYY"
                        )
                      : "—"}
                  </span>
                </div>
              </div>

              <div className={styles.reasonBlock}>
                <span className={styles.infoLabel}>Reason & Justification</span>
                <p className={styles.reasonText}>
                  {selectedRowData?.content
                    ? `“${selectedRowData.content}”`
                    : "No reason provided."}
                </p>
              </div>

              <div className={styles.auditSection}>
                <span className={styles.infoLabel}>Request Reference</span>
                <div className={styles.auditCard}>
                  <div className={styles.auditLeft}>
                    <span className={styles.auditIcon}>
                      <span className="material-symbols-outlined">
                        verified_user
                      </span>
                    </span>
                    <div>
                      <span className={styles.auditTitle}>
                        {selectedRowData?.approval_status || "Pending"} status
                      </span>
                      <span className={styles.auditMeta}>
                        Applied{" "}
                        {selectedRowData?.created_at
                          ? moment(selectedRowData.created_at).format(
                              "MMM DD, YYYY"
                            )
                          : "—"}
                        {selectedRowData?.duration != null
                          ? ` · ${selectedRowData.duration} day(s)`
                          : ""}
                      </span>
                    </div>
                  </div>
                  <span className={styles.auditId}>
                    ID: #{selectedRowData?.id}
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <div className={styles.modalActionsLeft}>
                {canDelete ? (
                  <button
                    type="button"
                    className={`${styles.btnText} ${styles.btnTextDanger}`}
                    onClick={deleteLeaveHandler}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 16 }}
                    >
                      delete
                    </span>
                    Delete
                  </button>
                ) : null}
                {canEdit ? (
                  <button
                    type="button"
                    className={styles.btnText}
                    onClick={() => {
                      router.push(
                        `/hrms/employee/leave/edit/${selectedRowData?.id}`
                      );
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 16 }}
                    >
                      edit
                    </span>
                    Edit
                  </button>
                ) : null}
              </div>

              {showApproveReject ? (
                <>
                  <button
                    type="button"
                    className={styles.btnApprove}
                    onClick={handleApprovedLeave}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className={styles.btnReject}
                    onClick={handleRejectedLeave}
                  >
                    Reject
                  </button>
                </>
              ) : null}

              <button
                type="button"
                className={styles.btnPrimary}
                onClick={closeModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default LeaveListComponent;
