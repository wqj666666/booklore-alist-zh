package com.adityachandel.booklore.service.upload;

import com.adityachandel.booklore.mapper.BookMapper;
import com.adityachandel.booklore.model.dto.Book;
import com.adityachandel.booklore.model.dto.BookMetadata;
import com.adityachandel.booklore.model.entity.BookEntity;
import com.adityachandel.booklore.model.entity.BookFileEntity;
import com.adityachandel.booklore.model.entity.BookMetadataEntity;
import com.adityachandel.booklore.model.entity.LibraryEntity;
import com.adityachandel.booklore.model.entity.LibraryPathEntity;
import com.adityachandel.booklore.model.enums.BookFileExtension;
import com.adityachandel.booklore.model.enums.BookFileType;
import com.adityachandel.booklore.repository.BookRepository;
import com.adityachandel.booklore.service.book.BookCreatorService;
import com.adityachandel.booklore.service.file.FileFingerprint;
import com.adityachandel.booklore.service.metadata.MetadataMatchService;
import com.adityachandel.booklore.service.metadata.extractor.MetadataExtractorFactory;
import com.adityachandel.booklore.util.BookCoverUtils;
import com.adityachandel.booklore.util.FileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Set;
import java.util.stream.Collectors;

import static com.adityachandel.booklore.util.FileService.truncate;

/**
 * 上传书籍创建服务
 * 封装从上传文件（临时文件）创建书籍记录的逻辑
 * 适用于 AList 上传等需要在文件移动前创建书籍记录的场景
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UploadBookCreationService {

    private static final long BYTES_TO_KB_DIVISOR = 1024L;

    private final BookRepository bookRepository;
    private final BookCreatorService bookCreatorService;
    private final MetadataExtractorFactory metadataExtractorFactory;
    private final MetadataMatchService metadataMatchService;
    private final BookMapper bookMapper;
    private final FileService fileService;

    /**
     * 从上传的临时文件创建书籍记录
     * 
     * @param context 上传书籍创建上下文
     * @return 创建的书籍 DTO
     */
    public Book createBookFromUpload(UploadBookCreationContext context) {
        // 计算文件哈希
        final String fileHash = FileFingerprint.generateHash(context.tempFilePath());
        
        // 从相对路径中提取子路径和文件名
        Path relPath = Paths.get(context.relativePath());
        String fileName = relPath.getFileName().toString();
        String fileSubPath = relPath.getParent() != null 
                ? relPath.getParent().toString().replace("\\", "/") 
                : "";
        
        // 获取文件类型
        BookFileType bookFileType = context.fileExtension().getType();
        
        // 创建书籍实体
        BookEntity bookEntity = createBookEntity(
                context.libraryEntity(),
                context.libraryPathEntity(),
                fileName,
                fileSubPath,
                bookFileType,
                context.fileSizeBytes(),
                fileHash
        );
        
        // 保存书籍实体以获取 ID
        bookEntity = bookRepository.save(bookEntity);
        
        // 设置元数据
        setBookMetadata(bookEntity, context.metadata());
        
        // 添加作者
        addAuthorsIfPresent(bookEntity, context.metadata());
        
        // 添加分类
        addCategoriesIfPresent(bookEntity, context.metadata());
        
        // 使用临时文件生成封面
        generateCoverFromFile(bookEntity, context.fileExtension(), context.tempFilePath().toFile());
        
        // 计算元数据匹配分数
        bookEntity.setMetadataMatchScore(metadataMatchService.calculateMatchScore(bookEntity));
        
        // 保存所有关联
        bookCreatorService.saveConnections(bookEntity);
        
        log.debug("Created book record from upload: {} (ID: {})", fileName, bookEntity.getId());
        
        return bookMapper.toBook(bookEntity);
    }

    /**
     * 创建书籍实体（不含元数据填充）
     */
    private BookEntity createBookEntity(
            LibraryEntity libraryEntity,
            LibraryPathEntity libraryPathEntity,
            String fileName,
            String fileSubPath,
            BookFileType bookFileType,
            long fileSizeBytes,
            String fileHash) {
        
        BookEntity bookEntity = BookEntity.builder()
                .library(libraryEntity)
                .libraryPath(libraryPathEntity)
                .addedOn(Instant.now())
                .bookFiles(new ArrayList<>())
                .build();
        
        BookFileEntity bookFileEntity = BookFileEntity.builder()
                .book(bookEntity)
                .fileName(fileName)
                .fileSubPath(fileSubPath)
                .isBookFormat(true)
                .bookType(bookFileType)
                .fileSizeKb(fileSizeBytes / BYTES_TO_KB_DIVISOR)
                .initialHash(fileHash)
                .currentHash(fileHash)
                .addedOn(Instant.now())
                .build();
        bookEntity.getBookFiles().add(bookFileEntity);
        
        BookMetadataEntity metadataEntity = BookMetadataEntity.builder()
                .book(bookEntity)
                .build();
        bookEntity.setMetadata(metadataEntity);
        
        return bookEntity;
    }

    /**
     * 从提取的元数据设置书籍元数据
     */
    private void setBookMetadata(BookEntity bookEntity, BookMetadata metadata) {
        BookMetadataEntity entity = bookEntity.getMetadata();
        
        entity.setTitle(truncate(metadata.getTitle(), 1000));
        entity.setSubtitle(truncate(metadata.getSubtitle(), 1000));
        entity.setDescription(truncate(metadata.getDescription(), 2000));
        entity.setPublisher(truncate(metadata.getPublisher(), 1000));
        entity.setPublishedDate(metadata.getPublishedDate());
        entity.setSeriesName(truncate(metadata.getSeriesName(), 1000));
        entity.setSeriesNumber(metadata.getSeriesNumber());
        entity.setSeriesTotal(metadata.getSeriesTotal());
        entity.setIsbn13(truncate(metadata.getIsbn13(), 64));
        entity.setIsbn10(truncate(metadata.getIsbn10(), 64));
        entity.setPageCount(metadata.getPageCount());
        
        String lang = metadata.getLanguage();
        entity.setLanguage(truncate((lang == null || "UND".equalsIgnoreCase(lang)) ? "en" : lang, 1000));
        
        entity.setAsin(truncate(metadata.getAsin(), 20));
        entity.setAmazonRating(metadata.getAmazonRating());
        entity.setAmazonReviewCount(metadata.getAmazonReviewCount());
        entity.setGoodreadsId(truncate(metadata.getGoodreadsId(), 100));
        entity.setGoodreadsRating(metadata.getGoodreadsRating());
        entity.setGoodreadsReviewCount(metadata.getGoodreadsReviewCount());
        entity.setHardcoverId(truncate(metadata.getHardcoverId(), 100));
        entity.setHardcoverRating(metadata.getHardcoverRating());
        entity.setHardcoverReviewCount(metadata.getHardcoverReviewCount());
        entity.setGoogleId(truncate(metadata.getGoogleId(), 100));
        entity.setComicvineId(truncate(metadata.getComicvineId(), 100));
        entity.setRanobedbId(truncate(metadata.getRanobedbId(), 100));
        entity.setRanobedbRating(metadata.getRanobedbRating());
    }

    /**
     * 添加作者（如果存在）
     */
    private void addAuthorsIfPresent(BookEntity bookEntity, BookMetadata metadata) {
        if (metadata.getAuthors() != null && !metadata.getAuthors().isEmpty()) {
            bookCreatorService.addAuthorsToBook(metadata.getAuthors(), bookEntity);
        }
    }

    /**
     * 添加分类（如果存在）
     */
    private void addCategoriesIfPresent(BookEntity bookEntity, BookMetadata metadata) {
        if (metadata.getCategories() != null && !metadata.getCategories().isEmpty()) {
            Set<String> validCategories = metadata.getCategories().stream()
                    .filter(s -> s != null && !s.isBlank() && s.length() <= 100)
                    .collect(Collectors.toSet());
            bookCreatorService.addCategoriesToBook(validCategories, bookEntity);
        }
    }

    /**
     * 使用本地文件生成封面
     * 
     * @param bookEntity 书籍实体
     * @param fileExtension 文件扩展名
     * @param file 本地文件
     * @return 是否成功生成封面
     */
    private boolean generateCoverFromFile(BookEntity bookEntity, BookFileExtension fileExtension, File file) {
        try {
            // 使用元数据提取器直接从文件提取封面
            byte[] coverData = metadataExtractorFactory.extractCover(fileExtension, file);
            
            if (coverData == null) {
                log.debug("No cover image found in file: {}", file.getName());
                return false;
            }
            
            try (ByteArrayInputStream bais = new ByteArrayInputStream(coverData)) {
                java.awt.image.BufferedImage originalImage = FileService.readImage(bais);
                if (originalImage == null) {
                    log.warn("Failed to decode cover image for file: {}", file.getName());
                    return false;
                }
                boolean saved = fileService.saveCoverImages(originalImage, bookEntity.getId());
                originalImage.flush();
                
                if (saved) {
                    FileService.setBookCoverPath(bookEntity.getMetadata());
                    bookEntity.setBookCoverHash(BookCoverUtils.generateCoverHash());
                }
                
                return saved;
            }
        } catch (Exception e) {
            log.error("Error generating cover for file '{}': {}", file.getName(), e.getMessage(), e);
            return false;
        }
    }

    /**
     * 上传书籍创建上下文
     * 封装创建书籍所需的所有参数
     */
    public record UploadBookCreationContext(
            LibraryEntity libraryEntity,
            LibraryPathEntity libraryPathEntity,
            BookFileExtension fileExtension,
            BookMetadata metadata,
            String relativePath,
            Path tempFilePath,
            long fileSizeBytes
    ) {
        /**
         * 创建上下文的构建器
         */
        public static Builder builder() {
            return new Builder();
        }

        public static class Builder {
            private LibraryEntity libraryEntity;
            private LibraryPathEntity libraryPathEntity;
            private BookFileExtension fileExtension;
            private BookMetadata metadata;
            private String relativePath;
            private Path tempFilePath;
            private long fileSizeBytes;

            public Builder libraryEntity(LibraryEntity libraryEntity) {
                this.libraryEntity = libraryEntity;
                return this;
            }

            public Builder libraryPathEntity(LibraryPathEntity libraryPathEntity) {
                this.libraryPathEntity = libraryPathEntity;
                return this;
            }

            public Builder fileExtension(BookFileExtension fileExtension) {
                this.fileExtension = fileExtension;
                return this;
            }

            public Builder metadata(BookMetadata metadata) {
                this.metadata = metadata;
                return this;
            }

            public Builder relativePath(String relativePath) {
                this.relativePath = relativePath;
                return this;
            }

            public Builder tempFilePath(Path tempFilePath) {
                this.tempFilePath = tempFilePath;
                return this;
            }

            public Builder fileSizeBytes(long fileSizeBytes) {
                this.fileSizeBytes = fileSizeBytes;
                return this;
            }

            public UploadBookCreationContext build() {
                return new UploadBookCreationContext(
                        libraryEntity,
                        libraryPathEntity,
                        fileExtension,
                        metadata,
                        relativePath,
                        tempFilePath,
                        fileSizeBytes
                );
            }
        }
    }
}