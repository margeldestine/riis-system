package com.geeks.riis_backend.service;

import com.geeks.riis_backend.dto.AccountActionDTO;
import com.geeks.riis_backend.dto.AccountActionDTO.AccountAction;
import com.geeks.riis_backend.dto.PendingUserResponse;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
@RequiredArgsConstructor
@Transactional
public class AdminUserService {

	private final UserApprovalService userApprovalService;

	@Transactional(readOnly = true)
	public List<PendingUserResponse> getPendingUsers() {
		return userApprovalService.getUsersByRoleAndStatus("HEI_STAFF", "PENDING");
	}

	public void approveUser(String userId) {
		AccountActionDTO dto = new AccountActionDTO(AccountAction.APPROVED, null);
		userApprovalService.processAction(UUID.fromString(userId), dto, "system");
	}
}