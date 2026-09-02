package com.geeks.riis_backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class EmailNotificationService {

	private static final Logger log = LoggerFactory.getLogger(EmailNotificationService.class);

	private final ObjectProvider<JavaMailSender> mailSenderProvider;
	private final String adminEmail;
	@Value("${spring.mail.from:}")
	private String fromEmail;

	public EmailNotificationService(
			ObjectProvider<JavaMailSender> mailSenderProvider,
			@Value("${app.notification.admin-email:}") String adminEmail
	) {
		this.mailSenderProvider = mailSenderProvider;
		this.adminEmail = adminEmail == null ? "" : adminEmail.trim();
		log.info("EmailNotificationService initialized. adminEmail configured: {}", !this.adminEmail.isBlank());
	}

	/**
	 * Fetches the mail sender and logs clearly if it's unavailable
	 * (e.g. spring.mail.* properties missing, autoconfiguration didn't fire).
	 */
	private JavaMailSender resolveMailSender(String context) {
		JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
		if (mailSender == null) {
			log.error("[{}] JavaMailSender bean is not available -- check spring.mail.* properties in application.properties/yml.", context);
		}
		return mailSender;
	}

	@Async
	public void sendSubmissionConfirmation(String toEmail, String referenceNumber) {
		if (toEmail == null || toEmail.isBlank()) {
			log.warn("[sendSubmissionConfirmation] Skipped -- toEmail is blank/null. referenceNumber={}", referenceNumber);
			return;
		}
		if (referenceNumber == null || referenceNumber.isBlank()) {
			log.warn("[sendSubmissionConfirmation] Skipped -- referenceNumber is blank/null. toEmail={}", toEmail);
			return;
		}

		try {
			JavaMailSender mailSender = resolveMailSender("sendSubmissionConfirmation");
			if (mailSender == null) return;

			SimpleMailMessage message = new SimpleMailMessage();
			if (!fromEmail.isBlank()) message.setFrom(fromEmail);
			message.setTo(toEmail);
			message.setSubject("Submission Received: " + referenceNumber);
			message.setText("Your research output submission has been received.\n\nReference Number: " + referenceNumber);
			mailSender.send(message);
			log.info("[sendSubmissionConfirmation] Email sent successfully to {} (ref={})", toEmail, referenceNumber);
		} catch (Exception e) {
			log.error("[sendSubmissionConfirmation] Failed to send email to {} (ref={}): {}", toEmail, referenceNumber, e.getMessage(), e);
		}
	}

	@Async
	public void sendResubmissionNotificationToAdmin(String referenceNumber) {
		if (adminEmail.isBlank()) {
			log.warn("[sendResubmissionNotificationToAdmin] Skipped -- app.notification.admin-email is not configured. referenceNumber={}", referenceNumber);
			return;
		}
		if (referenceNumber == null || referenceNumber.isBlank()) {
			log.warn("[sendResubmissionNotificationToAdmin] Skipped -- referenceNumber is blank/null.");
			return;
		}

		try {
			JavaMailSender mailSender = resolveMailSender("sendResubmissionNotificationToAdmin");
			if (mailSender == null) return;

			SimpleMailMessage message = new SimpleMailMessage();
			message.setTo(adminEmail);
			message.setSubject("Submission Resubmitted: " + referenceNumber);
			message.setText("A research output has been resubmitted.\n\nReference Number: " + referenceNumber);
			mailSender.send(message);
			log.info("[sendResubmissionNotificationToAdmin] Email sent successfully to admin {} (ref={})", adminEmail, referenceNumber);
		} catch (Exception e) {
			log.error("[sendResubmissionNotificationToAdmin] Failed to send email to admin {} (ref={}): {}", adminEmail, referenceNumber, e.getMessage(), e);
		}
	}

	@Async
	public void sendReviewStatusEmail(String toEmail, String referenceNumber, String action, String comment) {
		if (toEmail == null || toEmail.isBlank()) {
			log.warn("[sendReviewStatusEmail] Skipped -- toEmail is blank/null. referenceNumber={}, action={}", referenceNumber, action);
			return;
		}
		if (referenceNumber == null || referenceNumber.isBlank()) {
			log.warn("[sendReviewStatusEmail] Skipped -- referenceNumber is blank/null. toEmail={}, action={}", toEmail, action);
			return;
		}

		try {
			JavaMailSender mailSender = resolveMailSender("sendReviewStatusEmail");
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
			if (!fromEmail.isBlank()) message.setFrom(fromEmail);
			message.setTo(toEmail);
			message.setSubject(subject);
			message.setText(body);
			mailSender.send(message);
			log.info("[sendReviewStatusEmail] Email sent successfully to {} (ref={}, action={})", toEmail, referenceNumber, action);
		} catch (Exception e) {
			log.error("[sendReviewStatusEmail] Failed to send email to {} (ref={}, action={}): {}", toEmail, referenceNumber, action, e.getMessage(), e);
		}
	}

	/**
	 * SDD 5.6: "sendAccountApprovalEmail() dispatches a notification with
	 * a login link and confirmation that the account is now active."
	 */
	@Async
	public void sendAccountApprovalEmail(String toEmail, String fullName) {
		if (toEmail == null || toEmail.isBlank()) {
			log.warn("[sendAccountApprovalEmail] Skipped -- toEmail is blank/null. fullName={}", fullName);
			return;
		}

		try {
			JavaMailSender mailSender = resolveMailSender("sendAccountApprovalEmail");
			if (mailSender == null) return;

			SimpleMailMessage message = new SimpleMailMessage();
			if (!fromEmail.isBlank()) message.setFrom(fromEmail);
			message.setTo(toEmail);
			message.setSubject("Your DASIG Account Has Been Approved");
			message.setText(
					"Dear " + fullName + ",\n\n" +
							"Your HEI Research Office Staff account has been approved. " +
							"You can now log in to DASIG at http://localhost:5173/login\n\n" +
							"If you did not register for this account, please ignore this email."
			);
			mailSender.send(message);
			log.info("[sendAccountApprovalEmail] Email sent successfully to {}", toEmail);
		} catch (Exception e) {
			log.error("[sendAccountApprovalEmail] Failed to send email to {}: {}", toEmail, e.getMessage(), e);
		}
	}

	@Async
	public void sendPasswordResetEmail(String toEmail, String fullName, String resetLink) {
		if (toEmail == null || toEmail.isBlank()) {
			log.warn("[sendPasswordResetEmail] Skipped -- toEmail is blank/null.");
			return;
		}
		if (resetLink == null || resetLink.isBlank()) {
			log.warn("[sendPasswordResetEmail] Skipped -- resetLink is blank/null. toEmail={}", toEmail);
			return;
		}

		try {
			JavaMailSender mailSender = resolveMailSender("sendPasswordResetEmail");
			if (mailSender == null) return;

			SimpleMailMessage message = new SimpleMailMessage();
			if (!fromEmail.isBlank()) message.setFrom(fromEmail);
			message.setTo(toEmail);
			message.setSubject("Reset Your DASIG Password");
			message.setText(
					"Dear " + (fullName != null ? fullName : "user") + ",\n\n" +
							"We received a request to reset your DASIG password. Click the link below to choose a new one:\n\n" +
							resetLink + "\n\n" +
							"This link will expire shortly. If you did not request a password reset, please ignore this email " +
							"and your password will remain unchanged."
			);
			mailSender.send(message);
			log.info("[sendPasswordResetEmail] Email sent successfully to {}", toEmail);
		} catch (Exception e) {
			log.error("[sendPasswordResetEmail] Failed to send email to {}: {}", toEmail, e.getMessage(), e);
		}
	}

	@Async
	public void sendAccountRejectionEmail(String toEmail, String fullName, String reason) {
		if (toEmail == null || toEmail.isBlank()) {
			log.warn("[sendAccountRejectionEmail] Skipped -- toEmail is blank/null. fullName={}", fullName);
			return;
		}

		try {
			JavaMailSender mailSender = resolveMailSender("sendAccountRejectionEmail");
			if (mailSender == null) return;

			SimpleMailMessage message = new SimpleMailMessage();
			if (!fromEmail.isBlank()) message.setFrom(fromEmail);
			message.setTo(toEmail);
			message.setSubject("Your DASIG Account Registration Was Not Approved");
			message.setText(
					"Dear " + fullName + ",\n\n" +
							"Unfortunately, your HEI Research Office Staff account registration has been rejected.\n\n" +
							"Reason:\n" + (reason != null ? reason : "No reason provided.") + "\n\n" +
							"If you believe this is a mistake, please contact your DOST Region VII administrator."
			);
			mailSender.send(message);
			log.info("[sendAccountRejectionEmail] Email sent successfully to {}", toEmail);
		} catch (Exception e) {
			log.error("[sendAccountRejectionEmail] Failed to send email to {}: {}", toEmail, e.getMessage(), e);
		}
	}

	@Async
	public java.util.concurrent.CompletableFuture<Boolean> sendOverlapDetectionAlert(
			String toEmail,
			String newRecordTitle,
			String existingRecordTitle,
			String existingRecordHei,
			double similarityScore) {
		if (toEmail == null || toEmail.isBlank()) {
			log.warn("[sendOverlapDetectionAlert] Skipped -- toEmail is blank/null. newRecordTitle={}", newRecordTitle);
			return java.util.concurrent.CompletableFuture.completedFuture(false);
		}

		try {
			JavaMailSender mailSender = resolveMailSender("sendOverlapDetectionAlert");
			if (mailSender == null) return java.util.concurrent.CompletableFuture.completedFuture(false);

			SimpleMailMessage message = new SimpleMailMessage();
			if (!fromEmail.isBlank()) message.setFrom(fromEmail);
			message.setTo(toEmail);
			message.setSubject("Similarity Flag: Related Research Output Found");
			message.setText(
					"A similarity flag has been raised for your recently approved research output.\n\n" +
							"Your Research: " + newRecordTitle + "\n" +
							"Similar Existing Research: " + existingRecordTitle + "\n" +
							"Institution: " + existingRecordHei + "\n" +
							"Similarity Score: " + String.format("%.1f", similarityScore * 100) + "%\n\n" +
							"Please review this similarity flag and coordinate with the relevant institution if necessary.\n\n" +
							"Note: This is an automated similarity signal based on text embeddings. It is intended to " +
							"assist human reviewers and does not constitute a confirmed finding of duplication or plagiarism."
			);
			mailSender.send(message);
			log.info("[sendOverlapDetectionAlert] Email sent successfully to {}", toEmail);
			return java.util.concurrent.CompletableFuture.completedFuture(true);
		} catch (Exception e) {
			log.error("[sendOverlapDetectionAlert] Failed to send email to {}: {}", toEmail, e.getMessage(), e);
			return java.util.concurrent.CompletableFuture.completedFuture(false);
		}
	}

}