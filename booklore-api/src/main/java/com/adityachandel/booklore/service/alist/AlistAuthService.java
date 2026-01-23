package com.adityachandel.booklore.service.alist;

import com.adityachandel.booklore.model.entity.AlistSettingsEntity;
import com.adityachandel.booklore.repository.AlistSettingsRepository;
import com.adityachandel.booklore.service.alist.dto.AlistLoginRequest;
import com.adityachandel.booklore.service.alist.dto.AlistLoginResponse;
import com.adityachandel.booklore.service.alist.dto.AlistResponse;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.locks.ReentrantLock;

/**
 * AList 认证服务
 * 负责管理 AList API Token 的获取和刷新
 * 配置从数据库读取
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AlistAuthService {

    private final AlistSettingsRepository settingsRepository;
    private final ObjectMapper objectMapper;

    /**
     * 缓存的 token
     */
    private final AtomicReference<String> cachedToken = new AtomicReference<>();
    
    /**
     * 用于防止并发刷新的锁
     */
    private final ReentrantLock refreshLock = new ReentrantLock();
    
    /**
     * 正在进行的刷新任务（用于单飞策略）
     */
    private volatile CompletableFuture<String> pendingRefresh;

    /**
     * 获取有效的 token
     * 如果 token 不存在则尝试获取
     */
    public String getToken() {
        AlistSettingsEntity settings = getSettings();
        
        // 优先使用预配置的 token
        if (settings.getToken() != null && !settings.getToken().isBlank()) {
            return settings.getToken();
        }
        
        // 检查缓存
        String token = cachedToken.get();
        if (token != null && !token.isBlank()) {
            return token;
        }
        return refreshToken();
    }

    /**
     * 刷新 token
     * 使用单飞策略避免并发刷新
     */
    public String refreshToken() {
        // 单飞策略：如果已有刷新任务正在进行，等待其完成
        CompletableFuture<String> pending = this.pendingRefresh;
        if (pending != null) {
            try {
                return pending.join();
            } catch (Exception e) {
                // 如果等待的任务失败了，继续尝试刷新
            }
        }
        
        refreshLock.lock();
        try {
            // 双重检查
            pending = this.pendingRefresh;
            if (pending != null) {
                try {
                    return pending.join();
                } catch (Exception e) {
                    // 继续尝试刷新
                }
            }
            
            // 创建新的刷新任务
            CompletableFuture<String> refreshFuture = CompletableFuture.supplyAsync(() -> {
                try {
                    return doRefreshToken();
                } catch (Exception e) {
                    throw new AlistException("Failed to refresh token", e);
                }
            });
            
            this.pendingRefresh = refreshFuture;
            
            try {
                String newToken = refreshFuture.join();
                cachedToken.set(newToken);
                return newToken;
            } finally {
                this.pendingRefresh = null;
            }
        } finally {
            refreshLock.unlock();
        }
    }

    /**
     * 实际执行 token 刷新
     */
    private String doRefreshToken() {
        AlistSettingsEntity settings = getSettings();
        
        if (settings.getUsername() == null || settings.getUsername().isBlank()) {
            throw new AlistException("AList username is not configured");
        }
        
        try {
            HttpClient httpClient = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofMillis(settings.getConnectTimeout()))
                    .build();
            
            AlistLoginRequest loginRequest = AlistLoginRequest.builder()
                    .username(settings.getUsername())
                    .password(settings.getPassword())
                    .build();
            
            String requestBody = objectMapper.writeValueAsString(loginRequest);
            
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(settings.getBaseUrl() + "/api/auth/login"))
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .timeout(Duration.ofMillis(settings.getReadTimeout()))
                    .build();
            
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            
            AlistResponse<AlistLoginResponse> loginResponse = objectMapper.readValue(
                    response.body(),
                    new TypeReference<>() {}
            );
            
            if (!loginResponse.isSuccess()) {
                throw new AlistException(loginResponse.getCode(), "Login failed: " + loginResponse.getMessage());
            }
            
            String token = loginResponse.getData().getToken();
            log.debug("Successfully obtained AList token");
            return token;
            
        } catch (AlistException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to login to AList: {}", e.getMessage());
            throw new AlistException("Failed to login to AList", e);
        }
    }

    /**
     * 使 token 失效，触发下次请求时刷新
     */
    public void invalidateToken() {
        cachedToken.set(null);
        log.debug("AList token invalidated");
    }

    /**
     * 检查 AList 是否已配置并可用
     */
    public boolean isAvailable() {
        AlistSettingsEntity settings = getSettings();
        return settings.isEnabled() && 
               settings.getBaseUrl() != null && 
               !settings.getBaseUrl().isBlank();
    }
    
    private AlistSettingsEntity getSettings() {
        return settingsRepository.findSettings()
                .orElseThrow(() -> new AlistException("AList settings not found in database"));
    }
}