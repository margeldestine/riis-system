package com.geeks.riis_backend.service;

import com.geeks.riis_backend.model.OverlapAlert;
import com.geeks.riis_backend.model.ResearchOutput;
import com.geeks.riis_backend.model.User;
import com.geeks.riis_backend.repository.OverlapAlertRepository;
import com.geeks.riis_backend.repository.ResearchOutputRepository;
import com.geeks.riis_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class OverlapDetectionService {

    private static final double OVERLAP_THRESHOLD = 0.80;

    private final ResearchOutputRepository researchOutputRepository;
    private final OverlapAlertRepository overlapAlertRepository;
    private final UserRepository userRepository;
    private final EmailNotificationService emailNotificationService;

    public void detectOverlaps(ResearchOutput newRecord, float[] newEmbedding) {
        if (newEmbedding == null || newEmbedding.length == 0) {
            log.warn("Empty embedding for record: {}", newRecord.getReferenceNumber());
            return;
        }

        researchOutputRepository.updateSbertEmbedding(newRecord.getId(), newEmbedding);

        List<ResearchOutput> similar = researchOutputRepository
                .findSimilarBySbertEmbedding(newEmbedding, newRecord.getId(), OVERLAP_THRESHOLD);

        for (ResearchOutput existing : similar) {
            if (overlapAlertRepository.existsByNewRecordIdAndExistingRecordId(
                    newRecord.getId(), existing.getId())) continue;

            double similarity = computeCosineSimilarity(newEmbedding, existing.getSbertEmbedding());

            log.info("Overlap detected: {} and {} (score: {})",
                    newRecord.getReferenceNumber(),
                    existing.getReferenceNumber(),
                    similarity);

            OverlapAlert alert = OverlapAlert.builder()
                    .newRecord(newRecord)
                    .existingRecord(existing)
                    .similarityScore(similarity)
                    .detectedAt(LocalDateTime.now())
                    .notificationSent(false)
                    .build();

            overlapAlertRepository.save(alert);

            String submitterEmail = getSubmitterEmail(newRecord);
            if (submitterEmail != null) {
                emailNotificationService.sendOverlapDetectionAlert(
                        submitterEmail,
                        newRecord.getTitle(),
                        existing.getTitle(),
                        existing.getInstitution() != null ? existing.getInstitution().getName() : "Unknown",
                        similarity
                );
                alert.setNotificationSent(true);
                overlapAlertRepository.save(alert);
            }
        }
    }

    private String getSubmitterEmail(ResearchOutput output) {
        try {
            if (output.getInstitution() == null) return null;
            return userRepository.findAll().stream()
                    .filter(u -> u.getInstitution() != null &&
                            u.getInstitution().getId().equals(output.getInstitution().getId()))
                    .map(User::getEmail)
                    .findFirst()
                    .orElse(null);
        } catch (Exception e) {
            return null;
        }
    }

    private double computeCosineSimilarity(float[] a, float[] b) {
        if (a == null || b == null || a.length != b.length) return 0.0;
        double dot = 0.0, normA = 0.0, normB = 0.0;
        for (int i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        if (normA == 0 || normB == 0) return 0.0;
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}