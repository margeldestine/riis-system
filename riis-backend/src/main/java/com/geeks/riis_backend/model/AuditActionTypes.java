package com.geeks.riis_backend.model;

/** Audit log action_type values added for Priority 1 (governed public access). */
public final class AuditActionTypes {

    private AuditActionTypes() {}

    /** target_type RESEARCH_OUTPUT; metadata_json: { "from": "...", "to": "..." } */
    public static final String RECORD_VISIBILITY_CHANGED = "RECORD_VISIBILITY_CHANGED";

    /** target_type INSTITUTION; metadata_json: { "from": "...", "to": "..." } */
    public static final String INSTITUTION_DEFAULT_VISIBILITY_CHANGED = "INSTITUTION_DEFAULT_VISIBILITY_CHANGED";

    /** target_type FULL_TEXT_REQUEST; actor may be null (public requester). */
    public static final String FULL_TEXT_REQUEST_CREATED = "FULL_TEXT_REQUEST_CREATED";

    /** target_type FULL_TEXT_REQUEST; metadata_json: { "from": "...", "to": "..." } */
    public static final String FULL_TEXT_REQUEST_STATUS_CHANGED = "FULL_TEXT_REQUEST_STATUS_CHANGED";
}