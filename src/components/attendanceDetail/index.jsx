"use client";
import React, { useEffect, useState } from "react";
import styles from "./attendanceList.module.css";
import moment from "moment";
import DatePicker from "react-datepicker";
import { useRouter } from "next/navigation";
import ButtonLoader from "../ButtonLoader.jsx";
import { toast } from "react-toastify";
import { generateAttendancePdf } from "@/utils/pdfGenerator";

const AttendanceDetailComponent = () => {
  const router = useRouter();
  const [employeeData, setEmployeeData] = useState([]);
  const [name, setName] = useState("");
  const [debouncedName, setDebouncedName] = useState(name);
  const [totalRecord, setTotalRecord] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(5);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedName(name);
    }, process.env.NEXT_PUBLIC_DEBOUNCE_DELAY);

    return () => {
      clearTimeout(handler);
    };
  }, [name]);

  const getEmployeeAttendance = async () => {
    const startOfToday = new Date(startDate);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date(endDate);
    endOfToday.setHours(23, 59, 59, 999);

    const start = (currentPage - 1) * recordsPerPage;
    const end = start + recordsPerPage - 1;
    setIsLoading(true);
    const response = await fetch(
      `/api/attendance/get-all?start=${start}&end=${end}&name=${debouncedName}&startOfToday=${startOfToday}&endOfToday=${endOfToday}&startDate=${startDate}&endDate=${endDate}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const result = await response.json();

    if (response.status === 200) {
      const formattedData = result?.data?.data?.map((att) => ({
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
        hour: att?.total_hour || "",
        earlyOut: Boolean(att?.early_out),
      }));
      setIsLoading(false);
      setEmployeeData(formattedData);
      setTotalRecord(result?.data?.count);
    } else {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getEmployeeAttendance();
  }, [currentPage, recordsPerPage, debouncedName, startDate, endDate]);

  const handleEditClick = (rowData) => {
    router.push(`/hrms/employee/attendance/edit/${rowData?.id}`);
  };

  const handleDeleteClick = async (rowData) => {
    if (
      window.confirm(
        `Are you sure you want to delete the attendance record for ${rowData?.name} on ${rowData?.date}?`
      )
    ) {
      setDeleteLoading(true);
      try {
        const response = await fetch(
          `/api/attendance/delete?attendId=${rowData?.id}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const result = await response.json();

        if (response.status === 200) {
          toast.success("Attendance record deleted successfully", {
            position: "bottom-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "colored",
          });
          getEmployeeAttendance();
        } else {
          toast.error(result?.error || "Failed to delete attendance record", {
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
        toast.error("Something went wrong while deleting the record", {
          position: "bottom-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "colored",
        });
      } finally {
        setDeleteLoading(false);
      }
    }
  };

  const filteredPdfHandler = async () => {
    try {
      if ((startDate || endDate) && name) {
        setPdfLoading(true);
        const startOfToday = new Date(startDate);
        startOfToday.setHours(0, 0, 0, 0);

        const endOfToday = new Date(endDate);
        endOfToday.setHours(23, 59, 59, 999);

        const response = await fetch(
          `/api/attendance/get-all?name=${debouncedName}&startOfToday=${startOfToday}&endOfToday=${endOfToday}&startDate=${startDate}&endDate=${endDate}`,
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
          setPdfLoading(false);
        } else {
          setPdfLoading(false);
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
      setPdfLoading(false);
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

  const totalPages = Math.max(1, Math.ceil(totalRecord / recordsPerPage) || 1);
  const showingFrom =
    totalRecord === 0 ? 0 : (currentPage - 1) * recordsPerPage + 1;
  const showingTo = Math.min(currentPage * recordsPerPage, totalRecord);

  const pageNumbers = (() => {
    const pages = [];
    const maxButtons = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxButtons - 1);
    start = Math.max(1, end - maxButtons + 1);
    for (let i = start; i <= end; i += 1) {
      pages.push(i);
    }
    return pages;
  })();

  const tableBusy = isLoading || deleteLoading;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>Employee Attendance</h1>
          </div>
          <p className={styles.subtitle}>
            Review check-in and check-out records, export reports, and manage
            attendance entries.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.btnGhost}
            onClick={filteredPdfHandler}
            disabled={pdfLoading}
          >
            {pdfLoading ? (
              <ButtonLoader />
            ) : (
              <>
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 18 }}
                >
                  picture_as_pdf
                </span>
                Download PDF
              </>
            )}
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => router.push("/hrms/employee/attendance/create")}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              add
            </span>
            Add Attendance
          </button>
        </div>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.filterBar}>
          <div className={styles.filterLeft}>
            <div className={styles.dateWrap}>
              <DatePicker
                selected={startDate}
                onChange={(date) => {
                  setCurrentPage(1);
                  setStartDate(date);
                }}
                placeholderText="Start Date"
                isClearable
              />
              <span className={`material-symbols-outlined ${styles.dateIcon}`}>
                calendar_month
              </span>
            </div>

            <div className={styles.dateWrap}>
              <DatePicker
                selected={endDate}
                onChange={(date) => {
                  setCurrentPage(1);
                  setEndDate(date);
                }}
                placeholderText="End Date"
                isClearable
              />
              <span className={`material-symbols-outlined ${styles.dateIcon}`}>
                calendar_month
              </span>
            </div>

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
                <th>Date</th>
                <th>Employee Name</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Total Hour</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {tableBusy ? (
                <tr>
                  <td colSpan={6} className={styles.loadingRow}>
                    Loading attendance records…
                  </td>
                </tr>
              ) : employeeData?.length > 0 ? (
                employeeData.map((row, index) => (
                  <tr
                    key={row.id}
                    className={index % 2 === 1 ? styles.rowAlt : undefined}
                  >
                    <td className={styles.cellStrong}>{row.date || "—"}</td>
                    <td className={styles.cellStrong}>{row.name || "—"}</td>
                    <td className={styles.cellMuted}>{row.checkIn || "—"}</td>
                    <td className={styles.cellMuted}>{row.checkOut || "—"}</td>
                    <td className={styles.cellMuted}>
                      {row.hour || "—"}
                      {row.earlyOut ? (
                        <span className={styles.earlyOut}>Early out</span>
                      ) : null}
                    </td>
                    <td className={styles.actionCell}>
                      <div className={styles.actionBtns}>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          title="Edit"
                          aria-label="Edit attendance"
                          onClick={() => handleEditClick(row)}
                        >
                          <span className="material-symbols-outlined">
                            edit
                          </span>
                        </button>
                        <button
                          type="button"
                          className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                          title="Delete"
                          aria-label="Delete attendance"
                          onClick={() => handleDeleteClick(row)}
                        >
                          <span className="material-symbols-outlined">
                            delete
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className={styles.emptyRow}>
                    No attendance records found.
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
    </div>
  );
};

export default AttendanceDetailComponent;
