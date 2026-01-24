-- Fix: Add AList file metadata columns to book_file table
-- This migration ensures the columns exist, using MariaDB's native IF NOT EXISTS syntax
-- Created to fix potential issues with V94 migration

-- Add alist_path column if it doesn't exist
ALTER TABLE book_file ADD COLUMN IF NOT EXISTS alist_path VARCHAR(1000) NULL;

-- Add alist_file_size column if it doesn't exist
ALTER TABLE book_file ADD COLUMN IF NOT EXISTS alist_file_size BIGINT NULL;

-- Add alist_modified_time column if it doesn't exist
ALTER TABLE book_file ADD COLUMN IF NOT EXISTS alist_modified_time VARCHAR(64) NULL;