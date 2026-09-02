import apiClient from '../services/apiClient'

const BASE = '/admin/quality-reviews'

/**
 * Client for the Phase 2.1 AI Quality Assessment endpoints
 * (`/api/v1/admin/quality-reviews/**`, DOST_ADMIN only). Uses the shared
 * `apiClient` instance so requests carry the same bearer-token
 * interceptor as every other admin call.
 *
 * This pipeline is strictly advisory: nothing here approves, rejects, or
 * awards a submission — it only creates/reads `quality_reviews` rows and
 * records a human admin's read on Claude's assessment.
 */

/** POST /{researchOutputId}/run -> 202 { reviewId, status: "PENDING" } */
export function runQualityReview(researchOutputId, rubricVersion, options = {}) {
  return apiClient.post(
    `${BASE}/${researchOutputId}/run`,
    rubricVersion ? { rubric_version: rubricVersion } : undefined,
    options,
  )
}

/** GET /{researchOutputId} -> 200 QualityReviewDTO (latest), or 404 if none exists yet */
export function getLatestQualityReview(researchOutputId, options = {}) {
  return apiClient.get(`${BASE}/${researchOutputId}`, options)
}

/** GET /{researchOutputId}/history -> 200 List<QualityReviewDTO>, newest first */
export function getQualityReviewHistory(researchOutputId, options = {}) {
  return apiClient.get(`${BASE}/${researchOutputId}/history`, options)
}

/** POST /{id}/decision -> 200 QualityReviewDTO. adminDecision: AGREE | OVERRIDE | NEEDS_MORE_INFO */
export function recordQualityReviewDecision(reviewId, adminDecision, adminNotes, options = {}) {
  return apiClient.post(
    `${BASE}/${reviewId}/decision`,
    { adminDecision, adminNotes: adminNotes || null },
    options,
  )
}

/** POST /{id}/regenerate -> 202 { reviewId, status: "PENDING" } (new row, prior rows untouched) */
export function regenerateQualityReview(reviewId, options = {}) {
  return apiClient.post(`${BASE}/${reviewId}/regenerate`, undefined, options)
}