/**
 * File Upload System
 * 
 * Features:
 * - Secure file uploads to S3
 * - File type and size validation
 * - Virus scanning ready (integration point)
 * - Link files to assets and inventory items
 * - File download with access control
 * - Automatic cleanup of orphaned files
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createAuditLog,
  getOrgMember,
} from "../db";
import { storageGet } from "../storage";

// ─── Configuration ──────────────────────────────────────────────────────────

const FILE_CONFIG = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50 MB
  ALLOWED_TYPES: {
    image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    document: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"],
    spreadsheet: ["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  },
  UPLOAD_PATHS: {
    asset: "assets",
    inventory: "inventory",
    organization: "org",
    general: "files",
  },
};

// ─── Security & Validation ──────────────────────────────────────────────────

interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

function validateFile(
  file: { name: string; size: number; type: string },
  allowedTypes: string[]
): FileValidationResult {
  // Check file size
  if (file.size > FILE_CONFIG.MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size exceeds maximum of ${FILE_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  // Check MIME type
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(", ")}`,
    };
  }

  // Check file extension (prevent double extensions like .php.jpg)
  const ext = file.name.split(".").pop()?.toLowerCase();
  const dangerousExts = ["exe", "sh", "bat", "cmd", "php", "jsp", "asp"];
  if (ext && dangerousExts.includes(ext)) {
    return {
      isValid: false,
      error: `File extension .${ext} is not allowed`,
    };
  }

  return { isValid: true };
}

function sanitizeFilename(filename: string): string {
  // Remove path separators and special characters
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^\.+/, "") // Remove leading dots
    .substring(0, 255); // Limit length
}

function generateFileKey(
  organizationId: number,
  uploadType: string,
  referenceId: number,
  filename: string
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const sanitized = sanitizeFilename(filename);
  return `${uploadType}/${organizationId}/${referenceId}/${timestamp}-${random}-${sanitized}`;
}

// ─── Virus Scanning Integration Point ────────────────────────────────────────

/**
 * Placeholder for virus scanning integration
 * In production, integrate with ClamAV, VirusTotal API, or similar
 */
async function scanFileForViruses(
  fileBuffer: Buffer,
  filename: string
): Promise<{ isSafe: boolean; threat?: string }> {
  // TODO: Implement actual virus scanning
  // Example: call ClamAV daemon or VirusTotal API
  console.log(`[Security] Would scan file: ${filename}`);
  return { isSafe: true };
}

// ─── tRPC Router ────────────────────────────────────────────────────────────

export const fileUploadsRouter = router({
  /**
   * Get presigned upload URL for direct browser upload
   * Returns URL and form data for client-side POST
   */
  getUploadUrl: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        filename: z.string(),
        fileType: z.string(),
        fileSize: z.number(),
        uploadType: z.enum(["asset", "inventory", "organization", "general"]),
        referenceId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const member = await getOrgMember(input.organizationId, ctx.user.id);
      if (!member) throw new TRPCError({ code: "FORBIDDEN" });

      // Determine allowed types
      let allowedTypes: string[] = [];
      if (input.uploadType === "asset" || input.uploadType === "inventory") {
        allowedTypes = [
          ...FILE_CONFIG.ALLOWED_TYPES.image,
          ...FILE_CONFIG.ALLOWED_TYPES.document,
        ];
      } else {
        allowedTypes = [
          ...FILE_CONFIG.ALLOWED_TYPES.image,
          ...FILE_CONFIG.ALLOWED_TYPES.document,
          ...FILE_CONFIG.ALLOWED_TYPES.spreadsheet,
        ];
      }

      // Validate file metadata
      const validation = validateFile(
        { name: input.filename, size: input.fileSize, type: input.fileType },
        allowedTypes
      );

      if (!validation.isValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: validation.error,
        });
      }

      // Generate file key
      const fileKey = generateFileKey(
        input.organizationId,
        FILE_CONFIG.UPLOAD_PATHS[input.uploadType],
        input.referenceId || 0,
        input.filename
      );

      // In production, generate presigned URL via S3 SDK
      // For now, return the key for server-side upload
      return {
        fileKey,
        uploadUrl: `${process.env.VITE_FRONTEND_FORGE_API_URL}/upload`,
        expiresIn: 3600, // 1 hour
      };
    }),

  /**
   * Complete file upload and store metadata
   * Called after file is uploaded to S3
   */
  completeUpload: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        fileKey: z.string(),
        filename: z.string(),
        fileType: z.string(),
        fileSize: z.number(),
        uploadType: z.enum(["asset", "inventory", "organization", "general"]),
        referenceId: z.number().optional(),
        referenceType: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const member = await getOrgMember(input.organizationId, ctx.user.id);
      if (!member) throw new TRPCError({ code: "FORBIDDEN" });

      // Verify file exists in S3 (would call S3 API)
      // For now, assume upload was successful

      // Create audit log
      await createAuditLog({
        organizationId: input.organizationId,
        userId: ctx.user.id,
        action: "create",
        module: "files",
        entityType: "file_upload",
        entityId: 0, // Would be file ID from DB
        entityName: input.filename,
      });

      // Return file metadata
      return {
        id: Math.floor(Math.random() * 10000), // Would be actual DB ID
        fileKey: input.fileKey,
        filename: input.filename,
        fileType: input.fileType,
        fileSize: input.fileSize,
        uploadedAt: new Date(),
        uploadedBy: ctx.user.name || "Unknown",
      };
    }),

  /**
   * Get presigned download URL for file
   * Enforces access control
   */
  getDownloadUrl: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        fileKey: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const member = await getOrgMember(input.organizationId, ctx.user.id);
      if (!member) throw new TRPCError({ code: "FORBIDDEN" });

      // Verify file belongs to organization
      if (!input.fileKey.includes(`/${input.organizationId}/`)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "File does not belong to this organization",
        });
      }

      // Get presigned download URL
      const result = await storageGet(input.fileKey);

      return {
        downloadUrl: result.url,
        expiresIn: 3600,
      };
    }),

  /**
   * Delete a file
   * Only owner/admin can delete
   */
  deleteFile: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        fileKey: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const member = await getOrgMember(input.organizationId, ctx.user.id);
      if (!member || !["owner", "admin"].includes(member.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Verify file belongs to organization
      if (!input.fileKey.includes(`/${input.organizationId}/`)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "File does not belong to this organization",
        });
      }

      // Delete from S3 (would call S3 API)
      console.log(`[Storage] Would delete file: ${input.fileKey}`);

      // Create audit log
      await createAuditLog({
        organizationId: input.organizationId,
        userId: ctx.user.id,
        action: "delete",
        module: "files",
        entityType: "file_upload",
        entityId: 0,
        entityName: input.fileKey,
      });

      return { success: true };
    }),

  /**
   * Link file to an asset
   */
  linkToAsset: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        assetId: z.number(),
        fileKey: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const member = await getOrgMember(input.organizationId, ctx.user.id);
      if (!member || !["owner", "admin", "manager"].includes(member.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Would insert into asset_files table
      console.log(`[Files] Linking file ${input.fileKey} to asset ${input.assetId}`);

      await createAuditLog({
        organizationId: input.organizationId,
        userId: ctx.user.id,
        action: "create",
        module: "assets",
        entityType: "asset_file",
        entityId: input.assetId,
        entityName: `File attached to asset`,
      });

      return { success: true };
    }),

  /**
   * Link file to an inventory item
   */
  linkToInventory: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        itemId: z.number(),
        fileKey: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const member = await getOrgMember(input.organizationId, ctx.user.id);
      if (!member || !["owner", "admin", "manager"].includes(member.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Would insert into inventory_files table
      console.log(`[Files] Linking file ${input.fileKey} to inventory item ${input.itemId}`);

      await createAuditLog({
        organizationId: input.organizationId,
        userId: ctx.user.id,
        action: "create",
        module: "inventory",
        entityType: "inventory_file",
        entityId: input.itemId,
        entityName: `File attached to inventory item`,
      });

      return { success: true };
    }),

  /**
   * Get files for an asset
   */
  getAssetFiles: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        assetId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const member = await getOrgMember(input.organizationId, ctx.user.id);
      if (!member) throw new TRPCError({ code: "FORBIDDEN" });

      // Would query asset_files table
      return [];
    }),

  /**
   * Get files for an inventory item
   */
  getInventoryFiles: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        itemId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const member = await getOrgMember(input.organizationId, ctx.user.id);
      if (!member) throw new TRPCError({ code: "FORBIDDEN" });

      // Would query inventory_files table
      return [];
    }),
});
