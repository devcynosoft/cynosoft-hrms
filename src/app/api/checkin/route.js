import { supabase } from "@/utils/supabaseClient";

export async function POST(req) {
  try {
    const employeeData = await req.json();
    const today = new Date();
    const currentTime = new Date();

    // Set the start time to 10:00 AM today
    const startTime = new Date(today);
    startTime.setHours(0, 0, 0, 0);

    // Set the end time to 7:00 PM today
    const endTime = new Date(today);
    endTime.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from("attendance")
      .select("checkin_time")
      .eq("supabase_user_id", employeeData?.supabase_user_id)
      .gte("checkin_time", startTime.toISOString())
      .lte("checkin_time", endTime.toISOString());
    if (data?.length) {
      return new Response(
        JSON.stringify({
          success: true,
          data: `Already Checked In`,
        }),
        {
          status: 201,
        }
      );
    } else {
      const { data: insertData, error: insertError } = await supabase
        .from("attendance")
        .insert([
          {
            supabase_user_id: employeeData?.supabase_user_id,
            checkin_time: currentTime.toISOString(),
          },
        ]);
      if (insertError) {
        return new Response(
          JSON.stringify({ success: false, error: insertError }),
          {
            status: 500,
          }
        );
      }
      return new Response(
        JSON.stringify({
          success: true,
          data: `${employeeData?.name} Successfully Checked In`,
        }),
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
