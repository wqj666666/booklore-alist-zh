package com.adityachandel.booklore.service.alist;

import com.adityachandel.booklore.model.entity.AlistSettingsEntity;
import com.adityachandel.booklore.repository.AlistSettingsRepository;
import com.adityachandel.booklore.service.alist.dto.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.Flow;

/**
 * AList 文件操作客户端
 * 封装 AList API 的文件操作能力
 * 配置从数据库读取
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AlistClient {

    private final AlistSettingsRepository settingsRepository;
    private final AlistAuthService authService;
    private final ObjectMapper objectMapper;

    /**
     * 获取文件/目录信息
     * 
     * @param path AList 路径
     * @return 文件信息，如果不存在返回 empty
     */
    public Optional<AlistFileInfo> getFileInfo(String path) {
        return getFileInfo(path, null);
    }

    /**
     * 获取文件/目录信息
     * 
     * @param path AList 路径
     * @param password 目录密码（可选）
     * @return 文件信息，如果不存在返回 empty
     */
    public Optional<AlistFileInfo> getFileInfo(String path, String password) {
        try {
            AlistResponse<AlistFileInfo> response = executeWithRetry(() -> {
                AlistFsGetRequest request = AlistFsGetRequest.builder()
                        .path(path)
                        .password(password != null ? password : "")
                        .build();
                
                return doPost("/api/fs/get", request, new TypeReference<>() {});
            });
            
            if (response.isSuccess()) {
                return Optional.ofNullable(response.getData());
            } else {
                // 文件不存在的情况
                if (response.getMessage() != null && response.getMessage().contains("object not found")) {
                    return Optional.empty();
                }
                throw new AlistException(response.getCode(), response.getMessage());
            }
        } catch (AlistException e) {
            if (e.isNotFound()) {
                return Optional.empty();
            }
            throw e;
        }
    }

    /**
     * 创建目录（递归创建）
     * 
     * @param path 目录路径
     */
    public void mkdir(String path) {
        executeWithRetry(() -> {
            AlistMkdirRequest request = AlistMkdirRequest.builder()
                    .path(path)
                    .build();
            
            AlistResponse<Void> response = doPost("/api/fs/mkdir", request, new TypeReference<>() {});
            
            if (!response.isSuccess()) {
                // 如果目录已存在，不视为错误
                if (response.getMessage() == null || !response.getMessage().contains("file exists")) {
                    throw new AlistException(response.getCode(), "Failed to create directory: " + response.getMessage());
                }
            }
            
            return response;
        });
        
        log.debug("Created directory: {}", path);
    }

    /**
     * 确保目录存在，如果不存在则创建
     * 
     * @param path 目录路径
     */
    public void ensureDirectoryExists(String path) {
        Optional<AlistFileInfo> fileInfo = getFileInfo(path);
        if (fileInfo.isEmpty()) {
            mkdir(path);
        } else if (!fileInfo.get().isDir()) {
            throw new AlistException("Path exists but is not a directory: " + path);
        }
    }

    /**
     * 上传文件（流式上传）
     * 
     * @param targetPath AList 目标路径（包含文件名）
     * @param inputStream 文件输入流
     * @param contentLength 文件大小
     */
    public void uploadFile(String targetPath, InputStream inputStream, long contentLength) {
        AlistSettingsEntity settings = getSettings();
        
        // 确保父目录存在
        String parentPath = getParentPath(targetPath);
        if (parentPath != null && !parentPath.equals("/")) {
            ensureDirectoryExists(parentPath);
        }
        
        // 需要使用 final 变量供 lambda 使用
        final long fileSize = contentLength;
        
        executeWithRetry(() -> {
            try {
                HttpClient httpClient = createHttpClient(settings);
                
                String encodedPath = URLEncoder.encode(targetPath, StandardCharsets.UTF_8)
                        .replace("+", "%20");
                
                // 创建带有已知长度的 BodyPublisher
                // 这样 HttpClient 会自动设置 Content-Length 头，避免 "restricted header" 错误
                HttpRequest.BodyPublisher bodyPublisher = new HttpRequest.BodyPublisher() {
                    @Override
                    public long contentLength() {
                        return fileSize;
                    }
                    
                    @Override
                    public void subscribe(Flow.Subscriber<? super ByteBuffer> subscriber) {
                        HttpRequest.BodyPublishers.ofInputStream(() -> inputStream).subscribe(subscriber);
                    }
                };
                
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(settings.getBaseUrl() + "/api/fs/put"))
                        .header(HttpHeaders.AUTHORIZATION, authService.getToken())
                        .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_OCTET_STREAM_VALUE)
                        .header("File-Path", encodedPath)
                        .PUT(bodyPublisher)
                        .timeout(Duration.ofMillis(settings.getReadTimeout()))
                        .build();
                
                HttpResponse<String> httpResponse = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                
                AlistResponse<Void> response = objectMapper.readValue(httpResponse.body(), new TypeReference<>() {});
                
                if (!response.isSuccess()) {
                    throw new AlistException(response.getCode(), "Failed to upload file: " + response.getMessage());
                }
                
                return response;
            } catch (IOException | InterruptedException e) {
                throw new AlistException("Failed to upload file to " + targetPath, e);
            }
        });
        
        log.debug("Uploaded file to: {}", targetPath);
    }

    /**
     * 上传本地文件
     * 
     * @param targetPath AList 目标路径（包含文件名）
     * @param localFile 本地文件路径
     */
    public void uploadFile(String targetPath, Path localFile) {
        try (InputStream is = Files.newInputStream(localFile)) {
            uploadFile(targetPath, is, Files.size(localFile));
        } catch (IOException e) {
            throw new AlistException("Failed to read local file: " + localFile, e);
        }
    }

    /**
     * 删除文件或目录
     * 
     * @param path 文件/目录路径
     */
    public void remove(String path) {
        String parentPath = getParentPath(path);
        String fileName = getFileName(path);
        
        if (parentPath == null || fileName == null) {
            throw new AlistException("Invalid path: " + path);
        }
        
        executeWithRetry(() -> {
            AlistRemoveRequest request = AlistRemoveRequest.builder()
                    .dir(parentPath)
                    .names(Collections.singletonList(fileName))
                    .build();
            
            AlistResponse<Void> response = doPost("/api/fs/remove", request, new TypeReference<>() {});
            
            if (!response.isSuccess()) {
                throw new AlistException(response.getCode(), "Failed to remove: " + response.getMessage());
            }
            
            return response;
        });
        
        log.debug("Removed: {}", path);
    }

    /**
     * 获取文件的直链下载 URL
     * 
     * @param path AList 路径
     * @return 直链 URL，如果不可用返回 empty
     */
    public Optional<String> getRawUrl(String path) {
        return getRawUrl(path, null);
    }

    /**
     * 获取文件的直链下载 URL
     * 
     * @param path AList 路径
     * @param password 目录密码（可选）
     * @return 直链 URL，如果不可用返回 empty
     */
    public Optional<String> getRawUrl(String path, String password) {
        Optional<AlistFileInfo> fileInfo = getFileInfo(path, password);
        
        if (fileInfo.isEmpty()) {
            return Optional.empty();
        }
        
        AlistFileInfo info = fileInfo.get();
        if (info.isDir()) {
            throw new AlistException("Cannot get raw URL for directory: " + path);
        }
        
        String rawUrl = info.getRawUrl();
        if (rawUrl == null || rawUrl.isBlank()) {
            return Optional.empty();
        }
        
        return Optional.of(rawUrl);
    }

    /**
     * 下载文件内容
     *
     * @param path AList 路径
     * @return 文件字节数据
     */
    public byte[] downloadFile(String path) {
        return downloadFile(path, null);
    }

    /**
     * 下载文件内容
     *
     * @param path AList 路径
     * @param password 目录密码（可选）
     * @return 文件字节数据
     */
    public byte[] downloadFile(String path, String password) {
        // 首先获取文件信息以获取下载 URL
        Optional<AlistFileInfo> fileInfo = getFileInfo(path, password);
        
        if (fileInfo.isEmpty()) {
            throw new AlistException("File not found: " + path);
        }
        
        AlistFileInfo info = fileInfo.get();
        if (info.isDir()) {
            throw new AlistException("Cannot download directory: " + path);
        }
        
        // 获取直链 URL
        String downloadUrl = info.getRawUrl();
        if (downloadUrl == null || downloadUrl.isBlank()) {
            throw new AlistException("Direct download URL not available for: " + path);
        }
        
        // 下载文件内容
        try {
            AlistSettingsEntity settings = getSettings();
            HttpClient httpClient = createHttpClient(settings);
            
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(downloadUrl))
                    .GET()
                    .timeout(Duration.ofMillis(settings.getReadTimeout()))
                    .build();
            
            HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
            
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                return response.body();
            } else if (response.statusCode() == 302 || response.statusCode() == 301) {
                // 处理重定向
                String redirectUrl = response.headers().firstValue("Location").orElse(null);
                if (redirectUrl != null) {
                    HttpRequest redirectRequest = HttpRequest.newBuilder()
                            .uri(URI.create(redirectUrl))
                            .GET()
                            .timeout(Duration.ofMillis(settings.getReadTimeout()))
                            .build();
                    HttpResponse<byte[]> redirectResponse = httpClient.send(redirectRequest, HttpResponse.BodyHandlers.ofByteArray());
                    return redirectResponse.body();
                }
            }
            
            throw new AlistException("Failed to download file: HTTP " + response.statusCode());
            
        } catch (IOException | InterruptedException e) {
            throw new AlistException("Failed to download file: " + path, e);
        }
    }

    /**
     * 列出目录内容（仅目录）
     *
     * @param path 目录路径
     * @return 子目录路径列表
     */
    public List<String> listDirectories(String path) {
        return listDirectories(path, null);
    }

    /**
     * 列出目录内容（仅目录）
     *
     * @param path 目录路径
     * @param password 目录密码（可选）
     * @return 子目录路径列表
     */
    public List<String> listDirectories(String path, String password) {
        try {
            AlistResponse<AlistFsListResponse> response = executeWithRetry(() -> {
                AlistFsListRequest request = AlistFsListRequest.builder()
                        .path(path)
                        .password(password != null ? password : "")
                        .perPage(0) // 获取所有
                        .build();
                
                return doPost("/api/fs/list", request, new TypeReference<>() {});
            });
            
            if (response.isSuccess() && response.getData() != null) {
                List<AlistFileInfo> content = response.getData().getContent();
                if (content == null) {
                    return Collections.emptyList();
                }
                
                // 过滤出目录，并返回完整路径
                List<String> directories = new ArrayList<>();
                String basePath = path.endsWith("/") ? path : path + "/";
                if (basePath.equals("//")) {
                    basePath = "/";
                }
                
                for (AlistFileInfo file : content) {
                    if (file.isDir()) {
                        String dirPath = basePath.equals("/")
                                ? "/" + file.getName()
                                : basePath + file.getName();
                        directories.add(dirPath);
                    }
                }
                
                return directories;
            } else {
                String msg = response.getMessage();
                // 空目录不视为错误
                if (msg != null && msg.contains("object not found")) {
                    return Collections.emptyList();
                }
                throw new AlistException(response.getCode(), response.getMessage());
            }
        } catch (AlistException e) {
            if (e.isNotFound()) {
                return Collections.emptyList();
            }
            throw e;
        }
    }

    /**
     * 列出目录内容（包括文件和目录）
     *
     * @param path 目录路径
     * @return 文件和目录信息列表
     */
    public List<AlistFileInfo> listFiles(String path) {
        return listFiles(path, null);
    }

    /**
     * 列出目录内容（包括文件和目录）
     *
     * @param path 目录路径
     * @param password 目录密码（可选）
     * @return 文件和目录信息列表
     */
    public List<AlistFileInfo> listFiles(String path, String password) {
        try {
            AlistResponse<AlistFsListResponse> response = executeWithRetry(() -> {
                AlistFsListRequest request = AlistFsListRequest.builder()
                        .path(path)
                        .password(password != null ? password : "")
                        .perPage(0) // 获取所有
                        .build();
                
                return doPost("/api/fs/list", request, new TypeReference<>() {});
            });
            
            if (response.isSuccess() && response.getData() != null) {
                List<AlistFileInfo> content = response.getData().getContent();
                return content != null ? content : Collections.emptyList();
            } else {
                String msg = response.getMessage();
                // 空目录或不存在不视为错误，返回空列表
                if (msg != null && msg.contains("object not found")) {
                    return Collections.emptyList();
                }
                throw new AlistException(response.getCode(), response.getMessage());
            }
        } catch (AlistException e) {
            if (e.isNotFound()) {
                return Collections.emptyList();
            }
            throw e;
        }
    }

    /**
     * 检查文件是否存在
     *
     * @param path AList 路径
     * @return 是否存在
     */
    public boolean exists(String path) {
        return getFileInfo(path).isPresent();
    }

    /**
     * 检查文件是否存在且大小匹配
     * 
     * @param path AList 路径
     * @param expectedSize 期望的文件大小
     * @return 是否存在且大小匹配
     */
    public boolean existsWithSize(String path, long expectedSize) {
        Optional<AlistFileInfo> fileInfo = getFileInfo(path);
        if (fileInfo.isEmpty()) {
            return false;
        }
        
        Long size = fileInfo.get().getSize();
        return size != null && size == expectedSize;
    }

    /**
     * 执行带重试的操作
     * 遇到认证错误时刷新 token 并重试一次
     */
    private <T> T executeWithRetry(java.util.function.Supplier<T> operation) {
        try {
            return operation.get();
        } catch (AlistException e) {
            if (e.isAuthError()) {
                log.debug("Auth error, refreshing token and retrying...");
                authService.refreshToken();
                return operation.get();
            }
            throw e;
        }
    }

    /**
     * 执行 POST 请求
     */
    private <T, R> AlistResponse<R> doPost(String endpoint, T body, TypeReference<AlistResponse<R>> responseType) {
        AlistSettingsEntity settings = getSettings();
        
        try {
            HttpClient httpClient = createHttpClient(settings);
            String requestBody = objectMapper.writeValueAsString(body);
            
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(settings.getBaseUrl() + endpoint))
                    .header(HttpHeaders.AUTHORIZATION, authService.getToken())
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .timeout(Duration.ofMillis(settings.getReadTimeout()))
                    .build();
            
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            
            return objectMapper.readValue(response.body(), responseType);
            
        } catch (IOException | InterruptedException e) {
            throw new AlistException("Failed to call AList API: " + endpoint, e);
        }
    }

    /**
     * 创建 HttpClient
     */
    private HttpClient createHttpClient(AlistSettingsEntity settings) {
        return HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(settings.getConnectTimeout()))
                .followRedirects(HttpClient.Redirect.NEVER)
                .build();
    }

    /**
     * 获取路径的父目录
     */
    private String getParentPath(String path) {
        if (path == null || path.equals("/")) {
            return null;
        }
        
        // 移除尾部斜杠
        String normalizedPath = path.endsWith("/") ? path.substring(0, path.length() - 1) : path;
        
        int lastSlash = normalizedPath.lastIndexOf('/');
        if (lastSlash <= 0) {
            return "/";
        }
        
        return normalizedPath.substring(0, lastSlash);
    }

    /**
     * 获取路径的文件名
     */
    private String getFileName(String path) {
        if (path == null || path.equals("/")) {
            return null;
        }
        
        // 移除尾部斜杠
        String normalizedPath = path.endsWith("/") ? path.substring(0, path.length() - 1) : path;
        
        int lastSlash = normalizedPath.lastIndexOf('/');
        if (lastSlash < 0) {
            return normalizedPath;
        }
        
        return normalizedPath.substring(lastSlash + 1);
    }
    
    private AlistSettingsEntity getSettings() {
        return settingsRepository.findSettings()
                .orElseThrow(() -> new AlistException("AList settings not found in database"));
    }
}