import { DecryptData } from "@/utils/encrypt";
import { supabase } from "@/utils/supabaseClient";
import isTokenValid from "@/utils/tokenValidation";
import axios from "axios";

export async function POST(req) {
  let isValid = false;
  let decryptExpireAt;
  const encryptExpireAt = req.cookies.get("expires_at");
  if (encryptExpireAt) {
    decryptExpireAt = DecryptData(encryptExpireAt.value);
    isValid = isTokenValid(+decryptExpireAt);
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
    const forwardedFor = req.headers.get("x-forwarded-for");
    const clientIP = forwardedFor
      ? forwardedFor.split(",")[0].trim()
      : "Unknown";

    console.log("Request from IP:", clientIP);

    const allowedIP = "72.255.38.148"; // Replace this with your office's public IP
    if (clientIP !== allowedIP) {
      return new Response(
        JSON.stringify({
          success: false,
          data: "Access denied. Must be on office network.",
        }),
        { status: 403 }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: true,
          data: "Testing Checked-In",
        }),
        { status: 200 }
      );
    }

    // const employeeData = await req.json();
    // const today = new Date();
    // const currentTime = new Date();

    // // Set the start time to 10:00 AM today
    // const startTime = new Date(today);
    // startTime.setHours(0, 0, 0, 0);

    // // Set the end time to 11:59 PM today
    // const endTime = new Date(today);
    // endTime.setHours(23, 59, 59, 999);

    // const { data, error } = await supabase
    //   .from("attendance")
    //   .select("checkin_time")
    //   .eq("supabase_user_id", employeeData?.supabase_user_id)
    //   .gte("checkin_time", startTime.toISOString())
    //   .lte("checkin_time", endTime.toISOString());
    // if (data?.length) {
    //   return new Response(
    //     JSON.stringify({
    //       success: true,
    //       data: `Already Checked In`,
    //     }),
    //     {
    //       status: 201,
    //     }
    //   );
    // } else {
    //   const { data: insertData, error: insertError } = await supabase
    //     .from("attendance")
    //     .insert([
    //       {
    //         supabase_user_id: employeeData?.supabase_user_id,
    //         checkin_time: currentTime.toISOString(),
    //       },
    //     ]);
    //   if (insertError) {
    //     return new Response(
    //       JSON.stringify({ success: false, error: insertError }),
    //       {
    //         status: 500,
    //       }
    //     );
    //   }
    //   const text = `Checked In - ${employeeData?.name}`;
    //   await axios.post(process.env.NEXT_PUBLIC_WEBHOOK_API, { text });
    //   return new Response(
    //     JSON.stringify({
    //       success: true,
    //       data: `${employeeData?.name} Successfully Checked In`,
    //     }),
    //     {
    //       status: 200,
    //     }
    //   );
    // }
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
      }
    );
  }
}
