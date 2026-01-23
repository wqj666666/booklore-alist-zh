package com.adityachandel.booklore.model.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

@Builder
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class LibraryPath {
    private Long id;
    private Long libraryId;
    private String path;
    
    /**
     * 是否启用 AList 存储
     */
    private Boolean alistEnabled;
    
    /**
     * AList 存储路径
     */
    private String alistPath;
}
