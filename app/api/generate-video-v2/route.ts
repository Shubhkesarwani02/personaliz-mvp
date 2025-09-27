import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { generateVideoSchema, normalizePhoneToWhatsApp } from "@/lib/validation"
import crypto from "crypto"

async function insertInitialRequest(params: {
  id: string
  name: string
  city: string
  phone: string
  actor_id: string
}) {
  const { id, name, city, phone, actor_id } = params
  
  const request = await prisma.userRequest.create({
    data: {
      id,
      name,
      city,
      phone,
      actorId: actor_id,
      status: 'processing',
      logs: {
        create: {
          event: 'request_received',
          description: 'User request created',
        },
      },
    },
  })
  
  return request
}

async function updateVideoReady(requestId: string, videoUrl: string) {
  await prisma.userRequest.update({
    where: { id: requestId },
    data: {
      videoUrl,
      status: 'video_ready',
      logs: {
        create: {
          event: 'video_generated',
          description: 'Video ready',
        },
      },
    },
  })
}

async function updateSentToWhatsApp(requestId: string, sid: string) {
  await prisma.userRequest.update({
    where: { id: requestId },
    data: {
      twilioMessageSid: sid,
      status: 'sent_to_whatsapp',
      logs: {
        create: {
          event: 'video_sent',
          description: 'Sent to WhatsApp',
        },
      },
    },
  })
}

async function markFailed(requestId: string, reason: string) {
  await prisma.userRequest.update({
    where: { id: requestId },
    data: {
      status: 'failed',
      logs: {
        create: {
          event: 'failed',
          description: reason,
        },
      },
    },
  })
}

async function generatePersonalizedVideo(params: {
  actor_id: string
  name: string
  city: string
}): Promise<{ video_url: string }> {
  const rawBase = process.env.SYNCLABS_API_BASE || "https://api.synclabs.so/v2"
  const key = process.env.SYNCLABS_API_KEY
  if (!key) {
    throw new Error("SYNCLABS_API_KEY is not set")
  }

  const baseTrimmed = rawBase.replace(/\/+$/, "")
  const endpoint = `${baseTrimmed}/generate`

  console.log("[SyncLabs] API endpoint:", endpoint)

  // Updated payload structure based on SyncLabs API documentation
  const body = {
    model: params.actor_id,
    input: `Hi ${params.name} from ${params.city}! This is your personalized message. We're excited to have you as part of our community!`,
    voice_id: params.actor_id, // Assuming actor_id maps to voice_id
    webhook_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/synclabs`, // Optional webhook
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text()
    console.log("[SyncLabs] Error response:", res.status, errText)
    throw new Error(`SyncLabs error: ${res.status} ${errText}`)
  }

  const data = await res.json()
  console.log("[SyncLabs] Response:", data)

  // Handle different response structures
  const video_url = 
    data.video_url || 
    data.url || 
    data.output?.url || 
    data.result?.url ||
    data.video?.url

  if (!video_url) {
    console.log("[SyncLabs] Full response for debugging:", JSON.stringify(data, null, 2))
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
    Body: "🎥 Your personalized video is ready! Check it out below:",
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
  try {
    const json = await req.json()
    const parsed = generateVideoSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { name, city, phone, actor_id } = parsed.data
    const id = crypto.randomUUID()

    console.log(`[API] Processing request for ${name} in ${city}`)

    // Step 1: Create initial request
    await insertInitialRequest({ id, name, city, phone, actor_id })

    // Step 2: Generate video via SyncLabs
    console.log(`[API] Generating video for actor ${actor_id}`)
    const { video_url } = await generatePersonalizedVideo({ actor_id, name, city })
    await updateVideoReady(id, video_url)

    // Step 3: Send via Twilio WhatsApp
    console.log(`[API] Sending video to WhatsApp: ${phone}`)
    const toWhatsApp = normalizePhoneToWhatsApp(phone)
    const { sid } = await sendVideoViaTwilio({ to: toWhatsApp, video_url })
    await updateSentToWhatsApp(id, sid)

    console.log(`[API] Request ${id} completed successfully`)

    return NextResponse.json({
      request_id: id,
      status: "sent_to_whatsapp",
      video_url,
      twilio_message_sid: sid,
      message: "Video generated and sent successfully!"
    })
  } catch (err: any) {
    console.error("[API] Error processing request:", err)

    // Try to mark as failed if we have request context
    try {
      const maybeBody = await req.clone().json().catch(() => null)
      if (maybeBody?.request_id) {
        await markFailed(maybeBody.request_id, err?.message || "Unknown error")
      }
    } catch {
      // Ignore errors in error handling
    }

    return NextResponse.json(
      { 
        error: "Failed to process request", 
        message: err?.message || String(err),
        details: process.env.NODE_ENV === 'development' ? err?.stack : undefined
      },
      { status: 500 }
    )
  }
}