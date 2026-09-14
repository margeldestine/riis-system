package com.geeks.riis_backend.dto;

import java.time.LocalDateTime;

public class PendingUserResponse {

	private String id;
	private String fullName;
	private String email;
	private String emailDomain;
	private String status;
	private String role;


	private String institutionId;
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
		this(id, fullName, email, status, null, null, institutionName, institutionType, province, department, position, employeeId, submittedAt);
	}

	// UC-M5-04: full constructor adding role + institutionId, used by the
	// account directory search (UserRepository.searchAccounts). The
	// original 11-arg constructor above is preserved unchanged so the
	// existing findByRoleAndStatusForQueue query (and everything that
	// already depends on it, e.g. AccountApprovalQueuePage.jsx) keeps
	// working exactly as before.
	public PendingUserResponse(
			String id,
			String fullName,
			String email,
			String status,
			String role,
			String institutionId,
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
		this.role            = role;
		this.institutionId   = institutionId;
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
	public String getRole()            { return role; }
	public String getInstitutionId()   { return institutionId; }
	public String getInstitutionName() { return institutionName; }
	public String getInstitutionType() { return institutionType; }
	public String getProvince()        { return province; }
	public String getDepartment()      { return department; }
	public String getPosition()        { return position; }
	public String getEmployeeId()      { return employeeId; }
	public LocalDateTime getSubmittedAt() { return submittedAt; }
}