package com.geeks.riis_backend.event;

import com.geeks.riis_backend.model.ResearchOutput;
import com.geeks.riis_backend.repository.ResearchOutputRepository;
import com.geeks.riis_backend.service.AIProxyService;
import com.geeks.riis_backend.service.ThemeProfileService;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.event.TransactionPhase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class RecordIngestedEventListener {

    private final ResearchOutputRepository researchOutputRepository;
    private final AIProxyService aiProxyService;
    private final ThemeProfileService themeProfileService;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onRecordIngested(RecordIngestedEvent event) {
        log.info("RecordIngestedEvent received for: {}", event.referenceNumber());

        ResearchOutput output = researchOutputRepository
                .findById(event.researchOutputId())
                .orElse(null);

        if (output == null) {
            log.warn("Research output not found: {}", event.researchOutputId());
            return;
        }

        String text = buildText(output);

        List<List<Object>> keywords = aiProxyService.extractKeywords(text);
        if (!keywords.isEmpty()) {
            themeProfileService.updateThemeProfile(event.institutionId(), keywords);
            log.info("Theme profile updated for institution: {}", event.institutionId());
        } else {
            log.warn("No keywords extracted for: {}", event.referenceNumber());
        }

        // Requirement 16: the SBERT embedding + overlap detection step was removed here.
        // detectOverlaps() was the ONLY code that computed and stored the SBERT embedding,
        // and nothing else reads it (Related Research uses the SPECTER embedding below),
        // so we also skip the SBERT call to the AI service instead of wasting a request.

        float[] specterEmbedding = aiProxyService.computeSPECTEREmbedding(
                output.getTitle(), output.getAbstractText());
        if (specterEmbedding.length > 0) {
            researchOutputRepository.updateSpecterEmbedding(output.getId(), specterEmbedding);
            log.info("SPECTER embedding saved for: {}", event.referenceNumber());
        } else {
            log.warn("Empty SPECTER embedding for: {}", event.referenceNumber());
        }
    }

    private String buildText(ResearchOutput output) {
        StringBuilder sb = new StringBuilder();
        if (output.getTitle() != null) sb.append(output.getTitle()).append(" ");
        if (output.getAbstractText() != null) sb.append(output.getAbstractText()).append(" ");
        if (output.getKeywords() != null) sb.append(output.getKeywords());
        return sb.toString().trim();
    }
}