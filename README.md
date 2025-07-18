mart HR Management System
A comprehensive, AI-powered HR management system that automates the entire recruitment workflow from resume upload to candidate evaluation. Built with modern React.js frontend and Node.js backend, integrated with AWS cloud services for scalability and AI capabilities.

<img width="1781" height="877" alt="image" src="https://github.com/user-attachments/assets/3e2e787c-8e14-4523-8000-1e9a971724a5" />
<img width="1901" height="858" alt="image" src="https://github.com/user-attachments/assets/e8023e31-e514-446c-89ff-af7725eb87f0" />
<img width="1882" height="925" alt="image" src="https://github.com/user-attachments/assets/97082fef-7224-4412-8edf-223d28ac14fd" />
<img width="1478" height="864" alt="image" src="https://github.com/user-attachments/assets/b3a95129-e85e-466f-9d55-f878fe4837a0" />
<img width="1885" height="922" alt="image" src="https://github.com/user-attachments/assets/c8459f0d-03ad-42a3-8dc4-9892c206d80b" />
<img width="1145" height="850" alt="image" src="https://github.com/user-attachments/assets/f37cef04-f56d-4c32-8902-685b47b2794c" />

Core Functionality
🔐 Secure Authentication - AWS Cognito-powered enterprise login

📄 Resume Management - Upload, storage, and AI-powered text extraction

🤖 AI Interview Questions - Automated technical and behavioral question generation

👥 Candidate Pipeline - Complete hiring workflow management

📊 Analytics Dashboard - Real-time insights and reporting

📅 Interview Scheduling - Calendar integration and attendance tracking

⭐ Evaluation System - Comprehensive candidate assessment tools

Advanced Features
Real-time Status Updates across the hiring pipeline

Search & Filter capabilities for candidate management

Bulk Operations for efficient HR workflows

Professional UI/UX with responsive design

Error Handling with comprehensive logging

Performance Optimization for large datasets

🏗️ Architecture
Frontend (React.js)
text
├── src/
│   ├── components/
│   │   ├── hrdashboard.js          # Main dashboard interface
│   │   ├── interviewactions.js     # Interview management
│   │   ├── candidatelist.js        # Candidate listing
│   │   ├── candidateprofile.js     # Individual profiles
│   │   ├── resumeupload.js         # Upload functionality
│   │   └── editcandidatemodal.js   # Edit interface
│   ├── pages/
│   │   ├── login.js               # Authentication page
│   │   └── dashboard.js           # Main dashboard
│   ├── api/
│   │   └── hrap.js               # API integration layer
│   └── styles/
│       └── combined.css          # Professional styling
Backend (Node.js)
text
├── backend/
│   ├── routes/
│   │   ├── auth.js               # Authentication endpoints
│   │   ├── candidates.js         # Candidate CRUD operations
│   │   └── interviews.js         # Interview management
│   ├── services/
│   │   ├── awsService.js         # AWS integrations
│   │   ├── textractService.js    # Document processing
│   │   └── bedrockService.js     # AI question generation
│   ├── models/
│   │   └── candidateModel.js     # Data models
│   └── middleware/
│       ├── auth.js               # JWT validation
│       └── upload.js             # File handling
☁️ AWS Services Integration
🔐 Amazon Cognito
Purpose: User authentication and authorization

Features:

OAuth 2.0 flow implementation

Multi-factor authentication support

Session management with JWT tokens

User pool management for HR personnel

Configuration:

javascript
// Cognito User Pool Configuration
UserPoolId: process.env.COGNITO_USER_POOL_ID
ClientId: process.env.COGNITO_CLIENT_ID
Domain: process.env.COGNITO_DOMAIN
RedirectURI: process.env.COGNITO_REDIRECT_URI
📁 Amazon S3
Purpose: Resume and document storage

Features:

Secure file upload with presigned URLs

Automatic encryption at rest

Lifecycle policies for cost optimization

CDN integration for fast retrieval

Bucket Structure:

text
smart-hr-resumes/
├── resumes/
│   ├── {candidateId}/
│   │   ├── original_resume.pdf
│   │   └── processed_resume.json
└── documents/
    └── {candidateId}/
        ├── cover_letter.pdf
        └── certificates/
📊 Amazon DynamoDB
Purpose: Candidate data and application state management

Tables:

SmartHR_Candidates Table

javascript
{
  candidateId: String,        // Primary Key
  name: String,
  email: String,              // Global Secondary Index
  phone: String,
  status: String,             // Pending, Shortlisted, Hired, Rejected
  uploadedAt: String,
  resumeUrl: String,
  questions: String,          // AI-generated questions HTML
  interviewDate: String,
  attendance: String,
  rating: String,
  feedback: String,
  technicalSkills: String,
  communicationSkills: String,
  problemSolvingSkills: String,
  overallImpression: String,
  nextSteps: String,
  lastUpdated: String
}
🤖 Amazon Bedrock
Purpose: AI-powered interview question generation

Model: DeepSeek R1 (us.deepseek.r1-v1:0)

Features:

Technical question generation based on resume skills

Behavioral question creation for cultural fit assessment

Context-aware question adaptation

Customizable difficulty levels

Implementation:

javascript
// Bedrock Integration
const bedrock = new BedrockRuntimeClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});
📄 Amazon Textract (Future Enhancement)
Purpose: AI-powered resume text extraction

Features:

Intelligent document analysis

Structured data extraction

Multi-format support (PDF, DOC, DOCX)

Key-value pair detection

🛠️ Installation & Setup
Prerequisites
Node.js 18.x or higher

npm or yarn package manager

AWS Account with appropriate permissions

Git for version control

Backend Setup
bash
# Clone the repository
git clone https://github.com/yourusername/smart-hr-system.git
cd smart-hr-system/backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your AWS credentials and configurations

# Start the development server
npm run dev
Frontend Setup
bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your frontend configurations

# Start the development server
npm start
Environment Configuration
Backend (.env)
bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET=smart-hr-resumes
DYNAMODB_TABLE_NAME=SmartHR_Candidates

# Cognito Configuration
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_CLIENT_ID=your_client_id
COGNITO_CLIENT_SECRET=your_client_secret
COGNITO_DOMAIN=your-domain.auth.us-east-1.amazoncognito.com
COGNITO_REDIRECT_URI=http://localhost:5000/callback
COGNITO_LOGOUT_URI=http://localhost:5000/goodbye

# Bedrock Configuration
BEDROCK_MODEL_ID=arn:aws:bedrock:us-east-1:992382578995:inference-profile/us.deepseek.r1-v1:0

# Server Configuration
PORT=5000
NODE_ENV=development
DEBUG_LOG=true
Frontend (.env)
bash
# Cognito Configuration
REACT_APP_COGNITO_DOMAIN=your-domain.auth.us-east-1.amazoncognito.com
REACT_APP_COGNITO_CLIENT_ID=your_client_id
REACT_APP_COGNITO_REDIRECT_URI=http://localhost:3000/callback
REACT_APP_COGNITO_LOGOUT_URI=http://localhost:3000

# API Configuration
REACT_APP_API_BASE_URL=http://localhost:5000
🚀 Deployment
AWS Infrastructure Setup
Create DynamoDB Table

bash
aws dynamodb create-table \
    --table-name SmartHR_Candidates \
    --attribute-definitions AttributeName=candidateId,AttributeType=S \
    --key-schema AttributeName=candidateId,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST
Create S3 Bucket

bash
aws s3 mb s3://smart-hr-resumes --region us-east-1
Configure Cognito User Pool

bash
# Use AWS Console or AWS CLI to create User Pool
# Configure OAuth settings and domain
Production Deployment
Frontend: Deploy to AWS S3 + CloudFront

Backend: Deploy to AWS ECS or EC2

Database: Production DynamoDB with proper indexing

Storage: S3 with CloudFront for global CDN

📊 Usage
1. Authentication
Access the application at http://localhost:3000

Click "Sign in with AWS Cognito"

Complete OAuth flow with your Cognito credentials

2. Resume Upload
Navigate to "Resume Upload" section

Drag and drop resume files (PDF, DOC, DOCX)

System automatically extracts candidate information

AI generates interview questions based on resume content

3. Candidate Management
View all candidates in the HR Dashboard

Use search and filter options to find specific candidates

Update candidate status throughout the hiring pipeline

Add notes and comments for team collaboration

4. Interview Management
Select candidate and navigate to "Interview Actions"

Schedule interviews and track attendance

Use AI-generated questions during interviews

Provide evaluation scores and detailed feedback

Define next steps in the hiring process

🔧 API Endpoints
Authentication
javascript
POST /api/auth/callback          # Handle Cognito callback
POST /api/auth/refresh           # Refresh JWT tokens
POST /api/auth/logout            # Logout user
Candidates
javascript
GET  /api/candidates             # Get all candidates
GET  /api/candidates/:id         # Get specific candidate
POST /api/candidates             # Create new candidate
PUT  /api/candidates/:id         # Update candidate
DELETE /api/candidates/:id       # Delete candidate
POST /api/candidates/upload      # Upload resume
Interviews
javascript
GET  /api/interviews/:candidateId    # Get interview data
POST /api/interviews/schedule        # Schedule interview
PUT  /api/interviews/:id/feedback    # Submit feedback
GET  /api/interviews/analytics       # Get interview metrics
🧪 Testing
Unit Tests
bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test
Integration Tests
bash
# Full application testing
npm run test:integration
Load Testing
bash
# Performance testing with Artillery
npm run test:load
📈 Performance Optimization
Frontend: Code splitting, lazy loading, optimized bundle size

Backend: Connection pooling, caching with Redis

Database: Proper indexing, query optimization

AWS: CloudFront CDN, Auto Scaling Groups

Monitoring: CloudWatch metrics and alarms

🔒 Security Features
Authentication: AWS Cognito with MFA support

Authorization: JWT token validation

Data Encryption: At-rest and in-transit encryption

Input Validation: Comprehensive sanitization

CORS: Properly configured cross-origin policies

Rate Limiting: API endpoint protection

Audit Logging: Complete action tracking
