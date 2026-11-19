package com.geeks.riis_backend.service;

import java.util.Locale;

/**
 * Requirement 10: the rules and the wording of the email that DASIG sends when a research office
 * approves a full-text request. There is no Spring code here on purpose, so every rule (when to
 * attach, how to name the file, what the email says) is easy to unit test.
 */
public final class FullTextApprovalMessage {

    /** What to do before downloading anything. */
    public enum Decision { FETCH, NO_FILE, TOO_LARGE }

    /** What actually happened, which decides the wording of the email. */
    public enum Outcome { ATTACHED, TOO_LARGE, NO_FILE, UNREADABLE, SEND_FAILED }

    private static final String REPLY_SENTENCE =
            "Please reply to this email and the research office will send it to you.";
    private static final String CONTACT_SENTENCE =
            "Please contact the research office and ask them to send it to you.";

    private FullTextApprovalMessage() {}

    /**
     * A record without a stored PDF has nothing to attach. A file known to be bigger than the limit is
     * not even downloaded. Anything else is fetched, and its real size is checked again afterwards,
     * because the stored size can be missing for records from before the file details were saved.
     */
    public static Decision decide(String s3PdfKey, Long knownSizeBytes, long maxAttachmentBytes) {
        if (s3PdfKey == null || s3PdfKey.isBlank()) {
            return Decision.NO_FILE;
        }
        if (knownSizeBytes != null && knownSizeBytes > maxAttachmentBytes) {
            return Decision.TOO_LARGE;
        }
        return Decision.FETCH;
    }

    /** The public record page: "https://dasig.example" and "abc123" give "https://dasig.example/research/abc123". */
    public static String recordUrl(String frontendBaseUrl, String recordId) {
        String base = frontendBaseUrl == null ? "" : frontendBaseUrl.trim().replaceAll("/+$", "");
        return base + "/research/" + recordId;
    }

    /** The name of the attached file: the stored name, or the reference number, always ending in .pdf and safe to use. */
    public static String attachmentName(String storedName, String referenceNumber) {
        String name = oneLine(storedName);
        if (name.isEmpty()) {
            name = oneLine(referenceNumber);
        }
        if (name.isEmpty()) {
            name = "full-text";
        }
        name = name.replaceAll("[\\\\/:*?\"<>|]+", "_");
        return name.toLowerCase(Locale.ROOT).endsWith(".pdf") ? name : name + ".pdf";
    }

    public static String subject(String referenceNumber) {
        return "Your full text request was approved: " + oneLine(referenceNumber);
    }

    /**
     * @param repliesGoToOffice true when the email has a Reply-To (the person who approved), so the
     *                          sentence about replying is only written when it is true
     */
    public static String body(String requesterName, String institutionName, String recordTitle,
                              String referenceNumber, String recordUrl, String fileName,
                              Outcome outcome, boolean repliesGoToOffice) {
        String reply = repliesGoToOffice ? REPLY_SENTENCE : CONTACT_SENTENCE;
        return compose(requesterName, institutionName, recordTitle, referenceNumber, recordUrl, fileName,
                outcome, reply, repliesGoToOffice);
    }

    /**
     * The wording for the retry queue (EmailOutboxService). A retried email is a plain message with no
     * Reply-To, so it can never say that replies go to the research office. It names the research office
     * address instead, when there is one. It never says the file is attached: an ATTACHED outcome is
     * written as SEND_FAILED.
     *
     * @param officeAddress the research office address (may be null or blank)
     */
    public static String retryBody(String requesterName, String institutionName, String recordTitle,
                                   String referenceNumber, String recordUrl, String fileName,
                                   Outcome outcome, String officeAddress) {
        String office = oneLine(officeAddress);
        String reply = office.isEmpty()
                ? CONTACT_SENTENCE
                : "Please contact the research office at " + office + " and ask them to send it to you.";
        Outcome wording = outcome == Outcome.ATTACHED ? Outcome.SEND_FAILED : outcome;
        return compose(requesterName, institutionName, recordTitle, referenceNumber, recordUrl, fileName,
                wording, reply, false);
    }

    private static String compose(String requesterName, String institutionName, String recordTitle,
                                  String referenceNumber, String recordUrl, String fileName,
                                  Outcome outcome, String reply, boolean repliesGoToOffice) {
        StringBuilder text = new StringBuilder();
        text.append("Hi ").append(oneLine(requesterName)).append(",\n\n");
        text.append(oneLine(institutionName)).append(" has approved your request for the full text of \"")
                .append(oneLine(recordTitle)).append("\" (reference ").append(oneLine(referenceNumber)).append(").\n\n");

        switch (outcome) {
            case ATTACHED -> text.append("The full text is attached to this email as ").append(fileName).append(".\n\n");
            case TOO_LARGE -> text.append("The file is too large to attach to an email. ").append(reply).append("\n\n");
            case NO_FILE -> text.append("DASIG has no file stored for this record. ").append(reply).append("\n\n");
            case UNREADABLE -> text.append("DASIG could not read the file just now. ").append(reply).append("\n\n");
            case SEND_FAILED -> text.append("The file could not be attached to this email because of a problem sending it. ")
                    .append(reply).append("\n\n");
        }

        text.append("Record page: ").append(recordUrl).append("\n\n");
        text.append("Please use the file only for the purpose you gave in your request, and cite it when you use it. ")
                .append("The research office decides how it may be shared further.\n\n");
        if (repliesGoToOffice) {
            text.append("Replies to this email go to the research office.\n\n");
        }
        text.append("DASIG, the DOST Region VII Research Information System");
        return text.toString();
    }

    /** A name or title typed by a person must never add a line to an email header. */
    static String oneLine(String value) {
        return value == null ? "" : value.replaceAll("[\\r\\n]+", " ").trim();
    }
}
