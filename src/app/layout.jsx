"use client";
import { Cairo } from "next/font/google";
import "./globals.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "react-datepicker/dist/react-datepicker.css";
import "react-toastify/dist/ReactToastify.css";
import "react-time-picker/dist/TimePicker.css";
// import { Stack } from "@mui/system";
import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { EmployeeProvider, useEmployee } from "@/context/EmployeeContext";
import { ToastContainer } from "react-toastify";
import HeaderComponent from "@/components/header";
import SidebarComponent from "@/components/sidebar";
import useIsMobile from "@/utils/useIsMobile";
import { SpeedInsights } from "@vercel/speed-insights/next";

const cairo = Cairo({ subsets: ["latin"] });

// export const metadata = {
//   title: "CYNOSOFT",
//   description: "Software Company",
// };

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
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap"
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
      <body className={cairo.className}>
        {
          <EmployeeProvider>
            {isLayoutExcluded ? (
              children
            ) : (
              <LayoutWrapper>{children}</LayoutWrapper>
            )}
            <SpeedInsights />
          </EmployeeProvider>
        }
      </body>
    </html>
  );
}

const LayoutWrapper = ({ children }) => {
  const isMobile = useIsMobile();
  const { employeeData } = useEmployee();

  return (
    <React.Fragment>
      <ToastContainer />
      <div className="hrms-container">
        <SidebarComponent employeeData={employeeData} />
        <div className="hrms-content">
          {!isMobile && <HeaderComponent empData={employeeData} />}
          <div className="main-content">{children}</div>
        </div>
      </div>
    </React.Fragment>
  );
};
