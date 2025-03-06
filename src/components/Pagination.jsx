import React from "react";
import Pagination from "react-bootstrap/Pagination";

const CustomPagination = ({
  totalRecords,
  recordsPerPage,
  setRecordsPerPage,
  currentPage,
  onPageChange,
}) => {
  const totalPages = Math.ceil(totalRecords / recordsPerPage);

  const handlePageChange = (page) => {
    if (page !== currentPage && page > 0 && page <= totalPages) {
      onPageChange(page);
    }
  };

  const handleRecordsPerPageChange = (event) => {
    setRecordsPerPage(Number(event.target.value));
    onPageChange(1); // Reset to first page after changing the limit
  };

  // let items = [];
  // for (let number = 1; number <= totalPages; number++) {
  //   items.push(
  //     <Pagination.Item
  //       key={number}
  //       active={number === currentPage}
  //       onClick={() => handlePageChange(number)}
  //     >
  //       {number}
  //     </Pagination.Item>
  //   );
  // }
  const generatePaginationItems = () => {
    const items = [];
    const pageRangeToShow = 1; // Number of pages to show on either side of the current page
    const boundaryPagesToShow = 1; // Number of boundary pages (start and end)

    if (totalPages <= 5) {
      for (let number = 1; number <= totalPages; number++) {
        items.push(
          <Pagination.Item
            key={number}
            active={number === currentPage}
            onClick={() => handlePageChange(number)}
          >
            {number}
          </Pagination.Item>
        );
      }
    } else {
      // Show boundary pages, current page, and ellipses
      const startPages = [...Array(boundaryPagesToShow)].map((_, i) => i + 1);
      const endPages = [...Array(boundaryPagesToShow)]
        .map((_, i) => totalPages - i)
        .reverse();

      const middlePages = [...Array(pageRangeToShow * 2 + 1)]
        .map((_, i) => currentPage - pageRangeToShow + i)
        .filter(
          (page) =>
            page > boundaryPagesToShow &&
            page < totalPages - boundaryPagesToShow + 1
        );

      const pagesToShow = [
        ...new Set([...startPages, ...middlePages, ...endPages]),
      ];

      pagesToShow.forEach((number, i, arr) => {
        if (i > 0 && number !== arr[i - 1] + 1) {
          items.push(<Pagination.Ellipsis key={`ellipsis-${i}`} />);
        }
        items.push(
          <Pagination.Item
            key={number}
            active={number === currentPage}
            onClick={() => handlePageChange(number)}
          >
            {number}
          </Pagination.Item>
        );
      });
    }

    return items;
  };

  return (
    <div className="d-flex justify-content-between mt-1 align-items-start align-items-md-center w-100 flex-column-reverse flex-md-row">
      <div
        className={`d-flex justify-content-center justify-content-md-start pagination-num mt-2 mt-md-0`}
      >
        <Pagination>
          <Pagination.Prev
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          />
          {generatePaginationItems()}
          <Pagination.Next
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          />
        </Pagination>
      </div>
      <div className="d-flex justify-content-center gap-1 align-items-center justify-content-md-end w-100">
        Showing{" "}
        <select
          style={{ padding: "0px" }}
          value={recordsPerPage}
          onChange={handleRecordsPerPageChange}
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={20}>20</option>
        </select>{" "}
        records out of <strong>{totalRecords}</strong>
      </div>
    </div>
  );
};

export default CustomPagination;
