"use client";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "@/styles/hrms-tokens.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "react-datepicker/dist/react-datepicker.css";
import "react-toastify/dist/ReactToastify.css";
import "react-time-picker/dist/TimePicker.css";
import React from "react";
import { usePathname } from "next/navigation";
import { EmployeeProvider, useEmployee } from "@/context/EmployeeContext";
import { ToastContainer } from "react-toastify";
import HeaderComponent from "@/components/header";
import SidebarComponent from "@/components/sidebar";
import { SpeedInsights } from "@vercel/speed-insights/next";
import shell from "./hrms-shell.module.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export default function RootLayout({ children }) {
  const pathname = usePathname();

  const noLayoutRoutes = ["/login", "/reset-password", "/hrms/unauthorized/"];

  const isLayoutExcluded = noLayoutRoutes.some((route) =>
    pathname.includes(route)
  );

  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon/favicon.ico" type="image/png" />
        <link
          rel="stylesheet"
          type="text/css"
          charSet="UTF-8"
          href="https://cdnjs.cloudflare.com/ajax/libs/slick-carousel/1.6.0/slick.min.css"
        />
        <link
          rel="stylesheet"
          type="text/css"
          href="https://cdnjs.cloudflare.com/ajax/libs/slick-carousel/1.6.0/slick-theme.min.css"
        />
      </head>
      <body className={`${inter.variable} ${plusJakarta.variable} ${inter.className}`}>
        <EmployeeProvider>
          {isLayoutExcluded ? (
            children
          ) : (
            <LayoutWrapper>{children}</LayoutWrapper>
          )}
          <SpeedInsights />
        </EmployeeProvider>
      </body>
    </html>
  );
}

const LayoutWrapper = ({ children }) => {
  const { employeeData } = useEmployee();

  return (
    <React.Fragment>
      <ToastContainer />
      <div className={shell.app}>
        <SidebarComponent />
        <div className={shell.mainColumn}>
          <HeaderComponent empData={employeeData} />
          <main className={shell.content}>{children}</main>
        </div>
      </div>
    </React.Fragment>
  );
};
