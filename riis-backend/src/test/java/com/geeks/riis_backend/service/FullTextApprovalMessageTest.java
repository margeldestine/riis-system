package com.geeks.riis_backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.geeks.riis_backend.service.FullTextApprovalMessage.Decision;
import com.geeks.riis_backend.service.FullTextApprovalMessage.Outcome;
import org.junit.jupiter.api.Test;

class FullTextApprovalMessageTest {

    private static final long MAX = 15L * 1024 * 1024;

    @Test
    void aRecordWithoutAStoredPdfHasNothingToAttach() {
        assertEquals(Decision.NO_FILE, FullTextApprovalMessage.decide(null, 1000L, MAX));
        assertEquals(Decision.NO_FILE, FullTextApprovalMessage.decide("   ", null, MAX));
    }

    @Test
    void aFileKnownToBeTooLargeIsNotDownloaded() {
        assertEquals(Decision.TOO_LARGE, FullTextApprovalMessage.decide("inst/submissions/2026/a.pdf", MAX + 1, MAX));
    }

    @Test
    void aFileAtTheLimitOrWithAnUnknownSizeIsFetched() {
        assertEquals(Decision.FETCH, FullTextApprovalMessage.decide("inst/submissions/2026/a.pdf", MAX, MAX));
        assertEquals(Decision.FETCH, FullTextApprovalMessage.decide("inst/submissions/2026/a.pdf", null, MAX));
    }

    @Test
    void buildsTheRecordLinkWithoutDoubleSlashes() {
        assertEquals("https://dasig.example/research/abc123",
                FullTextApprovalMessage.recordUrl("https://dasig.example", "abc123"));
        assertEquals("https://dasig.example/research/abc123",
                FullTextApprovalMessage.recordUrl("https://dasig.example///", "abc123"));
        assertEquals("http://localhost:5173/research/x", FullTextApprovalMessage.recordUrl(" http://localhost:5173/ ", "x"));
    }

    @Test
    void theAttachmentNameIsSafeAndEndsInPdf() {
        assertEquals("My_Paper.pdf", FullTextApprovalMessage.attachmentName("My_Paper.pdf", "REF-1"));
        assertEquals("My_Paper.pdf", FullTextApprovalMessage.attachmentName("My_Paper", "REF-1"));
        assertEquals("REF-2026-001.pdf", FullTextApprovalMessage.attachmentName(null, "REF-2026-001"));
        assertEquals("full-text.pdf", FullTextApprovalMessage.attachmentName("", null));
        assertEquals("a_b_c.pdf", FullTextApprovalMessage.attachmentName("a/b\\c.pdf", "REF-1"));
        assertEquals("report.PDF", FullTextApprovalMessage.attachmentName("report.PDF", "REF-1"));
    }

    @Test
    void aSubjectNeverContainsALineBreak() {
        String subject = FullTextApprovalMessage.subject("REF-1\r\nBcc: someone@example.com");
        assertFalse(subject.contains("\n"));
        assertFalse(subject.contains("\r"));
    }

    @Test
    void theAttachedVersionNamesTheFileAndTheRecordLink() {
        String body = FullTextApprovalMessage.body("Ana", "CIT-U", "Coconut study", "REF-1",
                "https://dasig.example/research/abc", "Coconut_study.pdf", Outcome.ATTACHED, true);
        assertTrue(body.startsWith("Hi Ana,"));
        assertTrue(body.contains("CIT-U has approved your request for the full text of \"Coconut study\" (reference REF-1)."));
        assertTrue(body.contains("attached to this email as Coconut_study.pdf"));
        assertTrue(body.contains("Record page: https://dasig.example/research/abc"));
        assertTrue(body.contains("Replies to this email go to the research office."));
        assertFalse(body.contains("too large"));
    }

    @Test
    void theFallbackVersionsAskThePersonToReplyAndStillHaveTheLink() {
        for (Outcome outcome : new Outcome[] {Outcome.TOO_LARGE, Outcome.NO_FILE, Outcome.UNREADABLE, Outcome.SEND_FAILED}) {
            String body = FullTextApprovalMessage.body("Ana", "CIT-U", "T", "REF-1",
                    "https://dasig.example/research/abc", "x.pdf", outcome, true);
            assertTrue(body.contains("Please reply to this email and the research office will send it to you."), outcome.name());
            assertTrue(body.contains("Record page: https://dasig.example/research/abc"), outcome.name());
            assertFalse(body.contains("attached to this email as"), outcome.name());
        }
    }

    @Test
    void theReplySentenceIsOnlyWrittenWhenRepliesReallyGoToTheOffice() {
        String withoutReplyTo = FullTextApprovalMessage.body("Ana", "CIT-U", "T", "REF-1", "u", "x.pdf", Outcome.TOO_LARGE, false);
        assertFalse(withoutReplyTo.contains("Replies to this email go to the research office."));
        assertFalse(withoutReplyTo.contains("Please reply to this email"));
        assertTrue(withoutReplyTo.contains("Please contact the research office"));
    }

    @Test
    void namesAndTitlesTypedByAPersonStayOnOneLine() {
        String body = FullTextApprovalMessage.body("Ana\r\nBcc: x@y.z", "CIT-U", "Two\nlines", "REF-1", "u", "x.pdf", Outcome.ATTACHED, true);
        assertTrue(body.startsWith("Hi Ana Bcc: x@y.z,"));
        assertTrue(body.contains("\"Two lines\""));
    }

    @Test
    void theRetryWordingNamesTheOfficeAddressAndNeverPromisesAReplyOrAnAttachment() {
        String withOffice = FullTextApprovalMessage.retryBody("Ana", "CIT-U", "T", "REF-1", "u", "x.pdf",
                Outcome.SEND_FAILED, "research@cit.example");
        assertTrue(withOffice.contains("Please contact the research office at research@cit.example and ask them to send it to you."));
        assertFalse(withOffice.contains("Replies to this email go to the research office."));
        assertFalse(withOffice.contains("Please reply to this email"));
        assertFalse(withOffice.contains("attached to this email as"));

        String attachedIsRewritten = FullTextApprovalMessage.retryBody("Ana", "CIT-U", "T", "REF-1", "u", "x.pdf",
                Outcome.ATTACHED, "research@cit.example");
        assertTrue(attachedIsRewritten.contains("because of a problem sending it"));
        assertFalse(attachedIsRewritten.contains("attached to this email as"));

        String noOffice = FullTextApprovalMessage.retryBody("Ana", "CIT-U", "T", "REF-1", "u", "x.pdf", Outcome.TOO_LARGE, null);
        assertTrue(noOffice.contains("Please contact the research office and ask them to send it to you."));
        assertFalse(noOffice.contains("research office at"));
        assertTrue(noOffice.contains("Record page: u"));
    }
}
