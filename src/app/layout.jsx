"use client";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "@/styles/hrms-tokens.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "react-datepicker/dist/react-datepicker.css";
import "react-toastify/dist/ReactToastify.css";
import "react-time-picker/dist/TimePicker.css";
import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import { EmployeeProvider, useEmployee } from "@/context/EmployeeContext";
import { ToastContainer } from "react-toastify";
import HeaderComponent from "@/components/header";
import SidebarComponent from "@/components/sidebar";
import { SpeedInsights } from "@vercel/speed-insights/next";
import shell from "./hrms-shell.module.css";

const MATERIAL_ICONS_HREF =
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block";

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

function markMaterialIconsReady() {
  if (typeof document === "undefined") return;
  document.documentElement.classList.add("material-icons-ready");
}

export default function RootLayout({ children }) {
  const pathname = usePathname();

  const noLayoutRoutes = ["/login", "/reset-password", "/hrms/unauthorized/"];

  const isLayoutExcluded = noLayoutRoutes.some((route) =>
    pathname.includes(route)
  );

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) markMaterialIconsReady();
    }, 2000);

    const ready = async () => {
      try {
        if (document.fonts?.load) {
          await document.fonts.load('24px "Material Symbols Outlined"');
        }
        if (document.fonts?.ready) {
          await document.fonts.ready;
        }
      } catch {
        // Fall through to mark ready anyway
      }
      if (!cancelled) markMaterialIconsReady();
    };

    ready();
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []);

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link rel="preload" as="style" href={MATERIAL_ICONS_HREF} />
        <link href={MATERIAL_ICONS_HREF} rel="stylesheet" />
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
