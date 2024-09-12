import { DecryptData } from "@/utils/encrypt";
import { supabase } from "@/utils/supabaseClient";
import isTokenValid from "@/utils/tokenValidation";

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
    const method = req.method;
    const atendData = await req.json();

    if (method === "POST") {
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance")
        .insert([atendData]);
      if (attendanceError) {
        return new Response(
          JSON.stringify({ success: false, error: attendanceError.message }),
          {
            status: 500,
          }
        );
      }
      return new Response(
        JSON.stringify({
          success: true,
          data: "Successfully Added Attendance",
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

export async function PATCH(req) {
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
    const method = req.method;
    if (method === "PATCH") {
      const updateBody = await req.json();
      const { searchParams } = new URL(req.url);
      const attendId =
        searchParams.get("attendId") && searchParams.get("attendId") !== "null"
          ? Number(searchParams.get("attendId"))
          : null;
      const { data: updateData, error: updateError } = await supabase
        .from("attendance")
        .update(updateBody)
        .eq("id", attendId);
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
