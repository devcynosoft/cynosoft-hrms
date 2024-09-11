'use client'
import React from "react";
import EmployeeCreateComponent from "@/components/employee/create";
import { useParams } from "next/navigation";

const EmployeeEdit = () => {
  const { id } = useParams();
  return <EmployeeCreateComponent empId={id}/>;
};

export default EmployeeEdit;
