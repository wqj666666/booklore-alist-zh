package com.adityachandel.booklore.service.file;

import java.io.IOException;
import java.io.RandomAccessFile;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

public class FileFingerprint {

    /**
     * 为本地文件生成部分 MD5 哈希
     * @param filePath 本地文件路径
     * @return MD5 哈希字符串
     */
    public static String generateHash(Path filePath) {
        final long base = 1024L;
        final int blockSize = 1024;

        try (RandomAccessFile raf = new RandomAccessFile(filePath.toFile(), "r")) {
            MessageDigest md5 = MessageDigest.getInstance("MD5");
            byte[] buffer = new byte[blockSize];

            for (int i = -1; i <= 10; i++) {
                long position = base << (2 * i);
                if (position >= raf.length()) break;

                raf.seek(position);
                int read = raf.read(buffer);
                if (read > 0) {
                    md5.update(buffer, 0, read);
                }
            }

            byte[] hash = md5.digest();
            return bytesToHex(hash);

        } catch (IOException | NoSuchAlgorithmException e) {
            throw new RuntimeException("Failed to compute partial MD5 hash for: " + filePath, e);
        }
    }

    /**
     * 为远程文件（如 AList）生成虚拟哈希
     * 基于文件路径、大小和修改时间生成，不需要下载文件内容
     *
     * @param filePath 文件的完整路径（AList 路径）
     * @param fileSize 文件大小（字节）
     * @param modifiedTime 文件修改时间（ISO 8601 格式字符串）
     * @return MD5 哈希字符串
     */
    public static String generateVirtualHash(String filePath, Long fileSize, String modifiedTime) {
        try {
            MessageDigest md5 = MessageDigest.getInstance("MD5");
            
            // 组合文件元数据创建唯一标识
            StringBuilder sb = new StringBuilder();
            sb.append("alist://");
            sb.append(filePath != null ? filePath : "");
            sb.append("|size:");
            sb.append(fileSize != null ? fileSize : 0);
            sb.append("|modified:");
            sb.append(modifiedTime != null ? modifiedTime : "");
            
            md5.update(sb.toString().getBytes(StandardCharsets.UTF_8));
            byte[] hash = md5.digest();
            return bytesToHex(hash);

        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("Failed to compute virtual hash for: " + filePath, e);
        }
    }

    /**
     * 将字节数组转换为十六进制字符串
     */
    private static String bytesToHex(byte[] bytes) {
        StringBuilder result = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            result.append(String.format("%02x", b));
        }
        return result.toString();
    }
}
