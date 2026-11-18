package com.geeks.riis_backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Pure helpers for talking to the OpenAlex API (requirement 1). There is no Spring code here on
 * purpose, so these small rules are easy to unit test without starting the application.
 */
final class OpenAlexSupport {

	/** OpenAlex accepts at most 100 values in one OR filter, and returns at most 100 results per page. */
	static final int MAX_DOIS_PER_REQUEST = 100;

	/**
	 * A plain DOI: "10.", 4 to 9 digits, "/", then a suffix. Commas, pipes, quotes and spaces are
	 * refused because they would break the OpenAlex filter syntax ("," separates filters, "|" is OR).
	 */
	private static final Pattern DOI_PATTERN = Pattern.compile("^10\\.\\d{4,9}/[^\\s,|\"]+$");

	private static final String[] DOI_PREFIXES = {
			"https://doi.org/", "http://doi.org/", "https://dx.doi.org/", "http://dx.doi.org/", "doi:"
	};

	private OpenAlexSupport() {}

	/**
	 * Turns whatever was typed or stored into one canonical form: lower case, no "https://doi.org/"
	 * or "doi:" prefix, no surrounding spaces. Returns null if it is not a usable DOI. DOIs are
	 * case-insensitive, so lower-casing lets us match them against what OpenAlex returns.
	 */
	static String normalizeDoi(String raw) {
		if (raw == null) {
			return null;
		}
		String doi = raw.trim().toLowerCase(Locale.ROOT);
		for (String prefix : DOI_PREFIXES) {
			if (doi.startsWith(prefix)) {
				doi = doi.substring(prefix.length());
				break;
			}
		}
		return DOI_PATTERN.matcher(doi).matches() ? doi : null;
	}

	/**
	 * The request path for one batch, already percent-encoded, for example
	 * /works?filter=doi%3Ahttps%3A%2F%2Fdoi.org%2F10.1234%2Fa%7Chttps%3A%2F%2Fdoi.org%2F10.5678%2Fb&per_page=100&select=id,doi,cited_by_count
	 * "select" asks for only the three fields we use, so the response stays small.
	 */
	static String worksPath(List<String> normalizedDois) {
		String filter = "doi:" + normalizedDois.stream()
				.map(doi -> "https://doi.org/" + doi)
				.collect(Collectors.joining("|"));
		return "/works?filter=" + URLEncoder.encode(filter, StandardCharsets.UTF_8)
				+ "&per_page=" + MAX_DOIS_PER_REQUEST
				+ "&select=id,doi,cited_by_count";
	}

	/** Reads "results" and returns normalized DOI -> cited_by_count. Works without a DOI or a count are skipped. */
	static Map<String, Integer> parseCounts(ObjectMapper mapper, String json) {
		try {
			Map<String, Integer> counts = new HashMap<>();
			for (JsonNode work : mapper.readTree(json).path("results")) {
				String doi = normalizeDoi(work.path("doi").asText(null));
				JsonNode count = work.path("cited_by_count");
				if (doi != null && count.isNumber()) {
					counts.put(doi, count.asInt());
				}
			}
			return counts;
		} catch (JsonProcessingException e) {
			throw new IllegalStateException("Could not read the OpenAlex response.", e);
		}
	}

	/** Seconds to wait from a Retry-After header. A missing or non-numeric header gives the fallback. */
	static long retryAfterSeconds(String header, long fallbackSeconds) {
		if (header == null || header.isBlank()) {
			return fallbackSeconds;
		}
		try {
			return Math.max(1L, Long.parseLong(header.trim()));
		} catch (NumberFormatException e) {
			return fallbackSeconds;
		}
	}
}
