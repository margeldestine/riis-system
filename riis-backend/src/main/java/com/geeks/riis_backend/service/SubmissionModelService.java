package com.geeks.riis_backend.service;

import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.geeks.riis_backend.dto.SubmissionModelResponse;
import com.geeks.riis_backend.exception.BadRequestException;
import com.geeks.riis_backend.model.AuditActionTypes;
import com.geeks.riis_backend.model.SubmissionModel;
import com.geeks.riis_backend.model.SystemSetting;
import com.geeks.riis_backend.repository.SystemSettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Reads and changes the recorded Mandatory/Voluntary submission model. Recording only: nothing is enforced. */
@Service
@RequiredArgsConstructor
@Transactional
public class SubmissionModelService {

    public static final String KEY = "submission_model";

    private final SystemSettingRepository systemSettingRepository;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public SubmissionModelResponse get() {
        SystemSetting setting = systemSettingRepository.findById(KEY).orElse(null);
        SubmissionModel model = setting == null ? SubmissionModel.VOLUNTARY : SubmissionModel.fromString(setting.getValue());
        return toResponse(model, setting, false);
    }

    public SubmissionModelResponse change(String actorUserId, SubmissionModel next, String note) {
        if (note == null || note.isBlank()) {
            throw new BadRequestException("A note recording the basis of this decision is required.");
        }

        SystemSetting setting = systemSettingRepository.findById(KEY)
                .orElseGet(() -> SystemSetting.builder().key(KEY).value(SubmissionModel.VOLUNTARY.name()).build());
        SubmissionModel current = SubmissionModel.fromString(setting.getValue());

        // Same model and same note: nothing to record.
        if (current == next && note.trim().equals(setting.getNote())) {
            return toResponse(current, setting, false);
        }

        setting.setValue(next.name());
        setting.setNote(note.trim());
        setting.setUpdatedBy(actorUserId);
        SystemSetting saved = systemSettingRepository.save(setting);

        ObjectNode metadata = JsonNodeFactory.instance.objectNode();
        metadata.put("from", current.name());
        metadata.put("to", next.name());
        metadata.put("note", note.trim());
        auditLogService.logWithMetadata(
                AuditActionTypes.SUBMISSION_MODEL_CHANGED,
                "SYSTEM_SETTING",
                KEY,
                actorUserId,
                current == next
                        ? "Submission model basis updated (still " + next.getLabel() + ")."
                        : "Submission model changed from " + current.getLabel() + " to " + next.getLabel() + ".",
                metadata);

        return toResponse(next, saved, true);
    }

    private SubmissionModelResponse toResponse(SubmissionModel model, SystemSetting setting, boolean changed) {
        return new SubmissionModelResponse(
                model.name(),
                model.getLabel(),
                setting == null ? null : setting.getNote(),
                setting == null ? null : setting.getUpdatedAt(),
                changed);
    }
}