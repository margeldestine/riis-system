package com.geeks.riis_backend.controller;

import com.geeks.riis_backend.dto.InstitutionDropdownItem;
import com.geeks.riis_backend.dto.InstitutionExportDataDTO;
import com.geeks.riis_backend.dto.InstitutionProfileDTO;
import com.geeks.riis_backend.dto.InstitutionSummaryDTO;
import com.geeks.riis_backend.dto.PublicStatsDTO;
import com.geeks.riis_backend.model.Institution;
import com.geeks.riis_backend.service.InstitutionService;
import com.geeks.riis_backend.service.ReportExportService;
import com.geeks.riis_backend.service.SubmissionService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/institutions")
@RequiredArgsConstructor
public class InstitutionController {

    private final InstitutionService institutionService;
    private final SubmissionService submissionService;
    private final ReportExportService reportExportService;

    /**
     * Public, unauthenticated stats used on the sign-in page (shown before
     * anyone logs in). Lives here rather than in SubmissionController
     * because /api/v1/institutions/** is already permitted without auth in
     * the security config; SubmissionController's routes are not.
     */
    @GetMapping("/public/stats")
    public ResponseEntity<PublicStatsDTO> getPublicStats() {
        return ResponseEntity.ok(new PublicStatsDTO(
                submissionService.countAllApproved(),
                institutionService.countAll()
        ));
    }

    @GetMapping("/active")
    public ResponseEntity<List<InstitutionDropdownItem>> getActiveInstitutions() {
        return ResponseEntity.ok(institutionService.getAllActiveInstitutions());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Institution> getInstitutionById(@PathVariable("id") String id) {
        return ResponseEntity.ok(institutionService.getInstitutionById(id));
    }

    @GetMapping
    public ResponseEntity<List<InstitutionSummaryDTO>> listInstitutions(
            @RequestParam(required = false) String province) {
        return ResponseEntity.ok(institutionService.listAll(province));
    }

    @GetMapping("/{id}/profile")
    public ResponseEntity<InstitutionProfileDTO> getInstitutionProfile(
            @PathVariable("id") String institutionId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String researchTypes,
            @RequestParam(required = false) String subjects,
            @RequestParam(required = false) Integer yearTo) {
        Pageable pageable = PageRequest.of(
                page, size, Sort.by(Sort.Direction.DESC, "completionYear"));
        return ResponseEntity.ok(institutionService.buildProfileDTO(institutionId, pageable, keyword, researchTypes, subjects, yearTo));
    }

    /**
     * Downloads a report (PDF or CSV) of the institution's research output
     * data. Applies the same keyword/researchTypes/subjects/yearTo filters
     * as the profile view, unpaginated, so the export matches whatever the
     * user currently has filtered on screen.
     */
    @GetMapping("/{id}/export")
    public ResponseEntity<byte[]> exportInstitutionReport(
            @PathVariable("id") String institutionId,
            @RequestParam(defaultValue = "pdf") String format,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String researchTypes,
            @RequestParam(required = false) String subjects,
            @RequestParam(required = false) Integer yearTo) {

        InstitutionExportDataDTO data = institutionService.buildExportData(institutionId, keyword, researchTypes, subjects, yearTo);

        byte[] content;
        MediaType mediaType;
        String extension;

        if ("csv".equalsIgnoreCase(format)) {
            content = reportExportService.generateCsv(data);
            mediaType = MediaType.parseMediaType("text/csv");
            extension = "csv";
        } else {
            content = reportExportService.generatePdf(data);
            mediaType = MediaType.APPLICATION_PDF;
            extension = "pdf";
        }

        String filename = slugify(data.institutionName()) + "-research-report." + extension;

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(content);
    }

    private String slugify(String name) {
        if (name == null || name.isBlank()) return "institution";
        return name.trim().toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
    }
}