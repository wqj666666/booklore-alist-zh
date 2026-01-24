package com.adityachandel.booklore.model.entity;
import com.adityachandel.booklore.util.ArchiveUtils;
import com.adityachandel.booklore.model.enums.BookFileType;
import jakarta.persistence.*;
import lombok.*;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;

@Entity
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "book_file")
public class BookFileEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "book_id", nullable = false)
    private BookEntity book;

    @Column(name = "file_name", length = 1000, nullable = false)
    private String fileName;

    @Column(name = "file_sub_path", length = 512, nullable = false)
    private String fileSubPath;

    @Column(name = "is_book", nullable = false)
    private boolean isBookFormat;

    @Enumerated(EnumType.STRING)
    @Column(name = "book_type", nullable = false)
    private BookFileType bookType;

    @Column(name = "archive_type")
    @Enumerated(EnumType.STRING)
    private ArchiveUtils.ArchiveType archiveType;

    @Column(name = "file_size_kb")
    private Long fileSizeKb;

    /**
     * AList 存储路径
     * 当文件存储在 AList 时，记录完整的 AList 路径
     */
    @Column(name = "alist_path", length = 1000)
    private String alistPath;

    /**
     * AList 文件大小（字节）
     * 从 AList API 获取的原始文件大小
     */
    @Column(name = "alist_file_size")
    private Long alistFileSize;

    /**
     * 文件修改时间（ISO 8601 格式字符串），用于 AList 存储的虚拟哈希计算
     */
    @Column(name = "alist_modified_time", length = 64)
    private String alistModifiedTime;

    @Column(name = "initial_hash", length = 128)
    private String initialHash;

    @Column(name = "current_hash", length = 128)
    private String currentHash;

    @Column(name = "alt_format_current_hash", insertable = false, updatable = false)
    private String altFormatCurrentHash;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "added_on")
    private Instant addedOn;

    public boolean isBook() {
        return isBookFormat;
    }

    public Path getFullFilePath() {
        if (book == null || book.getLibraryPath() == null || book.getLibraryPath().getPath() == null
                || fileSubPath == null || fileName == null) {
            throw new IllegalStateException("Cannot construct file path: missing book, library path, file subpath, or file name");
        }

        return Paths.get(book.getLibraryPath().getPath(), fileSubPath, fileName);
    }
}
