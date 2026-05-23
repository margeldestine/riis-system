package com.geeks.riis_backend.service;

import com.geeks.riis_backend.dto.PendingUserResponse;
import com.geeks.riis_backend.exception.BadRequestException;
import com.geeks.riis_backend.exception.ResourceNotFoundException;
import com.geeks.riis_backend.model.User;
import com.geeks.riis_backend.repository.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminUserService {

	private static final String STATUS_PENDING = "PENDING";
	private static final String STATUS_ACTIVE = "ACTIVE";

	private final UserRepository userRepository;

	@Transactional(readOnly = true)
	public List<PendingUserResponse> getPendingUsers() {
		return userRepository.findUsersByStatusForPendingList(STATUS_PENDING);
	}

	public void approveUser(String userId) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

		if (!STATUS_PENDING.equalsIgnoreCase(user.getStatus())) {
			throw new BadRequestException("User is not pending approval.");
		}

		user.setStatus(STATUS_ACTIVE);
		user.setMustResetPassword(false);
		userRepository.save(user);
	}
}
