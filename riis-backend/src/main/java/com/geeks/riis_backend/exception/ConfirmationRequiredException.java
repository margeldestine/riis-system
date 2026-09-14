package com.geeks.riis_backend.exception;

import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * UC-M5-03: thrown when an admin action would have a side effect that
 * needs explicit confirmation (e.g. deactivating/suspending an HEI that
 * still has ACTIVE HEI_STAFF accounts). Carries a small JSON payload
 * beyond a plain message -- e.g. the count of affected accounts -- so the
 * frontend can render a specific warning and let the admin confirm and
 * resend the request rather than just showing a generic error.
 */
@ResponseStatus(HttpStatus.CONFLICT)
public class ConfirmationRequiredException extends RuntimeException {

    private final Map<String, Object> details;

    public ConfirmationRequiredException(String message, Map<String, Object> details) {
        super(message);
        this.details = details;
    }

    public Map<String, Object> getDetails() {
        return details;
    }
}