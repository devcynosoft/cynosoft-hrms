import { supabase } from "@/utils/supabaseClient";
import isTokenValid from "@/utils/tokenValidation";

export async function DELETE(req) {
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
    const { searchParams } = new URL(req.url);
    const attendId = searchParams.get("attendId");
    
    if (!attendId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Attendance ID is required",
        }),
        {
          status: 400,
        }
      );
    }

    const { data: deleteData, error: deleteError } = await supabase
      .from("attendance")
      .delete()
      .eq("id", attendId);

    if (deleteError) {
      return new Response(
        JSON.stringify({ success: false, error: deleteError.message }),
        {
          status: 500,
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: "Attendance record deleted successfully",
      }),
      {
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
      }
    );
  }
}
