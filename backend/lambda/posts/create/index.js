// createPost/index.js
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { randomUUID } = require("crypto");

// Configurare AWS clients
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({ region: process.env.AWS_REGION });

// Constante din environment
const TABLE_NAME = process.env.TABLE_NAME;
const BUCKET_NAME = process.env.BUCKET_NAME;
const UPLOAD_EXPIRATION = 300; // 5 minute

exports.handler = async (event) => {
  try {
    // Extract userId from JWT (Cognito Authorizer)
    const userId = event.requestContext?.authorizer?.claims?.sub;

    if (!userId) {
      return response(401, { error: "Unauthorized - No user ID in token" });
    }

    // Parse body
    const body = JSON.parse(event.body);
    const { title, description, postType, content } = body;

    // Validation
    if (!title || !postType) {
      return response(400, {
        error: "title and postType are required",
        validTypes: ["score", "text", "image", "video"],
      });
    }

    const postId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    // Create post item (userId comes from JWT, not body!)
    const item = {
      postId,
      userId,
      postType,
      title,
      description: description || "",
      content: content || null, // ← For text posts
      status: "pending",
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    if (postType === "score") {
      item.status = "pending";
    }

    // Save to DynamoDB
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
      }),
    );

    // Generate presigned URL ONLY for score/image/video
    if (postType === "score" || postType === "image" || postType === "video") {
      const fileExtension =
        postType === "score" ? "jpg" : postType === "image" ? "jpg" : "mp4";
      const folder = postType === "score" ? "uploads" : "media";
      const uploadKey = `${folder}/${postId}/score.${fileExtension}`;

      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: uploadKey,
        ContentType: postType === "video" ? "video/mp4" : "image/jpeg",
      });

      const uploadUrl = await getSignedUrl(s3Client, command, {
        expiresIn: UPLOAD_EXPIRATION,
      });

      return response(201, {
        postId,
        postType,
        uploadUrl,
        expiresIn: UPLOAD_EXPIRATION,
        message: `Post created. Upload your ${postType}.`,
      });
    }

    // For text posts - no upload needed
    return response(201, {
      postId,
      postType: "text",
      message: "Text post created successfully",
    });
  } catch (error) {
    console.error("Error:", error);
    return response(500, {
      error: "Internal server error",
      message: error.message,
    });
  }
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    },
    body: JSON.stringify(body),
  };
}
