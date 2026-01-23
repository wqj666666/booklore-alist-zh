package com.adityachandel.booklore.service.alist;

/**
 * AList 操作异常
 */
public class AlistException extends RuntimeException {
    
    private final int code;
    
    public AlistException(String message) {
        super(message);
        this.code = -1;
    }
    
    public AlistException(int code, String message) {
        super(message);
        this.code = code;
    }
    
    public AlistException(String message, Throwable cause) {
        super(message, cause);
        this.code = -1;
    }
    
    public int getCode() {
        return code;
    }
    
    /**
     * 判断是否是认证错误
     */
    public boolean isAuthError() {
        return code == 401 || code == 403;
    }
    
    /**
     * 判断是否是文件不存在错误
     */
    public boolean isNotFound() {
        return code == 500 && getMessage() != null && getMessage().contains("object not found");
    }
}