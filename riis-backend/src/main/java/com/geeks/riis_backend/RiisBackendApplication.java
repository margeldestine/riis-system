package com.geeks.riis_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.retry.annotation.EnableRetry;

@SpringBootApplication
@EnableRetry
@org.springframework.scheduling.annotation.EnableAsync
public class RiisBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(RiisBackendApplication.class, args);
	}
}