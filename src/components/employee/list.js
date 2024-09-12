"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Select from "react-select";
import DynamicTable from "../table";
import styles from "./employee.module.css";
import { Button } from "react-bootstrap";
import SearchField from "../SearchField";
import useIsMobile from "@/utils/useIsMobile";

const EmployeeListComponent = () => {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [employeeData, setEmployeeData] = useState([]);
  const [jobStatus, setJobStatus] = useState(null);
  const [name, setName] = useState("");
  const [totalRecord, setTotalRecord] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(5);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const getEmployeeDetail = async () => {
      const start = (currentPage - 1) * recordsPerPage;
      const end = start + recordsPerPage - 1;
      setIsLoading(true);
      const response = await fetch(
        `/api/employee/get-all?start=${start}&end=${end}&name=${name}&jobStatus=${JSON.stringify(
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
      }
    };
    getEmployeeDetail();
  }, [currentPage, recordsPerPage, name, jobStatus]);

  const handleIconClick = (rowData) => {
    router.push(`/hrms/employee/edit/${rowData?.id}`);
  };

  const configData = [
    {
      label: "Image",
      key: "pic",
    },
    {
      label: "Employee Name",
      key: "name",
    },
    {
      label: "Email Address",
      key: "email",
    },
    {
      label: "Role",
      key: "role",
    },
    {
      label: "Contact No",
      key: "contact",
    },
    {
      label: "Joining Date",
      key: "created_at",
    },
    {
      label: "Action",
      isIcon: true,
      icon: "/assets/icons/Edit.svg",
    },
  ];
  return (
    <div className="mainContainer">
      <div className={styles.listForm}>
        <span style={{ fontSize: "30px", fontWeight: "700" }}>
          Employee List
        </span>
        <div
          className={`${styles.searchField} d-flex justify-content-between mt-4 align-items-center`}
        >
          <div className="mb-2 mb-md-0">
            <Select
              value={jobStatus}
              name="role"
              className="hrms-field"
              placeholder="Select Job Status"
              onChange={(val) => {
                setJobStatus(val);
              }}
              options={[
                { label: "All", value: "all" },
                { label: "Current", value: true },
                { label: "Left", value: false },
              ]}
            />
          </div>
          <SearchField
            value={name}
            placeholder="Search by name"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div
          className={`d-flex justify-content-end mt-3 mb-3 ${styles.btnCont}`}
        >
          <Button
            className={`hrms-button`}
            variant="primary"
            size="md"
            type="submit"
            style={{ width: "206px", height: "40px" }}
            onClick={() => router.push("/hrms/employee/create")}
          >
            Add Employee
          </Button>
        </div>
        <div className="table">
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
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default EmployeeListComponent;
