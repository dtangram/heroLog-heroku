import { Router, Request, Response, NextFunction } from 'express';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface SignS3RequestBody {
  fileName: string;
  fileType: string;
}

interface SignS3SuccessResponse {
  success: true;
  data: {
    signedRequest: string;
    url: string;
  };
  timestamp: string;
}

interface SignS3ErrorResponse {
  success: false;
  error: string;
  timestamp: string;
}

interface StringValidationResult {
  isValid: boolean;
  value?: string;
  error?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const ENV = {
  s3BucketName: process.env.S3_BUCKET || '',
  awsRegion: process.env.AWS_REGION || 'us-east-2',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  signedUrlExpiration: 500, // seconds
};

// ============================================================================
// AWS S3 CLIENT
// ============================================================================

const s3Client = new S3Client({
  region: ENV.awsRegion,
  credentials: {
    accessKeyId: ENV.awsAccessKeyId,
    secretAccessKey: ENV.awsSecretAccessKey,
  },
});

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

const validateS3Config = (): StringValidationResult => {
  if (!ENV.s3BucketName) {
    return {
      isValid: false,
      error: 'S3_BUCKET is not configured'
    };
  }

  if (!ENV.awsAccessKeyId || !ENV.awsSecretAccessKey) {
    return {
      isValid: false,
      error: 'AWS credentials are not configured'
    };
  }

  return {
    isValid: true,
    value: ENV.s3BucketName
  };
};

const validateFileName = (
  fileName: string | undefined | null
): StringValidationResult => {
  if (!fileName || typeof fileName !== 'string' || !fileName.trim()) {
    return {
      isValid: false,
      error: 'File name is required'
    };
  }

  // Sanitize filename - remove path traversal attempts
  const sanitized = fileName.replace(/\.\./g, '').replace(/^\/+/, '');

  if (!sanitized) {
    return {
      isValid: false,
      error: 'Invalid file name'
    };
  }

  return {
    isValid: true,
    value: sanitized
  };
};

const validateFileType = (
  fileType: string | undefined | null
): StringValidationResult => {
  if (!fileType || typeof fileType !== 'string' || !fileType.trim()) {
    return {
      isValid: false,
      error: 'File type is required'
    };
  }

  // Validate MIME type format
  const mimeTypeRegex = /^[a-z]+\/[a-z0-9\-\+\.]+$/i;

  if (!mimeTypeRegex.test(fileType)) {
    return {
      isValid: false,
      error: 'Invalid file type format'
    };
  }

  return {
    isValid: true,
    value: fileType
  };
};

// ============================================================================
// S3 OPERATIONS
// ============================================================================

const generateSignedUrl = async (
  bucketName: string,
  fileName: string,
  fileType: string
): Promise<{ signedRequest: string; url: string }> => {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileName,
    ContentType: fileType,
    ACL: 'public-read',
  });

  const signedRequest = await getSignedUrl(s3Client, command, {
    expiresIn: ENV.signedUrlExpiration,
  });

  const url = `https://${bucketName}.s3.${ENV.awsRegion}.amazonaws.com/${fileName}`;

  return { signedRequest, url };
};

// ============================================================================
// RESPONSE BUILDERS
// ============================================================================

const buildSuccessResponse = (
  signedRequest: string,
  url: string
): SignS3SuccessResponse => ({
  success: true,
  data: {
    signedRequest,
    url
  },
  timestamp: new Date().toISOString()
});

const buildErrorResponse = (error: string): SignS3ErrorResponse => ({
  success: false,
  error,
  timestamp: new Date().toISOString()
});

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

const signS3Handler = async (
  req: Request<Record<string, never>, SignS3SuccessResponse | SignS3ErrorResponse, SignS3RequestBody>,
  res: Response<SignS3SuccessResponse | SignS3ErrorResponse>,
  _next: NextFunction
): Promise<void> => {
  try {
    // Destructure request body
    const { fileName, fileType } = req.body;

    // Validate S3 configuration
    const configValidation = validateS3Config();

    if (!configValidation.isValid) {
      res.status(500).json(buildErrorResponse(configValidation.error!));
      return;
    }

    // Validate file name
    const fileNameValidation = validateFileName(fileName);

    if (!fileNameValidation.isValid) {
      res.status(400).json(buildErrorResponse(fileNameValidation.error!));
      return;
    }

    // Validate file type
    const fileTypeValidation = validateFileType(fileType);

    if (!fileTypeValidation.isValid) {
      res.status(400).json(buildErrorResponse(fileTypeValidation.error!));
      return;
    }

    // Generate signed URL
    const { signedRequest, url } = await generateSignedUrl(
      configValidation.value!,
      fileNameValidation.value!,
      fileTypeValidation.value!
    );

    // Send success response
    res.status(200).json(buildSuccessResponse(signedRequest, url));

  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : 'Failed to generate signed URL';

    res.status(500).json(buildErrorResponse(errorMessage));
  }
};

// ============================================================================
// ROUTER CONFIGURATION
// ============================================================================

const router = Router();

// POST /s3/sign
// Generate a signed URL for S3 file upload
router.post('/sign', signS3Handler);

// In your s3upload.ts router, add:
router.get('/test', async (_req, res) => {
  try {
    const { S3Client, ListBucketsCommand } = await import('@aws-sdk/client-s3');
    
    const client = new S3Client({
      region: ENV.awsRegion,
      credentials: {
        accessKeyId: ENV.awsAccessKeyId,
        secretAccessKey: ENV.awsSecretAccessKey,
      },
    });

    const command = new ListBucketsCommand({});
    const response = await client.send(command);

    res.json({
      success: true,
      message: 'AWS credentials are valid',
      buckets: response.Buckets?.map(b => b.Name),
      config: {
        region: ENV.awsRegion,
        bucket: ENV.s3BucketName,
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// EXPORTS
// ============================================================================

export default router;