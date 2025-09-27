import EnhancedRequestForm from "@/components/enhanced-request-form"

export default function Page() {
  return (
    <main className="container mx-auto px-4 py-8 min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
          Personaliz MVP
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Create personalized video messages with AI-powered voice cloning and lip-sync technology. 
          Get your custom video delivered instantly to WhatsApp.
        </p>
      </header>

      <EnhancedRequestForm />

      <footer className="mt-16 text-center text-sm text-muted-foreground">
        <p>Powered by SyncLabs AI • Delivered via Twilio WhatsApp API</p>
      </footer>
    </main>
  )
}