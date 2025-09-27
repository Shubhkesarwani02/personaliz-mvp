import RequestForm from "@/components/request-form"

export default function Page() {
  return (
    <main className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-pretty">Create Your Personalized Video</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Enter your details and we’ll generate a tailored video and send it to your WhatsApp.
        </p>
      </header>

      <RequestForm />
    </main>
  )
}
