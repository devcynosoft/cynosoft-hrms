import { NextResponse } from "next/server";
import { parse } from "cookie";
import isTokenValid from "./utils/tokenValidation";
import { DecryptData } from "./utils/encrypt";
import { supabase } from "./utils/supabaseClient";

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const cookieHeader = req.headers.get("cookie");
  const cookies = cookieHeader ? parse(cookieHeader) : {};
  const userId = cookies["user_id"];
  const encryptedExpireAt = req.cookies.get("expires_at");

  let isValid = false;
  if (encryptedExpireAt) {
    const decryptedExpireAt = DecryptData(encryptedExpireAt.value);
    isValid = isTokenValid(+decryptedExpireAt);
  }
  console.log("middleware calling");
  // Public Routes
  if (pathname === "/" || pathname === "/hrms/") {
    return NextResponse.redirect(
      new URL(isValid ? "/hrms/dashboard" : "/hrms/login", req.url)
    );
  }

  if (pathname === "/hrms/login/" || pathname === "/hrms/reset-password/") {
    return isValid
      ? NextResponse.redirect(new URL("/hrms/dashboard", req.url))
      : NextResponse.next();
  }

  // Protected Routes
  if (
    pathname.startsWith("/hrms/dashboard") ||
    pathname.startsWith("/hrms/employee")
  ) {
    if (!isValid) {
      return NextResponse.redirect(new URL("/hrms/login", req.url));
    }
  }

  // Admin Routes
  const adminRoutes = [
    "/hrms/employee/attendance/create/",
    "/hrms/employee/attendance/edit/",
    "/hrms/employee/create/",
  ];

  if (userId && adminRoutes.some((route) => pathname.startsWith(route))) {
    const { data: employeeData, error } = await supabase
      .from("employees")
      .select("role")
      .eq("supabase_user_id", userId)
      .single();

    if (error || employeeData?.role !== "admin") {
      return NextResponse.redirect(new URL("/hrms/unauthorized", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/hrms/dashboard/:path*", "/hrms/employee/:path*"],
};
