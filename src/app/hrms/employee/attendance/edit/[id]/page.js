"use client";
import React from "react";
import AttendanceEditComponent from "@/components/attendanceDetail/editComponent";
import { useParams } from "next/navigation";
const AttendanceEdit = () => {
  const { id } = useParams();
  return <AttendanceEditComponent attendId={id} />;
};

export default AttendanceEdit;
