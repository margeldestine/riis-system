package com.geeks.riis_backend.service;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class EmailNotificationService {

	private final ObjectProvider<JavaMailSender> mailSenderProvider;
	private final String adminEmail;

	public EmailNotificationService(
			ObjectProvider<JavaMailSender> mailSenderProvider,
			@Value("${app.notification.admin-email:}") String adminEmail
	) {
		this.mailSenderProvider = mailSenderProvider;
		this.adminEmail = adminEmail == null ? "" : adminEmail.trim();
	}

	@Async
	public void sendSubmissionConfirmation(String toEmail, String referenceNumber) {
		if (toEmail == null || toEmail.isBlank()) {
			return;
		}
		if (referenceNumber == null || referenceNumber.isBlank()) {
			return;
		}

		try {
			JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
			if (mailSender == null) {
				return;
			}

			SimpleMailMessage message = new SimpleMailMessage();
			message.setTo(toEmail);
			message.setSubject("Submission Received: " + referenceNumber);
			message.setText("Your research output submission has been received.\n\nReference Number: " + referenceNumber);
			mailSender.send(message);
		} catch (Exception ignored) {
		}
	}

	@Async
	public void sendResubmissionNotificationToAdmin(String referenceNumber) {
		if (adminEmail.isBlank()) {
			return;
		}
		if (referenceNumber == null || referenceNumber.isBlank()) {
			return;
		}

		try {
			JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
			if (mailSender == null) {
				return;
			}

			SimpleMailMessage message = new SimpleMailMessage();
			message.setTo(adminEmail);
			message.setSubject("Submission Resubmitted: " + referenceNumber);
			message.setText("A research output has been resubmitted.\n\nReference Number: " + referenceNumber);
			mailSender.send(message);
		} catch (Exception ignored) {
		}
	}

    @Async
    public void sendReviewStatusEmail(String toEmail, String referenceNumber, String action, String comment) {
        if (toEmail == null || toEmail.isBlank()) return;
        if (referenceNumber == null || referenceNumber.isBlank()) return;

        try {
            JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
            if (mailSender == null) return;

            String subject;
            String body;

            switch (action) {
                case "APPROVED" -> {
                    subject = "Research Output Approved: " + referenceNumber;
                    body = "Your research output submission has been approved and is now publicly visible.\n\nReference Number: " + referenceNumber;
                }
                case "REJECTED" -> {
                    subject = "Research Output Rejected: " + referenceNumber;
                    body = "Your research output submission has been rejected.\n\nReference Number: " + referenceNumber
                            + "\n\nReason:\n" + (comment != null ? comment : "No reason provided.");
                }
                case "REQUIRES_CORRECTION" -> {
                    subject = "Correction Required: " + referenceNumber;
                    body = "Your research output submission requires correction before it can be approved.\n\nReference Number: " + referenceNumber
                            + "\n\nCorrection Notes:\n" + (comment != null ? comment : "Please review and resubmit.");
                }
                default -> {
                    subject = "Submission Update: " + referenceNumber;
                    body = "Your submission status has been updated.\n\nReference Number: " + referenceNumber;
                }
            }

            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(toEmail);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
        } catch (Exception ignored) {
        }
    }
}
