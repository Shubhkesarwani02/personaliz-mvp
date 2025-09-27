import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function POST(req: Request) {
  const db = getDb()
  
  try {
    const data = await req.json()
    console.log("[SyncLabs Webhook] Received:", data)

    // Extract relevant information from SyncLabs webhook
    const { id, status, video_url, error } = data

    if (!id) {
      return NextResponse.json({ error: "Missing video ID" }, { status: 400 })
    }

    // Find the request that matches this video ID
    // Note: In a real implementation, you'd store the SyncLabs video ID in your database
    // For now, we'll try to match based on recent requests or use a different approach
    
    if (status === "completed" && video_url) {
      // Update any pending requests with the video URL
      await db`
        UPDATE user_requests 
        SET video_url = ${video_url}, status = 'video_ready', updated_at = NOW()
        WHERE status = 'processing' AND video_url IS NULL
        ORDER BY created_at DESC 
        LIMIT 1
      `
      
      // Log the completion
      const recentRequests = await db`
        SELECT id FROM user_requests 
        WHERE status = 'video_ready' AND video_url = ${video_url}
        LIMIT 1
      `
      
      if (Array.isArray(recentRequests) && recentRequests.length > 0) {
        const requestId = (recentRequests[0] as any).id as string
        await db`
          INSERT INTO request_logs (id, request_id, event, description)
          VALUES (gen_random_uuid(), ${requestId}, 'video_completed', 'SyncLabs video generation completed')
        `
      }
      
    } else if (status === "failed" || error) {
      // Mark recent processing requests as failed
      await db`
        UPDATE user_requests 
        SET status = 'failed', updated_at = NOW()
        WHERE status = 'processing' 
        ORDER BY created_at DESC 
        LIMIT 1
      `
      
      const recentRequests = await db`
        SELECT id FROM user_requests 
        WHERE status = 'failed'
        ORDER BY updated_at DESC
        LIMIT 1
      `
      
      if (Array.isArray(recentRequests) && recentRequests.length > 0) {
        const requestId = (recentRequests[0] as any).id as string
        await db`
          INSERT INTO request_logs (id, request_id, event, description)
          VALUES (gen_random_uuid(), ${requestId}, 'video_failed', ${`SyncLabs error: ${error || 'Unknown error'}`})
        `
      }
    }

    return NextResponse.json({ success: true })
    
  } catch (err: any) {
    console.error("[SyncLabs Webhook] Error:", err)
    return NextResponse.json(
      { error: "Webhook processing failed", message: err?.message },
      { status: 500 }
    )
  }
}