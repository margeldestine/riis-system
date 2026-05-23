package com.geeks.riis_backend.config;

import java.net.URI;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.AnonymousCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

@Configuration
public class S3Config {

	@Bean
	public S3Presigner s3Presigner(
			@Value("${app.s3.region:ap-southeast-1}") String region,
			@Value("${app.s3.endpoint:}") String endpoint,
			@Value("${app.s3.access-key:}") String accessKey,
			@Value("${app.s3.secret-key:}") String secretKey
	) {
		S3Presigner.Builder builder = S3Presigner.builder()
				.region(Region.of(region))
				.serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build());

		if (accessKey != null && !accessKey.isBlank() && secretKey != null && !secretKey.isBlank()) {
			AwsBasicCredentials credentials = AwsBasicCredentials.create(accessKey.trim(), secretKey.trim());
			builder.credentialsProvider(StaticCredentialsProvider.create(credentials));
		} else {
			builder.credentialsProvider(AnonymousCredentialsProvider.create());
		}

		if (endpoint != null && !endpoint.isBlank()) {
			builder.endpointOverride(URI.create(endpoint.trim()));
		}

		return builder.build();
	}

	@Bean
	public S3Client s3Client(
			@Value("${app.s3.region:ap-southeast-1}") String region,
			@Value("${app.s3.endpoint:}") String endpoint,
			@Value("${app.s3.access-key:}") String accessKey,
			@Value("${app.s3.secret-key:}") String secretKey
	) {
		var builder = S3Client.builder()
				.region(Region.of(region))
				.serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build());

		if (accessKey != null && !accessKey.isBlank() && secretKey != null && !secretKey.isBlank()) {
			AwsBasicCredentials credentials = AwsBasicCredentials.create(accessKey.trim(), secretKey.trim());
			builder.credentialsProvider(StaticCredentialsProvider.create(credentials));
		} else {
			builder.credentialsProvider(AnonymousCredentialsProvider.create());
		}

		if (endpoint != null && !endpoint.isBlank()) {
			builder.endpointOverride(URI.create(endpoint.trim()));
		}

		return builder.build();
	}
}
