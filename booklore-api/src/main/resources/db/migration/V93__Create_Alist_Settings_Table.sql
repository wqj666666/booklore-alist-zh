-- Create alist_settings table for storing AList configuration in database
-- This replaces the application.yaml based configuration

CREATE TABLE IF NOT EXISTS alist_settings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    base_url VARCHAR(500),
    username VARCHAR(255),
    password VARCHAR(500),
    token VARCHAR(1000),
    connect_timeout INT NOT NULL DEFAULT 30000,
    read_timeout INT NOT NULL DEFAULT 300000,
    enable_redirect_download BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default row (only one row should exist in this table - singleton pattern)
INSERT INTO alist_settings (enabled, base_url, connect_timeout, read_timeout, enable_redirect_download)
VALUES (FALSE, NULL, 30000, 300000, TRUE);