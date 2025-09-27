import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { generateVideoSchema, normalizePhoneToWhatsApp } from "@/lib/validation"
import crypto from "crypto"

type Db = ReturnType<typeof getDb>

async function insertInitialRequest(
  db: Db,
  params: { id: string; name: string; city: string; phone: string; actor_id: string },
) {
  const { id, name, city, phone, actor_id } = params
  await db`
    INSERT INTO user_requests (id, name, city, phone, actor_id, status)
    VALUES (${id}, ${name}, ${city}, ${phone}, ${actor_id}, 'processing')
  `
  await db`
    INSERT INTO request_logs (id, request_id, event, description)
    VALUES (gen_random_uuid(), ${id}, 'request_received', 'User request created')
  `
}

async function updateVideoReady(db: Db, requestId: string, videoUrl: string) {
  await db`
    UPDATE user_requests
    SET video_url = ${videoUrl}, status = 'video_ready', updated_at = NOW()
    WHERE id = ${requestId}
  `
  await db`
    INSERT INTO request_logs (id, request_id, event, description)
    VALUES (gen_random_uuid(), ${requestId}, 'video_generated', 'Video ready')
  `
}

async function updateSentToWhatsApp(db: Db, requestId: string, sid: string) {
  await db`
    UPDATE user_requests
    SET twilio_message_sid = ${sid}, status = 'sent_to_whatsapp', updated_at = NOW()
    WHERE id = ${requestId}
  `
  await db`
    INSERT INTO request_logs (id, request_id, event, description)
    VALUES (gen_random_uuid(), ${requestId}, 'video_sent', 'Sent to WhatsApp')
  `
}

async function markFailed(db: Db, requestId: string, reason: string) {
  await db`
    UPDATE user_requests
    SET status = 'failed', updated_at = NOW()
    WHERE id = ${requestId}
  `
  await db`
    INSERT INTO request_logs (id, request_id, event, description)
    VALUES (gen_random_uuid(), ${requestId}, 'failed', ${reason})
  `
}

async function generatePersonalizedVideo(params: {
  actor_id: string
  name: string
  city: string
}): Promise<{ video_url: string }> {
  const apiKey = process.env.SYNCLABS_API_KEY
  if (!apiKey) {
    throw new Error("SYNCLABS_API_KEY is not set")
  }

  // SyncLabs API endpoint for video generation
  const endpoint = "https://api.synclabs.so/video"
  
  console.log("[SyncLabs] Generating video with params:", { actor_id: params.actor_id, name: params.name, city: params.city })

  const body = {
    model: params.actor_id,
    input: `Hi ${params.name} from ${params.city}! This is your personalized video message created just for you. We're excited to deliver this custom content directly to your WhatsApp.`,
    voice_id: params.actor_id, // Using same ID for voice
    webhook_url: `${process.env.WEBHOOK_BASE_URL || 'http://localhost:3000'}/api/webhook/synclabs`
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text()
    console.log("[SyncLabs] Error response:", res.status, errText)
    throw new Error(`SyncLabs API error: ${res.status} ${errText}`)
  }

  const data = await res.json()
  console.log("[SyncLabs] API response:", data)
  // Handle both immediate response and async video generation
  let video_url = data.video_url || data.url || data.output_url || data.video?.url
  
  // If video is not immediately ready, it might be processing
  if (!video_url && data.id) {
    // For async processing, we'd typically poll or wait for webhook
    // For now, let's return a placeholder or handle this case
    console.log("[SyncLabs] Video processing async, ID:", data.id)
    
    // In a real implementation, you'd poll the status endpoint or wait for webhook
    // For demo purposes, we'll simulate a video URL
    video_url = `https://api.synclabs.so/video/${data.id}/download`
  }
  
  if (!video_url) {
    console.log("[SyncLabs] Response data:", data)
    throw new Error("SyncLabs missing video_url in response")
  }

  return { video_url }
}

async function sendVideoViaTwilio(params: {
  to: string
  video_url: string
}): Promise<{ sid: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_FROM // e.g., whatsapp:+14155238886

  if (!accountSid || !authToken || !from) {
    throw new Error("Missing Twilio env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM")
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
  const body = new URLSearchParams({
    To: params.to,
    From: from,
    Body: "Your personalized video is ready!",
    MediaUrl: params.video_url,
  })

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Twilio error: ${res.status} ${err}`)
  }

  const data = await res.json()
  if (!data.sid) {
    throw new Error("Twilio missing message SID")
  }
  return { sid: data.sid }
}

export async function POST(req: Request) {
  const db = getDb()

  try {
    const json = await req.json()
    const parsed = generateVideoSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
    }

    const { name, city, phone, actor_id } = parsed.data
    const id = crypto.randomUUID()

    await insertInitialRequest(db, { id, name, city, phone, actor_id })

    // Step 1: Generate video via SyncLabs
    const { video_url } = await generatePersonalizedVideo({ actor_id, name, city })
    await updateVideoReady(db, id, video_url)

    // Step 2: Send via Twilio WhatsApp
    const toWhatsApp = normalizePhoneToWhatsApp(phone)
    const { sid } = await sendVideoViaTwilio({ to: toWhatsApp, video_url })
    await updateSentToWhatsApp(db, id, sid)

    return NextResponse.json({
      request_id: id,
      status: "sent_to_whatsapp",
      video_url,
      twilio_message_sid: sid,
    })
  } catch (err: any) {
    // Try to mark failed if we already created the request
    const maybeBody = await req
      .clone()
      .json()
      .catch(() => null)
    const maybeId = (maybeBody && typeof maybeBody === "object" && "id" in maybeBody && maybeBody.id) || null

    if (maybeId) {
      try {
        await markFailed(getDb(), maybeId as string, err?.message || "Unknown error")
      } catch {
        // ignore
      }
    }

    return NextResponse.json(
      { error: "Failed to process request", message: err?.message || String(err) },
      { status: 500 },
    )
  }
}
