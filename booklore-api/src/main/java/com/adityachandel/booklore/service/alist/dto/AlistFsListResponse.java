package com.adityachandel.booklore.service.alist.dto;

import lombok.Data;
import java.util.List;

/**
 * AList 目录列表响应
 * 用于 /api/fs/list 接口的响应数据
 */
@Data
public class AlistFsListResponse {
    
    /**
     * 目录内容列表
     */
    private List<AlistFileInfo> content;
    
    /**
     * 总数
     */
    private Integer total;
    
    /**
     * 目录说明
     */
    private String readme;
    
    /**
     * 是否可写
     */
    private Boolean write;
    
    /**
     * 存储提供者
     */
    private String provider;
}