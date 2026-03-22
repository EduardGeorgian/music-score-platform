const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand } = require("@aws-sdk/lib-dynamodb");

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.TABLE_NAME;
const BUCKET_NAME = process.env.BUCKET_NAME;
const DOWNLOAD_EXPIRATION = 3600; // 1 hour

exports.handler = async (event) => {
  try {
    const postId = event.pathParameters?.postId;
    const fileType = event.queryStringParameters?.type; // musicxml, midi, mp3

    if (!postId || !fileType) {
      return response(400, {
        error: "postId and type are required",
        validTypes: ["musicxml", "midi", "mp3"],
      });
    }

    // Verifică că postul există și e completed
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { postId },
      }),
    );

    if (!result.Item) {
      return response(404, { error: "Post not found" });
    }

    if (result.Item.status !== "completed") {
      return response(400, {
        error: "Post is not ready for download",
        status: result.Item.status,
      });
    }

    // Determină S3 key-ul bazat pe tip
    let s3Key;
    switch (fileType) {
      case "musicxml":
        s3Key = `processed/${postId}/score.musicxml`;
        break;
      case "midi":
        s3Key = `processed/${postId}/audio.mid`;
        break;
      case "mp3":
        s3Key = `processed/${postId}/audio.mp3`;
        break;
      default:
        return response(400, {
          error: "Invalid file type",
          validTypes: ["musicxml", "midi", "mp3"],
        });
    }

    // Generează presigned URL
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    });

    const downloadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: DOWNLOAD_EXPIRATION,
    });

    return response(200, {
      downloadUrl,
      fileType,
      expiresIn: DOWNLOAD_EXPIRATION,
      fileName: s3Key.split("/").pop(),
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
