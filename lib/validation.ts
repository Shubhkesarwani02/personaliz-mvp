import { z } from "zod"

export const generateVideoSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  city: z.string().min(1, "City is required").max(100),
  phone: z
    .string()
    .min(8, "Phone seems too short")
    .max(20, "Phone seems too long")
    // Basic E.164-ish validator: allows optional '+' and 8-15 digits
    .regex(/^\+?[1-9]\d{7,14}$/, "Use international format, e.g. +15551234567"),
  actor_id: z.string().min(1, "Actor is required").max(50),
})

export type GenerateVideoInput = z.infer<typeof generateVideoSchema>

export function normalizePhoneToWhatsApp(phone: string) {
  // Ensure it starts with 'whatsapp:' as Twilio expects
  const normalized = phone.startsWith("+") ? phone : `+${phone}`
  return `whatsapp:${normalized}`
}

export type RequestStatus = "processing" | "video_ready" | "sent_to_whatsapp" | "delivered" | "read" | "failed"

export function isTerminalStatus(status: RequestStatus) {
  return status === "delivered" || status === "read" || status === "failed"
}
