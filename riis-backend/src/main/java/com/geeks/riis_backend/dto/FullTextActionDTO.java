package com.geeks.riis_backend.dto;

/**
 * Tells the public UI which "Full text" button to render.
 * type DOI_LINK    -> link out to url (publisher / DOI page)
 * type REQUEST_FORM -> open the "Request full text" form (url is null)
 */
public record FullTextActionDTO(String type, String url) {

    public static final String DOI_LINK = "DOI_LINK";
    public static final String REQUEST_FORM = "REQUEST_FORM";

    public static FullTextActionDTO doiLink(String url) {
        return new FullTextActionDTO(DOI_LINK, url);
    }

    public static FullTextActionDTO requestForm() {
        return new FullTextActionDTO(REQUEST_FORM, null);
    }
}