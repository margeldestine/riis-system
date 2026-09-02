package com.geeks.riis_backend.config;

import com.geeks.riis_backend.security.AuthRateLimitingFilter;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.cors.CorsConfiguration;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

	private final JwtAuthenticationFilter jwtAuthenticationFilter;
	private final AuthRateLimitingFilter authRateLimitingFilter;

	/**
	 * This is now the ONLY CORS configuration in the application -- the
	 * separate CorsConfig.java (a WebMvcConfigurer) was deleted. Spring
	 * Security's CorsFilter, registered by http.cors(...) below, runs
	 * inside the security filter chain, which sits in front of Spring
	 * MVC's DispatcherServlet for every request this app handles (there's
	 * no unprotected path that bypasses the filter chain entirely -- see
	 * authorizeHttpRequests below, which ends in anyRequest().authenticated()
	 * as its catch-all). That means Spring Security's CORS handling was
	 * always the one actually taking effect for preflight OPTIONS requests
	 * and CORS headers in this app; the WebMvcConfigurer-based
	 * CorsConfig.java was dead weight that just happened to duplicate the
	 * same allowed-origins list, which is exactly how the two configs had
	 * drifted into being hardcoded in two places at once.
	 */
	private final List<String> allowedOrigins;

	public SecurityConfig(
			JwtAuthenticationFilter jwtAuthenticationFilter,
			AuthRateLimitingFilter authRateLimitingFilter,
			@Value("${app.frontend.allowed-origins}") String allowedOriginsRaw
	) {
		this.jwtAuthenticationFilter = jwtAuthenticationFilter;
		this.authRateLimitingFilter = authRateLimitingFilter;
		this.allowedOrigins = Arrays.stream(allowedOriginsRaw.split(","))
				.map(String::trim)
				.filter(origin -> !origin.isBlank())
				.toList();
	}

	@Bean
	public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
		http
				.cors(cors -> cors.configurationSource(request -> {
					CorsConfiguration config = new CorsConfiguration();
					config.setAllowedOrigins(allowedOrigins);
					config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
					config.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With"));
					config.setAllowCredentials(true);
					return config;
				}))
				.csrf(csrf -> csrf.disable())
				.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
				.formLogin(form -> form.disable())
				.httpBasic(basic -> basic.disable())
				// Security headers -- none of these were configured before.
				// HSTS's writer only sends the header on requests it sees as
				// HTTPS (request.isSecure()), so it won't appear when testing
				// over plain http://localhost -- that's correct, expected
				// behavior for HSTS, not a bug.
				.headers(headers -> headers
						.frameOptions(frame -> frame.deny())
						.contentTypeOptions(contentTypeOptions -> {})
						.contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'self'"))
						.referrerPolicy(referrer -> referrer
								.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
						.httpStrictTransportSecurity(hsts -> hsts
								.includeSubDomains(true)
								.maxAgeInSeconds(31536000))
				)
				.exceptionHandling(exceptions -> exceptions
						.authenticationEntryPoint((request, response, authException) -> {
							String reason = (String) request.getAttribute(JwtAuthenticationFilter.JWT_FAILURE_REASON_ATTRIBUTE);
							if (reason == null && authException != null) {
								String message = authException.getMessage() == null ? "" : authException.getMessage().trim();
								reason = authException.getClass().getSimpleName() + (message.isBlank() ? "" : (": " + message));
							}
							response.setStatus(401);
							response.setCharacterEncoding(StandardCharsets.UTF_8.name());
							response.setContentType("application/json");
							String body = "{\"message\":\"Unauthorized\",\"detail\":" +
									(reason == null ? "null" : "\"" + escapeJson(reason) + "\"") +
									",\"path\":\"" + escapeJson(request.getRequestURI()) + "\"}";
							response.getWriter().write(body);
						})
						.accessDeniedHandler((request, response, accessDeniedException) -> response.sendError(403))
				)
				.addFilterBefore(authRateLimitingFilter, UsernamePasswordAuthenticationFilter.class)
				.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
				.authorizeHttpRequests(auth -> auth
						.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
						.requestMatchers("/api/v1/auth/**").permitAll()
						.requestMatchers("/error").permitAll()
						.requestMatchers(HttpMethod.POST, "/api/v1/search").permitAll()
						.requestMatchers(HttpMethod.GET, "/api/v1/search/related/**").permitAll()
						.requestMatchers(HttpMethod.GET, "/api/v1/search/**").permitAll()
						.requestMatchers("/api/v1/institutions/**").permitAll()
						.requestMatchers(HttpMethod.POST, "/api/v1/submissions").hasAnyAuthority("ROLE_HEI_STAFF", "HEI_STAFF", "ROLE_HEI", "HEI", "ROLE_DOST_ADMIN", "DOST_ADMIN")
						.requestMatchers(HttpMethod.POST, "/api/v1/submissions/upload-url").hasAnyAuthority("ROLE_HEI_STAFF", "HEI_STAFF", "ROLE_HEI", "HEI", "ROLE_DOST_ADMIN", "DOST_ADMIN")
						.requestMatchers(HttpMethod.POST, "/api/v1/submissions/upload").hasAnyAuthority("ROLE_HEI_STAFF", "HEI_STAFF", "ROLE_HEI", "HEI", "ROLE_DOST_ADMIN", "DOST_ADMIN")
						.requestMatchers(HttpMethod.PUT, "/api/v1/submissions/**").hasAnyAuthority("ROLE_HEI_STAFF", "HEI_STAFF", "ROLE_HEI", "HEI", "ROLE_DOST_ADMIN", "DOST_ADMIN")
						.requestMatchers(HttpMethod.GET, "/api/v1/submissions/**").hasAnyAuthority("ROLE_HEI_STAFF", "HEI_STAFF", "ROLE_HEI", "HEI", "ROLE_DOST_ADMIN", "DOST_ADMIN")
						.requestMatchers("/api/v1/admin/**").hasAnyAuthority("ROLE_DOST_ADMIN", "DOST_ADMIN")
						.requestMatchers("/api/v1/analytics/**").hasRole("DOST_ADMIN")
						.requestMatchers("/api/v1/reports/**").hasAnyAuthority("ROLE_DOST_ADMIN", "DOST_ADMIN", "ROLE_HEI_STAFF", "HEI_STAFF")
						// QualityController's every method already enforces
						// hasRole('DOST_ADMIN') individually, but until now
						// had no URL-level backstop at all (unlike every
						// other admin-only controller) -- this adds the
						// missing second layer, redundant with the existing
						// method-level rule, not a new authorization decision.
						.requestMatchers("/api/v1/quality/**").hasRole("DOST_ADMIN")

						.anyRequest().authenticated()
				);

		return http.build();
	}

	private static String escapeJson(String value) {
		if (value == null) {
			return "";
		}
		return value
				.replace("\\", "\\\\")
				.replace("\"", "\\\"")
				.replace("\r", "\\r")
				.replace("\n", "\\n");
	}
}