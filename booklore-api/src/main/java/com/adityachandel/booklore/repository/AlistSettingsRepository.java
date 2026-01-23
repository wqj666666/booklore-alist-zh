package com.adityachandel.booklore.repository;

import com.adityachandel.booklore.model.entity.AlistSettingsEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository for AList settings.
 * This is a singleton entity - only one row should exist.
 */
@Repository
public interface AlistSettingsRepository extends JpaRepository<AlistSettingsEntity, Long> {

    /**
     * Get the singleton AList settings record.
     * Returns the first (and should be only) record.
     */
    @Query("SELECT a FROM AlistSettingsEntity a ORDER BY a.id ASC LIMIT 1")
    Optional<AlistSettingsEntity> findSettings();
}