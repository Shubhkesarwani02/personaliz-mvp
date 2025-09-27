import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id

    const request = await prisma.userRequest.findUnique({
      where: { id },
      include: {
        logs: {
          orderBy: { timestamp: 'asc' },
        },
      },
    })

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    return NextResponse.json({
      request_id: request.id,
      status: request.status,
      video_url: request.videoUrl,
      twilio_message_sid: request.twilioMessageSid,
      created_at: request.createdAt,
      updated_at: request.updatedAt,
      user_info: {
        name: request.name,
        city: request.city,
        phone: request.phone,
        actor_id: request.actorId,
      },
      logs: request.logs.map(log => ({
        event: log.event,
        description: log.description,
        timestamp: log.timestamp,
      })),
    })
  } catch (error: any) {
    console.error("[Status API] Error:", error)
    return NextResponse.json(
      { error: "Internal server error", message: error?.message },
      { status: 500 }
    )
  }
}