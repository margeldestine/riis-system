package com.geeks.riis_backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.geeks.riis_backend.repository.ResearchOutputRepository;
import java.net.URI;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientException;
import org.springframework.web.reactive.function.client.WebClientResponseException;

/**
 * Requirement 1: fetches the worldwide citation count of each approved record from OpenAlex and
 * stores it on the record.
 *
 * How it works:
 * 1. Find approved records that have a DOI and were never checked (or not checked for a few days).
 * 2. Clean each DOI, and group them into batches of up to 100 (OpenAlex's limit for one request).
 * 3. Ask OpenAlex for the cited_by_count of each batch with one request.
 * 4. Save the count, the source ("openalex") and the time it was checked.
 *
 * It runs once a week (see app.openalex.cron) and can also be started by a DOST admin through
 * POST /api/v1/admin/citations/refresh. Records without a DOI are never touched, so their count
 * stays empty ("not available") instead of showing a misleading 0.
 */
@Slf4j
@Service
public class OpenAlexCitationService {

	public static final String SOURCE = "openalex";

	private static final int MAX_ATTEMPTS = 3;
	private static final long MAX_WAIT_SECONDS = 120L;
	private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(30);
	private static final long PAUSE_BETWEEN_BATCHES_MS = 250L;

	/** What one run did, returned to the admin endpoint and written to the log. */
	public record RefreshSummary(
			String status,
			int records,
			int dois,
			int updated,
			int notFound,
			int invalidDois,
			String message
	) {}

	/** Thrown to end the whole run (not just one batch), for example when the daily budget is used up. */
	private static final class StopRun extends RuntimeException {
		StopRun(String message) {
			super(message);
		}
	}

	private final ResearchOutputRepository researchOutputRepository;
	private final ObjectMapper objectMapper;
	private final WebClient client;
	private final String baseUrl;
	private final boolean enabled;
	private final int refreshDays;
	private final AtomicBoolean running = new AtomicBoolean(false);

	public OpenAlexCitationService(
			ResearchOutputRepository researchOutputRepository,
			ObjectMapper objectMapper,
			@Value("${app.openalex.base-url:https://api.openalex.org}") String baseUrl,
			@Value("${app.openalex.api-key:}") String apiKey,
			@Value("${app.openalex.enabled:true}") boolean enabled,
			@Value("${app.openalex.refresh-days:7}") int refreshDays
	) {
		this.researchOutputRepository = researchOutputRepository;
		this.objectMapper = objectMapper;
		this.baseUrl = baseUrl.trim().replaceAll("/+$", "");
		this.enabled = enabled;
		this.refreshDays = Math.max(1, refreshDays);

		WebClient.Builder builder = WebClient.builder();
		if (apiKey != null && !apiKey.isBlank()) {
			// A bearer header keeps the key out of URLs and logs. The key is optional: without it
			// OpenAlex still answers, but with a much smaller free daily budget.
			builder.defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey.trim());
		}
		this.client = builder.build();
	}

	@Scheduled(cron = "${app.openalex.cron:0 0 3 * * SUN}", zone = "Asia/Manila")
	public void scheduledRefresh() {
		if (!enabled) {
			return;
		}
		RefreshSummary summary = refresh(false);
		log.info("[OpenAlex] Scheduled run: {}", summary);
	}

	/**
	 * @param force true re-checks every record with a DOI; false skips records checked in the last
	 *              refresh-days days
	 */
	public RefreshSummary refresh(boolean force) {
		if (!running.compareAndSet(false, true)) {
			return new RefreshSummary("already_running", 0, 0, 0, 0, 0, "A citation refresh is already running.");
		}
		try {
			return doRefresh(force);
		} finally {
			running.set(false);
		}
	}

	private RefreshSummary doRefresh(boolean force) {
		LocalDateTime cutoff = force ? LocalDateTime.now().plusDays(1) : LocalDateTime.now().minusDays(refreshDays);
		List<ResearchOutputRepository.CitationCandidate> candidates =
				researchOutputRepository.findCitationCandidates(cutoff);

		// Several records can share a DOI, so group the record ids by cleaned DOI.
		Map<String, List<String>> idsByDoi = new LinkedHashMap<>();
		int invalid = 0;
		for (ResearchOutputRepository.CitationCandidate candidate : candidates) {
			String doi = OpenAlexSupport.normalizeDoi(candidate.getDoi());
			if (doi == null) {
				invalid++;
				continue;
			}
			idsByDoi.computeIfAbsent(doi, key -> new ArrayList<>()).add(candidate.getId());
		}
		log.info("[OpenAlex] {} record(s) to check, {} distinct DOI(s), {} unusable DOI(s).",
				candidates.size(), idsByDoi.size(), invalid);

		List<String> dois = new ArrayList<>(idsByDoi.keySet());
		int updated = 0;
		int notFound = 0;
		String stopMessage = null;

		for (int from = 0; from < dois.size(); from += OpenAlexSupport.MAX_DOIS_PER_REQUEST) {
			List<String> batch = dois.subList(from, Math.min(from + OpenAlexSupport.MAX_DOIS_PER_REQUEST, dois.size()));
			Map<String, Integer> counts;
			try {
				counts = fetchCounts(batch);
			} catch (StopRun e) {
				stopMessage = e.getMessage();
				log.warn("[OpenAlex] Stopping this run: {}", stopMessage);
				break;
			} catch (RuntimeException e) {
				// One bad batch must not stop the others. Its records stay unchecked and are retried next run.
				log.warn("[OpenAlex] Skipping a batch of {} DOI(s): {}", batch.size(), e.getMessage());
				continue;
			}

			LocalDateTime checkedAt = LocalDateTime.now();
			for (String doi : batch) {
				Integer count = counts.get(doi);
				for (String id : idsByDoi.get(doi)) {
					if (count == null) {
						researchOutputRepository.markCitationChecked(id, SOURCE, checkedAt);
					} else {
						researchOutputRepository.updateCitation(id, count, SOURCE, checkedAt);
					}
				}
				if (count == null) {
					notFound++;
				} else {
					updated++;
				}
			}
			sleepQuietly(PAUSE_BETWEEN_BATCHES_MS);
		}

		String status = stopMessage == null ? "completed" : "stopped";
		String message = stopMessage == null
				? "Checked " + (updated + notFound) + " DOI(s): " + updated + " with a count, " + notFound
						+ " not found in OpenAlex."
				: stopMessage;
		return new RefreshSummary(status, candidates.size(), idsByDoi.size(), updated, notFound, invalid, message);
	}

	/**
	 * One OpenAlex request for a batch of up to 100 DOIs, with limited retries:
	 * - 401/403: the key is wrong or its email was never confirmed, so stop the whole run.
	 * - 429: wait for the Retry-After time (if it is short) and try again. A long wait means the daily
	 *   budget is used up, so stop the run. The records that were not reached are picked up next time.
	 * - 5xx or a network problem: wait a little and try again, then give up on this batch only.
	 */
	private Map<String, Integer> fetchCounts(List<String> dois) {
		URI uri = URI.create(baseUrl + OpenAlexSupport.worksPath(dois));
		for (int attempt = 1; ; attempt++) {
			try {
				String body = client.get()
						.uri(uri)
						.accept(MediaType.APPLICATION_JSON)
						.retrieve()
						.bodyToMono(String.class)
						.block(REQUEST_TIMEOUT);
				return OpenAlexSupport.parseCounts(objectMapper, body == null ? "{}" : body);
			} catch (WebClientResponseException e) {
				int status = e.getStatusCode().value();
				if (status == 401 || status == 403) {
					throw new StopRun("OpenAlex refused the request (HTTP " + status
							+ "). Check OPENALEX_API_KEY, and that the email of the key was confirmed.");
				}
				if (status == 429) {
					long wait = OpenAlexSupport.retryAfterSeconds(e.getHeaders().getFirst(HttpHeaders.RETRY_AFTER), 10L);
					if (wait > MAX_WAIT_SECONDS || attempt >= MAX_ATTEMPTS) {
						throw new StopRun("OpenAlex rate limit or daily budget reached (HTTP 429). "
								+ "The remaining records will be tried at the next run.");
					}
					log.info("[OpenAlex] Rate limited, waiting {} second(s).", wait);
					sleepQuietly(wait * 1000L);
					continue;
				}
				if (status >= 500 && attempt < MAX_ATTEMPTS) {
					sleepQuietly(2000L * attempt);
					continue;
				}
				throw e;
			} catch (WebClientException | IllegalStateException e) {
				// Network error, timeout, or an unreadable response.
				if (attempt >= MAX_ATTEMPTS) {
					throw e;
				}
				sleepQuietly(2000L * attempt);
			}
		}
	}

	private void sleepQuietly(long millis) {
		try {
			Thread.sleep(millis);
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			throw new StopRun("The citation refresh was interrupted.");
		}
	}
}
