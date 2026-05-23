package com.geeks.riis_backend.dto;

import java.time.LocalDateTime;

public class PendingUserResponse {

	private String id;
	private String fullName;
	private String email;
	private String emailDomain;
	private String status;


	private String institutionName;
	private String institutionType;
	private String province;
	private String department;
	private String position;
	private String employeeId;

	private LocalDateTime submittedAt;


	public PendingUserResponse(
			String id,
			String fullName,
			String email,
			String status,
			String institutionName,
			String institutionType,
			String province,
			String department,
			String position,
			String employeeId,
			LocalDateTime submittedAt
	) {
		this.id              = id;
		this.fullName        = fullName;
		this.email           = email;
		this.emailDomain     = email != null && email.contains("@")
				? "@" + email.split("@", 2)[1]
				: null;
		this.status          = status;
		this.institutionName = institutionName;
		this.institutionType = institutionType;
		this.province        = province;
		this.department      = department;
		this.position        = position;
		this.employeeId      = employeeId;
		this.submittedAt     = submittedAt;
	}


	public String getId()              { return id; }
	public String getFullName()        { return fullName; }
	public String getEmail()           { return email; }
	public String getEmailDomain()     { return emailDomain; }
	public String getStatus()          { return status; }
	public String getInstitutionName() { return institutionName; }
	public String getInstitutionType() { return institutionType; }
	public String getProvince()        { return province; }
	public String getDepartment()      { return department; }
	public String getPosition()        { return position; }
	public String getEmployeeId()      { return employeeId; }
	public LocalDateTime getSubmittedAt() { return submittedAt; }
}