package com.geeks.riis_backend.dto;

import java.util.List;

public class SubmissionFilterDTO {

	private List<String> statuses;
	private Integer completionYearFrom;
	private Integer completionYearTo;
	private List<String> researchTypes;
	private Boolean mine;
	private String submittedByUserId;

	public List<String> getStatuses() {
		return statuses;
	}

	public void setStatuses(List<String> statuses) {
		this.statuses = statuses;
	}

	public Integer getCompletionYearFrom() {
		return completionYearFrom;
	}

	public void setCompletionYearFrom(Integer completionYearFrom) {
		this.completionYearFrom = completionYearFrom;
	}

	public Integer getCompletionYearTo() {
		return completionYearTo;
	}

	public void setCompletionYearTo(Integer completionYearTo) {
		this.completionYearTo = completionYearTo;
	}

	public List<String> getResearchTypes() {
		return researchTypes;
	}

	public void setResearchTypes(List<String> researchTypes) {
		this.researchTypes = researchTypes;
	}

	public Boolean getMine() {
		return mine;
	}

	public void setMine(Boolean mine) {
		this.mine = mine;
	}

	public String getSubmittedByUserId() {
		return submittedByUserId;
	}

	public void setSubmittedByUserId(String submittedByUserId) {
		this.submittedByUserId = submittedByUserId;
	}
}
