package com.geeks.riis_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.retry.annotation.EnableRetry;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableRetry
@org.springframework.scheduling.annotation.EnableAsync
@EnableScheduling
public class RiisBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(RiisBackendApplication.class, args);
	}
}