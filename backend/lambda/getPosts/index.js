// getPosts/index.js
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");

// Configurare AWS client
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
  try {
    // Parse query parameters
    const params = event.queryStringParameters || {};
    const limit = parseInt(params.limit || "20", 10);
    const userId = params.userId; // Optional filter

    // Build scan parameters
    const scanParams = {
      TableName: TABLE_NAME,
      Limit: limit,
    };

    // Opțional: filtrare după userId
    if (userId) {
      scanParams.FilterExpression = "userId = :uid";
      scanParams.ExpressionAttributeValues = {
        ":uid": userId,
      };
    }

    // Scan DynamoDB
    const result = await docClient.send(new ScanCommand(scanParams));

    // Sortează după createdAt (descending - cele mai noi primele)
    const posts = (result.Items || []).sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return response(200, {
      posts,
      count: posts.length,
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
