package com.geeks.riis_backend.event;

import com.geeks.riis_backend.service.EmailNotificationService;
import com.geeks.riis_backend.service.FullTextApprovalMessage;
import com.geeks.riis_backend.service.FullTextApprovalMessage.Decision;
import com.geeks.riis_backend.service.FullTextApprovalMessage.Outcome;
import com.geeks.riis_backend.service.S3UploadService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Requirement 10: when a research office approves a full-text request, email the requester the PDF
 * (attached) and a link to the record page.
 *
 * It runs AFTER the approval has been saved, in another thread, so a slow download or a mail
 * problem can never undo the approval or make the HEI's click wait. Any failure here is logged and
 * ends in a link-only email, never in an exception for the person who clicked.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class FullTextApprovalListener {

    private final S3UploadService s3UploadService;
    private final EmailNotificationService emailNotificationService;

    @Value("${app.frontend.base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    // 15 MB. Gmail refuses messages over 25 MB, and an attachment grows by about a third when it
    // is encoded for email, so a 20 MB upload (the upload limit) could not be sent. Bigger files
    // go as a link.
    @Value("${app.fulltext.max-attachment-bytes:15728640}")
    private long maxAttachmentBytes;

    private record Prepared(byte[] pdf, Outcome outcome) {}

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onApproved(FullTextRequestApprovedEvent event) {
        try {
            String recordUrl = FullTextApprovalMessage.recordUrl(frontendBaseUrl, event.recordId());
            String fileName = FullTextApprovalMessage.attachmentName(
                    event.attachmentFileName(), event.referenceNumber());
            boolean repliesGoToOffice = event.replyTo() != null && !event.replyTo().isBlank();

            Prepared prepared = prepare(event);

            String subject = FullTextApprovalMessage.subject(event.referenceNumber());
            String body = FullTextApprovalMessage.body(
                    event.requesterName(), event.institutionName(), event.recordTitle(),
                    event.referenceNumber(), recordUrl, fileName, prepared.outcome(),
                    repliesGoToOffice);
            // The retry queue can only hold text and has no Reply-To, so it gets its own wording
            // (never "attached", never "replies go to the research office").
            String retryBody = FullTextApprovalMessage.retryBody(
                    event.requesterName(), event.institutionName(), event.recordTitle(),
                    event.referenceNumber(), recordUrl, fileName, prepared.outcome(),
                    event.replyTo());

            emailNotificationService.sendFullTextApproved(
                    event.requesterEmail(), event.replyTo(), subject, body, retryBody,
                    prepared.pdf(), fileName);
            log.info("[FullTextApproval] Request {}: outcome {}, email handed to the mail service",
                    event.requestId(), prepared.outcome());
        } catch (Exception e) {
            log.error("[FullTextApproval] Could not email the approval for request {}: {}",
                    event.requestId(), e.getMessage(), e);
        }
    }

    /** Decides whether there is a PDF to attach, and fetches it from S3 when there is. */
    private Prepared prepare(FullTextRequestApprovedEvent event) {
        Decision decision = FullTextApprovalMessage.decide(
                event.s3PdfKey(), event.attachmentSizeBytes(), maxAttachmentBytes);
        if (decision == Decision.NO_FILE) {
            return new Prepared(null, Outcome.NO_FILE);
        }
        if (decision == Decision.TOO_LARGE) {
            return new Prepared(null, Outcome.TOO_LARGE);
        }
        try {
            byte[] pdf = s3UploadService.downloadFileBytes(event.s3PdfKey());
            // A real 0-byte object would attach an empty PDF and say "attached": unreadable.
            if (pdf == null || pdf.length == 0) {
                log.warn("[FullTextApproval] The file of request {} came back empty",
                        event.requestId());
                return new Prepared(null, Outcome.UNREADABLE);
            }
            // The stored size can be missing for older records, so check the real size too.
            if (pdf.length > maxAttachmentBytes) {
                return new Prepared(null, Outcome.TOO_LARGE);
            }
            return new Prepared(pdf, Outcome.ATTACHED);
        } catch (Exception e) {
            log.warn("[FullTextApproval] Could not read the file of request {}: {}",
                    event.requestId(), e.getMessage());
            return new Prepared(null, Outcome.UNREADABLE);
        }
    }
}
