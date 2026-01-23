package com.adityachandel.booklore.service.alist;

import com.adityachandel.booklore.model.dto.AlistSettingsDto;
import com.adityachandel.booklore.model.entity.AlistSettingsEntity;
import com.adityachandel.booklore.repository.AlistSettingsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Service for managing AList settings stored in the database.
 * Provides CRUD operations and connection testing.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AlistSettingsService {

    private final AlistSettingsRepository repository;

    /**
     * Get AList settings from database.
     * Returns default settings if none exist.
     */
    @Transactional(readOnly = true)
    public AlistSettingsDto getSettings() {
        return repository.findSettings()
                .map(this::toDto)
                .orElseGet(this::getDefaultSettings);
    }

    /**
     * Get the settings entity for internal use.
     * Used by AlistClient and AlistAuthService to read configuration.
     */
    @Transactional(readOnly = true)
    public AlistSettingsEntity getSettingsEntity() {
        return repository.findSettings()
                .orElseGet(this::createDefaultEntity);
    }

    /**
     * Update AList settings.
     */
    @Transactional
    public AlistSettingsDto updateSettings(AlistSettingsDto dto) {
        AlistSettingsEntity entity = repository.findSettings()
                .orElseGet(this::createDefaultEntity);

        entity.setEnabled(dto.isEnabled());
        entity.setBaseUrl(dto.getBaseUrl());
        entity.setUsername(dto.getUsername());
        entity.setPassword(dto.getPassword());
        entity.setToken(dto.getToken());
        entity.setConnectTimeout(dto.getConnectTimeout());
        entity.setReadTimeout(dto.getReadTimeout());
        entity.setEnableRedirectDownload(dto.isEnableRedirectDownload());

        AlistSettingsEntity saved = repository.save(entity);
        log.info("AList settings updated: enabled={}, baseUrl={}", saved.isEnabled(), saved.getBaseUrl());

        return toDto(saved);
    }

    /**
     * Test connection to AList server.
     * Returns a result with success status and message.
     */
    public AlistTestResult testConnection(AlistSettingsDto settings) {
        if (settings.getBaseUrl() == null || settings.getBaseUrl().isBlank()) {
            return new AlistTestResult(false, "Base URL is required");
        }

        try {
            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofMillis(settings.getConnectTimeout()))
                    .build();

            // Test basic connectivity by calling /api/public/settings endpoint
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(settings.getBaseUrl().replaceAll("/+$", "") + "/api/public/settings"))
                    .GET()
                    .timeout(Duration.ofMillis(settings.getReadTimeout()))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                log.info("AList connection test successful: {}", settings.getBaseUrl());
                return new AlistTestResult(true, "Connection successful");
            } else {
                log.warn("AList connection test failed with status {}: {}", response.statusCode(), settings.getBaseUrl());
                return new AlistTestResult(false, "Server returned status: " + response.statusCode());
            }

        } catch (java.net.ConnectException e) {
            log.warn("AList connection test failed - connection refused: {}", settings.getBaseUrl());
            return new AlistTestResult(false, "Connection refused - check if AList server is running");
        } catch (java.net.UnknownHostException e) {
            log.warn("AList connection test failed - unknown host: {}", settings.getBaseUrl());
            return new AlistTestResult(false, "Unknown host - check the URL");
        } catch (java.net.http.HttpTimeoutException e) {
            log.warn("AList connection test failed - timeout: {}", settings.getBaseUrl());
            return new AlistTestResult(false, "Connection timeout");
        } catch (Exception e) {
            log.error("AList connection test failed: {}", e.getMessage(), e);
            return new AlistTestResult(false, "Connection failed: " + e.getMessage());
        }
    }

    /**
     * Check if AList is enabled in current settings.
     */
    @Transactional(readOnly = true)
    public boolean isEnabled() {
        return repository.findSettings()
                .map(AlistSettingsEntity::isEnabled)
                .orElse(false);
    }

    private AlistSettingsDto toDto(AlistSettingsEntity entity) {
        return AlistSettingsDto.builder()
                .enabled(entity.isEnabled())
                .baseUrl(entity.getBaseUrl())
                .username(entity.getUsername())
                .password(entity.getPassword())
                .token(entity.getToken())
                .connectTimeout(entity.getConnectTimeout())
                .readTimeout(entity.getReadTimeout())
                .enableRedirectDownload(entity.isEnableRedirectDownload())
                .build();
    }

    private AlistSettingsDto getDefaultSettings() {
        return AlistSettingsDto.builder()
                .enabled(false)
                .baseUrl("")
                .username("")
                .password("")
                .token("")
                .connectTimeout(30000)
                .readTimeout(300000)
                .enableRedirectDownload(true)
                .build();
    }

    private AlistSettingsEntity createDefaultEntity() {
        AlistSettingsEntity entity = AlistSettingsEntity.builder()
                .enabled(false)
                .baseUrl("")
                .username("")
                .password("")
                .token("")
                .connectTimeout(30000)
                .readTimeout(300000)
                .enableRedirectDownload(true)
                .build();
        return repository.save(entity);
    }

    /**
     * Result of AList connection test
     */
    public record AlistTestResult(boolean success, String message) {}
}