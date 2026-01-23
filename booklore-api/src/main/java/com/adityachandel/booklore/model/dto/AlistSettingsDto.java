package com.adityachandel.booklore.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for AList settings - used for API responses
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlistSettingsDto {

    private boolean enabled;
    private String baseUrl;
    private String username;
    private String password;
    private String token;
    private int connectTimeout;
    private int readTimeout;
    private boolean enableRedirectDownload;
}