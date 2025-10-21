const AWS = require("aws-sdk");
const crypto = require("crypto");
const path = require("path");

// Configure AWS
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || "us-east-1",
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

// Generate unique S3 key for file
const generateS3Key = (projectId, filePath, userId) => {
  const timestamp = Date.now();
  const hash = crypto
    .createHash("md5")
    .update(`${projectId}-${filePath}-${timestamp}`)
    .digest("hex");
  return `projects/${userId}/${projectId}/${hash}/${filePath}`;
};

// Upload file content to S3
const uploadFileToS3 = async (content, s3Key, mimeType = "text/plain") => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: content,
      ContentType: mimeType,
      ServerSideEncryption: "AES256",
    };

    const result = await s3.upload(params).promise();
    return {
      success: true,
      url: result.Location,
      etag: result.ETag,
      key: result.Key,
    };
  } catch (error) {
    console.error("S3 Upload Error:", error);
    throw new Error(`Failed to upload file to S3: ${error.message}`);
  }
};

// Download file content from S3
const downloadFileFromS3 = async (s3Key) => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
    };

    const result = await s3.getObject(params).promise();
    return {
      success: true,
      content: result.Body.toString(),
      contentType: result.ContentType,
      lastModified: result.LastModified,
      size: result.ContentLength,
    };
  } catch (error) {
    console.error("S3 Download Error:", error);
    if (error.code === "NoSuchKey") {
      throw new Error("File not found in S3");
    }
    throw new Error(`Failed to download file from S3: ${error.message}`);
  }
};

// Delete file from S3
const deleteFileFromS3 = async (s3Key) => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
    };

    await s3.deleteObject(params).promise();
    return { success: true };
  } catch (error) {
    console.error("S3 Delete Error:", error);
    throw new Error(`Failed to delete file from S3: ${error.message}`);
  }
};

// Delete multiple files from S3
const deleteMultipleFilesFromS3 = async (s3Keys) => {
  try {
    if (!s3Keys || s3Keys.length === 0) {
      return { success: true, deleted: [] };
    }

    const params = {
      Bucket: BUCKET_NAME,
      Delete: {
        Objects: s3Keys.map((key) => ({ Key: key })),
        Quiet: false,
      },
    };

    const result = await s3.deleteObjects(params).promise();
    return {
      success: true,
      deleted: result.Deleted,
      errors: result.Errors,
    };
  } catch (error) {
    console.error("S3 Bulk Delete Error:", error);
    throw new Error(`Failed to delete files from S3: ${error.message}`);
  }
};

// Copy file in S3
const copyFileInS3 = async (sourceKey, destinationKey) => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      CopySource: `${BUCKET_NAME}/${sourceKey}`,
      Key: destinationKey,
      ServerSideEncryption: "AES256",
    };

    const result = await s3.copyObject(params).promise();
    return {
      success: true,
      etag: result.ETag,
      key: destinationKey,
    };
  } catch (error) {
    console.error("S3 Copy Error:", error);
    throw new Error(`Failed to copy file in S3: ${error.message}`);
  }
};

// Move file in S3 (copy + delete)
const moveFileInS3 = async (sourceKey, destinationKey) => {
  try {
    // First copy the file
    await copyFileInS3(sourceKey, destinationKey);

    // Then delete the original
    await deleteFileFromS3(sourceKey);

    return { success: true, newKey: destinationKey };
  } catch (error) {
    console.error("S3 Move Error:", error);
    throw new Error(`Failed to move file in S3: ${error.message}`);
  }
};

// Check if file exists in S3
const fileExistsInS3 = async (s3Key) => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
    };

    await s3.headObject(params).promise();
    return true;
  } catch (error) {
    if (error.code === "NotFound") {
      return false;
    }
    throw error;
  }
};

// Get file metadata from S3
const getFileMetadataFromS3 = async (s3Key) => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
    };

    const result = await s3.headObject(params).promise();
    return {
      success: true,
      size: result.ContentLength,
      lastModified: result.LastModified,
      contentType: result.ContentType,
      etag: result.ETag,
    };
  } catch (error) {
    console.error("S3 Metadata Error:", error);
    if (error.code === "NotFound") {
      throw new Error("File not found in S3");
    }
    throw new Error(`Failed to get file metadata from S3: ${error.message}`);
  }
};

// Generate presigned URL for direct upload
const generatePresignedUploadUrl = async (
  s3Key,
  mimeType = "text/plain",
  expiresIn = 3600
) => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      ContentType: mimeType,
      Expires: expiresIn,
    };

    const url = await s3.getSignedUrlPromise("putObject", params);
    return {
      success: true,
      uploadUrl: url,
      key: s3Key,
    };
  } catch (error) {
    console.error("S3 Presigned URL Error:", error);
    throw new Error(`Failed to generate presigned URL: ${error.message}`);
  }
};

// Generate presigned URL for direct download
const generatePresignedDownloadUrl = async (s3Key, expiresIn = 3600) => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Expires: expiresIn,
    };

    const url = await s3.getSignedUrlPromise("getObject", params);
    return {
      success: true,
      downloadUrl: url,
    };
  } catch (error) {
    console.error("S3 Presigned Download URL Error:", error);
    throw new Error(
      `Failed to generate presigned download URL: ${error.message}`
    );
  }
};

// List all files in a project folder
const listProjectFiles = async (userId, projectId) => {
  try {
    const prefix = `projects/${userId}/${projectId}/`;
    const params = {
      Bucket: BUCKET_NAME,
      Prefix: prefix,
    };

    const result = await s3.listObjectsV2(params).promise();
    return {
      success: true,
      files: result.Contents.map((file) => ({
        key: file.Key,
        size: file.Size,
        lastModified: file.LastModified,
        etag: file.ETag,
      })),
    };
  } catch (error) {
    console.error("S3 List Files Error:", error);
    throw new Error(`Failed to list project files: ${error.message}`);
  }
};

// Clean up orphaned files (files in S3 but not in database)
const cleanupOrphanedFiles = async (userId, projectId, validS3Keys) => {
  try {
    const projectFiles = await listProjectFiles(userId, projectId);

    if (!projectFiles.success) {
      throw new Error("Failed to list project files");
    }

    const orphanedKeys = projectFiles.files
      .map((file) => file.key)
      .filter((key) => !validS3Keys.includes(key));

    if (orphanedKeys.length > 0) {
      await deleteMultipleFilesFromS3(orphanedKeys);
      return {
        success: true,
        deletedCount: orphanedKeys.length,
        deletedKeys: orphanedKeys,
      };
    }

    return {
      success: true,
      deletedCount: 0,
      deletedKeys: [],
    };
  } catch (error) {
    console.error("S3 Cleanup Error:", error);
    throw new Error(`Failed to cleanup orphaned files: ${error.message}`);
  }
};

module.exports = {
  generateS3Key,
  uploadFileToS3,
  downloadFileFromS3,
  deleteFileFromS3,
  deleteMultipleFilesFromS3,
  copyFileInS3,
  moveFileInS3,
  fileExistsInS3,
  getFileMetadataFromS3,
  generatePresignedUploadUrl,
  generatePresignedDownloadUrl,
  listProjectFiles,
  cleanupOrphanedFiles,
};
