const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const crypto = require("crypto");

// Configurare AWS clients
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({ region: process.env.AWS_REGION });

const TABLE_NAME = process.env.TABLE_NAME;
const BUCKET_NAME = process.env.BUCKET_NAME;
const UPLOAD_EXPIRATION = 300; // 5 minute

exports.handler = async (event) => {
  try {
    // 1. Verificare Auth
    const userId = event.requestContext?.authorizer?.claims?.sub;
    if (!userId) {
      return response(401, { error: "Unauthorized - No user ID in token" });
    }

    // 2. Parsare Body
    const body = JSON.parse(event.body);
    const { title, description, postType, content, fileName, contentType } =
      body;

    if (!title || !postType) {
      return response(400, {
        error: "title and postType are required",
        validTypes: ["score", "text", "image", "video"],
      });
    }

    const postId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    // Aflăm extensia reală a fișierului (dacă există)
    let fileExt = "jpg";
    if (fileName) {
      fileExt = fileName.split(".").pop().toLowerCase();
    }

    // 3. Creare Item pentru baza de date
    const item = {
      postId,
      userId,
      postType,
      title,
      description: description || "",
      content: content || null,
      // Score-urile merg în "pending" pentru procesare, imaginile și textele sunt gata instant "completed"
      status: postType === "score" ? "pending" : "completed",
      fileExt: fileExt, // Salvăm extensia pentru download/preview
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    // 4. Salvare în DynamoDB
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
      }),
    );

    // 5. Generare URL S3 pentru upload
    if (postType === "score" || postType === "image" || postType === "video") {
      let folder = postType === "score" ? "uploads" : "media";
      let baseName =
        postType === "score"
          ? "score"
          : postType === "image"
            ? "image"
            : "video";

      const uploadKey = `${folder}/${postId}/${baseName}.${fileExt}`;
      const mimeType = contentType || "application/octet-stream";

      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: uploadKey,
        ContentType: mimeType,
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

    // Pentru postările tip text
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
