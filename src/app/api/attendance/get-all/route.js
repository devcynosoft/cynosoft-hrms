import { supabase } from "@/utils/supabaseClient";

export async function GET(req, res) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id =
      searchParams.get("user_id") && searchParams.get("user_id") !== "null"
        ? searchParams.get("user_id")
        : null;
    const attendId =
      searchParams.get("attendId") && searchParams.get("attendId") !== "null"
        ? Number(searchParams.get("attendId"))
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
        : null; // Remains string

    // Parse dates as actual Date objects
    const startDate =
      searchParams.get("startDate") && searchParams.get("startDate") !== "null"
        ? new Date(searchParams.get("startDate"))
        : null;
    const endDate =
      searchParams.get("endDate") && searchParams.get("endDate") !== "null"
        ? new Date(searchParams.get("endDate"))
        : null;
    const startOfToday =
      searchParams.get("startOfToday") &&
      searchParams.get("startOfToday") !== "null"
        ? new Date(searchParams.get("startOfToday"))
        : null;
    const endOfToday =
      searchParams.get("endOfToday") &&
      searchParams.get("endOfToday") !== "null"
        ? new Date(searchParams.get("endOfToday"))
        : null;

    let query = supabase
      .from("attendance")
      .select(
        `
        id, 
        checkin_time, 
        checkout_time, 
        total_hour, 
        early_out,
        supabase_user_id,
        employees(name)
      `
      )
      .order("checkin_time", { ascending: false });

    // Admin list filters to current employees; user-scoped fetches must not
    // drop rows via embed filter (breaks live punch after check-in).
    if (!user_id && !attendId) {
      query = query.eq("employees.is_current", true);
    }

    if (attendId) {
      query = query.eq("id", attendId);
    }
    if (start !== null && end !== null && !Number.isNaN(start) && !Number.isNaN(end)) {
      query = query.range(start, end);
    }
    if (user_id) {
      query = query.eq("supabase_user_id", user_id);
    }
    if (name) {
      query = query
        .eq("employees.is_current", true)
        .ilike("employees.name", `%${name}%`)
        .not("employees", "is", null);
    }
    if (startDate && startOfToday && !Number.isNaN(startOfToday.getTime())) {
      query = query.gte("checkin_time", startOfToday.toISOString());
    }
    if (endDate && endOfToday && !Number.isNaN(endOfToday.getTime())) {
      query = query.lte("checkin_time", endOfToday.toISOString());
    }

    const { data, error } = await query;

    if (attendId && !error) {
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
      .from("attendance")
      .select(`id, employees!inner(name)`, { count: "exact", head: true })
      .eq("employees.is_current", true);
    if (user_id) {
      secndQuery = secndQuery.eq("supabase_user_id", user_id);
    }
    if (name) {
      secndQuery = secndQuery.ilike("employees.name", `%${name}%`);
    }
    if (startDate) {
      secndQuery = secndQuery.gte(
        "checkin_time",
        `${startOfToday.toISOString()}`
      );
    }
    if (endDate) {
      secndQuery = secndQuery.lte(
        "checkin_time",
        `${endOfToday.toISOString()}`
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
