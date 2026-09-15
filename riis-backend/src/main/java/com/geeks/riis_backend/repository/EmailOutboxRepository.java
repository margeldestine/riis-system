package com.geeks.riis_backend.repository;

import com.geeks.riis_backend.model.EmailOutboxEntry;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface EmailOutboxRepository extends JpaRepository<EmailOutboxEntry, String> {

    // UC-M5-06: batch picked up by the @Scheduled poller each run --
    // PENDING entries whose backoff window has elapsed, oldest first, so
    // a backlog is worked through in order rather than round-robin/random.
    @Query("""
            SELECT e FROM EmailOutboxEntry e
            WHERE e.status = 'PENDING' AND e.nextAttemptAt <= :now
            ORDER BY e.nextAttemptAt ASC
            """)
    List<EmailOutboxEntry> findDueForRetry(@Param("now") LocalDateTime now, Pageable pageable);
}