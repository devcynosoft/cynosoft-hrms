"use client";

import React from "react";
import { useParams } from "next/navigation";
import EmployeeDetailsComponent from "@/components/employee/details";

const EmployeeDetailsPage = () => {
  const { id } = useParams();
  return <EmployeeDetailsComponent empId={id} />;
};

export default EmployeeDetailsPage;
