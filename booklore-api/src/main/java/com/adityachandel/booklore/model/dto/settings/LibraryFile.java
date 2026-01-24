package com.adityachandel.booklore.model.dto.settings;

import com.adityachandel.booklore.model.entity.LibraryEntity;
import com.adityachandel.booklore.model.entity.LibraryPathEntity;
import com.adityachandel.booklore.model.enums.BookFileType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.nio.file.Path;
import java.nio.file.Paths;

@Builder
@Data
@AllArgsConstructor
public class LibraryFile {
    private LibraryEntity libraryEntity;
    private LibraryPathEntity libraryPathEntity;
    private String fileSubPath;
    private String fileName;
    private BookFileType bookFileType;
    
    /**
     * 文件大小（字节），用于 AList 存储的虚拟哈希计算
     */
    private Long fileSize;
    
    /**
     * 文件修改时间（ISO 8601 格式字符串），用于 AList 存储的虚拟哈希计算
     */
    private String modifiedTime;

    public Path getFullPath() {
        if (fileSubPath == null || fileSubPath.isEmpty()) {
            return Paths.get(libraryPathEntity.getPath(), fileName);
        }
        return Paths.get(libraryPathEntity.getPath(), fileSubPath, fileName);
    }
    
    /**
     * 获取完整的 AList 路径
     */
    public String getFullAlistPath() {
        String alistPath = libraryPathEntity.getAlistPath();
        if (alistPath == null) {
            return null;
        }
        
        // 规范化 alistPath
        String basePath = alistPath.endsWith("/") ? alistPath : alistPath + "/";
        
        if (fileSubPath == null || fileSubPath.isEmpty()) {
            return basePath + fileName;
        }
        
        String subPath = fileSubPath.startsWith("/") ? fileSubPath.substring(1) : fileSubPath;
        if (!subPath.endsWith("/")) {
            subPath = subPath + "/";
        }
        
        return basePath + subPath + fileName;
    }
}
