package com.adityachandel.booklore.service.alist.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * AList 登录请求
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlistLoginRequest {
    
    private String username;
    
    private String password;
}