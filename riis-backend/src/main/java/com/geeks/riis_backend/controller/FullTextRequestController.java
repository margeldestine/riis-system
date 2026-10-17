package com.geeks.riis_backend.controller;

import com.geeks.riis_backend.dto.FullTextRequestCreateDTO;
import com.geeks.riis_backend.dto.FullTextRequestDTO;
import com.geeks.riis_backend.dto.FullTextRequestStatusUpdateDTO;
import com.geeks.riis_backend.model.FullTextRequestStatus;
import com.geeks.riis_backend.security.CurrentUser;
import com.geeks.riis_backend.security.KeyedRateLimiter;
import com.geeks.riis_backend.service.FullTextRequestService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.time.Duration;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequiredArgsConstructor
public class FullTextRequestController {

    private static final int MAX_PAGE_SIZE = 50;

    private final FullTextRequestService fullTextRequestService;
    private final KeyedRateLimiter rateLimiter;

    /**
     * PUBLIC (no login). Rate limited per IP and per email (in-memory, same limitation as the auth limiter).
     * Always answers 202 with the same message, even for honeypot hits and repeat requests.
     */
    @PostMapping("/api/v1/public/research/{id}/full-text-requests")
    public ResponseEntity<Map<String, String>> create(
            @PathVariable("id") String id,
            @Valid @RequestBody FullTextRequestCreateDTO body,
            HttpServletRequest request) {

        String ip = request.getRemoteAddr();
        String email = body.email().trim().toLowerCase();
        boolean allowed = rateLimiter.tryConsume("full-text-ip", ip, 5, Duration.ofHours(1))
                && rateLimiter.tryConsume("full-text-email", email, 3, Duration.ofHours(1));
        if (!allowed) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Too many requests. Please try again later.");
        }

        fullTextRequestService.create(id, body);
        return ResponseEntity.accepted().body(Map.of(
                "message", "Your request was sent to the research office of the owning institution."));
    }

    /** Research-office inbox: HEI staff see their own institution's requests, DOST admin sees all. */
    @GetMapping("/api/v1/hei/full-text-requests")
    @PreAuthorize("hasAnyAuthority('HEI_STAFF','ROLE_HEI_STAFF','DOST_ADMIN','ROLE_DOST_ADMIN')")
    public ResponseEntity<Page<FullTextRequestDTO>> list(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        FullTextRequestStatus filter = (status == null || status.isBlank())
                ? null : FullTextRequestStatus.fromString(status);
        Pageable pageable = PageRequest.of(
                Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(fullTextRequestService.list(CurrentUser.requireUserId(), filter, pageable));
    }

    @PatchMapping("/api/v1/hei/full-text-requests/{id}")
    @PreAuthorize("hasAnyAuthority('HEI_STAFF','ROLE_HEI_STAFF','DOST_ADMIN','ROLE_DOST_ADMIN')")
    public ResponseEntity<FullTextRequestDTO> updateStatus(
            @PathVariable("id") String id,
            @Valid @RequestBody FullTextRequestStatusUpdateDTO body) {
        FullTextRequestStatus next = FullTextRequestStatus.fromString(body.status());
        return ResponseEntity.ok(
                fullTextRequestService.updateStatus(CurrentUser.requireUserId(), id, next, body.note()));
    }
}