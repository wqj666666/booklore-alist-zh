package com.adityachandel.booklore.service.alist.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * AList 创建目录请求
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlistMkdirRequest {
    
    /**
     * 目录路径
     */
    private String path;
}