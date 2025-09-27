import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"

function mapTwilioStatusToInternal(status: string) {
  // Twilio WhatsApp statuses include: queued, sent, delivered, read, failed, etc.
  switch (status) {
    case "delivered":
      return "delivered"
    case "read":
      return "read"
    case "failed":
    case "undelivered":
      return "failed"
    case "sent":
    case "queued":
    default:
      return "sent_to_whatsapp"
  }
}

export async function POST(req: Request) {
  const db = getDb()
  try {
    // Twilio sends application/x-www-form-urlencoded
    const form = await req.formData()
    const messageSid = (form.get("MessageSid") || form.get("SmsSid")) as string | null
    const messageStatus = (form.get("MessageStatus") || form.get("SmsStatus")) as string | null

    if (!messageSid) {
      return new NextResponse("Missing MessageSid", { status: 400 })
    }

    const internal = mapTwilioStatusToInternal(messageStatus || "sent")

    // Find the request via message SID
    const rows = await db`SELECT id FROM user_requests WHERE twilio_message_sid = ${messageSid} LIMIT 1`
    if (rows.length === 0) {
      // Not found; ignore to prevent leaking info
      return NextResponse.json({ ok: true })
    }

    const requestId = rows[0].id as string

    await db`
      UPDATE user_requests
      SET status = ${internal}, updated_at = NOW()
      WHERE id = ${requestId}
    `
    await db`
      INSERT INTO request_logs (id, request_id, event, description)
      VALUES (gen_random_uuid(), ${requestId}, ${internal}, ${`Twilio status: ${messageStatus || "sent"}`})
    `

    // TODO: Optionally validate X-Twilio-Signature to verify webhook authenticity.

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 })
  }
}
