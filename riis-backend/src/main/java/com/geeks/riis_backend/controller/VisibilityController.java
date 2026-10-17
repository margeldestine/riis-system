package com.geeks.riis_backend.controller;

import com.geeks.riis_backend.dto.VisibilityChangeRequest;
import com.geeks.riis_backend.dto.VisibilityResponse;
import com.geeks.riis_backend.model.AccessVisibility;
import com.geeks.riis_backend.security.CurrentUser;
import com.geeks.riis_backend.service.VisibilityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class VisibilityController {

    private final VisibilityService visibilityService;

    /** HEI staff (own institution) or DOST admin. */
    @PatchMapping("/api/v1/submissions/{id}/visibility")
    @PreAuthorize("hasAnyAuthority('HEI_STAFF','ROLE_HEI_STAFF','DOST_ADMIN','ROLE_DOST_ADMIN')")
    public ResponseEntity<VisibilityResponse> changeRecordVisibility(
            @PathVariable("id") String id,
            @Valid @RequestBody VisibilityChangeRequest body) {
        AccessVisibility next = AccessVisibility.fromString(body.visibility());
        return ResponseEntity.ok(visibilityService.changeRecordVisibility(CurrentUser.requireUserId(), id, next));
    }

    @GetMapping("/api/v1/hei/settings/default-visibility")
    @PreAuthorize("hasAnyAuthority('HEI_STAFF','ROLE_HEI_STAFF')")
    public ResponseEntity<VisibilityResponse> getOwnDefault() {
        return ResponseEntity.ok(visibilityService.getOwnInstitutionDefault(CurrentUser.requireUserId()));
    }

    @PutMapping("/api/v1/hei/settings/default-visibility")
    @PreAuthorize("hasAnyAuthority('HEI_STAFF','ROLE_HEI_STAFF')")
    public ResponseEntity<VisibilityResponse> changeOwnDefault(@Valid @RequestBody VisibilityChangeRequest body) {
        AccessVisibility next = AccessVisibility.fromString(body.visibility());
        return ResponseEntity.ok(visibilityService.changeOwnInstitutionDefault(CurrentUser.requireUserId(), next));
    }

    @PatchMapping("/api/v1/admin/institutions/{id}/default-visibility")
    @PreAuthorize("hasAnyAuthority('DOST_ADMIN','ROLE_DOST_ADMIN')")
    public ResponseEntity<VisibilityResponse> changeInstitutionDefault(
            @PathVariable("id") String id,
            @Valid @RequestBody VisibilityChangeRequest body) {
        AccessVisibility next = AccessVisibility.fromString(body.visibility());
        return ResponseEntity.ok(visibilityService.changeInstitutionDefault(CurrentUser.requireUserId(), id, next));
    }
}