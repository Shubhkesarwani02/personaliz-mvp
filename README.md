# 🎥 Personaliz MVP - Personalized Video Creation & WhatsApp Delivery

A full-stack Next.js application that generates personalized videos using SyncLabs API and delivers them via WhatsApp using Twilio.

## 🚀 Features

- **Personalized Video Generation**: Uses SyncLabs API for voice cloning and lip-sync
- **WhatsApp Delivery**: Automatically sends generated videos via Twilio WhatsApp API
- **Real-time Status Tracking**: Track video generation and delivery status
- **Database Logging**: Complete request and status logging with PostgreSQL
- **Modern UI**: Built with Next.js, React, and Tailwind CSS
- **Docker Support**: Ready for containerized deployment

## 🛠️ Tech Stack

### Backend
- **Framework**: Next.js 14 (API Routes)
- **Database**: PostgreSQL (Neon Cloud)
- **ORM**: Prisma Client
- **Language**: TypeScript

### Frontend
- **Framework**: Next.js 14 + React 18
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI)
- **Form Handling**: React Hook Form + Zod validation

### External APIs
- **Video Generation**: SyncLabs API
- **WhatsApp Messaging**: Twilio WhatsApp API
- **Database**: Neon PostgreSQL

### DevOps
- **Containerization**: Docker + docker-compose
- **Package Manager**: pnpm

## 📋 Prerequisites

- Node.js 18+ 
- pnpm (or npm/yarn)
- Docker & Docker Compose
- PostgreSQL database (Neon Cloud account)
- SyncLabs API account
- Twilio account with WhatsApp API access

## ⚙️ Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Database Configuration (Neon PostgreSQL)
DATABASE_URL=postgresql://your_user:your_password@your_host/your_database?sslmode=require

# SyncLabs API Configuration
SYNCLABS_API_BASE=https://api.synclabs.so/v2
SYNCLABS_API_KEY=sk-your_synclabs_api_key

# Twilio Configuration
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_ACCOUNT_SID=your_twilio_account_sid

# Optional: App URL for webhooks
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🐳 Docker Setup (Recommended)

### 1. Quick Start with Docker Compose

```bash
# Clone and navigate to the project
cd personaliz-mvp

# Copy environment variables
cp .env.local.example .env.local
# Edit .env.local with your actual API keys

# Build and start all services
docker-compose up --build

# The app will be available at http://localhost:3000
```

### 2. Services Included

- **nextjs-app**: Main application (Frontend + API)
- **postgres**: Local PostgreSQL database (optional, you can use Neon Cloud)

## 💻 Local Development Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Database Setup

```bash
# Generate Prisma client
pnpm prisma generate

# Run database migrations (if using local PostgreSQL)
pnpm prisma db push

# Optional: Seed database with initial data
pnpm prisma db seed
```

### 3. Start Development Server

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 🔄 API Endpoints

### Generate Video
```http
POST /api/generate-video
Content-Type: application/json

{
  "name": "John Doe",
  "city": "San Francisco", 
  "phone": "+15551234567",
  "actor_id": "actor_1"
}
```

### Check Status
```http
GET /api/status/{request_id}
```

### Webhook (Twilio)
```http
POST /api/webhook/twilio
Content-Type: application/x-www-form-urlencoded

MessageSid=SM1234...&MessageStatus=delivered
```

## 📱 How It Works

1. **User Input**: User fills form with name, city, phone number, and selects an actor
2. **Video Generation**: 
   - Backend calls SyncLabs API with personalized script
   - SyncLabs generates video with voice cloning and lip-sync
3. **WhatsApp Delivery**: 
   - Generated video is sent to user's WhatsApp via Twilio API
   - Delivery status is tracked via webhooks
4. **Status Updates**: Real-time status updates shown in UI

## 🗄️ Database Schema

### user_requests
- `id`: UUID (Primary Key)
- `name`: User's name
- `city`: User's city  
- `phone`: WhatsApp phone number
- `actor_id`: Selected actor for video
- `status`: Current status (processing → video_ready → sent_to_whatsapp → delivered/read/failed)
- `video_url`: Generated video URL
- `twilio_message_sid`: Twilio message ID
- `created_at`, `updated_at`: Timestamps

### request_logs
- `id`: UUID (Primary Key)
- `request_id`: Foreign key to user_requests
- `event`: Event type (request_received, video_generated, etc.)
- `description`: Event details
- `timestamp`: When event occurred

## 🔧 Configuration Details

### SyncLabs API
- **Endpoint**: `https://api.synclabs.so/v2/generate`
- **Authentication**: Bearer token
- **Payload**: Model ID, input text, voice ID

### Twilio WhatsApp API
- **Endpoint**: `https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json`
- **Authentication**: Basic Auth (AccountSid:AuthToken)
- **Format**: Phone numbers must be in format `whatsapp:+1234567890`

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection**
   ```bash
   # Test database connection
   pnpm prisma db push
   ```

2. **API Key Issues**
   ```bash
   # Verify environment variables are loaded
   node -e "console.log(process.env.SYNCLABS_API_KEY)"
   ```

3. **Docker Issues**
   ```bash
   # Rebuild containers
   docker-compose down
   docker-compose up --build
   ```

4. **Twilio Webhook Setup**
   - Configure webhook URL in Twilio Console
   - Format: `https://yourdomain.com/api/webhook/twilio`
   - Use ngrok for local testing

## 📊 Monitoring & Logs

### Application Logs
```bash
# View application logs
docker-compose logs -f nextjs-app

# View database logs  
docker-compose logs postgres
```

### Database Queries
```sql
-- Check recent requests
SELECT * FROM user_requests ORDER BY created_at DESC LIMIT 10;

-- Check request logs
SELECT ur.name, rl.event, rl.description, rl.timestamp 
FROM request_logs rl 
JOIN user_requests ur ON ur.id = rl.request_id 
ORDER BY rl.timestamp DESC;
```

## 🔐 Security Considerations

1. **Environment Variables**: Never commit `.env.local` to git
2. **Webhook Validation**: Implement Twilio signature validation
3. **Rate Limiting**: Add rate limiting for API endpoints
4. **Input Sanitization**: All user inputs are validated with Zod schemas

## 🚀 Deployment

### Production Deployment

1. **Environment Setup**
   ```bash
   # Set production environment variables
   export NODE_ENV=production
   export DATABASE_URL=your_production_db_url
   ```

2. **Build & Deploy**
   ```bash
   # Build the application
   pnpm build
   
   # Start production server
   pnpm start
   ```

3. **Docker Production**
   ```bash
   # Build production image
   docker build -t personaliz-mvp .
   
   # Run production container
   docker run -p 3000:3000 --env-file .env.local personaliz-mvp
   ```

## 📝 Development Notes

### AI Assistant Usage (Claude/Cursor)

This project was built with extensive use of AI assistance:

1. **Code Generation**: API routes, database schema, UI components
2. **Debugging**: Error handling, API integration issues
3. **Documentation**: README, code comments, API documentation
4. **Configuration**: Docker setup, Prisma schema, environment configuration

### Key AI Prompts Used:
- "Create a Next.js API route for SyncLabs video generation"
- "Set up Prisma schema for request tracking with PostgreSQL"  
- "Configure Docker compose for Next.js app with PostgreSQL"
- "Implement Twilio WhatsApp API integration with webhook handling"
- "Create React form component with Zod validation and real-time status updates"

## 📄 License

This project is for demonstration purposes as part of the Personaliz technical assessment.

## 🤝 Support

For issues and questions, please refer to:
- SyncLabs API Documentation
- Twilio WhatsApp API Documentation  
- Next.js Documentation
- Prisma Documentation