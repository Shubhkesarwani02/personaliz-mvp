import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

function mapTwilioStatusToInternal(status: string) {
  // Twilio WhatsApp statuses include: queued, sent, delivered, read, failed, etc.
  switch (status?.toLowerCase()) {
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
  try {
    // Twilio sends application/x-www-form-urlencoded
    const form = await req.formData()
    const messageSid = (form.get("MessageSid") || form.get("SmsSid")) as string | null
    const messageStatus = (form.get("MessageStatus") || form.get("SmsStatus")) as string | null
    const errorCode = form.get("ErrorCode") as string | null
    const errorMessage = form.get("ErrorMessage") as string | null

    console.log("[Webhook] Received Twilio status:", {
      messageSid,
      messageStatus,
      errorCode,
      errorMessage,
    })

    if (!messageSid) {
      console.log("[Webhook] Missing MessageSid")
      return new NextResponse("Missing MessageSid", { status: 400 })
    }

    const internalStatus = mapTwilioStatusToInternal(messageStatus || "sent")

    // Find the request via message SID using Prisma
    const request = await prisma.userRequest.findFirst({
      where: { twilioMessageSid: messageSid },
    })

    if (!request) {
      console.log(`[Webhook] Request not found for MessageSid: ${messageSid}`)
      // Return success to prevent Twilio retries for unknown messages
      return NextResponse.json({ ok: true, message: "Message not tracked" })
    }

    console.log(`[Webhook] Updating request ${request.id} to status: ${internalStatus}`)

    // Update the request status and add log entry
    await prisma.userRequest.update({
      where: { id: request.id },
      data: {
        status: internalStatus,
        logs: {
          create: {
            event: internalStatus,
            description: errorCode 
              ? `Twilio status: ${messageStatus} (Error: ${errorCode} - ${errorMessage})`
              : `Twilio status: ${messageStatus}`,
          },
        },
      },
    })

    return NextResponse.json({ 
      ok: true, 
      message: `Status updated to ${internalStatus}`,
      request_id: request.id 
    })
  } catch (error: any) {
    console.error("[Webhook] Error processing Twilio webhook:", error)
    return NextResponse.json(
      { ok: false, error: error?.message || "Unknown error" },
      { status: 500 }
    )
  }
}