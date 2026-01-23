package com.adityachandel.booklore.service.storage;

import com.adityachandel.booklore.model.entity.AlistSettingsEntity;
import com.adityachandel.booklore.service.alist.AlistClient;
import com.adityachandel.booklore.service.alist.dto.AlistFileInfo;
import lombok.extern.slf4j.Slf4j;

import java.io.InputStream;
import java.nio.file.Path;
import java.util.Optional;
import java.util.function.Supplier;

/**
 * AList 远程存储后端
 * 将文件存储到 AList 服务
 */
@Slf4j
public class AlistStorageBackend implements StorageBackend {

    private final AlistClient alistClient;
    private final Supplier<AlistSettingsEntity> settingsSupplier;
    
    /**
     * AList 存储的根路径（对应 LibraryPath.alistPath）
     */
    private final String rootPath;

    public AlistStorageBackend(AlistClient alistClient, Supplier<AlistSettingsEntity> settingsSupplier, String rootPath) {
        this.alistClient = alistClient;
        this.settingsSupplier = settingsSupplier;
        this.rootPath = normalizeRootPath(rootPath);
    }

    @Override
    public StorageType getType() {
        return StorageType.ALIST;
    }

    @Override
    public void write(String targetPath, InputStream inputStream, long contentLength) {
        String fullPath = resolvePath(targetPath);
        alistClient.uploadFile(fullPath, inputStream, contentLength);
        log.debug("Written file to AList path: {}", fullPath);
    }

    @Override
    public void write(String targetPath, Path localFile) {
        String fullPath = resolvePath(targetPath);
        alistClient.uploadFile(fullPath, localFile);
        log.debug("Written file to AList path: {}", fullPath);
    }

    @Override
    public boolean exists(String path) {
        String fullPath = resolvePath(path);
        return alistClient.exists(fullPath);
    }

    @Override
    public boolean existsWithSize(String path, long expectedSize) {
        String fullPath = resolvePath(path);
        return alistClient.existsWithSize(fullPath, expectedSize);
    }

    @Override
    public Optional<Long> getFileSize(String path) {
        String fullPath = resolvePath(path);
        Optional<AlistFileInfo> fileInfo = alistClient.getFileInfo(fullPath);
        return fileInfo.map(AlistFileInfo::getSize);
    }

    @Override
    public byte[] read(String path) {
        String fullPath = resolvePath(path);
        return alistClient.downloadFile(fullPath);
    }

    @Override
    public void delete(String path) {
        String fullPath = resolvePath(path);
        alistClient.remove(fullPath);
        log.debug("Deleted file from AList: {}", fullPath);
    }

    @Override
    public DownloadAccess getDownloadAccess(String path) {
        String fullPath = resolvePath(path);
        
        // 如果启用了重定向下载，尝试获取直链
        AlistSettingsEntity settings = settingsSupplier.get();
        if (settings.isEnableRedirectDownload()) {
            Optional<String> rawUrl = alistClient.getRawUrl(fullPath);
            if (rawUrl.isPresent()) {
                return new DownloadAccess.Redirect(rawUrl.get());
            }
        }
        
        // 检查文件是否存在
        if (!alistClient.exists(fullPath)) {
            return new DownloadAccess.NotFound("File not found in AList: " + path);
        }
        
        // 如果没有直链可用，返回 NotFound（暂不支持通过本服务代理下载 AList 文件）
        // 未来可以扩展为代理下载模式
        return new DownloadAccess.NotFound("Direct link not available for: " + path);
    }

    @Override
    public void ensureDirectoryExists(String path) {
        String fullPath = resolvePath(path);
        alistClient.ensureDirectoryExists(fullPath);
    }

    /**
     * 将相对路径解析为完整的 AList 路径
     */
    private String resolvePath(String relativePath) {
        // 规范化相对路径
        String normalized = relativePath;
        if (normalized.startsWith("/")) {
            normalized = normalized.substring(1);
        }
        
        // 拼接根路径
        if (rootPath.endsWith("/")) {
            return rootPath + normalized;
        } else {
            return rootPath + "/" + normalized;
        }
    }

    /**
     * 规范化根路径
     */
    private String normalizeRootPath(String path) {
        if (path == null || path.isBlank()) {
            return "/";
        }
        
        // 确保以 / 开头
        String normalized = path.startsWith("/") ? path : "/" + path;
        
        // 移除尾部 /
        if (normalized.length() > 1 && normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        
        return normalized;
    }

    /**
     * 获取 AList 根路径
     */
    public String getRootPath() {
        return rootPath;
    }
}