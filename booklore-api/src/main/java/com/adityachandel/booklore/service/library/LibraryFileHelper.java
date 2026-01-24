package com.adityachandel.booklore.service.library;

import com.adityachandel.booklore.model.dto.settings.LibraryFile;
import com.adityachandel.booklore.model.entity.LibraryEntity;
import com.adityachandel.booklore.model.entity.LibraryPathEntity;
import com.adityachandel.booklore.model.enums.BookFileExtension;
import com.adityachandel.booklore.service.alist.AlistClient;
import com.adityachandel.booklore.service.alist.dto.AlistFileInfo;
import com.adityachandel.booklore.service.storage.StorageBackendSelector;
import com.adityachandel.booklore.util.FileUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.NonNull;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.FileVisitOption;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;

@Component
@Slf4j
@RequiredArgsConstructor
public class LibraryFileHelper {

    private final StorageBackendSelector storageBackendSelector;
    private final AlistClient alistClient;

    public List<LibraryFile> getLibraryFiles(LibraryEntity libraryEntity, LibraryFileProcessor processor) throws IOException {
        List<LibraryFile> allFiles = new ArrayList<>();
        for (LibraryPathEntity pathEntity : libraryEntity.getLibraryPaths()) {
            allFiles.addAll(findLibraryFiles(pathEntity, libraryEntity, processor));
        }
        return allFiles;
    }

    private List<LibraryFile> findLibraryFiles(LibraryPathEntity pathEntity, LibraryEntity libraryEntity, LibraryFileProcessor processor) throws IOException {
        // 检查是否启用了 AList
        if (storageBackendSelector.isAlistEnabled(pathEntity)) {
            log.info("Scanning AList path for library: {} (alistPath: {})", libraryEntity.getName(), pathEntity.getAlistPath());
            return findLibraryFilesFromAlist(pathEntity, libraryEntity, processor);
        } else {
            log.info("Scanning local path for library: {} (path: {})", libraryEntity.getName(), pathEntity.getPath());
            return findLibraryFilesFromLocal(pathEntity, libraryEntity, processor);
        }
    }

    /**
     * 从本地文件系统扫描文件
     */
    private List<LibraryFile> findLibraryFilesFromLocal(LibraryPathEntity pathEntity, LibraryEntity libraryEntity, LibraryFileProcessor processor) throws IOException {
        Path libraryPath = Path.of(pathEntity.getPath());
        boolean supportsSupplementaryFiles = processor.supportsSupplementaryFiles();
        List<LibraryFile> libraryFiles = new ArrayList<>();

        Files.walkFileTree(libraryPath, EnumSet.of(FileVisitOption.FOLLOW_LINKS), Integer.MAX_VALUE, new SimpleFileVisitor<>() {
            @Override
            @NonNull
            public FileVisitResult visitFile(@NonNull Path file, @NonNull BasicFileAttributes attrs) {
                if (FileUtils.shouldIgnore(file) || !Files.isReadable(file) || !Files.isRegularFile(file)) {
                    return FileVisitResult.CONTINUE;
                }

                String fileName = file.getFileName().toString();
                Optional<BookFileExtension> bookExtension = BookFileExtension.fromFileName(fileName);

                if (bookExtension.isEmpty() && !supportsSupplementaryFiles) {
                    return FileVisitResult.CONTINUE;
                }

                libraryFiles.add(LibraryFile.builder()
                        .libraryEntity(libraryEntity)
                        .libraryPathEntity(pathEntity)
                        .fileSubPath(FileUtils.getRelativeSubPath(pathEntity.getPath(), file))
                        .fileName(fileName)
                        .bookFileType(bookExtension.map(BookFileExtension::getType).orElse(null))
                        .build());
                return FileVisitResult.CONTINUE;
            }

            @Override
            @NonNull
            public FileVisitResult visitFileFailed(@NonNull Path file, IOException e) {
                log.error("Failed read path [{}]: {}", file, e.getMessage(), e);
                return FileVisitResult.CONTINUE;
            }

            @Override
            @NonNull
            public FileVisitResult preVisitDirectory(@NonNull Path dir, @NonNull BasicFileAttributes attrs) throws IOException {
                if (FileUtils.shouldIgnore(dir) || !Files.isReadable(dir)) {
                    return FileVisitResult.SKIP_SUBTREE;
                }

                return super.preVisitDirectory(dir, attrs);
            }
        });
        return libraryFiles;
    }

    /**
     * 从 AList 扫描文件
     */
    private List<LibraryFile> findLibraryFilesFromAlist(LibraryPathEntity pathEntity, LibraryEntity libraryEntity, LibraryFileProcessor processor) {
        String alistPath = pathEntity.getAlistPath();
        boolean supportsSupplementaryFiles = processor.supportsSupplementaryFiles();
        List<LibraryFile> libraryFiles = new ArrayList<>();

        try {
            // 递归扫描 AList 目录
            scanAlistDirectory(alistPath, "", pathEntity, libraryEntity, supportsSupplementaryFiles, libraryFiles);
            log.info("Found {} files in AList path: {}", libraryFiles.size(), alistPath);
        } catch (Exception e) {
            log.error("Failed to scan AList path [{}]: {}", alistPath, e.getMessage(), e);
        }

        return libraryFiles;
    }

    /**
     * 递归扫描 AList 目录
     *
     * @param currentAlistPath 当前 AList 绝对路径
     * @param relativeSubPath 相对于 LibraryPath.alistPath 的子路径
     * @param pathEntity LibraryPath 实体
     * @param libraryEntity Library 实体
     * @param supportsSupplementaryFiles 是否支持补充文件
     * @param libraryFiles 收集的文件列表
     */
    private void scanAlistDirectory(String currentAlistPath, String relativeSubPath, LibraryPathEntity pathEntity,
                                   LibraryEntity libraryEntity, boolean supportsSupplementaryFiles,
                                   List<LibraryFile> libraryFiles) {
        try {
            // 列出当前目录的所有内容
            List<AlistFileInfo> files = alistClient.listFiles(currentAlistPath);
            
            for (AlistFileInfo fileInfo : files) {
                String fileName = fileInfo.getName();
                
                // 跳过需要忽略的文件
                if (FileUtils.shouldIgnoreFileName(fileName)) {
                    continue;
                }
                
                if (fileInfo.isDir()) {
                    // 递归扫描子目录
                    String subDirAlistPath = currentAlistPath.endsWith("/")
                        ? currentAlistPath + fileName
                        : currentAlistPath + "/" + fileName;
                    String subDirRelativePath = relativeSubPath.isEmpty()
                        ? fileName
                        : relativeSubPath + "/" + fileName;
                    
                    scanAlistDirectory(subDirAlistPath, subDirRelativePath, pathEntity, libraryEntity,
                                     supportsSupplementaryFiles, libraryFiles);
                } else {
                    // 处理文件
                    Optional<BookFileExtension> bookExtension = BookFileExtension.fromFileName(fileName);
                    
                    // 如果不是书籍格式且不支持补充文件，跳过
                    if (bookExtension.isEmpty() && !supportsSupplementaryFiles) {
                        continue;
                    }
                    
                    libraryFiles.add(LibraryFile.builder()
                            .libraryEntity(libraryEntity)
                            .libraryPathEntity(pathEntity)
                            .fileSubPath(relativeSubPath.isEmpty() ? null : relativeSubPath)
                            .fileName(fileName)
                            .bookFileType(bookExtension.map(BookFileExtension::getType).orElse(null))
                            .fileSize(fileInfo.getSize())
                            .modifiedTime(fileInfo.getModified())
                            .build());
                }
            }
        } catch (Exception e) {
            log.error("Failed to scan AList directory [{}]: {}", currentAlistPath, e.getMessage());
        }
    }
}
