package com.adityachandel.booklore.service.storage;

import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Optional;

/**
 * 本地文件系统存储后端
 * 将文件存储在本地文件系统中
 */
@Slf4j
public class LocalStorageBackend implements StorageBackend {

    /**
     * 本地存储的根目录（对应 LibraryPath.path）
     */
    private final String rootPath;

    public LocalStorageBackend(String rootPath) {
        this.rootPath = rootPath;
    }

    @Override
    public StorageType getType() {
        return StorageType.LOCAL;
    }

    @Override
    public void write(String targetPath, InputStream inputStream, long contentLength) {
        Path fullPath = resolvePath(targetPath);
        
        try {
            // 确保父目录存在
            Files.createDirectories(fullPath.getParent());
            
            // 写入文件
            Files.copy(inputStream, fullPath, StandardCopyOption.REPLACE_EXISTING);
            
            log.debug("Written file to local path: {}", fullPath);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to write file to " + fullPath, e);
        }
    }

    @Override
    public void write(String targetPath, Path localFile) {
        Path fullPath = resolvePath(targetPath);
        
        try {
            // 确保父目录存在
            Files.createDirectories(fullPath.getParent());
            
            // 复制或移动文件
            Files.copy(localFile, fullPath, StandardCopyOption.REPLACE_EXISTING);
            
            log.debug("Written file to local path: {}", fullPath);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to write file to " + fullPath, e);
        }
    }

    @Override
    public boolean exists(String path) {
        Path fullPath = resolvePath(path);
        return Files.exists(fullPath);
    }

    @Override
    public boolean existsWithSize(String path, long expectedSize) {
        Path fullPath = resolvePath(path);
        
        if (!Files.exists(fullPath)) {
            return false;
        }
        
        try {
            return Files.size(fullPath) == expectedSize;
        } catch (IOException e) {
            log.warn("Failed to get file size for {}: {}", fullPath, e.getMessage());
            return false;
        }
    }

    @Override
    public Optional<Long> getFileSize(String path) {
        Path fullPath = resolvePath(path);
        
        if (!Files.exists(fullPath)) {
            return Optional.empty();
        }
        
        try {
            return Optional.of(Files.size(fullPath));
        } catch (IOException e) {
            log.warn("Failed to get file size for {}: {}", fullPath, e.getMessage());
            return Optional.empty();
        }
    }

    @Override
    public byte[] read(String path) {
        Path fullPath = resolvePath(path);
        
        if (!Files.exists(fullPath)) {
            throw new UncheckedIOException(new IOException("File not found: " + fullPath));
        }
        
        try {
            return Files.readAllBytes(fullPath);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read file: " + fullPath, e);
        }
    }

    @Override
    public void delete(String path) {
        Path fullPath = resolvePath(path);
        
        try {
            Files.deleteIfExists(fullPath);
            log.debug("Deleted local file: {}", fullPath);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to delete file: " + fullPath, e);
        }
    }

    @Override
    public DownloadAccess getDownloadAccess(String path) {
        Path fullPath = resolvePath(path);
        
        if (!Files.exists(fullPath)) {
            return new DownloadAccess.NotFound("File not found: " + path);
        }
        
        return new DownloadAccess.LocalFile(fullPath);
    }

    @Override
    public void ensureDirectoryExists(String path) {
        Path fullPath = resolvePath(path);
        
        try {
            Files.createDirectories(fullPath);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to create directory: " + fullPath, e);
        }
    }

    /**
     * 将相对路径解析为完整的本地路径
     */
    private Path resolvePath(String relativePath) {
        // 规范化路径，避免路径遍历攻击
        String normalized = relativePath;
        if (normalized.startsWith("/")) {
            normalized = normalized.substring(1);
        }
        
        Path resolved = Paths.get(rootPath, normalized).normalize();
        
        // 安全检查：确保解析后的路径仍在根目录下
        Path rootAbsolute = Paths.get(rootPath).toAbsolutePath().normalize();
        Path resolvedAbsolute = resolved.toAbsolutePath().normalize();
        
        if (!resolvedAbsolute.startsWith(rootAbsolute)) {
            throw new SecurityException("Path traversal attempt detected: " + relativePath);
        }
        
        return resolved;
    }

    /**
     * 获取根目录路径
     */
    public String getRootPath() {
        return rootPath;
    }
}