package com.geeks.riis_backend.config;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

	private final JwtAuthenticationFilter jwtAuthenticationFilter;

	public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
		this.jwtAuthenticationFilter = jwtAuthenticationFilter;
	}

	@Bean
	public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
		http
				.cors(cors -> cors.configurationSource(request -> {
					CorsConfiguration config = new CorsConfiguration();
					config.setAllowedOrigins(Arrays.asList("http://localhost:5173"));
                    config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
					config.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With"));
					config.setAllowCredentials(true);
					return config;
				}))
				.csrf(csrf -> csrf.disable())
				.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
				.formLogin(form -> form.disable())
				.httpBasic(basic -> basic.disable())
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
						.requestMatchers("/api/v1/admin/**").hasRole("DOST_ADMIN")
                        .requestMatchers("/api/v1/analytics/**").hasRole("DOST_ADMIN")
                        .requestMatchers("/api/v1/admin/submissions/**").hasRole("DOST_ADMIN")
						.requestMatchers("/api/v1/admin/submissions/**").hasRole("DOST_ADMIN")
						.requestMatchers("/api/v1/reports/**").hasAnyAuthority("ROLE_DOST_ADMIN", "DOST_ADMIN", "ROLE_HEI_STAFF", "HEI_STAFF")

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
