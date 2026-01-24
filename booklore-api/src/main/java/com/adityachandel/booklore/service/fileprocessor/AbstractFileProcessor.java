package com.adityachandel.booklore.service.fileprocessor;

import com.adityachandel.booklore.mapper.BookMapper;
import com.adityachandel.booklore.model.FileProcessResult;
import com.adityachandel.booklore.model.dto.Book;
import com.adityachandel.booklore.model.dto.settings.LibraryFile;
import com.adityachandel.booklore.model.entity.BookEntity;
import com.adityachandel.booklore.model.entity.BookFileEntity;
import com.adityachandel.booklore.model.enums.FileProcessStatus;
import com.adityachandel.booklore.repository.BookAdditionalFileRepository;
import com.adityachandel.booklore.repository.BookRepository;
import com.adityachandel.booklore.service.book.BookCreatorService;
import com.adityachandel.booklore.service.file.FileFingerprint;
import com.adityachandel.booklore.service.metadata.MetadataMatchService;
import com.adityachandel.booklore.service.storage.StorageBackend;
import com.adityachandel.booklore.service.storage.StorageBackendSelector;
import com.adityachandel.booklore.util.FileService;
import com.adityachandel.booklore.util.FileUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

@Slf4j
public abstract class AbstractFileProcessor implements BookFileProcessor {

    protected final BookRepository bookRepository;
    protected final BookAdditionalFileRepository bookAdditionalFileRepository;
    protected final BookCreatorService bookCreatorService;
    protected final BookMapper bookMapper;
    protected final MetadataMatchService metadataMatchService;
    protected final FileService fileService;
    protected final StorageBackendSelector storageBackendSelector;


    protected AbstractFileProcessor(BookRepository bookRepository,
                                    BookAdditionalFileRepository bookAdditionalFileRepository,
                                    BookCreatorService bookCreatorService,
                                    BookMapper bookMapper,
                                    FileService fileService,
                                    MetadataMatchService metadataMatchService,
                                    StorageBackendSelector storageBackendSelector) {
        this.bookRepository = bookRepository;
        this.bookAdditionalFileRepository = bookAdditionalFileRepository;
        this.bookCreatorService = bookCreatorService;
        this.bookMapper = bookMapper;
        this.metadataMatchService = metadataMatchService;
        this.fileService = fileService;
        this.storageBackendSelector = storageBackendSelector;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    @Override
    public FileProcessResult processFile(LibraryFile libraryFile) {
        String hash = computeFileHash(libraryFile);
        Book book = createAndMapBook(libraryFile, hash);
        return new FileProcessResult(book, FileProcessStatus.NEW);
    }

    /**
     * 计算文件哈希，支持本地和 AList 存储
     */
    private String computeFileHash(LibraryFile libraryFile) {
        StorageBackend backend = storageBackendSelector.getBackend(libraryFile.getLibraryPathEntity());
        
        if (backend.getType() == StorageBackend.StorageType.LOCAL) {
            // 本地存储：直接使用文件路径计算部分 MD5 哈希
            Path path = libraryFile.getFullPath();
            return FileFingerprint.generateHash(path);
        } else {
            // AList 存储：使用文件元数据生成虚拟哈希（不下载文件内容，节省流量）
            String fullAlistPath = libraryFile.getFullAlistPath();
            return FileFingerprint.generateVirtualHash(
                    fullAlistPath,
                    libraryFile.getFileSize(),
                    libraryFile.getModifiedTime()
            );
        }
    }

    private Book createAndMapBook(LibraryFile libraryFile, String hash) {
        BookEntity entity = processNewFile(libraryFile);
        entity.getPrimaryBookFile().setCurrentHash(hash);
        entity.setMetadataMatchScore(metadataMatchService.calculateMatchScore(entity));
        bookCreatorService.saveConnections(entity);
        return bookMapper.toBook(entity);
    }

    protected abstract BookEntity processNewFile(LibraryFile libraryFile);
    
    /**
     * 检查书籍是否存储在 AList
     */
    protected boolean isAlistStorage(BookEntity bookEntity) {
        StorageBackend backend = storageBackendSelector.getBackend(bookEntity);
        return backend.getType() == StorageBackend.StorageType.ALIST;
    }
    
    /**
     * 获取书籍文件用于处理。
     * 对于本地存储，直接返回本地文件。
     * 对于 AList 存储，下载到临时文件。
     *
     * @param bookEntity 书籍实体
     * @return 包含文件和是否为临时文件的结果
     */
    protected FileAccessResult getBookFileForProcessing(BookEntity bookEntity) {
        StorageBackend backend = storageBackendSelector.getBackend(bookEntity);
        BookFileEntity bookFile = bookEntity.getPrimaryBookFile();
        
        if (backend.getType() == StorageBackend.StorageType.LOCAL) {
            // 本地存储：直接使用本地文件
            File localFile = new File(FileUtils.getBookFullPath(bookEntity));
            return new FileAccessResult(localFile, false);
        } else {
            // AList 存储：下载到临时文件
            try {
                String relativePath = storageBackendSelector.getRelativePath(bookFile);
                byte[] fileContent = backend.read(relativePath);
                
                if (fileContent == null || fileContent.length == 0) {
                    log.error("Failed to download file from AList: {}", relativePath);
                    return null;
                }
                
                // 创建临时文件
                String extension = FileUtils.getExtension(bookFile.getFileName());
                Path tempFile = Files.createTempFile("booklore_", "." + extension);
                Files.write(tempFile, fileContent);
                
                log.debug("Downloaded AList file to temp: {} -> {}", relativePath, tempFile);
                return new FileAccessResult(tempFile.toFile(), true);
                
            } catch (IOException e) {
                log.error("Failed to create temp file for AList book: {}", bookFile.getFileName(), e);
                return null;
            }
        }
    }
    
    /**
     * 清理临时文件
     */
    protected void cleanupTempFile(FileAccessResult result) {
        if (result != null && result.isTempFile() && result.file() != null) {
            try {
                Files.deleteIfExists(result.file().toPath());
                log.debug("Cleaned up temp file: {}", result.file());
            } catch (IOException e) {
                log.warn("Failed to delete temp file: {}", result.file(), e);
            }
        }
    }
    
    /**
     * 文件访问结果
     * @param file 文件对象
     * @param isTempFile 是否为临时文件（需要在使用后删除）
     */
    protected record FileAccessResult(File file, boolean isTempFile) {}
}