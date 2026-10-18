package com.geeks.riis_backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.geeks.riis_backend.dto.SubmissionModelResponse;
import com.geeks.riis_backend.exception.BadRequestException;
import com.geeks.riis_backend.model.AuditActionTypes;
import com.geeks.riis_backend.model.SubmissionModel;
import com.geeks.riis_backend.model.SystemSetting;
import com.geeks.riis_backend.repository.SystemSettingRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class SubmissionModelServiceTest {

    private SystemSettingRepository repo;
    private AuditLogService auditLogService;
    private SubmissionModelService service;

    @BeforeEach
    void setUp() {
        repo = mock(SystemSettingRepository.class);
        auditLogService = mock(AuditLogService.class);
        service = new SubmissionModelService(repo, auditLogService);
        when(repo.save(any(SystemSetting.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private SystemSetting existing(String value, String note) {
        return SystemSetting.builder().key(SubmissionModelService.KEY).value(value).note(note).build();
    }

    @Test
    void get_defaultsToVoluntaryWhenRowMissing() {
        when(repo.findById(SubmissionModelService.KEY)).thenReturn(Optional.empty());
        assertEquals("VOLUNTARY", service.get().model());
    }

    @Test
    void change_savesAndWritesAuditEntry() {
        when(repo.findById(SubmissionModelService.KEY)).thenReturn(Optional.of(existing("VOLUNTARY", "initial")));

        SubmissionModelResponse result = service.change("u1", SubmissionModel.MANDATORY, "DOST memo 2026-10");

        assertTrue(result.changed());
        assertEquals("MANDATORY", result.model());
        verify(auditLogService).logWithMetadata(
                eq(AuditActionTypes.SUBMISSION_MODEL_CHANGED), eq("SYSTEM_SETTING"),
                eq(SubmissionModelService.KEY), eq("u1"), any(), any());
    }

    @Test
    void change_sameModelAndNoteIsNoOp() {
        when(repo.findById(SubmissionModelService.KEY)).thenReturn(Optional.of(existing("VOLUNTARY", "same")));

        SubmissionModelResponse result = service.change("u1", SubmissionModel.VOLUNTARY, "same");

        assertFalse(result.changed());
        verify(repo, never()).save(any());
        verify(auditLogService, never()).logWithMetadata(any(), any(), any(), any(), any(), any());
    }

    @Test
    void change_requiresNote() {
        assertThrows(BadRequestException.class, () -> service.change("u1", SubmissionModel.MANDATORY, "  "));
    }
}