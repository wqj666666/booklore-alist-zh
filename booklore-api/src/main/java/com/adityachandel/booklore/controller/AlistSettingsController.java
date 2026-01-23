package com.adityachandel.booklore.controller;

import com.adityachandel.booklore.model.dto.AlistSettingsDto;
import com.adityachandel.booklore.service.alist.AlistClient;
import com.adityachandel.booklore.service.alist.AlistSettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for AList storage settings.
 * Provides endpoints for managing AList configuration stored in the database.
 */
@Tag(name = "AList Settings", description = "Endpoints for managing AList storage configuration")
@AllArgsConstructor
@RestController
@RequestMapping("/api/settings/alist")
public class AlistSettingsController {

    private final AlistSettingsService alistSettingsService;
    private final AlistClient alistClient;

    @Operation(summary = "Get AList settings", description = "Retrieve current AList storage configuration.")
    @ApiResponse(responseCode = "200", description = "AList settings returned successfully")
    @GetMapping
    public ResponseEntity<AlistSettingsDto> getSettings() {
        return ResponseEntity.ok(alistSettingsService.getSettings());
    }

    @Operation(summary = "Update AList settings", description = "Update AList storage configuration.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Settings updated successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid request")
    })
    @PutMapping
    public ResponseEntity<AlistSettingsDto> updateSettings(@RequestBody AlistSettingsDto settings) {
        return ResponseEntity.ok(alistSettingsService.updateSettings(settings));
    }

    @Operation(summary = "Test AList connection", description = "Test connection to AList server with provided settings.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Connection test completed"),
        @ApiResponse(responseCode = "400", description = "Invalid request")
    })
    @PostMapping("/test")
    public ResponseEntity<TestConnectionResponse> testConnection(@RequestBody AlistSettingsDto settings) {
        AlistSettingsService.AlistTestResult result = alistSettingsService.testConnection(settings);
        return ResponseEntity.ok(new TestConnectionResponse(result.success(), result.message()));
    }

    @Operation(summary = "Browse AList directories", description = "List directories at a given path on the configured AList server. Requires admin or library manipulation permission.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Directories listed successfully"),
        @ApiResponse(responseCode = "400", description = "AList not enabled or invalid path"),
        @ApiResponse(responseCode = "500", description = "Failed to connect to AList server")
    })
    @GetMapping("/browse")
    @PreAuthorize("@securityUtil.canManageLibrary() or @securityUtil.isAdmin()")
    public ResponseEntity<List<String>> browseDirectories(
            @Parameter(description = "Path to list directories at") @RequestParam(defaultValue = "/") String path) {
        // Check if AList is enabled
        AlistSettingsDto settings = alistSettingsService.getSettings();
        if (!settings.isEnabled()) {
            return ResponseEntity.badRequest().build();
        }
        
        List<String> directories = alistClient.listDirectories(path);
        return ResponseEntity.ok(directories);
    }

    @Operation(summary = "Check if AList is enabled", description = "Returns whether AList storage is enabled.")
    @ApiResponse(responseCode = "200", description = "Status returned successfully")
    @GetMapping("/status")
    public ResponseEntity<AlistStatusResponse> getStatus() {
        AlistSettingsDto settings = alistSettingsService.getSettings();
        return ResponseEntity.ok(new AlistStatusResponse(settings.isEnabled()));
    }

    /**
     * Response for connection test endpoint
     */
    public record TestConnectionResponse(boolean success, String message) {}

    /**
     * Response for AList status endpoint
     */
    public record AlistStatusResponse(boolean enabled) {}
}