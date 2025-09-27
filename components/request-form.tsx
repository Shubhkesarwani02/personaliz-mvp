"use client"

import type React from "react"

import { useState, useMemo } from "react"
import useSWR from "swr"
import { generateVideoSchema, isTerminalStatus, type RequestStatus } from "@/lib/validation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function RequestForm() {
  const [name, setName] = useState("")
  const [city, setCity] = useState("")
  const [phone, setPhone] = useState("")
  const [actor, setActor] = useState("actor_1")
  const [requestId, setRequestId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { data: statusData, isLoading: statusLoading } = useSWR(
    requestId ? `/api/status/${requestId}` : null,
    fetcher,
    {
      refreshInterval: (latestData) => {
        if (!latestData) return 2000
        return isTerminalStatus(latestData.status as RequestStatus) ? 0 : 2000
      },
    },
  )

  const currentStatus: RequestStatus | null = statusData?.status ?? null
  const videoUrl: string | undefined = statusData?.video_url

  const canSubmit = useMemo(() => {
    const parsed = generateVideoSchema.safeParse({
      name,
      city,
      phone,
      actor_id: actor,
    })
    return parsed.success
  }, [name, city, phone, actor])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    setRequestId(null)

    const payload = { name, city, phone, actor_id: actor }
    const parsed = generateVideoSchema.safeParse(payload)
    if (!parsed.success) {
      setError("Please fix validation errors and try again.")
      setSubmitting(false)
      return
    }

    try {
      const res = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.message || data?.error || "Request failed")
      }
      setRequestId(data.request_id)
    } catch (err: any) {
      setError(err?.message || "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-pretty">Personalized Video Creator</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="name">Your Name</Label>
              <Input id="name" placeholder="Jane Doe" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="city">Your City</Label>
              <Input
                id="city"
                placeholder="San Francisco"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone">WhatsApp Number (E.164)</Label>
              <Input
                id="phone"
                placeholder="+15551234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label>Select Actor</Label>
              <Select value={actor} onValueChange={setActor}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an actor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="actor_1">Actor 1</SelectItem>
                  <SelectItem value="actor_2">Actor 2</SelectItem>
                  <SelectItem value="actor_3">Actor 3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={!canSubmit || submitting}>
              {submitting ? "Submitting..." : "Generate & Send"}
            </Button>
          </form>

          {error && (
            <p className="mt-4 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="mt-6">
            <h3 className="font-medium mb-2">Status</h3>
            {!requestId && <p className="text-sm text-muted-foreground">No request yet.</p>}

            {requestId && (
              <div className="space-y-2">
                <p className="text-sm">Request ID: {requestId}</p>
                {statusLoading && <p className="text-sm">Loading status...</p>}
                {currentStatus && (
                  <p className="text-sm">
                    Current status: <span className="font-medium">{currentStatus}</span>
                  </p>
                )}
                {videoUrl && (
                  <div className="mt-2">
                    <video src={videoUrl} controls className="w-full rounded-md" aria-label="Your personalized video" />
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
