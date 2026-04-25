import LeaveListComponent from "@/components/leave/list";
import React, { Suspense } from "react";

const EmployeeList = () => {
  return (
    <Suspense fallback={<div />}>
      <LeaveListComponent />
    </Suspense>
  );
};

export default EmployeeList;
