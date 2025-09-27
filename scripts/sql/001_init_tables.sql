-- Enable required extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Table: user_requests
CREATE TABLE IF NOT EXISTS user_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  city VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  actor_id VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'processing', -- processing | video_ready | sent_to_whatsapp | delivered | read | failed
  video_url TEXT,
  twilio_message_sid VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table: request_logs
CREATE TABLE IF NOT EXISTS request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL,
  event VARCHAR(50) NOT NULL, -- request_received | video_generated | video_sent | delivered | read | failed
  description TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_request
    FOREIGN KEY(request_id)
    REFERENCES user_requests(id)
    ON DELETE CASCADE
);
