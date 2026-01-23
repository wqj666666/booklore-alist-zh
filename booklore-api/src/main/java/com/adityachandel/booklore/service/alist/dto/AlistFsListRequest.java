package com.adityachandel.booklore.service.alist.dto;

import lombok.Builder;
import lombok.Data;

/**
 * AList 目录列表请求
 * 用于 /api/fs/list 接口
 */
@Data
@Builder
public class AlistFsListRequest {
    
    /**
     * 目录路径
     */
    private String path;
    
    /**
     * 目录密码（可选）
     */
    private String password;
    
    /**
     * 页码（从 1 开始）
     */
    private Integer page;
    
    /**
     * 每页数量
     */
    @Builder.Default
    private Integer perPage = 0; // 0 表示获取所有
    
    /**
     * 是否刷新缓存
     */
    private Boolean refresh;
}