package com.geeks.riis_backend.service;

import com.geeks.riis_backend.model.ResearchOutput;
import com.geeks.riis_backend.repository.ResearchOutputRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * One-time job (requirement 2): fills in the file name, type and size of PDFs that were uploaded
 * before those columns existed (V15).
 *
 * OFF by default. To run it, set the environment variable APP_BACKFILL_ATTACHMENTS=true, restart
 * the backend once, check the log lines starting with "[AttachmentBackfill]", then REMOVE the
 * variable again. It is safe to run twice: it only touches records that still have no size saved.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.backfill.attachments", havingValue = "true")
public class AttachmentBackfillRunner implements ApplicationRunner {

	private final ResearchOutputRepository researchOutputRepository;
	private final S3UploadService s3UploadService;

	@Override
	public void run(ApplicationArguments args) {
		List<ResearchOutput> pending = researchOutputRepository.findByS3PdfKeyIsNotNullAndAttachmentSizeBytesIsNull();
		log.info("[AttachmentBackfill] {} record(s) need attachment details.", pending.size());

		int updated = 0;
		int skipped = 0;
		for (ResearchOutput output : pending) {
			S3UploadService.AttachmentDetails details = s3UploadService.describeObject(output.getS3PdfKey());
			if (details == null) {
				// The file is missing or unreadable in S3. Leave the record as it is and carry on.
				skipped++;
				continue;
			}
			researchOutputRepository.updateAttachmentDetails(
					output.getId(), details.fileName(), details.contentType(), details.sizeBytes());
			updated++;
		}
		log.info("[AttachmentBackfill] Done. Updated {}, skipped {} (file not found in S3).", updated, skipped);
	}
}
