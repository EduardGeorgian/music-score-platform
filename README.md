# 🎵 Music Score Platform

A cloud-native social platform for musicians that uses Optical Music Recognition (OMR) to convert sheet music images into playable digital formats.

## 📋 Overview

This platform allows musicians to:

- Upload photos of sheet music
- Automatically convert them to **MusicXML**, **MIDI**, and **MP3** formats
- Share their musical scores in a social feed
- Download and play processed music files

Built with a **serverless architecture** on AWS using Infrastructure as Code (CDK).

---

## 🏗️ Architecture

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │ HTTPS
       ▼
┌──────────────────┐
│   API Gateway    │
│   (REST API)     │
└────────┬─────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌─────────┐ ┌──────────┐
│ Lambda  │ │ Lambda   │
│Functions│ │Functions │
└────┬────┘ └─────┬────┘
     │            │
     ▼            ▼
┌──────────────────────┐      ┌─────────────┐
│     DynamoDB         │      │     S3      │
│   (Posts Table)      │      │  (Storage)  │
└──────────────────────┘      └──────┬──────┘
                                     │
                              ┌──────┴──────┐
                              │ S3 Event    │
                              │Notification │
                              └──────┬──────┘
                                     │
                              ┌──────▼──────┐
                              │     SQS     │
                              │   (Queue)   │
                              └──────┬──────┘
                                     │
                              ┌──────▼──────┐
                              │  EC2 Worker │
                              │ (OMR Engine)│
                              └─────────────┘
```

---

## 🛠️ Tech Stack

### **Backend**

- **AWS CDK** (TypeScript) - Infrastructure as Code
- **AWS Lambda** (Node.js 22.x) - Serverless functions
- **API Gateway** - REST API with CORS
- **DynamoDB** - NoSQL database
- **S3** - Object storage
- **SQS** - Message queue
- **EC2** - Worker instance for processing

### **Processing Pipeline**

- **Python 3.12** - Worker runtime
- **oemer** - Optical Music Recognition engine
- **ImageMagick** - Image preprocessing
- **music21** - MIDI generation
- **FluidSynth** - MIDI to audio rendering
- **FFmpeg** - Audio encoding (MP3)

### **Development Tools**

- **Git** - Version control
- **npm** - Package management
- **PowerShell** - Deployment scripts

---

## 📊 AWS Services Used

| Service         | Purpose                         | Configuration                          |
| --------------- | ------------------------------- | -------------------------------------- |
| **DynamoDB**    | Store post metadata             | PAY_PER_REQUEST, single table          |
| **S3**          | Store images & processed files  | Private bucket, event notifications    |
| **SQS**         | Decouple upload from processing | 15min visibility timeout, long polling |
| **Lambda**      | API endpoints (5 functions)     | Node.js 22.x, 128-256MB memory         |
| **API Gateway** | REST API                        | CORS enabled, throttling 100/200 req/s |
| **EC2**         | OMR processing worker           | t3.large, Ubuntu 24, systemd service   |

---

## 🔐 Authentication

This platform uses **AWS Cognito** for user authentication with **JWT tokens**.

### **Cognito Configuration**

- **User Pool ID:** `eu-north-1_fhcN3i17g`
- **Client ID:** `759j1q95dr8ddsgpdiu93pb0jt`
- **Region:** `eu-north-1`

### **Getting a JWT Token**

**1. Sign Up (Create User):**

```bash
aws cognito-idp sign-up \
  --client-id 759j1q95dr8ddsgpdiu93pb0jt \
  --username user@example.com \
  --password YourPassword123! \
  --user-attributes Name=email,Value=user@example.com
```

**2. Confirm User (if required):**

```bash
aws cognito-idp admin-confirm-sign-up \
  --user-pool-id eu-north-1_fhcN3i17g \
  --username user@example.com
```

**3. Login (Get Tokens):**

```bash
aws cognito-idp initiate-auth \
  --client-id 759j1q95dr8ddsgpdiu93pb0jt \
  --auth-flow USER_PASSWORD_AUTH \
  --auth-parameters USERNAME=user@example.com,PASSWORD=YourPassword123!
```

**Response includes:**

- `IdToken` - Use this for API authentication
- `AccessToken` - For Cognito API calls
- `RefreshToken` - To refresh expired tokens

### **Using JWT in API Calls**

Include the `IdToken` in the `Authorization` header:

```http
Authorization: Bearer eyJraWQiOiJ...your-id-token...
```

---

## 🔌 API Endpoints

**Base URL:** `https://tkl02rb5f2.execute-api.eu-north-1.amazonaws.com/prod`

### **Authentication Status:**

- 🔓 **Public** - No authentication required
- 🔐 **Protected** - Requires JWT token in Authorization header

---

### **1. Create Post** 🔐

**Authentication:** Required - JWT token must be in Authorization header

```http
POST /posts
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "title": "string",
  "description": "string"
}
```

**Note:** `userId` is automatically extracted from JWT token (no need to send it!)

**Response:**

```json
{
  "postId": "uuid",
  "uploadUrl": "presigned-s3-url",
  "expiresIn": 300,
  "message": "Post created successfully..."
}
```

---

### **2. Get All Posts (Feed)** 🔓

**Authentication:** Public - No token required

```http
GET /posts?limit=20&lastKey=...&status=completed
```

**Query Parameters:**

- `limit` (optional): Number of posts (default: 20)
- `lastKey` (optional): Pagination token
- `status` (optional): Filter by status (pending, processing, completed, failed)

**Response:**

```json
{
  "posts": [
    {
      "postId": "uuid",
      "userId": "string",
      "title": "string",
      "description": "string",
      "status": "completed",
      "musicxmlUrl": "s3://...",
      "midiUrl": "s3://...",
      "mp3Url": "s3://...",
      "createdAt": "ISO-8601",
      "updatedAt": "ISO-8601"
    }
  ],
  "count": 20,
  "hasMore": true,
  "lastKey": "pagination-token"
}
```

---

### **3. Get Post by ID** 🔓

**Authentication:** Public - No token required

```http
GET /posts/{postId}
```

**Response:**

```json
{
  "postId": "uuid",
  "userId": "string",
  "title": "string",
  "description": "string",
  "status": "completed",
  "musicxmlUrl": "s3://...",
  "midiUrl": "s3://...",
  "mp3Url": "s3://...",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

---

### **4. Get Download URL** 🔐

**Authentication:** Required - JWT token must be in Authorization header

```http
GET /posts/{postId}/download?type=musicxml
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**

- `type` (required): `musicxml`, `midi`, or `mp3`

**Response:**

```json
{
  "downloadUrl": "presigned-s3-url",
  "fileType": "musicxml",
  "expiresIn": 3600,
  "fileName": "score.musicxml"
}
```

---

### **5. Delete Post** 🔐

**Authentication:** Required - JWT token must be in Authorization header

**Authorization:** Only the post owner can delete their own posts

```http
DELETE /posts/{postId}
Authorization: Bearer <JWT_TOKEN>
```

**Response:**

```json
{
  "message": "Post deleted successfully",
  "postId": "uuid"
}
```

**Error Responses:**

- `401 Unauthorized` - No/invalid JWT token
- `403 Forbidden` - Not the post owner
- `404 Not Found` - Post doesn't exist

---

### **6. Get My Posts** 🔐 **NEW**

**Authentication:** Required - JWT token must be in Authorization header

Get all posts created by the authenticated user.

```http
GET /posts/my?limit=20&lastKey=...
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**

- `limit` (optional): Number of posts (default: 20)
- `lastKey` (optional): Pagination token

**Response:**

```json
{
  "posts": [
    {
      "postId": "uuid",
      "userId": "cognito-sub",
      "title": "string",
      "description": "string",
      "status": "completed",
      "musicxmlUrl": "s3://...",
      "midiUrl": "s3://...",
      "mp3Url": "s3://...",
      "createdAt": "ISO-8601",
      "updatedAt": "ISO-8601"
    }
  ],
  "count": 5,
  "hasMore": true,
  "lastKey": "pagination-token"
}
```

---

### **7. Create User Profile** 🔐 **NEW**

**Authentication:** Required - JWT token must be in Authorization header

Create or update user profile. Called after Cognito sign-up.

```http
POST /users/profile
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "name": "John Doe",
  "displayName": "John"
}
```

**Note:** `userId` and `email` are automatically extracted from JWT token

**Response:**

```json
{
  "message": "Profil creat cu succes!",
  "userId": "cognito-sub"
}
```

---

## 🚀 Deployment Guide

### **Prerequisites**

- AWS Account with Administrator access
- AWS CLI configured
- Node.js 18+ and npm
- AWS CDK CLI: `npm install -g aws-cdk`

### **1. Clone Repository**

```bash
git clone https://github.com/EduardGeorgian/music-score-platform.git
cd music-score-platform
```

### **2. Deploy Infrastructure (CDK)**

```bash
cd infrastructure

# Install dependencies
npm install

# Bootstrap CDK (first time only)
cdk bootstrap

# Deploy
cdk deploy
```

**Note:** CDK will create:

- DynamoDB table: `Posts`
- S3 bucket: `app-partituri-eduard-test`
- SQS queue: `music-processing-queue`
- 5 Lambda functions
- API Gateway with endpoints

### **3. Setup EC2 Worker**

**Launch EC2 instance:**

- AMI: Ubuntu 24.04 LTS
- Instance type: t3.large
- IAM Role: `EC2-Music-Worker-Role` (with S3, SQS, DynamoDB access)
- Region: eu-north-1

**SSH into instance and run:**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install system dependencies
sudo apt install -y python3 python3-pip python3-venv
sudo apt install -y imagemagick-6.q16
sudo apt install -y fluidsynth fluid-soundfont-gm ffmpeg

# Create virtual environment
python3 -m venv ~/oemer-env
source ~/oemer-env/bin/activate

# Install Python packages
cd ~/worker
pip install -r requirements.txt

# Setup systemd service
sudo cp systemd/music-worker.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable music-worker
sudo systemctl start music-worker

# Check status
sudo systemctl status music-worker
```

---

## 📦 Project Structure

```
music-score-platform/
├── backend/
│   ├── lambda/
│   │   └── posts/
│   │       ├── create/           # POST /posts
│   │       ├── getAll/           # GET /posts
│   │       ├── getById/          # GET /posts/{id}
│   │       ├── getDownloadUrl/   # GET /posts/{id}/download
│   │       └── delete/           # DELETE /posts/{id}
│   └── worker/
│       ├── worker.py             # Main processing script
│       ├── requirements.txt      # Python dependencies
│       └── systemd/
│           └── music-worker.service
├── infrastructure/
│   ├── bin/
│   │   └── infrastructure.ts     # CDK app entry point
│   ├── lib/
│   │   └── infrastructure-stack.ts  # CDK stack definition
│   ├── package.json
│   ├── tsconfig.json
│   └── cdk.json
├── .gitignore
└── README.md
```

---

## 🔄 Processing Flow

### **Upload Flow**

```
1. User calls POST /posts
2. Lambda creates DynamoDB entry (status: pending)
3. Lambda generates presigned S3 URL
4. User uploads image to S3 via presigned URL
5. S3 triggers event notification → SQS
```

### **Processing Flow**

```
6. Worker polls SQS queue
7. Worker downloads image from S3
8. Worker preprocesses image (ImageMagick)
   - Convert to grayscale
   - Increase contrast
   - Threshold to black/white
9. Worker runs OMR (oemer)
   - Extract musical notation
   - Generate MusicXML
10. Worker generates MIDI (music21)
11. Worker generates MP3 (FluidSynth + FFmpeg)
12. Worker uploads results to S3 (processed/)
13. Worker updates DynamoDB (status: completed)
14. Worker deletes SQS message
```

---

## 🧪 Testing

### **Getting a Test JWT Token:**

```bash
# 1. Create test user
aws cognito-idp sign-up \
  --client-id 759j1q95dr8ddsgpdiu93pb0jt \
  --username testuser@example.com \
  --password TestPass123! \
  --user-attributes Name=email,Value=testuser@example.com

# 2. Confirm user (admin command)
aws cognito-idp admin-confirm-sign-up \
  --user-pool-id eu-north-1_fhcN3i17g \
  --username testuser@example.com

# 3. Get JWT token
aws cognito-idp initiate-auth \
  --client-id 759j1q95dr8ddsgpdiu93pb0jt \
  --auth-flow USER_PASSWORD_AUTH \
  --auth-parameters USERNAME=testuser@example.com,PASSWORD=TestPass123!

# Save the IdToken from the response
```

---

### **Using PowerShell with Authentication:**

```powershell
# Set your JWT token (from step 3 above)
$token = "eyJraWQiOiJ...your-id-token..."
$apiUrl = "https://tkl02rb5f2.execute-api.eu-north-1.amazonaws.com/prod"

# Headers with authentication
$authHeaders = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Create post (PROTECTED)
Invoke-RestMethod "$apiUrl/posts" `
  -Method POST `
  -Headers $authHeaders `
  -Body '{"title":"Test Post","description":"Testing"}'

# Get my posts (PROTECTED)
Invoke-RestMethod "$apiUrl/posts/my?limit=10" `
  -Headers $authHeaders

# Get all posts (PUBLIC - no auth needed)
Invoke-RestMethod "$apiUrl/posts?limit=10"

# Delete post (PROTECTED - must be owner)
Invoke-RestMethod "$apiUrl/posts/{postId}" `
  -Method DELETE `
  -Headers $authHeaders
```

---

### **Using cURL with Authentication:**

```bash
# Set your token
TOKEN="eyJraWQiOiJ...your-id-token..."

# Create post (PROTECTED)
curl -X POST https://API-URL/prod/posts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Post","description":"Testing"}'

# Get my posts (PROTECTED)
curl https://API-URL/prod/posts/my \
  -H "Authorization: Bearer $TOKEN"

# Get all posts (PUBLIC)
curl https://API-URL/prod/posts?limit=10

# Get specific post (PUBLIC)
curl https://API-URL/prod/posts/{postId}

# Get download URL (PROTECTED)
curl https://API-URL/prod/posts/{postId}/download?type=musicxml \
  -H "Authorization: Bearer $TOKEN"

# Delete post (PROTECTED)
curl -X DELETE https://API-URL/prod/posts/{postId} \
  -H "Authorization: Bearer $TOKEN"

# Create user profile (PROTECTED)
curl -X POST https://API-URL/prod/users/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","displayName":"John"}'
```

---

## 📊 Database Schema

### **DynamoDB Tables**

#### **Users Table**

| Attribute     | Type        | Description                      |
| ------------- | ----------- | -------------------------------- |
| `userId`      | String (PK) | Cognito user sub (UUID)          |
| `email`       | String      | User email from Cognito          |
| `name`        | String      | User's full name                 |
| `displayName` | String      | Display name for UI              |
| `createdAt`   | String      | ISO-8601 timestamp               |
| `updatedAt`   | String      | ISO-8601 timestamp               |
| `followers`   | Number      | Follower count (future feature)  |
| `following`   | Number      | Following count (future feature) |

---

#### **Posts Table**

| Attribute     | Type        | Description                                    |
| ------------- | ----------- | ---------------------------------------------- |
| `postId`      | String (PK) | UUID primary key                               |
| `userId`      | String      | Cognito user sub (FK to Users)                 |
| `title`       | String      | Post title                                     |
| `description` | String      | Post description                               |
| `status`      | String      | `pending`, `processing`, `completed`, `failed` |
| `musicxmlUrl` | String      | S3 URI for MusicXML file                       |
| `midiUrl`     | String      | S3 URI for MIDI file                           |
| `mp3Url`      | String      | S3 URI for MP3 file                            |
| `createdAt`   | String      | ISO-8601 timestamp                             |
| `updatedAt`   | String      | ISO-8601 timestamp                             |

**Global Secondary Index:**

- **Index Name:** `userId-createdAt-index`
- **Partition Key:** `userId` (String)
- **Sort Key:** `createdAt` (String)
- **Purpose:** Query user's posts sorted by date (for "My Posts" feature)

---

## 🗂️ S3 Bucket Structure

```
app-partituri-eduard-test/
├── uploads/
│   └── {postId}/
│       └── score.jpg           # Original uploaded image
└── processed/
    └── {postId}/
        ├── score.musicxml      # Extracted musical notation
        ├── audio.mid           # MIDI file
        └── audio.mp3           # Audio file
```

---

## 💰 Cost Estimation (Monthly)

**Assumptions:** 100 uploads/month, 1GB storage

| Service           | Usage                    | Estimated Cost    |
| ----------------- | ------------------------ | ----------------- |
| **Lambda**        | 500 invocations          | $0.20             |
| **API Gateway**   | 500 requests             | $0.02             |
| **DynamoDB**      | 1000 read/write          | $0.25 (free tier) |
| **S3**            | 1GB storage, 100 uploads | $0.05             |
| **SQS**           | 500 messages             | $0.00 (free tier) |
| **EC2 t3.large**  | 730 hours (always on)    | ~$60.00           |
| **Data Transfer** | 5GB out                  | $0.45             |
| **Total**         |                          | **~$61/month**    |

**Optimization:** Use EC2 Spot instances or Lambda for OMR to reduce costs.

---

## 🔒 Security Considerations

- ✅ **AWS Cognito authentication** implemented
- ✅ **JWT token validation** on protected endpoints
- ✅ **Ownership verification** - users can only delete their own posts
- ✅ **Automatic userId extraction** from JWT (no spoofing possible)
- ✅ S3 bucket is private (no public access)
- ✅ Presigned URLs expire after 5-60 minutes
- ✅ IAM roles with least privilege principle
- ✅ CORS configured for browser security
- ⚠️ API throttling enabled (100 req/s rate, 200 burst)
- ⚠️ Consider adding API keys for additional protection
- ⚠️ Consider MFA (Multi-Factor Authentication) for sensitive operations

### **Authentication Flow:**

```
1. User signs up → Cognito User Pool
2. User confirms email → Account activated
3. User logs in → Receives JWT tokens (ID, Access, Refresh)
4. Frontend stores tokens securely
5. API calls include: Authorization: Bearer <ID_TOKEN>
6. API Gateway validates JWT with Cognito
7. Lambda extracts userId from validated token
8. Lambda performs authorized operations
```

---

## 🐛 Troubleshooting

### **Worker not processing images:**

```bash
# Check worker logs
sudo journalctl -u music-worker -f

# Check SQS queue
aws sqs get-queue-attributes \
  --queue-url https://sqs.eu-north-1.amazonaws.com/.../music-processing-queue \
  --attribute-names ApproximateNumberOfMessages

# Manually test worker
cd /tmp/oemer_processing
source ~/oemer-env/bin/activate
oemer input.jpg -o output/
```

### **Lambda timeout errors:**

- Check CloudWatch Logs: `aws logs tail /aws/lambda/FUNCTION_NAME --follow`
- Increase timeout in CDK: `timeout: cdk.Duration.seconds(30)`

### **CORS errors in browser:**

- Verify `defaultCorsPreflightOptions` in API Gateway
- Check response headers include `Access-Control-Allow-Origin: *`

---

## 🚧 Future Enhancements

- [x] ~~User authentication (AWS Cognito)~~ ✅ Implemented
- [x] ~~User profiles and ownership~~ ✅ Implemented
- [x] ~~"My Posts" endpoint~~ ✅ Implemented
- [ ] React frontend with Cognito login
- [ ] Real-time status updates (WebSockets)
- [ ] Multi-page score support
- [ ] Comments and likes on posts
- [ ] User following/followers system
- [ ] Music playback in browser
- [ ] Share to social media
- [ ] Mobile app (React Native)
- [ ] Email notifications (SES)
- [ ] Admin dashboard
- [ ] Analytics and usage metrics
- [ ] Cost optimization (Lambda for OMR, Spot instances)

---

## 📝 License

This project is part of a university thesis project.

---

## 👨‍💻 Author

**Eduard Georgian**

- GitHub: [@EduardGeorgian](https://github.com/EduardGeorgian)
- Project: Music Score Platform (Licență)

---

## 🙏 Acknowledgments

- **oemer** - Open-source OMR engine
- **music21** - Music analysis toolkit
- **AWS CDK** - Infrastructure as Code framework
- **FluidSynth** - Software synthesizer

---

## 📞 Support

For issues or questions:

1. Check CloudWatch Logs
2. Review DynamoDB table entries
3. Check EC2 worker logs: `sudo journalctl -u music-worker -f`
4. Verify S3 event notifications are configured

---
