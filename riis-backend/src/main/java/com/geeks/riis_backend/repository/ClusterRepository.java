package com.geeks.riis_backend.repository;

import com.geeks.riis_backend.model.Cluster;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface ClusterRepository extends JpaRepository<Cluster, String> {

	Optional<Cluster> findBySlug(String slug);

	@Modifying
	@Transactional
	@Query(value = "REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cluster_distribution", nativeQuery = true)
	void refreshClusterDistributionView();
}

