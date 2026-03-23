const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
  try {
    // Extract userId from JWT (Cognito Authorizer puts it in requestContext)
    const userId = event.requestContext.authorizer.claims.sub;

    if (!userId) {
      return response(401, { error: "Unauthorized - No user ID in token" });
    }

    // Query parameters
    const params = event.queryStringParameters || {};
    const limit = parseInt(params.limit || "20", 10);
    const lastKey = params.lastKey
      ? JSON.parse(decodeURIComponent(params.lastKey))
      : undefined;

    // Query DynamoDB using GSI
    const queryParams = {
      TableName: TABLE_NAME,
      IndexName: "userId-createdAt-index",
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId,
      },
      ScanIndexForward: false, // Sort descending (newest first)
      Limit: limit,
    };

    if (lastKey) {
      queryParams.ExclusiveStartKey = lastKey;
    }

    const result = await docClient.send(new QueryCommand(queryParams));

    const responseData = {
      posts: result.Items || [],
      count: result.Items?.length || 0,
    };

    if (result.LastEvaluatedKey) {
      responseData.lastKey = encodeURIComponent(
        JSON.stringify(result.LastEvaluatedKey),
      );
      responseData.hasMore = true;
    } else {
      responseData.hasMore = false;
    }

    return response(200, responseData);
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
