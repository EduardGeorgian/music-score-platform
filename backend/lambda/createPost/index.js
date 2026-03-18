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
    // Parse request body
    const body = JSON.parse(event.body || "{}");

    // Validare input
    const { userId, title, description } = body;

    if (!userId) {
      return response(400, { error: "userId is required" });
    }

    // Generează postId unic
    const postId = randomUUID();
    const timestamp = new Date().toISOString();

    // Creează înregistrare în DynamoDB
    const item = {
      postId,
      userId,
      title: title || "Untitled",
      description: description || "",
      status: "pending", // pending -> processing -> completed/failed
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
      }),
    );

    // Generează Presigned URL pentru upload (PUT)
    const s3Key = `uploads/${postId}/score.jpg`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      ContentType: "image/jpeg",
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: UPLOAD_EXPIRATION,
    });

    // Response
    return response(201, {
      postId,
      uploadUrl,
      expiresIn: UPLOAD_EXPIRATION,
      message:
        "Post created successfully. Use PUT request to uploadUrl to upload the image.",
    });
  } catch (error) {
    console.error("Error:", error);
    return response(500, {
      error: "Internal server error",
      message: error.message,
    });
  }
};

// Helper function pentru response cu CORS
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
