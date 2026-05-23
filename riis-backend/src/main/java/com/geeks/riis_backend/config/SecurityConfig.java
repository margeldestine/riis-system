package com.geeks.riis_backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import java.nio.charset.StandardCharsets;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

	private final JwtAuthenticationFilter jwtAuthenticationFilter;

	public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
		this.jwtAuthenticationFilter = jwtAuthenticationFilter;
	}

	@Bean
	public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
		http
				.csrf(csrf -> csrf.disable())
				.cors(Customizer.withDefaults())
				.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
				.formLogin(form -> form.disable())
				.httpBasic(basic -> basic.disable())
				.anonymous(anonymous -> anonymous.disable())
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
				.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
				.authorizeHttpRequests(auth -> auth
						.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
						.requestMatchers("/api/v1/auth/**").permitAll()
						.requestMatchers("/api/v1/institutions/active").permitAll()
						.requestMatchers(HttpMethod.POST, "/api/v1/submissions").hasAnyAuthority("ROLE_HEI_STAFF", "HEI_STAFF", "ROLE_HEI", "HEI", "ROLE_DOST_ADMIN", "DOST_ADMIN")
						.requestMatchers(HttpMethod.POST, "/api/v1/submissions/upload-url").hasAnyAuthority("ROLE_HEI_STAFF", "HEI_STAFF", "ROLE_HEI", "HEI", "ROLE_DOST_ADMIN", "DOST_ADMIN")
						.requestMatchers(HttpMethod.PUT, "/api/v1/submissions/**").hasAnyAuthority("ROLE_HEI_STAFF", "HEI_STAFF", "ROLE_HEI", "HEI", "ROLE_DOST_ADMIN", "DOST_ADMIN")
						.requestMatchers(HttpMethod.GET, "/api/v1/submissions/**").hasAnyAuthority("ROLE_HEI_STAFF", "HEI_STAFF", "ROLE_HEI", "HEI", "ROLE_DOST_ADMIN", "DOST_ADMIN")
						.requestMatchers("/api/v1/admin/**").hasRole("DOST_ADMIN")
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
