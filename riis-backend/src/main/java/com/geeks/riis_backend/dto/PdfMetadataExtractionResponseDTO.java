// riis-backend/src/main/java/com/geeks/riis_backend/dto/PdfMetadataExtractionResponseDTO.java
package com.geeks.riis_backend.dto;

import java.util.List;
import java.util.Map;

/**
 * Advisory result of reading a research PDF for the guided submission intake.
 *
 * <p>The endpoint always answers HTTP 200 for a request that was well-formed, even
 * when the PDF could not be read: {@code status} carries the typed outcome (the
 * name of a {@code PdfExtractionStatus}) and {@code extracted} says whether any
 * field was found. The form then simply stays empty for manual entry.
 *
 * @param status       {@code SUCCESS}, {@code LIKELY_SCANNED_OR_IMAGE_ONLY},
 *                     {@code CORRUPTED_OR_UNREADABLE_PDF}, {@code S3_KEY_MISSING}
 *                     or {@code IO_ERROR}
 * @param extracted    true when at least one field was pre-filled
 * @param confidence   per-field HIGH / MEDIUM / LOW / NONE, keyed by the form field names
 *                     ({@code title}, {@code authors}, {@code abstractText},
 *                     {@code keywords}, {@code doi})
 * @param warnings     human-readable hints to show on the review step
 * @param message      one-line summary suitable for a banner
 */
public record PdfMetadataExtractionResponseDTO(
        String status,
        boolean extracted,
        String title,
        List<String> authors,
        String abstractText,
        List<String> keywords,
        String doi,
        Map<String, String> confidence,
        List<String> warnings,
        String message
) {}