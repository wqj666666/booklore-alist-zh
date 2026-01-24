package com.adityachandel.booklore.service.storage;

import com.adityachandel.booklore.model.entity.AlistSettingsEntity;
import com.adityachandel.booklore.model.entity.BookEntity;
import com.adityachandel.booklore.model.entity.BookFileEntity;
import com.adityachandel.booklore.model.entity.LibraryPathEntity;
import com.adityachandel.booklore.repository.AlistSettingsRepository;
import com.adityachandel.booklore.service.alist.AlistClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 存储后端选择器
 * 根据 LibraryPath 配置选择合适的存储后端
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StorageBackendSelector {

    private final AlistSettingsRepository alistSettingsRepository;
    private final AlistClient alistClient;

    /**
     * 本地存储后端缓存，key 为 LibraryPath.path
     */
    private final Map<String, LocalStorageBackend> localBackendCache = new ConcurrentHashMap<>();

    /**
     * AList 存储后端缓存，key 为 LibraryPath.alistPath
     */
    private final Map<String, AlistStorageBackend> alistBackendCache = new ConcurrentHashMap<>();

    /**
     * 根据 LibraryPathEntity 获取存储后端
     * 
     * @param libraryPath 库路径配置
     * @return 存储后端
     */
    public StorageBackend getBackend(LibraryPathEntity libraryPath) {
        // 检查是否启用了 AList 且该 LibraryPath 配置了 AList
        if (isAlistEnabled(libraryPath)) {
            return getAlistBackend(libraryPath);
        }
        
        // 默认使用本地存储
        return getLocalBackend(libraryPath);
    }

    /**
     * 根据 BookEntity 获取存储后端
     * 
     * @param book 书籍实体
     * @return 存储后端
     */
    public StorageBackend getBackend(BookEntity book) {
        if (book.getLibraryPath() == null) {
            throw new IllegalStateException("Book has no library path");
        }
        return getBackend(book.getLibraryPath());
    }

    /**
     * 根据 BookFileEntity 获取存储后端
     * 
     * @param bookFile 书籍文件实体
     * @return 存储后端
     */
    public StorageBackend getBackend(BookFileEntity bookFile) {
        if (bookFile.getBook() == null) {
            throw new IllegalStateException("BookFile has no associated book");
        }
        return getBackend(bookFile.getBook());
    }

    /**
     * 获取本地存储后端
     */
    public LocalStorageBackend getLocalBackend(LibraryPathEntity libraryPath) {
        return localBackendCache.computeIfAbsent(
                libraryPath.getPath(),
                LocalStorageBackend::new
        );
    }

    /**
     * 获取 AList 存储后端
     */
    public AlistStorageBackend getAlistBackend(LibraryPathEntity libraryPath) {
        String alistPath = libraryPath.getAlistPath();
        if (alistPath == null || alistPath.isBlank()) {
            throw new IllegalStateException("AList path is not configured for library path: " + libraryPath.getId());
        }
        
        return alistBackendCache.computeIfAbsent(
                alistPath,
                path -> new AlistStorageBackend(alistClient, this::getAlistSettings, path)
        );
    }

    /**
     * 检查 LibraryPath 是否启用了 AList
     */
    public boolean isAlistEnabled(LibraryPathEntity libraryPath) {
        // 全局 AList 必须启用
        if (!isAlistGloballyEnabled()) {
            return false;
        }
        
        // LibraryPath 必须配置了 AList 路径且启用了 AList
        return libraryPath.isAlistEnabled() && 
               libraryPath.getAlistPath() != null && 
               !libraryPath.getAlistPath().isBlank();
    }

    /**
     * 检查全局 AList 是否可用
     */
    public boolean isAlistGloballyEnabled() {
        return alistSettingsRepository.findSettings()
                .map(settings -> settings.isEnabled() && 
                        settings.getBaseUrl() != null && 
                        !settings.getBaseUrl().isBlank())
                .orElse(false);
    }

    /**
     * 获取书籍文件的相对路径（用于存储后端操作）
     *
     * @param bookFile 书籍文件实体
     * @return 相对路径（fileSubPath + fileName）
     */
    public String getRelativePath(BookFileEntity bookFile) {
        String subPath = bookFile.getFileSubPath();
        String fileName = bookFile.getFileName();
        
        if (subPath == null || subPath.isBlank()) {
            return fileName;
        }
        
        // 确保路径分隔符统一
        if (subPath.endsWith("/") || subPath.endsWith("\\")) {
            return subPath + fileName;
        }
        
        return subPath + "/" + fileName;
    }

    /**
     * 获取 LibraryFile 的相对路径（用于存储后端操作）
     *
     * @param libraryFile 库文件
     * @return 相对路径（fileSubPath + fileName）
     */
    public String getRelativePath(com.adityachandel.booklore.model.dto.settings.LibraryFile libraryFile) {
        String subPath = libraryFile.getFileSubPath();
        String fileName = libraryFile.getFileName();
        
        if (subPath == null || subPath.isBlank()) {
            return fileName;
        }
        
        // 确保路径分隔符统一
        if (subPath.endsWith("/") || subPath.endsWith("\\")) {
            return subPath + fileName;
        }
        
        return subPath + "/" + fileName;
    }

    /**
     * 清除缓存
     */
    public void clearCache() {
        localBackendCache.clear();
        alistBackendCache.clear();
        log.debug("Storage backend cache cleared");
    }
    
    private AlistSettingsEntity getAlistSettings() {
        return alistSettingsRepository.findSettings()
                .orElseThrow(() -> new IllegalStateException("AList settings not found in database"));
    }
}