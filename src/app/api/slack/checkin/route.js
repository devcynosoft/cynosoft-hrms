import axios from "axios";

export async function POST(req) {
  try {
    const { text } = await req.json();

    const slackResponse = await axios.post(
      "https://hooks.slack.com/services/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",
      { text }
    );

    return new Response(JSON.stringify({ success: true, data: slackResponse.data }), {
      status: 200,
    });
  } catch (error) {
    console.error("Error posting to Slack:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
    });
  }
}
