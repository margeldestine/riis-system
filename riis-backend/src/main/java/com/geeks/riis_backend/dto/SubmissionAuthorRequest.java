package com.geeks.riis_backend.dto;

/**
 * One author in a submission. Used as the request body AND in the detail responses that only
 * HEI staff (own institution) and DOST admins can open, so it may carry the author's email.
 * Public responses use PublicAuthorDTO, which deliberately has no email field.
 */
public record SubmissionAuthorRequest(
		String fullName,
		String orcid,
		String institution,
		String email
) {}