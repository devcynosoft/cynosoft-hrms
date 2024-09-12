import { supabase } from "@/utils/supabaseClient";

export async function GET(req, res) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id =
      searchParams.get("userId") && searchParams.get("userId") !== "null"
        ? searchParams.get("userId")
        : null;
    const empId =
      searchParams.get("empId") && searchParams.get("empId") !== "null"
        ? Number(searchParams.get("empId"))
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
    const jobStatus =
      searchParams.get("jobStatus") && searchParams.get("jobStatus") !== "null"
        ? JSON.parse(decodeURIComponent(searchParams.get("jobStatus")))
        : null;

    let query = supabase
      .from("employees")
      .select("*")
      .order("created_at", { ascending: false });

    if (empId) {
      query = query.eq("id", empId);
    }

    if (start >= 0 && end) {
      query = query.range(start, end);
    }
    if (user_id) {
      query = query.eq("supabase_user_id", user_id);
    }
    if (name) {
      query = query.ilike("name", `%${name}%`);
    }
    if (jobStatus) {
      if (jobStatus?.value !== "all") {
        query = query.eq("is_current", jobStatus.value);
      }
    }

    const { data, error } = await query;

    if (empId && !error) {
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
      .from("employees")
      .select("*", { count: "exact", head: true });

    if (name) {
      secndQuery = secndQuery.ilike("name", `%${name}%`);
    }
    if (user_id) {
      secndQuery = secndQuery.eq("supabase_user_id", user_id);
    }
    if (jobStatus) {
      if (jobStatus?.value !== "all") {
        secndQuery = secndQuery.eq("is_current", jobStatus.value);
      }
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
