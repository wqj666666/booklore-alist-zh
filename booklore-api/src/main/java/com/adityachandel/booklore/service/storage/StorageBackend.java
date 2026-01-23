package com.adityachandel.booklore.service.storage;

import java.io.InputStream;
import java.nio.file.Path;
import java.util.Optional;

/**
 * 存储后端抽象接口
 * 定义文件存储的统一操作接口，支持本地存储和远程存储（如 AList）
 */
public interface StorageBackend {

    /**
     * 获取存储类型
     */
    StorageType getType();

    /**
     * 写入文件
     * 
     * @param targetPath 目标路径（相对于存储根目录）
     * @param inputStream 文件输入流
     * @param contentLength 文件大小
     */
    void write(String targetPath, InputStream inputStream, long contentLength);

    /**
     * 从本地文件写入
     * 
     * @param targetPath 目标路径（相对于存储根目录）
     * @param localFile 本地文件路径
     */
    void write(String targetPath, Path localFile);

    /**
     * 检查文件是否存在
     * 
     * @param path 文件路径（相对于存储根目录）
     * @return 是否存在
     */
    boolean exists(String path);

    /**
     * 检查文件是否存在且大小匹配
     * 
     * @param path 文件路径（相对于存储根目录）
     * @param expectedSize 期望的文件大小
     * @return 是否存在且大小匹配
     */
    boolean existsWithSize(String path, long expectedSize);

    /**
     * 获取文件大小
     *
     * @param path 文件路径
     * @return 文件大小，如果不存在返回 empty
     */
    Optional<Long> getFileSize(String path);

    /**
     * 读取文件内容
     *
     * @param path 文件路径（相对于存储根目录）
     * @return 文件字节内容
     */
    byte[] read(String path);

    /**
     * 删除文件
     *
     * @param path 文件路径（相对于存储根目录）
     */
    void delete(String path);

    /**
     * 获取下载访问方式
     * 
     * @param path 文件路径（相对于存储根目录）
     * @return 下载访问信息
     */
    DownloadAccess getDownloadAccess(String path);

    /**
     * 确保目录存在
     * 
     * @param path 目录路径
     */
    void ensureDirectoryExists(String path);

    /**
     * 存储类型枚举
     */
    enum StorageType {
        /**
         * 本地文件系统存储
         */
        LOCAL,
        
        /**
         * AList 远程存储
         */
        ALIST
    }

    /**
     * 下载访问信息
     */
    sealed interface DownloadAccess {
        
        /**
         * 本地文件下载 - 通过本地文件路径直接流式返回
         */
        record LocalFile(Path filePath) implements DownloadAccess {}
        
        /**
         * 重定向下载 - 返回 302 跳转到指定 URL
         */
        record Redirect(String url) implements DownloadAccess {}
        
        /**
         * 文件不存在
         */
        record NotFound(String message) implements DownloadAccess {}
    }
}