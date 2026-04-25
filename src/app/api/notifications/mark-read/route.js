import { supabase } from "@/utils/supabaseClient";
import isTokenValid from "@/utils/tokenValidation";

export async function PATCH(req) {
  let isValid = false;
  const token = req.cookies.get("access_token");
  const decodedToken = token?.value
    ? JSON.parse(atob(token.value.split(".")[1]))
    : null;

  if (decodedToken) {
    isValid = isTokenValid(decodedToken);
  }

  if (!isValid) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Your session has expired, please log in again.",
      }),
      { status: 401 }
    );
  }

  try {
    const recipientUserId = req.cookies.get("user_id")?.value || null;
    if (!recipientUserId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing user_id cookie." }),
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const notificationId = body?.id ?? null;

    let query = supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("recipient_user_id", recipientUserId);

    if (notificationId) {
      query = query.eq("id", Number(notificationId));
    }

    const { error } = await query;

    if (error) {
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500 }
      );
    }

    return new Response(JSON.stringify({ success: true, data: "Marked read" }), {
      status: 200,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500 }
    );
  }
}

