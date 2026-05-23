package com.geeks.riis_backend.event;

public record RecordIngestedEvent(
		String researchOutputId,
		String referenceNumber,
		String institutionId
) {}
