import { supabase } from "@/utils/supabaseClient";
import isTokenValid from "@/utils/tokenValidation";
import {
  computeAttendanceTrend,
  computeLeaveBalances,
  computeMonthMetrics,
  getRequiredHours,
} from "@/utils/attendanceDisplay";
import moment from "moment";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
  "Content-Type": "application/json",
};

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: NO_STORE_HEADERS,
  });

async function requireAdmin(req) {
  const token = req.cookies.get("access_token");
  if (!token?.value) {
    return { error: jsonResponse({ success: false, error: "Unauthorized" }, 401) };
  }

  let decodedToken;
  try {
    decodedToken = JSON.parse(atob(token.value.split(".")[1]));
  } catch {
    return { error: jsonResponse({ success: false, error: "Unauthorized" }, 401) };
  }

  if (!decodedToken || !isTokenValid(decodedToken)) {
    return {
      error: jsonResponse(
        {
          success: false,
          error: "Your session has expired, please log in again.",
        },
        401
      ),
    };
  }

  const callerUserId = req.cookies.get("user_id")?.value;
  if (!callerUserId) {
    return { error: jsonResponse({ success: false, error: "Unauthorized" }, 401) };
  }

  const { data: caller, error: callerError } = await supabase
    .from("employees")
    .select("id, role, name")
    .eq("supabase_user_id", callerUserId)
    .single();

  if (callerError || !caller || caller.role !== "admin") {
    return {
      error: jsonResponse(
        { success: false, error: "Forbidden. Admin access required." },
        403
      ),
    };
  }

  return { caller };
}

export async function GET(req, { params }) {
  try {
    const auth = await requireAdmin(req);
    if (auth.error) return auth.error;

    const empId = Number(params?.id);
    if (!empId || Number.isNaN(empId)) {
      return jsonResponse(
        { success: false, error: "Invalid employee id." },
        400
      );
    }

    const { data: employeeRows, error: employeeError } = await supabase
      .from("employees")
      .select(
        "id, name, email, contact, role, job_type, pic, is_current, created_at, supabase_user_id, annual_leaves, sick_leaves, casual_leaves"
      )
      .eq("id", empId)
      .limit(1);

    if (employeeError) {
      return jsonResponse(
        { success: false, error: employeeError.message || "Something went wrong" },
        500
      );
    }

    const employee = employeeRows?.[0];
    if (!employee) {
      return jsonResponse(
        { success: false, error: "Employee not found." },
        404
      );
    }

    const userId = employee.supabase_user_id;
    const requiredHours = getRequiredHours(employee.job_type);
    const sixMonthStart = moment()
      .subtract(5, "months")
      .startOf("month")
      .toISOString();
    const rangeEnd = moment().endOf("day").toISOString();

    const [attendanceResult, leavesResult] = await Promise.all([
      userId
        ? supabase
            .from("attendance")
            .select(
              "id, checkin_time, checkout_time, total_hour, early_out, supabase_user_id"
            )
            .eq("supabase_user_id", userId)
            .gte("checkin_time", sixMonthStart)
            .lte("checkin_time", rangeEnd)
            .order("checkin_time", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      userId
        ? supabase
            .from("leaves")
            .select(
              "id, start_date, end_date, leave_type, leave_type_duration, duration, approval_status, created_at"
            )
            .eq("supabase_user_id", userId)
            .eq("approval_status", "Approved")
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (attendanceResult.error) {
      return jsonResponse(
        {
          success: false,
          error: attendanceResult.error.message || "Failed to load attendance",
        },
        500
      );
    }

    if (leavesResult.error) {
      return jsonResponse(
        {
          success: false,
          error: leavesResult.error.message || "Failed to load leaves",
        },
        500
      );
    }

    const attendanceRecords = attendanceResult.data || [];
    const leaveRecords = leavesResult.data || [];

    const monthStartIso = moment().startOf("month").toISOString();
    const currentMonthRecords = attendanceRecords.filter(
      (row) => row?.checkin_time && row.checkin_time >= monthStartIso
    );

    const currentMonth = computeMonthMetrics(
      currentMonthRecords,
      requiredHours
    );
    const attendanceTrend = computeAttendanceTrend(
      attendanceRecords,
      requiredHours,
      "6months"
    );
    const leaveBalances = computeLeaveBalances(leaveRecords, employee);

    return jsonResponse({
      success: true,
      data: {
        employee: {
          id: employee.id,
          name: employee.name,
          email: employee.email,
          contact: employee.contact,
          role: employee.role,
          job_type: employee.job_type,
          pic: employee.pic,
          is_current: employee.is_current,
          created_at: employee.created_at,
          supabase_user_id: employee.supabase_user_id,
          annual_leaves: employee.annual_leaves,
          sick_leaves: employee.sick_leaves,
          casual_leaves: employee.casual_leaves,
        },
        currentMonth,
        monthlyTrend: attendanceTrend.points,
        attendanceTrend,
        attendanceRecords,
        leaveBalances,
        requiredHours,
      },
    });
  } catch (error) {
    return jsonResponse(
      { success: false, error: error.message || "Something went wrong" },
      500
    );
  }
}
