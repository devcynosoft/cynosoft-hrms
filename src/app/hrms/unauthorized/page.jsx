"use client";

import React from "react";
import { useRouter } from "next/navigation";

const UnauthorizedPage = () => {
  const router = useRouter();

  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        fontFamily: "var(--font-inter), sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "28rem",
          width: "100%",
          textAlign: "center",
          padding: "2rem 1.5rem",
          borderRadius: "0.75rem",
          background: "var(--hrms-surface-container-lowest, #fff)",
          boxShadow: "var(--hrms-shadow-sm, 0 1px 3px rgba(0,0,0,0.08))",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--font-plus-jakarta), sans-serif",
            fontSize: "1.5rem",
            fontWeight: 700,
          }}
        >
          Unauthorized
        </h1>
        <p
          style={{
            margin: "0.75rem 0 1.5rem",
            color: "var(--hrms-on-surface-variant, #64748b)",
            fontSize: "0.875rem",
            lineHeight: 1.5,
          }}
        >
          You do not have permission to view this page. Only admins can access
          employee analytics details.
        </p>
        <button
          type="button"
          onClick={() => router.push("/hrms/dashboard")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.35rem",
            padding: "0.625rem 1rem",
            border: "none",
            borderRadius: "0.5rem",
            background: "var(--hrms-primary-container, #002046)",
            color: "var(--hrms-on-primary, #fff)",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Go to dashboard
        </button>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
