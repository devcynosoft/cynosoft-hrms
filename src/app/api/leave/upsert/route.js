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
    const leaveData = await req.json();

    if (method === "POST") {
      const { error } = await supabase.from("leaves").insert(leaveData);
      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          {
            status: 500,
          }
        );
      }
      return new Response(
        JSON.stringify({
          success: true,
          data: "Successfully Added leave",
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
      const leaveId =
        searchParams.get("leaveId") && searchParams.get("leaveId") !== "null"
          ? Number(searchParams.get("leaveId"))
          : null;
      const userId =
        searchParams.get("userId") && searchParams.get("userId") !== "null"
          ? searchParams.get("userId")
          : null;
      let query = supabase.from("leaves").update(updateBody).eq("id", leaveId);
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
            data: "Successfully leave updated",
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
