// getAll/index.js
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
  try {
    const params = event.queryStringParameters || {};
    const limit = parseInt(params.limit || "20", 10);
    const lastKey = params.lastKey
      ? JSON.parse(decodeURIComponent(params.lastKey))
      : undefined;
    const statusFilter = params.status; // Optional: completed, processing, pending, failed

    // Build scan parameters
    const scanParams = {
      TableName: TABLE_NAME,
      Limit: limit,
    };

    if (lastKey) {
      scanParams.ExclusiveStartKey = lastKey;
    }

    // Optional status filter
    if (statusFilter) {
      scanParams.FilterExpression = "#status = :status";
      scanParams.ExpressionAttributeNames = { "#status": "status" };
      scanParams.ExpressionAttributeValues = { ":status": statusFilter };
    }

    // Scan DynamoDB
    const result = await docClient.send(new ScanCommand(scanParams));

    // Sort by createdAt (descending - newest first)
    const posts = (result.Items || []).sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const response = {
      posts,
      count: posts.length,
    };

    // Add pagination token if there are more results
    if (result.LastEvaluatedKey) {
      response.lastKey = encodeURIComponent(
        JSON.stringify(result.LastEvaluatedKey),
      );
      response.hasMore = true;
    } else {
      response.hasMore = false;
    }

    return responseWithCors(200, response);
  } catch (error) {
    console.error("Error:", error);
    return responseWithCors(500, {
      error: "Internal server error",
      message: error.message,
    });
  }
};

function responseWithCors(statusCode, body) {
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
