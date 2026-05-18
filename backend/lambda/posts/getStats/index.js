// backend/lambda/posts/getStats/index.js
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
    const userId = event.requestContext?.authorizer?.claims?.sub;

    if (!userId) {
      return response(401, { error: "Unauthorized" });
    }

    let total = 0;
    let completed = 0;
    let processing = 0;

    let lastKey;

    // Folosim un loop do-while în caz că utilizatorul are peste 1MB de date
    do {
      const params = {
        TableName: TABLE_NAME,
        IndexName: "userId-createdAt-index",
        KeyConditionExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":userId": userId,
        },
        // Secretul vitezei: aducem DOAR coloana "status", ignorăm restul!
        ProjectionExpression: "#status",
        ExpressionAttributeNames: {
          "#status": "status",
        },
      };

      if (lastKey) {
        params.ExclusiveStartKey = lastKey;
      }

      const result = await docClient.send(new QueryCommand(params));

      // Numărăm rezultatele
      for (const item of result.Items) {
        total++;
        if (item.status === "completed") completed++;
        if (item.status === "processing" || item.status === "pending")
          processing++;
      }

      lastKey = result.LastEvaluatedKey;
    } while (lastKey);

    return response(200, { total, completed, processing });
  } catch (error) {
    console.error("Error fetching stats:", error);
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
