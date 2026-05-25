package com.geeks.riis_backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.geeks.riis_backend.dto.ValidationResult;
import com.geeks.riis_backend.model.Institution;
import com.geeks.riis_backend.model.ResearchOutput;
import com.geeks.riis_backend.model.ValidationLog;
import com.geeks.riis_backend.repository.InstitutionRepository;
import com.geeks.riis_backend.repository.ResearchOutputRepository;
import com.geeks.riis_backend.repository.ValidationLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ValidationLogService {

    private final ValidationLogRepository validationLogRepository;
    private final InstitutionRepository institutionRepository;
    private final ResearchOutputRepository researchOutputRepository;
    private final ObjectMapper objectMapper;

    public void persistValidationResult(
            ValidationResult result,
            String institutionId,
            String researchOutputId,
            String triggeredBy) {

        try {
            Institution institution = institutionRepository.findById(institutionId)
                    .orElse(null);
            if (institution == null) {
                log.warn("Institution not found for validation log: {}", institutionId);
                return;
            }

            ResearchOutput researchOutput = researchOutputId != null
                    ? researchOutputRepository.findById(researchOutputId).orElse(null)
                    : null;

            ArrayNode errorsJson = objectMapper.createArrayNode();
            if (result.errors() != null) {
                for (var error : result.errors()) {
                    ObjectNode node = objectMapper.createObjectNode();
                    node.put("field", error.field());
                    node.put("message", error.message());
                    errorsJson.add(node);
                }
            }

            ValidationLog validationLog = ValidationLog.builder()
                    .researchOutput(researchOutput)
                    .institution(institution)
                    .validatedAt(LocalDateTime.now())
                    .passed(result.passed())
                    .errorCount(result.errors() != null ? result.errors().size() : 0)
                    .errorsJson(errorsJson)
                    .triggeredBy(triggeredBy)
                    .hasWarnings(false)
                    .build();

            validationLogRepository.save(validationLog);

        } catch (Exception e) {
            log.warn("Failed to persist validation log: {}", e.getMessage());
        }
    }
}