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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock, Send, AlertCircle, Video, MessageSquare } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// Mock actors with better descriptions
const ACTORS = [
  { id: "actor_1", name: "Sarah Chen", description: "Professional Business Coach", avatar: "👩‍💼" },
  { id: "actor_2", name: "Marcus Johnson", description: "Tech Industry Leader", avatar: "👨‍💻" },
  { id: "actor_3", name: "Elena Rodriguez", description: "Marketing Expert", avatar: "👩‍🎓" },
  { id: "demo_actor", name: "Demo Actor", description: "For Testing", avatar: "🎭" },
]

function getStatusIcon(status: RequestStatus) {
  switch (status) {
    case "processing": return <Clock className="h-4 w-4" />
    case "video_ready": return <Video className="h-4 w-4" />
    case "sent_to_whatsapp": return <Send className="h-4 w-4" />
    case "delivered": return <MessageSquare className="h-4 w-4" />
    case "read": return <CheckCircle className="h-4 w-4" />
    case "failed": return <AlertCircle className="h-4 w-4" />
    default: return <Clock className="h-4 w-4" />
  }
}

function getStatusColor(status: RequestStatus) {
  switch (status) {
    case "processing": return "bg-yellow-100 text-yellow-800 border-yellow-300"
    case "video_ready": return "bg-blue-100 text-blue-800 border-blue-300"
    case "sent_to_whatsapp": return "bg-purple-100 text-purple-800 border-purple-300"
    case "delivered": return "bg-green-100 text-green-800 border-green-300"
    case "read": return "bg-emerald-100 text-emerald-800 border-emerald-300"
    case "failed": return "bg-red-100 text-red-800 border-red-300"
    default: return "bg-gray-100 text-gray-800 border-gray-300"
  }
}

export default function EnhancedRequestForm() {
  const [name, setName] = useState("")
  const [city, setCity] = useState("")
  const [phone, setPhone] = useState("")
  const [actorId, setActorId] = useState("actor_1")
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
  const logs = statusData?.logs || []

  const selectedActor = ACTORS.find(actor => actor.id === actorId) || ACTORS[0]

  const canSubmit = useMemo(() => {
    const parsed = generateVideoSchema.safeParse({
      name,
      city,
      phone,
      actor_id: actorId,
    })
    return parsed.success && !submitting
  }, [name, city, phone, actorId, submitting])

  const resetForm = () => {
    setName("")
    setCity("")
    setPhone("")
    setActorId("actor_1")
    setRequestId(null)
    setError(null)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const payload = { name, city, phone, actor_id: actorId }
    const parsed = generateVideoSchema.safeParse(payload)
    if (!parsed.success) {
      setError("Please fix validation errors and try again.")
      setSubmitting(false)
      return
    }

    try {
      console.log("Submitting request:", payload)
      const res = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      
      const data = await res.json()
      console.log("API response:", data)
      
      if (!res.ok) {
        throw new Error(data?.message || data?.error || `Request failed with status ${res.status}`)
      }
      
      setRequestId(data.request_id)
    } catch (err: any) {
      console.error("Submit error:", err)
      setError(err?.message || "Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            🎥 Create Your Personalized Video
          </CardTitle>
          <p className="text-center text-muted-foreground">
            Generate a custom video message and receive it on WhatsApp
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={onSubmit}>
            {/* Personal Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Your Name *</Label>
                <Input 
                  id="name" 
                  placeholder="e.g., John Doe" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Your City *</Label>
                <Input
                  id="city"
                  placeholder="e.g., San Francisco"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">WhatsApp Number (E.164 format) *</Label>
              <Input
                id="phone"
                placeholder="e.g., +15551234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                disabled={submitting}
              />
              <p className="text-sm text-muted-foreground">
                Include country code (e.g., +1 for US, +44 for UK)
              </p>
            </div>

            {/* Actor Selection */}
            <div className="space-y-3">
              <Label>Choose Your Video Host *</Label>
              <Select value={actorId} onValueChange={setActorId} disabled={submitting}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an actor" />
                </SelectTrigger>
                <SelectContent>
                  {ACTORS.map((actor) => (
                    <SelectItem key={actor.id} value={actor.id}>
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{actor.avatar}</span>
                        <div>
                          <div className="font-medium">{actor.name}</div>
                          <div className="text-sm text-muted-foreground">{actor.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Selected Actor Preview */}
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{selectedActor.avatar}</span>
                  <div>
                    <div className="font-medium">{selectedActor.name}</div>
                    <div className="text-sm text-muted-foreground">{selectedActor.description}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                type="submit" 
                disabled={!canSubmit || submitting} 
                className="flex-1"
              >
                {submitting ? (
                  <>
                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Video className="mr-2 h-4 w-4" />
                    Generate & Send Video
                  </>
                )}
              </Button>
              
              {requestId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  New Request
                </Button>
              )}
            </div>
          </form>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Status Card */}
      {requestId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Request Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Request ID:</span>
              <code className="text-xs bg-muted px-2 py-1 rounded">{requestId}</code>
            </div>

            {statusLoading && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading status...</span>
              </div>
            )}

            {currentStatus && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(currentStatus)}>
                    {getStatusIcon(currentStatus)}
                    <span className="ml-2 capitalize">{currentStatus.replace('_', ' ')}</span>
                  </Badge>
                </div>

                {/* Progress Timeline */}
                <div className="space-y-2">
                  {logs.length > 0 && (
                    <div className="text-sm">
                      <h4 className="font-medium mb-2">Progress Timeline:</h4>
                      <div className="space-y-1">
                        {logs.slice(-3).map((log: any, index: number) => (
                          <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                            <span>{log.description}</span>
                            <span className="text-xs opacity-70">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Video Preview */}
                {videoUrl && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Generated Video:</h4>
                    <video 
                      src={videoUrl} 
                      controls 
                      className="w-full rounded-md border"
                      poster="/placeholder.jpg"
                    >
                      Your browser does not support the video tag.
                    </video>
                    <p className="text-xs text-muted-foreground">
                      This video has been sent to your WhatsApp number.
                    </p>
                  </div>
                )}

                {/* Success Message */}
                {(currentStatus === 'delivered' || currentStatus === 'read') && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      🎉 Success! Your personalized video has been {currentStatus === 'read' ? 'read' : 'delivered'} on WhatsApp.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Failure Message */}
                {currentStatus === 'failed' && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Sorry, there was an issue delivering your video. Please try again or contact support.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}