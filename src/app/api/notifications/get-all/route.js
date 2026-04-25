import { supabase } from "@/utils/supabaseClient";
import isTokenValid from "@/utils/tokenValidation";

export async function GET(req) {
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
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get("limit")
      ? Number(searchParams.get("limit"))
      : 15;

    const recipientUserId = req.cookies.get("user_id")?.value || null;
    if (!recipientUserId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing user_id cookie." }),
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("notifications")
      .select(
        "id, recipient_user_id, actor_user_id, type, entity, entity_id, message, url, is_read, created_at"
      )
      .eq("recipient_user_id", recipientUserId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500 }
      );
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500 }
    );
  }
}

