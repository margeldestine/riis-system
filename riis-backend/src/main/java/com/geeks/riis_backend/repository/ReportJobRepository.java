package com.geeks.riis_backend.repository;

import com.geeks.riis_backend.model.ReportJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ReportJobRepository extends JpaRepository<ReportJob, String> {}