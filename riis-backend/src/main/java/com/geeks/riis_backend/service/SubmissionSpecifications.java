package com.geeks.riis_backend.service;

import com.geeks.riis_backend.dto.SubmissionFilterDTO;
import com.geeks.riis_backend.model.ResearchOutput;
import java.util.List;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

public class SubmissionSpecifications {

	public static Specification<ResearchOutput> forInstitution(String institutionId) {
		return (root, query, cb) -> cb.equal(root.get("institution").get("id"), institutionId);
	}

	public static Specification<ResearchOutput> withFilters(SubmissionFilterDTO filter) {
		return (root, query, cb) -> {
			if (filter == null) {
				return cb.conjunction();
			}

			var predicate = cb.conjunction();

			List<String> statuses = normalizeList(filter.getStatuses());
			if (!statuses.isEmpty()) {
				predicate = cb.and(predicate, root.get("status").in(statuses));
			}

			List<String> researchTypes = normalizeList(filter.getResearchTypes());
			if (!researchTypes.isEmpty()) {
				predicate = cb.and(predicate, root.get("researchType").in(researchTypes));
			}

			if (filter.getCompletionYearFrom() != null) {
				predicate = cb.and(predicate, cb.greaterThanOrEqualTo(root.get("completionYear"), filter.getCompletionYearFrom()));
			}

			if (filter.getCompletionYearTo() != null) {
				predicate = cb.and(predicate, cb.lessThanOrEqualTo(root.get("completionYear"), filter.getCompletionYearTo()));
			}

			return predicate;
		};
	}

	private static List<String> normalizeList(List<String> values) {
		if (values == null) return List.of();
		return values.stream()
				.filter(v -> v != null && !v.isBlank())
				.map(v -> v.trim().toUpperCase(Locale.ROOT))
				.distinct()
				.toList();
	}
}
