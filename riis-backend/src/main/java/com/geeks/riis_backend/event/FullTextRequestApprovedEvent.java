package com.geeks.riis_backend.event;

/**
 * Published when a research office approves a full-text request (requirement 10). It carries plain
 * values only, so the listener can run after the transaction has ended, in another thread, without
 * touching the database again.
 *
 * @param requestId the full-text request id (a String, like FullTextRequest.id)
 * @param requesterEmail private: it is only used to send the email, so it must never be logged
 * @param replyTo the person who approved (or the institution's contact address), so that a reply to
 *                the email goes to the research office. May be null.
 */
public record FullTextRequestApprovedEvent(
        String requestId,
        String requesterName,
        String requesterEmail,
        String recordId,
        String recordTitle,
        String referenceNumber,
        String institutionName,
        String replyTo,
        String s3PdfKey,
        String attachmentFileName,
        Long attachmentSizeBytes
) {}
