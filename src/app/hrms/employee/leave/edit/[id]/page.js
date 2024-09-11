"use client";
import React from "react";
import LeaveCreateComponent from "@/components/leave/create";
import { useParams } from "next/navigation";
const LeaveEdit = () => {
  const { id } = useParams();
  return <LeaveCreateComponent leaveId={id} />;
};

export default LeaveEdit;
