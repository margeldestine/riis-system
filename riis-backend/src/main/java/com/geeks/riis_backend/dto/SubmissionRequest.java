package com.geeks.riis_backend.dto;

import jakarta.validation.constraints.Size;
import java.util.List;

public record SubmissionRequest(
		String title,
		Integer completionYear,
		String abstractText,
		List<String> keywords,
		String doi,
		List<SubmissionAuthorRequest> authors,

		// sAndTTheme -> ResearchOutput.subjectDc, coverageDc, and rightsDc are
		// genuinely free-text fields, not a closed vocabulary: confirmed by
		// checking both the entity (columnDefinition = "text", no enum/check
		// constraint) and the frontend's own Zod schema for this form
		// (SubmissionPortal.jsx), which validates these as free text with a
		// "not gibberish" heuristic, not a fixed option list. A @Size cap is
		// the correct fix here, not an invented enum that could reject
		// currently-valid submissions the frontend already accepts.
		@Size(max = 500, message = "Subject must be at most 500 characters.")
		String sAndTTheme,

		String researchType,
		String fundingSource,
		String publicationVenue,

		@Size(max = 500, message = "Coverage must be at most 500 characters.")
		String coverageDc,

		@Size(max = 500, message = "Rights must be at most 500 characters.")
		String rightsDc,

		String conferenceUrl,
		String principalInvestigator,
		String institutionalAffiliation,
		String attachmentKey
) {}