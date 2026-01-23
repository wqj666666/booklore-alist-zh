package com.adityachandel.booklore.service.alist.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

/**
 * AList 文件/目录信息
 */
@Data
public class AlistFileInfo {
    
    /**
     * 文件名
     */
    private String name;
    
    /**
     * 文件大小（字节）
     */
    private Long size;
    
    /**
     * 是否是目录
     */
    @JsonProperty("is_dir")
    private boolean isDir;
    
    /**
     * 修改时间
     */
    private String modified;
    
    /**
     * 创建时间
     */
    private String created;
    
    /**
     * 签名
     */
    private String sign;
    
    /**
     * 缩略图 URL
     */
    private String thumb;
    
    /**
     * 文件类型
     */
    private Integer type;
    
    /**
     * 原始下载 URL（直链）
     */
    @JsonProperty("raw_url")
    private String rawUrl;
    
    /**
     * 说明
     */
    private String readme;
    
    /**
     * 存储提供者
     */
    private String provider;
}