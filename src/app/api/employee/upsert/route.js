import { supabase } from "@/utils/supabaseClient";
import isTokenValid from "@/utils/tokenValidation";

export async function POST(req) {
  let isValid = false;
  const token = req.cookies.get("access_token");
  const decodedToken = JSON.parse(atob(token?.value?.split(".")[1]));
  if (decodedToken) {
    isValid = isTokenValid(decodedToken);
  }
  if (!isValid) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Your session has expired, please log in again.",
      }),
      {
        status: 401,
      }
    );
  }
  try {
    const method = req.method;
    const empData = await req.json();

    if (method === "POST") {
      const { data: employeeData, error: employeeError } = await supabase
        .from("employees")
        .insert([empData]);
      if (employeeError) {
        return new Response(
          JSON.stringify({ success: false, error: employeeError.message }),
          {
            status: 500,
          }
        );
      }
      return new Response(
        JSON.stringify({ success: true, data: "Successfully Added Employee" }),
        {
          status: 200,
        }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(req) {
  let isValid = false;
  const token = req.cookies.get("access_token");
  const decodedToken = JSON.parse(atob(token?.value?.split(".")[1]));
  if (decodedToken) {
    isValid = isTokenValid(decodedToken);
  }
  if (!isValid) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Your session has expired, please log in again.",
      }),
      {
        status: 401,
      }
    );
  }
  try {
    const method = req.method;
    if (method === "PATCH") {
      const updateBody = await req.json();
      const { searchParams } = new URL(req.url);
      const empId =
        searchParams.get("empId") && searchParams.get("empId") !== "null"
          ? Number(searchParams.get("empId"))
          : null;
      const userId =
        searchParams.get("userId") && searchParams.get("userId") !== "null"
          ? searchParams.get("userId")
          : null;
      let query = supabase.from("employees").update(updateBody).eq("id", empId);
      if (userId) {
        query = query.eq("supabase_user_id", userId);
      }
      const { data: updateData, error: updateError } = await query;
      if (updateError) {
        return new Response(
          JSON.stringify({ success: false, error: updateError.message }),
          {
            status: 500,
          }
        );
      } else {
        return new Response(
          JSON.stringify({
            success: true,
            data: "Successfully Employee updated",
          }),
          {
            status: 200,
          }
        );
      }
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
      }
    );
  }
}
