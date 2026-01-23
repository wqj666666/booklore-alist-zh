package com.adityachandel.booklore.service.file;

import com.adityachandel.booklore.mapper.AdditionalFileMapper;
import com.adityachandel.booklore.model.dto.BookFile;
import com.adityachandel.booklore.model.entity.BookFileEntity;
import com.adityachandel.booklore.repository.BookAdditionalFileRepository;
import com.adityachandel.booklore.service.monitoring.MonitoringRegistrationService;
import com.adityachandel.booklore.service.storage.StorageBackend;
import com.adityachandel.booklore.service.storage.StorageBackendSelector;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

@Slf4j
@AllArgsConstructor
@Service
public class AdditionalFileService {

    private static final Pattern NON_ASCII = Pattern.compile("[^\\x00-\\x7F]");

    private final BookAdditionalFileRepository additionalFileRepository;
    private final AdditionalFileMapper additionalFileMapper;
    private final MonitoringRegistrationService monitoringRegistrationService;
    private final StorageBackendSelector storageBackendSelector;

    public List<BookFile> getAdditionalFilesByBookId(Long bookId) {
        List<BookFileEntity> entities = additionalFileRepository.findByBookId(bookId);
        return additionalFileMapper.toAdditionalFiles(entities);
    }

    public List<BookFile> getAdditionalFilesByBookIdAndIsBook(Long bookId, boolean isBook) {
        List<BookFileEntity> entities = additionalFileRepository.findByBookIdAndIsBookFormat(bookId, isBook);
        return additionalFileMapper.toAdditionalFiles(entities);
    }

    @Transactional
    public void deleteAdditionalFile(Long fileId) {
        Optional<BookFileEntity> fileOpt = additionalFileRepository.findById(fileId);
        if (fileOpt.isEmpty()) {
            throw new IllegalArgumentException("Additional file not found with id: " + fileId);
        }

        BookFileEntity file = fileOpt.get();

        try {
            // 使用存储后端删除文件
            StorageBackend backend = storageBackendSelector.getBackend(file);
            String relativePath = storageBackendSelector.getRelativePath(file);
            
            try {
                backend.delete(relativePath);
                log.info("Deleted additional file from storage: {}", relativePath);
            } catch (Exception e) {
                log.warn("Failed to delete file from storage: {}", relativePath, e);
            }
            
            // 同时尝试删除本地文件（如果存在）
            try {
                monitoringRegistrationService.unregisterSpecificPath(file.getFullFilePath().getParent());
                Files.deleteIfExists(file.getFullFilePath());
            } catch (Exception e) {
                log.debug("Local file cleanup: {}", e.getMessage());
            }

            additionalFileRepository.delete(file);
        } catch (Exception e) {
            log.warn("Failed to delete physical file: {}", file.getFullFilePath(), e);
            additionalFileRepository.delete(file);
        }
    }

    public ResponseEntity<Resource> downloadAdditionalFile(Long fileId) throws IOException {
        Optional<BookFileEntity> fileOpt = additionalFileRepository.findById(fileId);
        if (fileOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        BookFileEntity file = fileOpt.get();
        
        // 尝试使用存储后端的下载方式（支持 AList 302 直链）
        try {
            StorageBackend backend = storageBackendSelector.getBackend(file);
            String relativePath = storageBackendSelector.getRelativePath(file);
            StorageBackend.DownloadAccess downloadAccess = backend.getDownloadAccess(relativePath);
            
            switch (downloadAccess) {
                case StorageBackend.DownloadAccess.Redirect redirect -> {
                    log.debug("Redirecting download for file {} to: {}", fileId, redirect.url());
                    return ResponseEntity.status(HttpStatus.FOUND)
                            .location(URI.create(redirect.url()))
                            .build();
                }
                case StorageBackend.DownloadAccess.LocalFile localFile -> {
                    return downloadLocalFile(localFile.filePath(), file.getFileName());
                }
                case StorageBackend.DownloadAccess.NotFound notFound -> {
                    // 尝试回退到本地文件路径
                    Path filePath = file.getFullFilePath();
                    if (Files.exists(filePath)) {
                        return downloadLocalFile(filePath, file.getFileName());
                    }
                    log.warn("File not found: {}", notFound.message());
                    return ResponseEntity.notFound().build();
                }
            }
        } catch (Exception e) {
            log.warn("Error using storage backend, falling back to local: {}", e.getMessage());
            
            // 回退到本地文件
            Path filePath = file.getFullFilePath();
            if (!Files.exists(filePath)) {
                return ResponseEntity.notFound().build();
            }
            return downloadLocalFile(filePath, file.getFileName());
        }
    }

    /**
     * 下载本地文件
     */
    private ResponseEntity<Resource> downloadLocalFile(Path filePath, String fileName) {
        if (!Files.exists(filePath)) {
            return ResponseEntity.notFound().build();
        }
        
        Resource resource = new FileSystemResource(filePath.toFile());

        String encodedFilename = URLEncoder.encode(fileName, StandardCharsets.UTF_8).replace("+", "%20");
        String fallbackFilename = NON_ASCII.matcher(fileName).replaceAll("_");
        String contentDisposition = String.format("attachment; filename=\"%s\"; filename*=UTF-8''%s",
                fallbackFilename, encodedFilename);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition)
                .body(resource);
    }
}
