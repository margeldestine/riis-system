-- V6__create_email_outbox.sql
--
-- UC-M5-06: backs a scheduled retry mechanism for failed email sends.
-- EmailNotificationService's existing @Async send methods still attempt
-- delivery immediately (unchanged happy path); when that attempt throws,
-- the failed send is enqueued here instead of just being logged, and
-- EmailOutboxService's @Scheduled poller retries it with backoff until it
-- either succeeds or exhausts max_attempts.

CREATE TABLE IF NOT EXISTS email_outbox (
                                            id VARCHAR(36) PRIMARY KEY,
    recipient VARCHAR(320) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    next_attempt_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_error TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_email_outbox_status CHECK (status IN ('PENDING', 'SENT', 'FAILED'))
    );

CREATE INDEX IF NOT EXISTS idx_email_outbox_status_next_attempt
    ON email_outbox(status, next_attempt_at)
    WHERE status = 'PENDING';