import { supabase } from "@/utils/supabaseClient";
import calculateTimeDifference from "@/utils/timeDifference";
import isTokenValid from "@/utils/tokenValidation";
import axios from "axios";

export async function PATCH(req) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const clientIP = forwardedFor ? forwardedFor.split(",")[0].trim() : "Unknown";

  const allowedIP = process.env.NEXT_PUBLIC_OFFICE_IP; // office's public IP
  if (clientIP !== allowedIP && process.env.NEXT_PUBLIC_NODE_ENV !== "local") {
    return new Response(
      JSON.stringify({
        success: false,
        data: "Access denied. Must be on office network.",
      }),
      { status: 403 }
    );
  }

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
    const employeeData = await req.json();
    const today = new Date();
    const currentTime = new Date();

    const startTime = new Date(today);
    startTime.setHours(0, 0, 0, 0);
    let jobHour;
    if (employeeData.job_type === "fullTime") {
      jobHour = "08:59:00";
    }
    if (employeeData.job_type === "partTime") {
      jobHour = "04:59:00";
    }
    const { data: attendanceData, error: fetchError } = await supabase
      .from("attendance")
      .select("id, checkin_time")
      .eq("supabase_user_id", employeeData?.supabase_user_id)
      .gte("checkin_time", startTime.toISOString())
      .is("checkout_time", null)
      .single();
    if (attendanceData) {
      const timeDifference = calculateTimeDifference(
        attendanceData?.checkin_time
      );
      const { data: updateData, error: updateError } = await supabase
        .from("attendance")
        .update({
          checkout_time: currentTime,
          total_hour: timeDifference,
          early_out: timeDifference > jobHour ? false : true,
        })
        .eq("id", attendanceData?.id);
      if (updateError) {
        return new Response(
          JSON.stringify({ success: false, error: updateError }),
          {
            status: 500,
          }
        );
      }
      if (process.env.NEXT_PUBLIC_NODE_ENV !== "local") {
        const text = `Checked Out - ${employeeData?.name}`;
        await axios.post(process.env.NEXT_PUBLIC_WEBHOOK_API, { text });
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: `${employeeData?.name} Successfully Checked Out`,
        }),
        {
          status: 200,
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: true,
          data: `Already Checked Out`,
        }),
        {
          status: 201,
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
