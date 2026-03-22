const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  DeleteCommand,
  GetCommand,
} = require("@aws-sdk/lib-dynamodb");
const {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} = require("@aws-sdk/client-s3");

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({ region: process.env.AWS_REGION });

const TABLE_NAME = process.env.TABLE_NAME;
const BUCKET_NAME = process.env.BUCKET_NAME;

exports.handler = async (event) => {
  try {
    const postId = event.pathParameters?.postId;

    if (!postId) {
      return response(400, { error: "postId is required" });
    }

    // Verifică că postul există
    const getResult = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { postId },
      }),
    );

    if (!getResult.Item) {
      return response(404, { error: "Post not found" });
    }

    // Șterge fișierele din S3 (uploads + processed)
    await deleteS3Files(postId);

    // Șterge din DynamoDB
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { postId },
      }),
    );

    return response(200, {
      message: "Post deleted successfully",
      postId,
    });
  } catch (error) {
    console.error("Error:", error);
    return response(500, {
      error: "Internal server error",
      message: error.message,
    });
  }
};

async function deleteS3Files(postId) {
  const prefixes = [`uploads/${postId}/`, `processed/${postId}/`];

  for (const prefix of prefixes) {
    // List objects
    const listResult = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: prefix,
      }),
    );

    if (listResult.Contents && listResult.Contents.length > 0) {
      // Delete objects
      await s3Client.send(
        new DeleteObjectsCommand({
          Bucket: BUCKET_NAME,
          Delete: {
            Objects: listResult.Contents.map((obj) => ({ Key: obj.Key })),
          },
        }),
      );
    }
  }
}

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
