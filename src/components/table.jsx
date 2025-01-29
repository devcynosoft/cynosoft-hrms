import moment from "moment";
import Image from "next/image";
import React from "react";
import CustomPagination from "./Pagination";

const DynamicTable = ({
  config,
  data,
  totalRecord,
  currentPage,
  recordsPerPage,
  setCurrentPage,
  setRecordsPerPage,
  onIconClick,
  tableHeight,
  isLoading,
}) => {
  return (
    <>
      <div className="table-container" style={{ height: `${tableHeight}vh` }}>
        <table className="table">
          <thead>
            <tr>
              {config?.map((column, index) => (
                <th style={{ minWidth: "120px" }} scope="col" key={index}>
                  {column?.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="text-center" colSpan="8">
                  Data Loading...
                </td>
              </tr>
            ) : data && data.length > 0 ? (
              data?.map((row, rowIndex) => (
                <tr className="tr" key={rowIndex}>
                  {config?.map((column, colIndex) => (
                    <td key={colIndex}>
                      {column?.isIcon ? (
                        <Image
                          style={{ cursor: "pointer" }}
                          src={column.icon}
                          width={20}
                          height={20}
                          alt="image"
                          onClick={() => onIconClick(row)}
                        />
                      ) : column?.key === "approval_status" ? (
                        <div
                          className={`${
                            row[column?.key] === "Pending"
                              ? "pendingStatus"
                              : row[column?.key] === "Approved"
                              ? "approvedStatus"
                              : "rejectedStatus"
                          }`}
                        >
                          {row[column?.key]}
                        </div>
                      ) : column?.key === "created_at" ? (
                        moment(row[column?.key]).format("YYYY-MM-DD")
                      ) : column?.key === "pic" ? (
                        <Image
                          src={
                            row[column?.key]
                              ? row[column?.key]
                              : "/assets/images/emp-static-pic.png"
                          }
                          width={40}
                          height={40}
                          style={{ objectFit: "cover", borderRadius: "50%" }}
                          alt="image"
                        />
                      ) : (
                        row[column?.key] || "N/A"
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="text-center" colSpan="8">
                  No Data Found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {data && data?.length ? (
        <CustomPagination
          totalRecords={totalRecord}
          recordsPerPage={recordsPerPage}
          setRecordsPerPage={setRecordsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      ) : (
        ""
      )}
    </>
  );
};

export default DynamicTable;
