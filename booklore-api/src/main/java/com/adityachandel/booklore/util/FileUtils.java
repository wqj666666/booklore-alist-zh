package com.adityachandel.booklore.util;

import com.adityachandel.booklore.model.dto.Book;
import com.adityachandel.booklore.model.entity.BookEntity;
import com.adityachandel.booklore.model.entity.BookFileEntity;
import lombok.experimental.UtilityClass;
import lombok.extern.slf4j.Slf4j;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import com.adityachandel.booklore.model.entity.BookEntity;

@UtilityClass
@Slf4j
public class FileUtils {

    private final String FILE_NOT_FOUND_MESSAGE = "File does not exist: ";

    public String getBookFullPath(BookEntity bookEntity) {
        BookFileEntity bookFile = bookEntity.getPrimaryBookFile();

        return Path.of(bookEntity.getLibraryPath().getPath(), bookFile.getFileSubPath(), bookFile.getFileName())
                .normalize()
                .toString()
                .replace("\\", "/");
    }

    public String getBookFullPath(Book book) {
        return Path.of(book.getLibraryPath().getPath(), book.getFileSubPath(), book.getFileName())
                .normalize()
                .toString()
                .replace("\\", "/");
    }

    public String getRelativeSubPath(String basePath, Path fullFilePath) {
        return Optional.ofNullable(Path.of(basePath)
                        .relativize(fullFilePath)
                        .getParent())
                .map(path -> path.toString().replace("\\", "/"))
                .orElse("");
    }

    public Long getFileSizeInKb(BookEntity bookEntity) {
        Path filePath = Path.of(getBookFullPath(bookEntity));
        return getFileSizeInKb(filePath);
    }

    public Long getFileSizeInKb(Path filePath) {
        try {
            if (!Files.exists(filePath)) {
                log.warn(FILE_NOT_FOUND_MESSAGE + "{}", filePath.toAbsolutePath());
                return null;
            }
            return Files.size(filePath) / 1024;
        } catch (IOException e) {
            log.error("Failed to get file size for path [{}]: {}", filePath, e.getMessage(), e);
            return null;
        }
    }

    public void deleteDirectoryRecursively(Path path) throws IOException {
        if (!Files.exists(path)) return;

        try (var walk = Files.walk(path)) {
            walk.sorted(Comparator.reverseOrder())
                    .map(Path::toFile)
                    .forEach(File::delete);
        }
    }

    public String getExtension(String fileName) {
        if (fileName == null) {
            return "";
        }
        int i = fileName.lastIndexOf('.');
        if (i >= 0 && i < fileName.length() - 1) {
            return fileName.substring(i + 1);
        }
        return "";
    }

    final private List<String> systemDirs = Arrays.asList(
      // synology
      "#recycle",
      "@eaDir",
      // calibre
      ".caltrash"
    );

    public boolean shouldIgnore(Path path) {
        if (!path.getFileName().toString().isEmpty() && path.getFileName().toString().charAt(0) == '.') {
            return true;
        }
        for (Path part : path) {
            if (systemDirs.contains(part.toString())) {
                return true;
            }
        }
        return false;
    }

    /**
     * 检查文件名是否应该被忽略（用于 AList 等非 Path 场景）
     *
     * @param fileName 文件名
     * @return 是否应该忽略
     */
    public static boolean shouldIgnoreFileName(String fileName) {
        if (fileName == null || fileName.isEmpty()) {
            return true;
        }
        
        // 忽略隐藏文件（以 . 开头）
        if (fileName.charAt(0) == '.') {
            return true;
        }
        
        // 检查是否是系统目录
        List<String> systemDirs = Arrays.asList(
            "#recycle",
            "@eaDir",
            ".caltrash"
        );
        
        return systemDirs.contains(fileName);
    }
}
