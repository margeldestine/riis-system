// riis-backend/src/test/java/com/geeks/riis_backend/service/SimilarityDispositionServiceTest.java
package com.geeks.riis_backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.geeks.riis_backend.dto.OverlapMatchDTO;
import com.geeks.riis_backend.dto.SimilarityDispositionRequest;
import com.geeks.riis_backend.exception.BadRequestException;
import com.geeks.riis_backend.model.OverlapAlert;
import com.geeks.riis_backend.model.ResearchOutput;
import com.geeks.riis_backend.model.SimilarityDispositionStatus;
import com.geeks.riis_backend.model.User;
import com.geeks.riis_backend.repository.AuditLogEntryRepository;
import com.geeks.riis_backend.repository.OverlapAlertRepository;
import com.geeks.riis_backend.repository.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class SimilarityDispositionServiceTest {

    private OverlapAlertRepository alertRepository;
    private AuditLogEntryRepository auditLogEntryRepository;
    private UserRepository userRepository;
    private AuditLogService auditLogService;
    private SimilarityDispositionService service;
    private OverlapAlert alert;

    @BeforeEach
    void setUp() {
        alertRepository = mock(OverlapAlertRepository.class);
        auditLogEntryRepository = mock(AuditLogEntryRepository.class);
        userRepository = mock(UserRepository.class);
        auditLogService = mock(AuditLogService.class);
        service = new SimilarityDispositionService(
                alertRepository, auditLogEntryRepository, userRepository, auditLogService);

        User admin = mock(User.class);
        when(admin.getId()).thenReturn("admin-1");
        when(admin.getFullName()).thenReturn("DOST Admin");
        when(userRepository.findById("admin-1")).thenReturn(Optional.of(admin));

        ResearchOutput newRecord = mock(ResearchOutput.class);
        when(newRecord.getId()).thenReturn("new-1");
        when(newRecord.getReferenceNumber()).thenReturn("RIS-2026-001");
        ResearchOutput existing = mock(ResearchOutput.class);
        when(existing.getId()).thenReturn("old-1");
        when(existing.getReferenceNumber()).thenReturn("RIS-2025-044");
        when(existing.getTitle()).thenReturn("Existing study");

        alert = OverlapAlert.builder()
                .id("alert-1")
                .newRecord(newRecord)
                .existingRecord(existing)
                .similarityScore(0.93)
                .build();
        when(alertRepository.findByIdForUpdate("alert-1")).thenReturn(Optional.of(alert));
    }

    @Test
    void newAlertsDefaultToOpen() {
        assertEquals(SimilarityDispositionStatus.OPEN, alert.getStatus());
    }

    @Test
    void appliesDispositionAndWritesAuditEntryWithBeforeAndAfter() {
        OverlapMatchDTO dto = service.updateDisposition("alert-1", "admin-1",
                new SimilarityDispositionRequest("REFERRED_FOR_COLLABORATION", "Both teams work on Bohol floods.", "OPEN"));

        assertEquals("REFERRED_FOR_COLLABORATION", dto.status());
        assertEquals("Referred for collaboration", dto.statusLabel());
        assertEquals("DOST Admin", dto.reviewedByName());
        assertNotNull(dto.reviewedAt());
        assertEquals(SimilarityDispositionStatus.REFERRED_FOR_COLLABORATION, alert.getStatus());
        verify(alertRepository).save(alert);
        verify(auditLogService).logWithMetadata(
                eq("SIMILARITY_FLAG_DISPOSITION_CHANGED"), eq("OVERLAP_ALERT"), eq("alert-1"),
                eq("admin-1"), any(String.class), any());
    }

    @Test
    void staleExpectedStatusIsRejectedWithConflictAndNothingIsWritten() {
        alert.setStatus(SimilarityDispositionStatus.REVIEWED_NO_ISSUE);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                service.updateDisposition("alert-1", "admin-1",
                        new SimilarityDispositionRequest("ESCALATED_TO_RESEARCH_OFFICE", "Escalating after review.", "OPEN")));

        assertEquals(409, ex.getStatusCode().value());
        verify(alertRepository, never()).save(any());
        verify(auditLogService, never()).logWithMetadata(any(), any(), any(), any(), any(), any());
    }

    @Test
    void unchangedStatusAndNoteIsRejected() {
        alert.setStatus(SimilarityDispositionStatus.REVIEWED_NO_ISSUE);
        alert.setDispositionNotes("Different topics despite similar titles.");

        assertThrows(BadRequestException.class, () ->
                service.updateDisposition("alert-1", "admin-1",
                        new SimilarityDispositionRequest("REVIEWED_NO_ISSUE", "Different topics despite similar titles.", null)));
    }

    @Test
    void shortNotesAndUnknownStatusesAreRejected() {
        assertThrows(BadRequestException.class, () ->
                service.updateDisposition("alert-1", "admin-1",
                        new SimilarityDispositionRequest("REVIEWED_NO_ISSUE", "ok", null)));
        assertThrows(BadRequestException.class, () ->
                service.updateDisposition("alert-1", "admin-1",
                        new SimilarityDispositionRequest("DELETED", "Not a real status value.", null)));
        verify(alertRepository, never()).save(any());
    }

    @Test
    void reopeningAFlagIsAllowedWithANote() {
        alert.setStatus(SimilarityDispositionStatus.REVIEWED_NO_ISSUE);

        OverlapMatchDTO dto = service.updateDisposition("alert-1", "admin-1",
                new SimilarityDispositionRequest("OPEN", "New evidence of overlap in the methods section.", "REVIEWED_NO_ISSUE"));

        assertEquals("OPEN", dto.status());
    }
}