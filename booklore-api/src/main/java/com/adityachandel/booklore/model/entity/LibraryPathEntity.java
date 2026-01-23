package com.adityachandel.booklore.model.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "library_path")
public class LibraryPathEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "library_id", nullable = false)
    private LibraryEntity library;

    @Column(nullable = false)
    private String path;

    /**
     * 是否启用 AList 存储
     * 当启用时，新上传的文件将存储到 AList
     */
    @Column(name = "alist_enabled", nullable = false)
    @Builder.Default
    private boolean alistEnabled = false;

    /**
     * AList 存储路径
     * 对应 AList 中的目录路径，例如 /books/library1
     */
    @Column(name = "alist_path", length = 1000)
    private String alistPath;
}
