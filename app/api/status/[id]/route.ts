import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const db = getDb()
  const id = params.id

  const rows =
    await db`SELECT id, status, video_url, twilio_message_sid, created_at, updated_at FROM user_requests WHERE id = ${id} LIMIT 1`

  if (rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const logs =
    await db`SELECT event, description, timestamp FROM request_logs WHERE request_id = ${id} ORDER BY timestamp ASC`

  return NextResponse.json({
    request_id: rows[0].id,
    status: rows[0].status,
    video_url: rows[0].video_url,
    twilio_message_sid: rows[0].twilio_message_sid,
    created_at: rows[0].created_at,
    updated_at: rows[0].updated_at,
    logs,
  })
}
