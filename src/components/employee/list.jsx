"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import moment from "moment";
import styles from "./employeeList.module.css";

const EmployeeListComponent = () => {
  const router = useRouter();
  const [employeeData, setEmployeeData] = useState([]);
  const [jobStatus, setJobStatus] = useState(null);
  const [name, setName] = useState("");
  const [debouncedName, setDebouncedName] = useState(name);
  const [totalRecord, setTotalRecord] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedName(name);
    }, process.env.NEXT_PUBLIC_DEBOUNCE_DELAY);

    return () => {
      clearTimeout(handler);
    };
  }, [name]);

  useEffect(() => {
    const getEmployeeDetail = async () => {
      const start = (currentPage - 1) * recordsPerPage;
      const end = start + recordsPerPage - 1;
      setIsLoading(true);
      const response = await fetch(
        `/api/employee/get-all?start=${start}&end=${end}&name=${debouncedName}&jobStatus=${JSON.stringify(
          jobStatus
        )}`,
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
        setEmployeeData(result?.data?.data);
        setTotalRecord(result?.data?.count);
      } else {
        setIsLoading(false);
      }
    };
    getEmployeeDetail();
  }, [currentPage, recordsPerPage, debouncedName, jobStatus]);

  const handleEditClick = (rowData) => {
    router.push(`/hrms/employee/edit/${rowData?.id}`);
  };

  const handleDetailsClick = (rowData) => {
    router.push(`/hrms/employee/details/${rowData?.id}`);
  };

  const jobStatusValue =
    jobStatus == null
      ? ""
      : jobStatus.value === "all"
        ? "all"
        : jobStatus.value === true
          ? "true"
          : "false";

  const handleJobStatusChange = (e) => {
    const value = e.target.value;
    setCurrentPage(1);
    if (!value) {
      setJobStatus(null);
      return;
    }
    if (value === "all") {
      setJobStatus({ label: "All", value: "all" });
      return;
    }
    if (value === "true") {
      setJobStatus({ label: "Current", value: true });
      return;
    }
    setJobStatus({ label: "Left", value: false });
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

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>Employee List</h1>
          </div>
          <p className={styles.subtitle}>
            Browse employee profiles, filter by job status, and open records to
            view analytics or edit.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => router.push("/hrms/employee/create")}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              person_add
            </span>
            Add Employee
          </button>
        </div>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.filterBar}>
          <div className={styles.filterLeft}>
            <div className={styles.selectWrap}>
              <select
                className={styles.select}
                value={jobStatusValue}
                onChange={handleJobStatusChange}
                aria-label="Job status"
              >
                <option value="">Select Job Status</option>
                <option value="all">All</option>
                <option value="true">Current</option>
                <option value="false">Left</option>
              </select>
              <span
                className={`material-symbols-outlined ${styles.selectChevron}`}
              >
                expand_more
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
                <th>Employee</th>
                <th>Email Address</th>
                <th>Role</th>
                <th>Contact No</th>
                <th>Joining Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className={styles.loadingRow}>
                    Loading employees…
                  </td>
                </tr>
              ) : employeeData?.length > 0 ? (
                employeeData.map((row, index) => (
                  <tr
                    key={row.id}
                    className={index % 2 === 1 ? styles.rowAlt : undefined}
                  >
                    <td>
                      <span className={styles.nameCell}>
                        <Image
                          src={row.pic || "/assets/images/emp-static-pic.png"}
                          width={40}
                          height={40}
                          className={styles.avatar}
                          alt=""
                        />
                        <span className={styles.cellStrong}>
                          {row.name || "—"}
                        </span>
                      </span>
                    </td>
                    <td className={styles.cellMuted}>{row.email || "—"}</td>
                    <td>
                      <span className={styles.roleBadge}>
                        {row.role || "—"}
                      </span>
                    </td>
                    <td className={styles.cellMuted}>{row.contact || "—"}</td>
                    <td className={styles.cellMuted}>
                      {row.created_at
                        ? moment(row.created_at).format("YYYY-MM-DD")
                        : "—"}
                    </td>
                    <td>
                      <span className={styles.statusBadge}>
                        <span
                          className={`${styles.statusDot} ${
                            row.is_current
                              ? styles.statusCurrent
                              : styles.statusLeft
                          }`}
                        />
                        {row.is_current ? "Current" : "Left"}
                      </span>
                    </td>
                    <td className={styles.actionCell}>
                      <div className={styles.actionGroup}>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          title="View details"
                          aria-label="View employee details"
                          onClick={() => handleDetailsClick(row)}
                        >
                          <span className="material-symbols-outlined">
                            visibility
                          </span>
                        </button>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          title="Edit"
                          aria-label="Edit employee"
                          onClick={() => handleEditClick(row)}
                        >
                          <span className="material-symbols-outlined">edit</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className={styles.emptyRow}>
                    No employees found.
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

export default EmployeeListComponent;
