package com.geeks.riis_backend.controller;

import com.geeks.riis_backend.dto.SubmissionModelRequest;
import com.geeks.riis_backend.dto.SubmissionModelResponse;
import com.geeks.riis_backend.model.SubmissionModel;
import com.geeks.riis_backend.security.CurrentUser;
import com.geeks.riis_backend.service.SubmissionModelService;
import jakarta.validation.Valid;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class SubmissionModelController {

    private final SubmissionModelService submissionModelService;

    /** DOST admin: current model, note and last update. */
    @GetMapping("/api/v1/admin/settings/submission-model")
    @PreAuthorize("hasAnyAuthority('DOST_ADMIN','ROLE_DOST_ADMIN')")
    public ResponseEntity<SubmissionModelResponse> getForAdmin() {
        return ResponseEntity.ok(submissionModelService.get());
    }

    /** DOST admin: record a decision. Writes an audit log entry. */
    @PutMapping("/api/v1/admin/settings/submission-model")
    @PreAuthorize("hasAnyAuthority('DOST_ADMIN','ROLE_DOST_ADMIN')")
    public ResponseEntity<SubmissionModelResponse> change(@Valid @RequestBody SubmissionModelRequest body) {
        SubmissionModel next = SubmissionModel.fromString(body.model());
        return ResponseEntity.ok(submissionModelService.change(CurrentUser.requireUserId(), next, body.note()));
    }

    /** Public (About page): model and label only. The internal note and timestamps are not exposed. */
    @GetMapping("/api/v1/public/submission-model")
    public ResponseEntity<Map<String, String>> getPublic() {
        SubmissionModelResponse current = submissionModelService.get();
        return ResponseEntity.ok(Map.of("model", current.model(), "label", current.label()));
    }
}