package com.geeks.riis_backend.service;

import com.geeks.riis_backend.model.EmailOutboxEntry;
import com.geeks.riis_backend.repository.EmailOutboxRepository;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.PageRequest;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * UC-M5-06: scheduled retry/backoff for email sends that failed on their
 * first (synchronous, @Async) attempt in EmailNotificationService.
 *
 * This is deliberately a small outbox table + @Scheduled poller rather
 * than a @Retryable wrapper on the send methods themselves (the pattern
 * AIProxyService uses for its synchronous AI-service calls): those sends
 * are already fire-and-forget @Async calls with no caller waiting on the
 * result, so retrying "later, out of band, with growing delays between
 * attempts" fits better than retrying immediately within the same call --
 * an SMTP outage lasting a few minutes wouldn't be helped by three
 * retries a couple of seconds apart, and there's no request thread left
 * to hold open for it anyway.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailOutboxService {

    private static final int MAX_ATTEMPTS = 5;
    private static final int BATCH_SIZE = 25;

    private final EmailOutboxRepository outboxRepository;
    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    /**
     * Called by EmailNotificationService from inside its catch block when
     * a send fails. Runs in its own transaction so the enqueue survives
     * even though it's invoked from a method that's about to return/log
     * the original failure.
     */
    @Transactional
    public void enqueue(String recipient, String subject, String body, String failureReason) {
        if (recipient == null || recipient.isBlank()) {
            log.warn("[EmailOutboxService] Not enqueuing retry -- recipient is blank. subject={}", subject);
            return;
        }

        EmailOutboxEntry entry = EmailOutboxEntry.builder()
                .recipient(recipient)
                .subject(subject)
                .body(body)
                .status("PENDING")
                .attemptCount(1)
                .maxAttempts(MAX_ATTEMPTS)
                .nextAttemptAt(LocalDateTime.now().plusSeconds(backoffSeconds(1)))
                .lastError(truncate(failureReason))
                .build();

        outboxRepository.save(entry);
        log.info("[EmailOutboxService] Enqueued failed send for retry: recipient={}, subject={}", recipient, subject);
    }

    // UC-M5-06: runs every minute; each run only picks up entries whose
    // backoff window has elapsed (findDueForRetry), so a short interval
    // here just controls polling granularity, not retry frequency.
    @Scheduled(fixedDelayString = "${app.email-outbox.poll-interval-ms:60000}")
    public void retryDueEntries() {
        List<EmailOutboxEntry> due = outboxRepository.findDueForRetry(LocalDateTime.now(), PageRequest.of(0, BATCH_SIZE));
        if (due.isEmpty()) {
            return;
        }

        log.info("[EmailOutboxService] Retrying {} due email(s).", due.size());
        for (EmailOutboxEntry entry : due) {
            retryOne(entry);
        }
    }

    // UC-M5-06: intentionally NOT @Transactional -- called via
    // self-invocation from retryDueEntries() in the same instance, so a
    // method-level @Transactional here would be silently ignored by
    // Spring's proxy-based AOP anyway. Each outboxRepository.save() call
    // below is its own atomic write, which is all this needs: on success
    // the entry is marked SENT, on failure markFailedAttempt() persists
    // the incremented attempt count/backoff immediately.
    private void retryOne(EmailOutboxEntry entry) {
        try {
            JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
            if (mailSender == null) {
                markFailedAttempt(entry, "JavaMailSender bean unavailable");
                return;
            }

            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(entry.getRecipient());
            message.setSubject(entry.getSubject());
            message.setText(entry.getBody());
            mailSender.send(message);

            entry.setStatus("SENT");
            outboxRepository.save(entry);
            log.info("[EmailOutboxService] Retry succeeded: recipient={}, subject={}, attempt={}",
                    entry.getRecipient(), entry.getSubject(), entry.getAttemptCount());
        } catch (Exception e) {
            markFailedAttempt(entry, e.getMessage());
        }
    }

    private void markFailedAttempt(EmailOutboxEntry entry, String error) {
        int nextAttemptCount = entry.getAttemptCount() + 1;
        entry.setAttemptCount(nextAttemptCount);
        entry.setLastError(truncate(error));

        if (nextAttemptCount >= entry.getMaxAttempts()) {
            entry.setStatus("FAILED");
            log.error("[EmailOutboxService] Giving up after {} attempts: recipient={}, subject={}",
                    nextAttemptCount, entry.getRecipient(), entry.getSubject());
        } else {
            entry.setNextAttemptAt(LocalDateTime.now().plusSeconds(backoffSeconds(nextAttemptCount)));
            log.warn("[EmailOutboxService] Retry attempt {} failed, will retry at {}: recipient={}, subject={}, error={}",
                    nextAttemptCount, entry.getNextAttemptAt(), entry.getRecipient(), entry.getSubject(), error);
        }
        outboxRepository.save(entry);
    }

    // Exponential backoff, capped at 30 minutes: 2, 4, 8, 16 minutes, then
    // 30 for any attempt beyond that (only reachable if MAX_ATTEMPTS grows).
    private long backoffSeconds(int attemptNumber) {
        long minutes = Math.min(30, (long) Math.pow(2, attemptNumber));
        return minutes * 60;
    }

    private String truncate(String value) {
        if (value == null) return null;
        return value.length() > 2000 ? value.substring(0, 2000) : value;
    }
}