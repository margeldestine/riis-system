package com.geeks.riis_backend.service;

import com.geeks.riis_backend.dto.FullTextActionDTO;
import com.geeks.riis_backend.model.AccessVisibility;
import com.geeks.riis_backend.model.ResearchOutput;
import com.geeks.riis_backend.model.User;
import com.geeks.riis_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Central rule for what a viewer may see of a research output.
 *
 *  - Anonymous / other users  -> the record's own tier.
 *  - HEI staff of the owning institution, and DOST/Super admins -> everything.
 *
 * Fail-safe: a record with a missing visibility is treated as RESTRICTED.
 * The raw PDF reference is never part of any public response, whatever the tier.
 */
@Component
@RequiredArgsConstructor
public class PublicAccessPolicy {

    private final UserRepository userRepository;

    /** Who is looking, resolved once per request. */
    public record Viewer(boolean admin, String institutionId) {

        public static final Viewer ANONYMOUS = new Viewer(false, null);

        public boolean canSeeAll(String recordInstitutionId) {
            return admin || (institutionId != null && institutionId.equals(recordInstitutionId));
        }
    }

    public static String normalizedRole(User user) {
        if (user == null || user.getRole() == null) {
            return "";
        }
        return user.getRole().trim().replaceFirst("^ROLE_", "").toUpperCase();
    }

    public static boolean isAdmin(User user) {
        String role = normalizedRole(user);
        return role.equals("DOST_ADMIN") || role.equals("SUPER_ADMIN");
    }

    public static boolean isHeiStaff(User user) {
        return normalizedRole(user).equals("HEI_STAFF");
    }

    public Viewer currentViewer() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            return Viewer.ANONYMOUS;
        }
        Object principal = auth.getPrincipal();
        if (principal == null || "anonymousUser".equalsIgnoreCase(principal.toString())) {
            return Viewer.ANONYMOUS;
        }
        User user = userRepository.findById(principal.toString()).orElse(null);
        if (user == null || !"ACTIVE".equalsIgnoreCase(user.getStatus())) {
            return Viewer.ANONYMOUS;
        }
        boolean admin = isAdmin(user);
        String institutionId = isHeiStaff(user) && user.getInstitution() != null
                ? user.getInstitution().getId()
                : null;
        return new Viewer(admin, institutionId);
    }

    public String institutionIdOf(ResearchOutput output) {
        return output.getInstitution() != null ? output.getInstitution().getId() : null;
    }

    /** The record's own tier (null-safe, fail-closed). */
    public AccessVisibility effectiveVisibility(ResearchOutput output) {
        AccessVisibility visibility = output.getVisibility();
        return visibility == null ? AccessVisibility.RESTRICTED : visibility;
    }

    /** The tier this particular viewer gets to see. Owners and admins get PUBLIC (= everything). */
    public AccessVisibility viewTier(Viewer viewer, ResearchOutput output) {
        if (viewer.canSeeAll(institutionIdOf(output))) {
            return AccessVisibility.PUBLIC;
        }
        return effectiveVisibility(output);
    }

    /** Which "Full text" button to show. Based on the record's own tier, not the viewer. */
    public FullTextActionDTO fullTextAction(ResearchOutput output) {
        AccessVisibility tier = effectiveVisibility(output);
        String doi = output.getDoi() == null ? "" : output.getDoi().trim();
        if (tier != AccessVisibility.RESTRICTED && !doi.isEmpty()) {
            return FullTextActionDTO.doiLink("https://doi.org/" + doi);
        }
        return FullTextActionDTO.requestForm();
    }
}