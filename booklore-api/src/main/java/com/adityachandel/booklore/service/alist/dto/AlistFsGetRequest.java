package com.adityachandel.booklore.service.alist.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * AList 获取文件信息请求
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlistFsGetRequest {
    
    /**
     * 文件或目录路径
     */
    private String path;
    
    /**
     * 目录密码（可选）
     */
    private String password;
}