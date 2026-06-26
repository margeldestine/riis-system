package com.geeks.riis_backend.service;

import com.geeks.riis_backend.model.Cluster;
import com.geeks.riis_backend.model.ResearchOutputCluster;
import com.geeks.riis_backend.repository.ClusterRepository;
import com.geeks.riis_backend.repository.ResearchOutputClusterRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Implements SDD §3.3's nightly centroid recompute (the design the team
 * chose to follow over §2.4.6's static seed-corpus approach — already
 * decided in an earlier session).
 *
 * For each of the 5 clusters, recomputes clusters.centroid_vector as the
 * element-wise mean of the SPECTER embeddings of every research output
 * currently assigned to that cluster (via research_output_clusters).
 *
 * Clusters with zero assigned members are left with their existing
 * centroid_vector untouched (rather than nulled out), so a cluster that
 * temporarily has no members doesn't lose its last-known centroid and
 * break the semantic signal for everything else.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CentroidRecomputationScheduler {

    private static final int EMBEDDING_DIMENSIONS = 768;

    private final ClusterRepository clusterRepository;
    private final ResearchOutputClusterRepository researchOutputClusterRepository;

    @Scheduled(cron = "0 0 2 * * *")
    @Transactional
    public void recomputeAllCentroids() {
        log.info("CentroidRecomputationScheduler: starting nightly centroid recompute");
        List<Cluster> clusters = clusterRepository.findAll();

        for (Cluster cluster : clusters) {
            recomputeCentroidForCluster(cluster);
        }

        log.info("CentroidRecomputationScheduler: finished, processed {} cluster(s)", clusters.size());
    }

    @Transactional
    public void recomputeCentroidForCluster(Cluster cluster) {
        List<ResearchOutputCluster> assignments = researchOutputClusterRepository.findByClusterId(cluster.getId());

        double[] sum = new double[EMBEDDING_DIMENSIONS];
        int memberCount = 0;

        for (ResearchOutputCluster assignment : assignments) {
            if (assignment.getResearchOutput() == null) {
                continue;
            }
            float[] embedding = assignment.getResearchOutput().getSpecterEmbedding();
            if (embedding == null || embedding.length != EMBEDDING_DIMENSIONS) {
                continue;
            }
            for (int i = 0; i < EMBEDDING_DIMENSIONS; i++) {
                sum[i] += embedding[i];
            }
            memberCount++;
        }

        if (memberCount == 0) {
            log.info("Cluster '{}' has no members with valid embeddings; centroid left unchanged", cluster.getName());
            return;
        }

        float[] newCentroid = new float[EMBEDDING_DIMENSIONS];
        for (int i = 0; i < EMBEDDING_DIMENSIONS; i++) {
            newCentroid[i] = (float) (sum[i] / memberCount);
        }

        cluster.setCentroidVector(newCentroid);
        clusterRepository.save(cluster);

        log.info("Cluster '{}' centroid recomputed from {} member(s)", cluster.getName(), memberCount);
    }
}