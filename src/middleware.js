import { NextResponse } from "next/server";
import { parse } from "cookie";
import isTokenValid from "./utils/tokenValidation";
import { DecryptData } from "./utils/encrypt";
import { supabase } from "./utils/supabaseClient";

export async function middleware(req) {
  let isValid = false;
  let decryptExpireAt;
  const { pathname } = req.nextUrl;

  const cookieHeader = req.headers.get("cookie");
  const adminRoutes = [
    "/hrms/employee/attendance/create/",
    "/hrms/employee/attendance/edit/",
    "/hrms/employee/create/",
  ];

  const encryptExpireAt = req.cookies.get("expires_at");

  if (encryptExpireAt) {
    decryptExpireAt = DecryptData(encryptExpireAt.value);
    isValid = isTokenValid(+decryptExpireAt);
  }

  if (pathname === "/" || pathname === "/hrms/") {
    if (isValid) {
      return NextResponse.redirect(new URL("/hrms/dashboard", req.url));
    } else {
      return NextResponse.redirect(new URL("/hrms/login", req.url));
    }
  }

  if (
    pathname.startsWith("/hrms/dashboard") ||
    pathname.startsWith("/hrms/employee")
  ) {
    if (!isValid) {
      return NextResponse.redirect(new URL("/hrms/login", req.url));
    }
  }

  if (pathname === "/hrms/login/" || pathname === "/hrms/reset-password/") {
    if (isValid) {
      return NextResponse.redirect(new URL("/hrms/dashboard", req.url));
    }
  }

  const cookies = cookieHeader ? parse(cookieHeader) : {};
  const userId = cookies["user_id"];
  if (userId) {
    const { data: employeeData, error: employeeError } = await supabase
      .from("employees")
      .select("*")
      .eq("supabase_user_id", userId)
      .single();
    const isAdminRoute = adminRoutes.some((route) =>
      pathname.startsWith(route)
    );
    if (isAdminRoute && employeeData?.role !== "admin") {
      return NextResponse.redirect(new URL("/hrms/unauthorized", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/hrms/:path*", "/"],
};
