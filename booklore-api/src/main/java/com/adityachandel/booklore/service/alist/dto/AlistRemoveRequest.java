package com.adityachandel.booklore.service.alist.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * AList 删除文件/目录请求
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlistRemoveRequest {
    
    /**
     * 目录路径
     */
    private String dir;
    
    /**
     * 要删除的文件名列表
     */
    private List<String> names;
}