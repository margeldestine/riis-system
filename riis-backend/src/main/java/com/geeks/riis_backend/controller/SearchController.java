package com.geeks.riis_backend.controller;

import com.geeks.riis_backend.service.SearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/search")
@RequiredArgsConstructor
public class SearchController {

    private final SearchService searchService;

    @PostMapping
    public ResponseEntity<Map<String, Object>> search(@RequestBody SearchRequest body) {
        return ResponseEntity.ok(searchService.search(
                body.query(),
                body.mode(),
                body.filters()
        ));
    }

    @GetMapping("/related/{id}")
    public ResponseEntity<List<Map<String, Object>>> getRelated(@PathVariable String id) {
        return ResponseEntity.ok(searchService.getRelated(id));
    }

    public record SearchRequest(
            String query,
            String mode,
            Map<String, Object> filters
    ) {}
}