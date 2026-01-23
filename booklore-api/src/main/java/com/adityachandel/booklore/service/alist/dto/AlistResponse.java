package com.adityachandel.booklore.service.alist.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

/**
 * AList API 通用响应结构
 */
@Data
public class AlistResponse<T> {
    
    /**
     * 状态码，200 表示成功
     */
    private int code;
    
    /**
     * 响应消息
     */
    private String message;
    
    /**
     * 响应数据
     */
    private T data;
    
    /**
     * 判断响应是否成功
     */
    public boolean isSuccess() {
        return code == 200;
    }
}