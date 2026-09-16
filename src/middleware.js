import { NextResponse } from "next/server";
import { parse } from "cookie";
import isTokenValid from "./utils/tokenValidation";
import { supabase } from "./utils/supabaseClient";

const cookieBaseOpts = {
  sameSite: "lax",
  path: "/",
};

function decodeAccessToken(tokenValue) {
  try {
    return JSON.parse(atob(tokenValue.split(".")[1]));
  } catch {
    return null;
  }
}

async function tryRefreshSession(refreshToken) {
  if (!refreshToken) return null;

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !data?.session) return null;
  return data.session;
}

function applySessionCookies(response, session) {
  const expires = new Date(session.expires_at * 1000);
  response.cookies.set("access_token", session.access_token, {
    ...cookieBaseOpts,
    expires,
  });
  response.cookies.set("refresh_token", session.refresh_token, {
    ...cookieBaseOpts,
    expires,
  });
  if (session.user?.id) {
    response.cookies.set("user_id", session.user.id, {
      ...cookieBaseOpts,
      expires,
    });
  }
  return response;
}

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const cookieHeader = req.headers.get("cookie");
  const cookies = cookieHeader ? parse(cookieHeader) : {};
  const userId = cookies["user_id"];
  const refreshToken = cookies["refresh_token"];
  const token = req.cookies.get("access_token");

  const decodedToken = token?.value ? decodeAccessToken(token.value) : null;
  let isValid = Boolean(decodedToken && isTokenValid(decodedToken));

  // Public Routes
  if (pathname === "/" || pathname === "/hrms/") {
    if (!isValid && refreshToken) {
      const session = await tryRefreshSession(refreshToken);
      if (session) {
        const res = NextResponse.redirect(new URL("/hrms/dashboard", req.url));
        return applySessionCookies(res, session);
      }
    }
    return NextResponse.redirect(
      new URL(isValid ? "/hrms/dashboard" : "/hrms/login", req.url)
    );
  }

  if (pathname === "/hrms/login/" || pathname === "/hrms/reset-password/") {
    if (!isValid && refreshToken) {
      const session = await tryRefreshSession(refreshToken);
      if (session) {
        const res = NextResponse.redirect(new URL("/hrms/dashboard", req.url));
        return applySessionCookies(res, session);
      }
    }
    return isValid
      ? NextResponse.redirect(new URL("/hrms/dashboard", req.url))
      : NextResponse.next();
  }

  // Protected Routes
  if (
    pathname.startsWith("/hrms/dashboard") ||
    pathname.startsWith("/hrms/employee")
  ) {
    if (!token && !refreshToken) {
      return NextResponse.redirect(new URL("/hrms/login", req.url));
    }

    if (!isValid) {
      const session = await tryRefreshSession(refreshToken);
      if (!session) {
        return NextResponse.redirect(new URL("/hrms/login", req.url));
      }

      const res = NextResponse.next();
      applySessionCookies(res, session);

      // Continue admin checks with refreshed identity
      const refreshedUserId = session.user?.id || userId;
      const adminRoutes = [
        "/hrms/employee/attendance/create/",
        "/hrms/employee/attendance/edit/",
        "/hrms/employee/create/",
        "/hrms/employee/details/",
      ];

      if (
        refreshedUserId &&
        adminRoutes.some((route) => pathname.startsWith(route))
      ) {
        const { data: employeeData, error } = await supabase
          .from("employees")
          .select("role")
          .eq("supabase_user_id", refreshedUserId)
          .single();

        if (error || employeeData?.role !== "admin") {
          return NextResponse.redirect(new URL("/hrms/unauthorized", req.url));
        }
      }

      return res;
    }
  }

  // Admin Routes
  const adminRoutes = [
    "/hrms/employee/attendance/create/",
    "/hrms/employee/attendance/edit/",
    "/hrms/employee/create/",
    "/hrms/employee/details/",
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
  matcher: [
    "/",
    "/hrms/dashboard/:path*",
    "/hrms/employee/:path*",
    "/hrms/reset-password/",
  ],
};
