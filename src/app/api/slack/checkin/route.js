import axios from "axios";

export async function POST(req) {
  try {
    const { text } = await req.json();

    const slackResponse = await axios.post(
      process.env.NEXT_PUBLIC_WEBHOOK_API,
      { text }
    );

    return new Response(
      JSON.stringify({ success: true, data: slackResponse.data }),
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
