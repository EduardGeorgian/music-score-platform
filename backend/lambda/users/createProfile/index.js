import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
  try {
    // Extract userId and email from JWT (Cognito Authorizer)
    const userId = event.requestContext?.authorizer?.claims?.sub;
    const email = event.requestContext?.authorizer?.claims?.email;

    if (!userId || !email) {
      return {
        statusCode: 401,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": true,
        },
        body: JSON.stringify({
          message: "Unauthorized - Missing user credentials",
        }),
      };
    }

    // Parse body for optional fields
    const body = JSON.parse(event.body || "{}");
    const { name, displayName } = body;

    // Prepare DynamoDB item
    const params = {
      TableName: TABLE_NAME,
      Item: {
        userId: userId, // From JWT (Cognito sub)
        email: email, // From JWT
        name: name || displayName || "User Nou",
        displayName: displayName || name || "User Nou",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        followers: 0,
        following: 0,
      },
    };

    // Write to DynamoDB
    await docClient.send(new PutCommand(params));

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({
        message: "Profil creat cu succes!",
        userId: userId,
      }),
    };
  } catch (err) {
    console.error("Error creating profile:", err);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({
        message: "Eroare interna",
        error: err.message,
      }),
    };
  }
};
