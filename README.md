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

## 🔌 API Endpoints

**Base URL:** `https://tkl02rb5f2.execute-api.eu-north-1.amazonaws.com/prod`

### **1. Create Post**

```http
POST /posts
Content-Type: application/json

{
  "userId": "string",
  "title": "string",
  "description": "string"
}
```

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

### **2. Get All Posts (Feed)**

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

### **3. Get Post by ID**

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

### **4. Get Download URL**

```http
GET /posts/{postId}/download?type=musicxml
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

### **5. Delete Post**

```http
DELETE /posts/{postId}
```

**Response:**

```json
{
  "message": "Post deleted successfully",
  "postId": "uuid"
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

### **Using PowerShell:**

```powershell
# Run comprehensive test
.\test-all-endpoints.ps1
```

### **Using cURL:**

```bash
# Create post
curl -X POST https://API-URL/prod/posts \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","title":"Test Post","description":"Testing"}'

# Get all posts
curl https://API-URL/prod/posts?limit=10

# Get specific post
curl https://API-URL/prod/posts/{postId}

# Get download URL
curl https://API-URL/prod/posts/{postId}/download?type=musicxml

# Delete post
curl -X DELETE https://API-URL/prod/posts/{postId}
```

---

## 📊 Database Schema

### **DynamoDB Table: Posts**

| Attribute     | Type        | Description                                    |
| ------------- | ----------- | ---------------------------------------------- |
| `postId`      | String (PK) | UUID primary key                               |
| `userId`      | String      | User identifier                                |
| `title`       | String      | Post title                                     |
| `description` | String      | Post description                               |
| `status`      | String      | `pending`, `processing`, `completed`, `failed` |
| `musicxmlUrl` | String      | S3 URI for MusicXML file                       |
| `midiUrl`     | String      | S3 URI for MIDI file                           |
| `mp3Url`      | String      | S3 URI for MP3 file                            |
| `createdAt`   | String      | ISO-8601 timestamp                             |
| `updatedAt`   | String      | ISO-8601 timestamp                             |

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

- ✅ S3 bucket is private (no public access)
- ✅ Presigned URLs expire after 5-60 minutes
- ✅ IAM roles with least privilege principle
- ✅ CORS configured for browser security
- ⚠️ No authentication implemented yet (add Cognito for production)
- ⚠️ No API keys (add for production)

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

- [ ] User authentication (AWS Cognito)
- [ ] React frontend
- [ ] Real-time status updates (WebSockets)
- [ ] Multi-page score support
- [ ] User profiles and social features
- [ ] Comments and likes
- [ ] Music playback in browser
- [ ] Share to social media
- [ ] Mobile app (React Native)
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
