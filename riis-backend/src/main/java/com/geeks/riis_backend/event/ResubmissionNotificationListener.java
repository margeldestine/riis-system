package com.geeks.riis_backend.event;

import com.geeks.riis_backend.service.EmailNotificationService;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class ResubmissionNotificationListener {

	private final EmailNotificationService emailNotificationService;

	public ResubmissionNotificationListener(EmailNotificationService emailNotificationService) {
		this.emailNotificationService = emailNotificationService;
	}

	@EventListener
	public void onRecordResubmitted(RecordResubmittedEvent event) {
		emailNotificationService.sendResubmissionNotificationToAdmin(event.referenceNumber());
	}
}
