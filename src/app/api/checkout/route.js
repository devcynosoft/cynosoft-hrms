import { supabase } from "@/utils/supabaseClient";
import calculateTimeDifference from "@/utils/timeDifference";

export async function PATCH(req) {
  try {
    const employeeData = await req.json();
    const today = new Date();
    const currentTime = new Date();

    const startTime = new Date(today);
    startTime.setHours(0, 0, 0, 0);

    const { data: attendanceData, error: fetchError } = await supabase
      .from("attendance")
      .select("id, checkin_time")
      .eq("supabase_user_id", employeeData?.supabase_user_id)
      .gte("checkin_time", startTime.toISOString())
      .is("checkout_time", null)
      .single();
    if (attendanceData) {
      const { data: updateData, error: updateError } = await supabase
        .from("attendance")
        .update({
          checkout_time: currentTime,
          total_hour: calculateTimeDifference(attendanceData?.checkin_time),
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
