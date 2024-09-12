import { supabase } from "@/utils/supabaseClient";

export async function GET(req, res) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id =
      searchParams.get("userId") && searchParams.get("userId") !== "null"
        ? searchParams.get("userId")
        : null;
    const leaveId =
      searchParams.get("leaveId") && searchParams.get("leaveId") !== "null"
        ? Number(searchParams.get("leaveId"))
        : null;
    const leaveCount =
      searchParams.get("count") && searchParams.get("count") !== "null"
        ? searchParams.get("count")
        : null;
    const start = searchParams.get("start")
      ? Number(searchParams.get("start"))
      : null;
    const end = searchParams.get("end")
      ? Number(searchParams.get("end"))
      : null;
    const name =
      searchParams.get("name") && searchParams.get("name") !== "null"
        ? searchParams.get("name")
        : null;
    const leaveStatusFilter =
      searchParams.get("leaveStatusFilter") &&
      searchParams.get("leaveStatusFilter") !== "null"
        ? JSON.parse(decodeURIComponent(searchParams.get("leaveStatusFilter")))
        : null;
    const leaveType =
      searchParams.get("leaveType") && searchParams.get("leaveType") !== "null"
        ? JSON.parse(decodeURIComponent(searchParams.get("leaveType")))
        : null;

    // Parse dates as actual Date objects
    const startDate =
      searchParams.get("startDate") && searchParams.get("startDate") !== "null"
        ? new Date(searchParams.get("startDate"))
        : null;
    const startOfToday =
      searchParams.get("startOfToday") &&
      searchParams.get("startOfToday") !== "null"
        ? new Date(searchParams.get("startOfToday"))
        : null;

    let query = supabase
      .from("leaves")
      .select(
        `
        id, 
        content, 
        start_date, 
        end_date, 
        approval_status,
        leave_type,
        created_at,
        duration,
        employees(name)

      `
      )

      .eq("employees.is_current", true)
      .order("created_at", { ascending: false });
    if (leaveId) {
      query = query.eq("id", leaveId);
    }
    if (leaveCount) {
      query = query.eq("approval_status", "Approved");
    }
    if (start >= 0 && end) {
      query = query.range(start, end);
    }
    if (user_id) {
      query = query.eq("supabase_user_id", user_id);
    }
    if (name) {
      query = query
        .ilike("employees.name", `%${name}%`)
        .not("employees", "is", null);
    }
    if (startDate) {
      query = query.gte("created_at", `${startOfToday.toISOString()}`);
    }
    if (leaveType) {
      if (leaveType?.value !== "all") {
        query = query.eq("leave_type", leaveType.value);
      }
    }
    if (leaveStatusFilter) {
      if (leaveStatusFilter?.value !== "all") {
        query = query.eq("approval_status", leaveStatusFilter.value);
      }
    }

    const { data, error } = await query;

    if (leaveId && !error) {
      return new Response(
        JSON.stringify({
          success: true,
          data,
        }),
        {
          status: 200,
        }
      );
    }

    let secndQuery = supabase
      .from("leaves")
      .select(`id, employees!inner(name)`, { count: "exact", head: true })
      .eq("employees.is_current", true);
    if (name) {
      secndQuery = secndQuery.ilike("employees.name", `%${name}%`);
    }
    if (user_id) {
      secndQuery = secndQuery.eq("supabase_user_id", user_id);
    }
    if (leaveType) {
      if (leaveType?.value !== "all") {
        secndQuery = secndQuery.eq("leave_type", leaveType.value);
      }
    }
    if (leaveStatusFilter) {
      if (leaveStatusFilter?.value !== "all") {
        secndQuery = secndQuery.eq("approval_status", leaveStatusFilter.value);
      }
    }
    if (startDate) {
      secndQuery = secndQuery.gte(
        "created_at",
        `${startOfToday.toISOString()}`
      );
    }
    const { count } = await secndQuery;

    if (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Something went wrong",
        }),
        {
          status: 500,
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: true,
          data: { data, count },
        }),
        {
          status: 200,
        }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
      }
    );
  }
}
