CREATE INDEX IF NOT EXISTS idx_user_requests_phone ON user_requests(phone);
CREATE INDEX IF NOT EXISTS idx_user_requests_status ON user_requests(status);

CREATE INDEX IF NOT EXISTS idx_request_logs_event ON request_logs(event);
CREATE INDEX IF NOT EXISTS idx_request_logs_request_id ON request_logs(request_id);
