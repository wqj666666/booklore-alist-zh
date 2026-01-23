package com.adityachandel.booklore.model.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Entity for storing AList configuration in database.
 * This is a singleton entity - only one row should exist.
 */
@Entity
@Table(name = "alist_settings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlistSettingsEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "enabled", nullable = false)
    private boolean enabled;

    @Column(name = "base_url", length = 500)
    private String baseUrl;

    @Column(name = "username", length = 255)
    private String username;

    @Column(name = "password", length = 500)
    private String password;

    @Column(name = "token", length = 1000)
    private String token;

    @Column(name = "connect_timeout", nullable = false)
    private int connectTimeout;

    @Column(name = "read_timeout", nullable = false)
    private int readTimeout;

    @Column(name = "enable_redirect_download", nullable = false)
    private boolean enableRedirectDownload;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}