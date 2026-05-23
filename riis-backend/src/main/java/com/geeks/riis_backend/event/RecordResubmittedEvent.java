package com.geeks.riis_backend.event;

public record RecordResubmittedEvent(
		String researchOutputId,
		String referenceNumber,
		String institutionId
) {}
