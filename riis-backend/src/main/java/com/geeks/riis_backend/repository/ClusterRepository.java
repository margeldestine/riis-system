package com.geeks.riis_backend.repository;

import com.geeks.riis_backend.model.Cluster;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ClusterRepository extends JpaRepository<Cluster, String> {

	Optional<Cluster> findBySlug(String slug);
}

