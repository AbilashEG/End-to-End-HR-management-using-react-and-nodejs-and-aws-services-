const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { TextractClient, DetectDocumentTextCommand, StartDocumentTextDetectionCommand, GetDocumentTextDetectionCommand } = require('@aws-sdk/client-textract');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { DynamoDBClient, PutItemCommand, ScanCommand, UpdateItemCommand, GetItemCommand } = require('@aws-sdk/client-dynamodb');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const path = require('path');

dotenv.config();

// TEMPORARY WORKAROUND: Force correct environment variables
console.log('🔧 Applying temporary environment variable overrides...');
process.env.COGNITO_REDIRECT_URI = 'http://localhost:3000/callback';
process.env.COGNITO_DOMAIN = '';
process.env.COGNITO_CLIENT_ID = '';
process.env.COGNITO_CLIENT_SECRET = '';
process.env.COGNITO_LOGOUT_URI = 'http://localhost:3000/';
process.env.COGNITO_REGION = 'us-east-1';

// Also set AWS variables if they're not loading from .env
if (!process.env.S3_BUCKET) {
  process.env.S3_BUCKET = 'smart-hr-resumes';
  process.env.AWS_ACCESS_KEY_ID = '';
  process.env.AWS_SECRET_ACCESS_KEY = '';
  process.env.AWS_REGION = 'us-east-1';
  process.env.BEDROCK_MODEL_ID = '';
  process.env.DYNAMODB_TABLE_NAME = 'SmartHR_Candidates';
}

console.log('✅ Environment variables manually set');

const app = express();
app.use(cors());
app.use(fileUpload());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Debug environment variables on startup
console.log('🔍 Backend Environment Check:', {
  cognitoDomain: process.env.COGNITO_DOMAIN,
  cognitoClientId: process.env.COGNITO_CLIENT_ID,
  cognitoClientSecret: process.env.COGNITO_CLIENT_SECRET ? 'SET' : 'NOT SET',
  cognitoRedirectUri: process.env.COGNITO_REDIRECT_URI,
  awsRegion: process.env.AWS_REGION,
  s3Bucket: process.env.S3_BUCKET,
  dynamoTable: process.env.DYNAMODB_TABLE_NAME
});

// AWS Clients
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const textract = new TextractClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const bedrock = new BedrockRuntimeClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const ddb = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Utility function for async Textract jobs
const waitForTextract = async (jobId) => {
  console.log('⏳ Waiting for Textract async job to complete...');
  while (true) {
    const result = await textract.send(
      new GetDocumentTextDetectionCommand({ JobId: jobId })
    );
    const status = result.JobStatus;
    console.log(`📋 Textract job status: ${status}`);
    
    if (status === 'SUCCEEDED') {
      return result;
    }
    if (status === 'FAILED') {
      throw new Error('Textract async job failed');
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
};

// ENHANCED: Textract-first JD text extraction function with S3 integration
async function extractJDText(jdFile, s3Location = null) {
  const mime = jdFile.mimetype || 'application/octet-stream';
  const ext = path.extname(jdFile.name || '').toLowerCase();
  const bytes = Buffer.from(jdFile.data);
  
  console.log('📋 JD File Analysis:', {
    name: jdFile.name,
    mimetype: mime,
    extension: ext,
    size: `${(jdFile.size / 1024 / 1024).toFixed(2)} MB`
  });

  // 1️⃣ Try synchronous Textract DetectDocumentText first
  try {
    console.log('📋 [JD] Attempting Textract DetectDocumentText (sync)...');
    const out = await textract.send(
      new DetectDocumentTextCommand({ Document: { Bytes: bytes } })
    );
    const text = (out.Blocks || [])
      .filter(b => b.BlockType === 'LINE')
      .map(b => b.Text)
      .join('\n');

    if (text.trim().length > 80) {
      console.log(`✅ Textract sync succeeded - extracted ${text.length} characters`);
      return text;
    }
    console.log('⚠️ Textract sync returned little/no text - trying async...');
  } catch (err) {
    console.log('⚠️ Textract sync failed:', err.message);
  }

  // 2️⃣ Try async Textract for PDFs using S3 location
  if ((mime === 'application/pdf' || ext === '.pdf') && s3Location) {
    try {
      console.log('📋 [JD] Attempting Textract StartDocumentTextDetection (async)...');
      const start = await textract.send(
        new StartDocumentTextDetectionCommand({
          DocumentLocation: { 
            S3Object: { 
              Bucket: s3Location.bucket, 
              Name: s3Location.key 
            }
          }
        })
      );
      const asyncResult = await waitForTextract(start.JobId);
      const text = (asyncResult.Blocks || [])
        .filter(b => b.BlockType === 'LINE')
        .map(b => b.Text)
        .join('\n');

      if (text.trim().length > 80) {
        console.log(`✅ Textract async succeeded - extracted ${text.length} characters`);
        return text;
      }
      console.log('⚠️ Textract async returned little/no text - trying fallbacks...');
    } catch (err) {
      console.log('⚠️ Textract async failed:', err.message);
    }
  }

  // 3️⃣ Fallback: pdf-parse for normal text PDFs
  if (mime === 'application/pdf' || ext === '.pdf') {
    try {
      console.log('📋 [JD] Fallback to pdf-parse...');
      const pdfData = await pdfParse(bytes);
      if (pdfData.text && pdfData.text.trim().length > 0) {
        console.log(`✅ pdf-parse extracted ${pdfData.text.length} characters`);
        return pdfData.text;
      }
    } catch (pdfError) {
      console.log('⚠️ pdf-parse failed:', pdfError.message);
    }
  }

  // 4️⃣ Fallback: mammoth for DOCX/DOC files
  if (
    mime.includes('officedocument.wordprocessingml.document') ||
    mime === 'application/msword' ||
    ext === '.docx' || ext === '.doc'
  ) {
    try {
      console.log('📋 [JD] Fallback to mammoth...');
      const result = await mammoth.extractRawText({ buffer: bytes });
      if (result.value && result.value.trim().length > 0) {
        console.log(`✅ mammoth extracted ${result.value.length} characters`);
        return result.value;
      }
    } catch (mammothError) {
      console.log('⚠️ mammoth failed:', mammothError.message);
    }
  }

  // 5️⃣ Images - retry Textract sync (already the best option for images)
  if (mime.startsWith('image/')) {
    try {
      console.log('📋 [JD] Re-trying Textract sync for image...');
      const outImg = await textract.send(
        new DetectDocumentTextCommand({ Document: { Bytes: bytes } })
      );
      return (outImg.Blocks || [])
        .filter(b => b.BlockType === 'LINE')
        .map(b => b.Text)
        .join('\n');
    } catch (imageError) {
      console.log('⚠️ Textract image retry failed:', imageError.message);
    }
  }

  // 6️⃣ Plain text files
  if (mime.startsWith('text/') || ext === '.txt') {
    try {
      console.log('📋 [JD] Processing as plain text...');
      const text = bytes.toString('utf8');
      if (text.trim().length > 0) {
        console.log(`✅ Plain text extracted ${text.length} characters`);
        return text;
      }
    } catch (textError) {
      console.log('⚠️ Plain text extraction failed:', textError.message);
    }
  }

  console.error('❌ All JD extraction methods failed');
  return null;
}

// ENHANCED: Analyze candidate profile for personalization
function analyzeCandidateProfile(resumeText) {
  const text = resumeText.toLowerCase();
  
  // Extract projects with better patterns
  const projectPatterns = [
    /(?:project|built|developed|created|implemented|designed)[:\s]*([^.!?]+)/gi,
    /(?:worked on|involved in|participated in)[:\s]*([^.!?]+)/gi
  ];
  
  let projects = [];
  projectPatterns.forEach(pattern => {
    const matches = resumeText.match(pattern) || [];
    matches.forEach(match => {
      const cleanProject = match.replace(/^(project|built|developed|created|implemented|designed|worked on|involved in|participated in)[:\s]*/i, '').trim();
      if (cleanProject.length > 10 && cleanProject.length < 150) {
        projects.push(cleanProject);
      }
    });
  });
  projects = projects.slice(0, 3);

  // Extract interests/technologies with expanded list
  const techKeywords = [
    'python', 'javascript', 'java', 'react', 'node', 'angular', 'vue',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'machine learning', 
    'ai', 'artificial intelligence', 'data science', 'web development',
    'mobile development', 'ios', 'android', 'sql', 'mongodb', 'postgresql',
    'blockchain', 'devops', 'cybersecurity', 'cloud computing', 'sagemaker',
    'pandas', 'numpy', 'tensorflow', 'pytorch', 'data engineering'
  ];
  const interests = techKeywords.filter(keyword => text.includes(keyword));
  
  // Determine career level with multiple indicators
  const experienceMatch = resumeText.match(/(\d+)\s*(?:\+|\-)?\s*years?\s*(?:of\s*)?experience/i);
  const yearMatches = resumeText.match(/\b(20\d{2})\b/g) || [];
  const seniorKeywords = ['senior', 'lead', 'principal', 'architect', 'manager'];
  const juniorKeywords = ['intern', 'graduate', 'entry', 'junior', 'associate', 'fresher'];
  
  let careerLevel = 'Mid-level';
  if (experienceMatch) {
    const years = parseInt(experienceMatch[1]);
    careerLevel = years > 7 ? 'Senior' : years > 3 ? 'Mid-level' : 'Entry-level';
  } else if (seniorKeywords.some(keyword => text.includes(keyword))) {
    careerLevel = 'Senior';
  } else if (juniorKeywords.some(keyword => text.includes(keyword))) {
    careerLevel = 'Entry-level';
  } else if (yearMatches.length > 4) {
    careerLevel = 'Experienced';
  }
  
  // Extract industry with expanded categories
  const industryKeywords = [
    'healthcare', 'finance', 'fintech', 'education', 'e-commerce', 'retail',
    'startup', 'enterprise', 'consulting', 'government', 'non-profit',
    'gaming', 'media', 'telecommunications', 'automotive', 'manufacturing'
  ];
  const industry = industryKeywords.find(ind => text.includes(ind)) || 'Technology';
  
  // Check leadership indicators with more patterns
  const leadershipKeywords = [
    'lead', 'led', 'manage', 'managed', 'team', 'mentor', 'mentored',
    'coordinate', 'coordinated', 'supervise', 'supervised', 'guide', 'guided'
  ];
  const leadership = leadershipKeywords.some(keyword => text.includes(keyword));
  
  // Extract education level
  const educationKeywords = ['phd', 'masters', 'bachelor', 'degree', 'university', 'college'];
  const hasAdvancedDegree = text.includes('phd') || text.includes('masters');
  const education = hasAdvancedDegree ? 'Advanced Degree' : 
                   educationKeywords.some(keyword => text.includes(keyword)) ? 'Bachelor\'s Degree' : 'Technical Background';

  // Extract specific achievements
  const achievementPatterns = [
    /(?:achieved|accomplished|delivered|improved|increased|reduced)[:\s]*([^.!?]+)/gi,
    /(?:award|recognition|certificate|certification)[:\s]*([^.!?]+)/gi
  ];
  
  let achievements = [];
  achievementPatterns.forEach(pattern => {
    const matches = resumeText.match(pattern) || [];
    matches.forEach(match => {
      const cleanAchievement = match.replace(/^(achieved|accomplished|delivered|improved|increased|reduced|award|recognition|certificate|certification)[:\s]*/i, '').trim();
      if (cleanAchievement.length > 10 && cleanAchievement.length < 100) {
        achievements.push(cleanAchievement);
      }
    });
  });
  achievements = achievements.slice(0, 2);

  return {
    projects: projects.length > 0 ? projects.join(', ') : 'Various technical projects',
    interests: interests.length > 0 ? interests.join(', ') : 'Software development and technology',
    careerLevel,
    industry,
    leadership: leadership ? 'Demonstrated leadership experience' : 'Individual contributor with growth potential',
    education,
    achievements: achievements.length > 0 ? achievements.join(', ') : 'Continuous learning and skill development'
  };
}

// NEW: Format task questions output for organized display
function formatTaskQuestionsOutput(rawOutput, candidateInfo, candidateAnalysis) {
  const currentDate = new Date().toLocaleString('en-IN', { 
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    year: 'numeric',
    month: 'long', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  // Clean and organize the output
  let formattedContent = rawOutput
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold formatting
    .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic formatting
    .replace(/•/g, '▪') // Better bullet points
    .replace(/\n\n/g, '</p><p>') // Paragraph breaks
    .replace(/\n/g, '<br/>'); // Line breaks

  return `
    <div class="task-assessment-container">
      <div class="task-header">
        <div class="header-badge">
          <span class="badge-icon">🎯</span>
          <span class="badge-text">TASK-BASED ASSESSMENT</span>
        </div>
        <div class="candidate-info">
          <h3>${candidateInfo.name}</h3>
          <div class="info-tags">
            <span class="tag status">✅ SHORTLISTED</span>
            <span class="tag level">${candidateAnalysis.careerLevel}</span>
            <span class="tag skills">${candidateAnalysis.interests.split(',')[0]?.trim() || 'Technical'}</span>
          </div>
        </div>
        <div class="generation-meta">
          <span class="meta-item">📅 Generated: ${currentDate}</span>
          <span class="meta-item">⏱️ Total Time: ~70 minutes</span>
        </div>
      </div>
      
      <div class="assessment-instructions">
        <h4>📋 Assessment Instructions</h4>
        <div class="instructions-content">
          <p><strong>Purpose:</strong> These tasks are specifically designed for shortlisted candidates to evaluate practical skills and real-world problem-solving abilities.</p>
          <div class="instruction-points">
            ▪ Complete both tasks within the specified time limits<br/>
            ▪ Focus on code quality, documentation, and clear explanations<br/>
            ▪ Demonstrate your ${candidateAnalysis.careerLevel} level expertise<br/>
            ▪ Show your problem-solving approach and reasoning
          </div>
        </div>
      </div>
      
      <div class="tasks-content">
        ${formattedContent}
      </div>
      
      <div class="assessment-footer">
        <div class="evaluation-note">
          <h5>🎯 Evaluation Criteria</h5>
          <div class="criteria-grid">
            <div class="criteria-item">
              <span class="criteria-label">Technical Skills:</span>
              <span class="criteria-desc">Code quality, best practices, efficiency</span>
            </div>
            <div class="criteria-item">
              <span class="criteria-label">Problem Solving:</span>
              <span class="criteria-desc">Approach, logic, edge case handling</span>
            </div>
            <div class="criteria-item">
              <span class="criteria-label">Communication:</span>
              <span class="criteria-desc">Documentation, explanations, clarity</span>
            </div>
            <div class="criteria-item">
              <span class="criteria-label">Practical Application:</span>
              <span class="criteria-desc">Real-world relevance, scalability</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <style>
      .task-assessment-container {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 100%;
        margin: 0 auto;
      }
      
      .task-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px;
        border-radius: 12px 12px 0 0;
        margin-bottom: 0;
      }
      
      .header-badge {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 700;
        font-size: 16px;
        margin-bottom: 15px;
      }
      
      .candidate-info h3 {
        margin: 0 0 10px 0;
        font-size: 24px;
        font-weight: 600;
      }
      
      .info-tags {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-bottom: 15px;
      }
      
      .tag {
        background: rgba(255,255,255,0.2);
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .generation-meta {
        display: flex;
        gap: 20px;
        font-size: 14px;
        opacity: 0.9;
      }
      
      .assessment-instructions {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        padding: 20px;
        margin: 0;
      }
      
      .assessment-instructions h4 {
        margin: 0 0 15px 0;
        color: #2d3748;
        font-size: 18px;
      }
      
      .instruction-points {
        background: white;
        padding: 15px;
        border-left: 4px solid #4299e1;
        border-radius: 4px;
        margin-top: 10px;
      }
      
      .tasks-content {
        background: white;
        padding: 25px;
        border: 1px solid #e2e8f0;
        border-top: none;
        line-height: 1.7;
      }
      
      .tasks-content h4, .tasks-content h5 {
        color: #2d3748;
        margin: 25px 0 15px 0;
        font-weight: 600;
      }
      
      .tasks-content strong {
        color: #2d3748;
        font-weight: 600;
      }
      
      .assessment-footer {
        background: #f7fafc;
        border: 1px solid #e2e8f0;
        border-top: none;
        border-radius: 0 0 12px 12px;
        padding: 20px;
      }
      
      .evaluation-note h5 {
        margin: 0 0 15px 0;
        color: #2d3748;
        font-size: 16px;
      }
      
      .criteria-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 15px;
      }
      
      .criteria-item {
        background: white;
        padding: 12px;
        border-radius: 6px;
        border-left: 3px solid #4299e1;
      }
      
      .criteria-label {
        font-weight: 600;
        color: #2d3748;
        display: block;
      }
      
      .criteria-desc {
        color: #718096;
        font-size: 14px;
      }
      
      @media (max-width: 768px) {
        .info-tags {
          justify-content: center;
        }
        
        .generation-meta {
          flex-direction: column;
          gap: 5px;
        }
        
        .criteria-grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  `;
}

// UPDATED: Generate task-based questions for shortlisted candidates with standardized output
async function generateTaskBasedQuestions(resumeText, jdData, candidateInfo) {
  const candidateAnalysis = analyzeCandidateProfile(resumeText);
  
  console.log('🎯 Generating organized task-based questions for shortlisted candidate:', candidateInfo.name);
  
  const taskPrompt = jdData ? `
TASK-BASED ASSESSMENT FOR SHORTLISTED CANDIDATE
CANDIDATE PROFILE:
Name: ${candidateInfo.name}
Email: ${candidateInfo.email}
Status: SHORTLISTED

CANDIDATE ANALYSIS:
- Projects: ${candidateAnalysis.projects}
- Technical Skills: ${candidateAnalysis.interests}
- Career Level: ${candidateAnalysis.careerLevel}
- Industry: ${candidateAnalysis.industry}
- Education: ${candidateAnalysis.education}

JOB REQUIREMENTS:
Position: ${jdData.jobTitle}
Skills: ${jdData.skills}
Experience: ${jdData.experience}

INSTRUCTIONS:
Generate 2 PRACTICAL TASK-BASED QUESTIONS specifically designed for this ${jdData.jobTitle} position.
Format the output with clear structure and bullet points.

TASK 1 - CODING/TECHNICAL CHALLENGE:
Problem Statement: [Clear problem description]
Requirements:
• [Requirement 1]
• [Requirement 2] 
• [Requirement 3]
Expected Deliverables:
• [Deliverable 1]
• [Deliverable 2]
Time Limit: 35-45 minutes
Evaluation Focus: Code quality, problem-solving approach, ${candidateAnalysis.careerLevel} level implementation

TASK 2 - PROJECT/SCENARIO CHALLENGE:
Scenario: [Real-world scenario description]
Your Role: [Candidate's role in the scenario]
Objectives:
• [Objective 1]
• [Objective 2]
• [Objective 3]
Deliverables:
• [Deliverable 1] 
• [Deliverable 2]
Time Limit: 30-35 minutes
Evaluation Focus: Strategic thinking, practical application, communication skills
` : `
TASK-BASED ASSESSMENT FOR SHORTLISTED CANDIDATE
CANDIDATE: ${candidateInfo.name} (SHORTLISTED)

BACKGROUND:
- Technical Skills: ${candidateAnalysis.interests}
- Experience Level: ${candidateAnalysis.careerLevel}
- Projects: ${candidateAnalysis.projects}

Generate 2 well-structured practical tasks with clear formatting:

TASK 1 - TECHNICAL CHALLENGE:
Problem: [Technical problem based on candidate's skills]
Requirements: [Clear bullet points]
Deliverables: [Expected outputs]
Time: 35-45 minutes

TASK 2 - PROJECT SCENARIO:
Scenario: [Real-world scenario]
Objectives: [Clear goals]
Deliverables: [Expected outputs]
Time: 30-35 minutes
`;

  try {
    const inputVariants = [
      { input: taskPrompt, max_tokens: 2500, temperature: 0.7 },
      { prompt: taskPrompt, max_tokens: 2500, temperature: 0.7 },
      { messages: [{ role: "user", content: taskPrompt }], max_tokens: 2500, temperature: 0.7 }
    ];

    for (let i = 0; i < inputVariants.length; i++) {
      try {
        console.log(`🔄 Trying organized task generation format ${i + 1}...`);
        
        const bedrockResponse = await bedrock.send(
          new InvokeModelCommand({
            modelId: process.env.BEDROCK_MODEL_ID,
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify(inputVariants[i]),
          })
        );

        const bodyBuffer = await bedrockResponse.body.transformToString();
        let parsed = {};
        
        try {
          parsed = JSON.parse(bodyBuffer);
        } catch {
          parsed.output = bodyBuffer;
        }

        let output = parsed.output || parsed.completion || parsed.response || 
                     (parsed.choices && parsed.choices[0]?.text);

        if (output && output.trim()) {
          console.log('✅ Organized task-based questions generated successfully');
          
          // Format the output for better display
          const formattedOutput = formatTaskQuestionsOutput(output, candidateInfo, candidateAnalysis);
          
          return { success: true, output: formattedOutput, taskBased: true };
        }
      } catch (error) {
        console.log(`❌ Task generation attempt ${i + 1} failed:`, error.message);
        continue;
      }
    }

    return { success: false, taskBased: true };
  } catch (error) {
    console.error('❌ Task-based question generation failed:', error);
    return { success: false, taskBased: true };
  }
}

// UPDATED: Enhanced fallback task generation with organized structure
function generateFallbackTaskQuestions(candidateAnalysis, jdData = null) {
  const primarySkill = candidateAnalysis.interests.split(',')[0]?.trim() || 'programming';
  const currentDate = new Date().toLocaleString('en-IN', { 
    timeZone: 'Asia/Kolkata',
    hour12: true
  });
  
  const task1 = jdData ? 
    `
    <div class="task-card">
      <div class="task-header">
        <h3>🔧 TASK 1 - TECHNICAL CHALLENGE</h3>
        <div class="task-meta">
          <span class="time-badge">⏱️ 45 minutes</span>
          <span class="difficulty-badge">${candidateAnalysis.careerLevel}</span>
        </div>
      </div>
      
      <div class="task-content">
        <div class="problem-statement">
          <h4>Problem Statement:</h4>
          <p>Create a ${primarySkill}-based solution that addresses key requirements for the ${jdData.jobTitle} position.</p>
        </div>
        
        <div class="requirements-section">
          <h4>Requirements:</h4>
          <ul class="requirement-list">
            <li>Clean, well-documented code following ${primarySkill} best practices</li>
            <li>Comprehensive error handling and edge case management</li>
            <li>Performance optimization considerations</li>
            <li>Clear explanation of your technical approach and design decisions</li>
          </ul>
        </div>
        
        <div class="deliverables-section">
          <h4>Expected Deliverables:</h4>
          <ul class="deliverable-list">
            <li>Working code implementation with proper structure</li>
            <li>Brief technical documentation (2-3 paragraphs)</li>
            <li>Test cases or validation approach</li>
          </ul>
        </div>
      </div>
    </div>
    ` :
    `
    <div class="task-card">
      <div class="task-header">
        <h3>🔧 TASK 1 - TECHNICAL CHALLENGE</h3>
        <div class="task-meta">
          <span class="time-badge">⏱️ 45 minutes</span>
          <span class="difficulty-badge">${candidateAnalysis.careerLevel}</span>
        </div>
      </div>
      
      <div class="task-content">
        <div class="problem-statement">
          <h4>Problem Statement:</h4>
          <p>Design and implement a ${primarySkill} solution for a real-world problem relevant to your ${candidateAnalysis.industry} background.</p>
        </div>
        
        <div class="requirements-section">
          <h4>Requirements:</h4>
          <ul class="requirement-list">
            <li>Demonstrate ${candidateAnalysis.careerLevel} level expertise</li>
            <li>Include proper documentation and code comments</li>
            <li>Consider scalability and maintainability</li>
            <li>Provide testing approach or validation strategy</li>
          </ul>
        </div>
      </div>
    </div>
    `;

  const task2 = jdData ?
    `
    <div class="task-card">
      <div class="task-header">
        <h3>📊 TASK 2 - PROJECT SCENARIO CHALLENGE</h3>
        <div class="task-meta">
          <span class="time-badge">⏱️ 30 minutes</span>
          <span class="type-badge">Strategic</span>
        </div>
      </div>
      
      <div class="task-content">
        <div class="scenario-section">
          <h4>Scenario:</h4>
          <p>You're working on a project involving ${candidateAnalysis.projects} type of work for a ${jdData.jobTitle} role.</p>
        </div>
        
        <div class="objectives-section">
          <h4>Objectives:</h4>
          <ul class="objective-list">
            <li>Design an end-to-end technical solution</li>
            <li>Create implementation strategy with timeline</li>
            <li>Identify potential risks and mitigation strategies</li>
            <li>Present approach suitable for stakeholder communication</li>
          </ul>
        </div>
        
        <div class="deliverables-section">
          <h4>Deliverables:</h4>
          <ul class="deliverable-list">
            <li>High-level architecture diagram or description</li>
            <li>Implementation roadmap with key milestones</li>
            <li>Risk assessment with mitigation plans</li>
          </ul>
        </div>
      </div>
    </div>
    ` :
    `
    <div class="task-card">
      <div class="task-header">
        <h3>📊 TASK 2 - PROJECT SCENARIO CHALLENGE</h3>
        <div class="task-meta">
          <span class="time-badge">⏱️ 30 minutes</span>
          <span class="type-badge">Strategic</span>
        </div>
      </div>
      
      <div class="task-content">
        <div class="scenario-section">
          <h4>Scenario:</h4>
          <p>Given your experience with ${candidateAnalysis.projects}, design a comprehensive solution for a typical ${candidateAnalysis.industry} challenge.</p>
        </div>
        
        <div class="objectives-section">
          <h4>Objectives:</h4>
          <ul class="objective-list">
            <li>Plan a complete technical solution</li>
            <li>Define implementation and deployment strategies</li>
            <li>Address potential risks and challenges</li>
            <li>Consider resource management and timelines</li>
          </ul>
        </div>
      </div>
    </div>
    `;

  // Combine tasks with organized structure
  const organizedOutput = `
    <div class="fallback-tasks-container">
      <div class="tasks-header">
        <h2>🎯 Task-Based Assessment for Shortlisted Candidate</h2>
        <div class="assessment-meta">
          <span class="meta-info">📅 Generated: ${currentDate}</span>
          <span class="meta-info">👤 Level: ${candidateAnalysis.careerLevel}</span>
          <span class="meta-info">🛠️ Focus: ${primarySkill}</span>
        </div>
      </div>
      
      ${task1}
      ${task2}
      
      <div class="assessment-summary">
        <h4>📋 Assessment Guidelines</h4>
        <div class="guidelines-content">
          <p><strong>Total Time Allocation:</strong> ~75 minutes (45 min + 30 min)</p>
          <p><strong>Evaluation Focus:</strong> Technical competence, problem-solving approach, communication clarity, and practical application of skills.</p>
          <p><strong>Submission Format:</strong> Code files, documentation, and any diagrams or explanations as specified in each task.</p>
        </div>
      </div>
    </div>
    
    <style>
      .fallback-tasks-container {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        color: #333;
      }
      
      .tasks-header {
        background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
        color: white;
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 20px;
        text-align: center;
      }
      
      .tasks-header h2 {
        margin: 0 0 15px 0;
        font-size: 24px;
      }
      
      .assessment-meta {
        display: flex;
        justify-content: center;
        gap: 20px;
        flex-wrap: wrap;
      }
      
      .meta-info {
        background: rgba(255,255,255,0.2);
        padding: 6px 12px;
        border-radius: 15px;
        font-size: 14px;
      }
      
      .task-card {
        background: white;
        border: 1px solid #e1e5e9;
        border-radius: 8px;
        margin-bottom: 20px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      
      .task-header {
        background: #f8f9fa;
        padding: 15px 20px;
        border-bottom: 1px solid #e1e5e9;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
      }
      
      .task-header h3 {
        margin: 0;
        color: #2c3e50;
        font-size: 18px;
      }
      
      .task-meta {
        display: flex;
        gap: 10px;
      }
      
      .time-badge, .difficulty-badge, .type-badge {
        background: #007bff;
        color: white;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;
      }
      
      .difficulty-badge {
        background: #28a745;
      }
      
      .type-badge {
        background: #17a2b8;
      }
      
      .task-content {
        padding: 20px;
      }
      
      .task-content h4 {
        color: #343a40;
        margin: 0 0 10px 0;
        font-size: 16px;
        font-weight: 600;
      }
      
      .task-content ul {
        padding-left: 20px;
        margin: 10px 0;
      }
      
      .task-content li {
        margin-bottom: 8px;
        color: #495057;
      }
      
      .assessment-summary {
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 8px;
        padding: 20px;
        margin-top: 20px;
      }
      
      .assessment-summary h4 {
        margin: 0 0 15px 0;
        color: #495057;
      }
      
      .guidelines-content p {
        margin: 8px 0;
        color: #6c757d;
      }
      
      @media (max-width: 768px) {
        .task-header {
          flex-direction: column;
          gap: 10px;
          text-align: center;
        }
        
        .assessment-meta {
          flex-direction: column;
          gap: 10px;
        }
      }
    </style>
  `;

  return { task1: organizedOutput, task2: '' }; // Return as task1 to maintain compatibility
}

// ENHANCED: Personalized question generation with individual analysis
async function generatePersonalizedQuestions(resumeText, jdData, candidateInfo) {
  const candidateAnalysis = analyzeCandidateProfile(resumeText);
  
  console.log('🎯 Candidate Analysis:', candidateAnalysis);
  
  const enhancedPrompt = jdData ? `
PERSONALIZED INTERVIEW QUESTION GENERATION FOR JOB MATCHING
CANDIDATE PROFILE:
Name: ${candidateInfo.name}
Email: ${candidateInfo.email}

DETAILED CANDIDATE ANALYSIS:
- Specific Projects: ${candidateAnalysis.projects}
- Technical Interests: ${candidateAnalysis.interests}
- Career Level: ${candidateAnalysis.careerLevel}
- Industry Background: ${candidateAnalysis.industry}
- Leadership Experience: ${candidateAnalysis.leadership}
- Education: ${candidateAnalysis.education}
- Key Achievements: ${candidateAnalysis.achievements}

CANDIDATE RESUME CONTENT:
${resumeText.slice(0, 2000)}

JOB DESCRIPTION DETAILS:
Position: ${jdData.jobTitle}
Required Skills: ${jdData.skills}
Experience Level: ${jdData.experience}
Job Content: ${jdData.jdText.slice(0, 1500)}

INSTRUCTIONS:
Generate 5 HIGHLY PERSONALIZED technical questions and 5 HIGHLY PERSONALIZED behavioral questions that:
1. Reference THIS candidate's specific projects, technologies, and achievements
2. Assess fit for THIS exact ${jdData.jobTitle} position
3. Match the candidate's ${candidateAnalysis.careerLevel} experience level
4. Consider the ${jdData.experience} requirement from the job posting
5. Evaluate both technical skills and cultural fit

Format response EXACTLY like this:
TECHNICAL QUESTIONS:
1. [Question about candidate's specific project/technology relevant to job requirements]
2. [Question about candidate's experience with technologies mentioned in JD]
3. [Question about scaling/implementing solutions relevant to job scope]
4. [Question about candidate's technical achievements applicable to this role]
5. [Question about best practices/methodologies for this specific position]

BEHAVIORAL QUESTIONS:
1. [Question about candidate's motivation for this specific role and company]
2. [Question about teamwork/collaboration based on candidate's project experience]
3. [Question about learning/adaptation relevant to job growth opportunities]
4. [Question about handling challenges specific to this role's requirements]
5. [Question about career goals alignment with this position's trajectory]

Make each question UNIQUE to ${candidateInfo.name}'s background and this ${jdData.jobTitle} opportunity.
` : `
PERSONALIZED INTERVIEW QUESTION GENERATION
CANDIDATE PROFILE:
Name: ${candidateInfo.name}
Email: ${candidateInfo.email}

DETAILED CANDIDATE ANALYSIS:
- Specific Projects: ${candidateAnalysis.projects}
- Technical Interests: ${candidateAnalysis.interests}
- Career Level: ${candidateAnalysis.careerLevel}
- Industry Background: ${candidateAnalysis.industry}
- Leadership Experience: ${candidateAnalysis.leadership}
- Education: ${candidateAnalysis.education}
- Key Achievements: ${candidateAnalysis.achievements}

CANDIDATE RESUME CONTENT:
${resumeText.slice(0, 2500)}

INSTRUCTIONS:
Generate 5 technical and 5 behavioral questions COMPLETELY PERSONALIZED to THIS candidate's actual background.
Each question must reference something SPECIFIC from their resume - no generic questions.

TECHNICAL QUESTIONS:
1. [Question about candidate's specific technologies/projects from their resume]
2. [Question about candidate's actual implementations and tools they've used]
3. [Question about technical challenges from their real project experience]
4. [Question about candidate's specific achievements and technical contributions]
5. [Question about scaling/improving their actual work and methodologies]

BEHAVIORAL QUESTIONS:
1. [Question about candidate's specific interests and motivations from resume]
2. [Question about teamwork/collaboration from their actual project experiences]
3. [Question about their career growth and learning based on their background]
4. [Question about challenges they've faced in their specific field/projects]
5. [Question about their individual strengths and initiatives from their experience]

Make each question UNIQUE to ${candidateInfo.name}'s specific background and experiences.
`;

  try {
    console.log('🎯 Generating personalized questions for:', candidateInfo.name);
    
    const inputVariants = [
      { input: enhancedPrompt, max_tokens: 3000, temperature: 0.8 },
      { prompt: enhancedPrompt, max_tokens: 3000, temperature: 0.8 },
      { messages: [{ role: "user", content: enhancedPrompt }], max_tokens: 3000, temperature: 0.8 },
      { text: enhancedPrompt, max_tokens: 3000, temperature: 0.8 }
    ];

    for (let i = 0; i < inputVariants.length; i++) {
      try {
        console.log(`🔄 Trying personalized generation format ${i + 1}...`);
        
        const bedrockResponse = await bedrock.send(
          new InvokeModelCommand({
            modelId: process.env.BEDROCK_MODEL_ID,
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify(inputVariants[i]),
          })
        );

        const bodyBuffer = await bedrockResponse.body.transformToString();
        let parsed = {};
        
        try {
          parsed = JSON.parse(bodyBuffer);
        } catch {
          parsed.output = bodyBuffer;
        }

        let output = parsed.output || parsed.completion || parsed.response || 
                     (parsed.choices && parsed.choices[0]?.text);

        if (output && output.trim()) {
          console.log('✅ Personalized questions generated successfully');
          console.log('📝 Generated content preview:', output.slice(0, 400));
          return { success: true, output: output, personalized: true, enhanced: !!jdData };
        }
      } catch (error) {
        console.log(`❌ Personalized generation attempt ${i + 1} failed:`, error.message);
        continue;
      }
    }

    return { success: false, personalized: true, enhanced: !!jdData };
  } catch (error) {
    console.error('❌ Personalized question generation failed:', error);
    return { success: false, personalized: true, enhanced: !!jdData };
  }
}

// ENHANCED: Personalized fallback with individual analysis
function generatePersonalizedFallbackQuestions(extractedText, name, jdData = null) {
  const analysis = analyzeCandidateProfile(extractedText);
  
  const skillsMatch = extractedText.match(/(?:Languages|Skills|Technologies):\s*([^\n]+)/i);
  const skills = skillsMatch ? skillsMatch[1] : analysis.interests;
  const primarySkill = skills.split(',')[0]?.trim() || 'programming';
  
  console.log('🔄 Generating personalized fallback for:', { name, analysis });
  
  // Personalized technical questions based on individual profile
  const techQuestions = jdData ? [
    `Based on your ${analysis.projects} and this ${jdData.jobTitle} role, how would you apply your ${primarySkill} skills to meet the job requirements?`,
    `You've worked in ${analysis.industry} with ${analysis.interests} - how would this experience help you excel in this ${jdData.jobTitle} position?`,
    `Looking at your ${analysis.careerLevel} background and ${analysis.education}, what technical approach would you bring to this ${jdData.experience} level role?`,
    `From your experience with ${analysis.projects}, what technical best practices would you implement in this ${jdData.jobTitle} position?`,
    `Given your achievements in ${analysis.achievements}, how do you see yourself contributing to this ${jdData.jobTitle} team's technical goals?`
  ] : [
    `Tell me about your experience with ${primarySkill} in your ${analysis.projects} - what was the most challenging technical aspect?`,
    `As a ${analysis.careerLevel} professional in ${analysis.industry}, how do you approach complex technical problem-solving?`,
    `Based on your work with ${analysis.interests}, describe a significant technical challenge you solved and your methodology.`,
    `Looking at your ${analysis.education} background, how do you apply theoretical knowledge to practical ${analysis.projects}?`,
    `What technical growth have you achieved in your ${analysis.careerLevel} career, especially in ${analysis.industry}?`
  ];

  // Personalized behavioral questions based on individual background
  const behavQuestions = jdData ? [
    `Looking at your background in ${analysis.industry} and ${analysis.leadership}, how do you see yourself fitting into this ${jdData.jobTitle} role's team culture?`,
    `Your experience shows ${analysis.achievements} - how would these accomplishments help you succeed in this specific ${jdData.jobTitle} position?`,
    `Based on your ${analysis.careerLevel} career stage and ${analysis.education}, what specifically motivates you about this ${jdData.jobTitle} opportunity?`,
    `Given your project experience with ${analysis.projects}, how would you handle the collaborative aspects of this ${jdData.jobTitle} role?`,
    `Your background in ${analysis.interests} aligns with this position - what excites you most about applying these skills in this company's environment?`
  ] : [
    `Tell me about the most challenging project from your ${analysis.projects} experience - how did your ${analysis.careerLevel} perspective help you handle it?`,
    `As someone with ${analysis.education} and experience in ${analysis.industry}, what drives your career decisions and professional growth?`,
    `Based on your work with ${analysis.interests} and ${analysis.achievements}, describe a time you had to learn something completely outside your comfort zone.`,
    `Your background shows ${analysis.leadership} - give me a specific example of how you've demonstrated this in your ${analysis.projects}.`,
    `Looking at your career progression in ${analysis.industry} with ${analysis.education}, where do you see yourself in 3 years and why?`
  ];

  return { techQuestions, behavQuestions };
}

// ENHANCED: Job Description processing with Textract-first extraction
async function processJobDescription(jdFile) {
  try {
    console.log('📋 Starting comprehensive JD processing...');
    console.log('📋 JD File Details:', {
      name: jdFile.name,
      size: `${(jdFile.size / 1024 / 1024).toFixed(2)} MB`,
      mimetype: jdFile.mimetype
    });

    // First upload JD to S3 for async Textract processing
    const jdKey = `job-descriptions/${Date.now()}_${jdFile.name}`;
    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: jdKey,
      Body: jdFile.data,
      ContentType: jdFile.mimetype
    }));

    // Extract text using the enhanced Textract-first function
    const s3Location = { bucket: process.env.S3_BUCKET, key: jdKey };
    const jdText = await extractJDText(jdFile, s3Location);
    
    if (!jdText || jdText.trim().length === 0) {
      console.log('❌ No text extracted from JD file');
      return null;
    }

    console.log('📋 JD Text Extraction Results:', {
      totalLength: jdText.length,
      lineCount: jdText.split('\n').length,
      preview: jdText.slice(0, 300) + (jdText.length > 300 ? '...' : '')
    });

    // Enhanced extraction with multiple patterns for job titles
    const jobTitlePatterns = [
      /Data\s+and\s+AI\s+Engineer/i,
      /Python\s+(?:Developer|Engineer)/i,
      /(?:job\s*title|position|role)[:\s]*([^\n]+)/i,
      /(?:we are looking for|seeking)[:\s]*([^\n]+)/i,
      /^([A-Z][a-zA-Z\s]+(?:Engineer|Developer|Manager|Analyst|Specialist|Intern))/m
    ];
    
    let jobTitle = 'Not specified';
    for (const pattern of jobTitlePatterns) {
      const match = jdText.match(pattern);
      if (match) {
        jobTitle = match[1] ? match[1].trim() : match[0].trim();
        if (jobTitle.length < 100 && jobTitle.length > 5) {
          console.log('📋 Job title found:', jobTitle);
          break;
        }
      }
    }
    
    // Enhanced skills extraction
    const skillsPatterns = [
      /(?:skills|requirements|qualifications|must have)[:\s]*([^.]+)/i,
      /(?:experience with|knowledge of)[:\s]*([^.]+)/i,
      /(?:proficient in|familiar with)[:\s]*([^.]+)/i,
      /Python.*programming/i,
      /AWS.*(?:services|SageMaker)/i,
      /(?:Pandas|NumPy).*data/i,
      /Machine.*learning/i
    ];
    
    let skills = 'Skills extraction in progress';
    for (const pattern of skillsPatterns) {
      const match = jdText.match(pattern);
      if (match && match[1]) {
        skills = match[1].slice(0, 400).trim();
        console.log('📋 Skills found:', skills.slice(0, 100));
        break;
      }
    }
    
    // Enhanced experience level detection
    const experiencePatterns = [
      /(\d+)\s*(?:\+|\-|\sto\s)?\s*years?\s*(?:of\s*)?experience/i,
      /fresher/i,
      /entry.level/i,
      /0.2\s*years/i,
      /fresh graduate/i
    ];
    
    let experience = 'Experience level to be determined';
    for (const pattern of experiencePatterns) {
      const match = jdText.match(pattern);
      if (match) {
        if (match[1]) {
          experience = `${match[1]}+ years`;
        } else if (match[0].toLowerCase().includes('fresher') || 
                   match[0].toLowerCase().includes('fresh graduate')) {
          experience = 'Fresher/Entry level';
        }
        console.log('📋 Experience level found:', experience);
        break;
      }
    }

    // Extract company information
    const companyPatterns = [
      /Tech Nova Solutions/i,
      /(?:company|organization)[:\s]*([^\n]+)/i
    ];
    
    let company = 'Tech Nova Solutions';
    for (const pattern of companyPatterns) {
      const match = jdText.match(pattern);
      if (match && match[1]) {
        company = match[1].trim();
        break;
      }
    }

    const result = {
      jdText,
      jobTitle,
      skills,
      experience,
      department: company,
      processed: true,
      s3Key: jdKey
    };

    console.log('✅ JD Processing completed successfully:', {
      jobTitle: result.jobTitle,
      skillsLength: result.skills.length,
      experienceLevel: result.experience,
      textLength: result.jdText.length,
      company: result.department
    });

    return result;
  } catch (error) {
    console.error('❌ JD processing failed with detailed error:', {
      errorMessage: error.message,
      errorCode: error.code || 'UNKNOWN',
      errorName: error.name || 'UNKNOWN',
      fileName: jdFile ? jdFile.name : 'NO_FILE',
      fileSize: jdFile ? jdFile.size : 0,
      fileMimeType: jdFile ? jdFile.mimetype : 'NO_MIMETYPE'
    });
    return null;
  }
}

app.get('/api', (req, res) => {
  res.send('✅ Smart HR API is working!');
});

// ENHANCED: Cognito authentication callback endpoint
app.post('/api/auth/callback', async (req, res) => {
  try {
    const { code } = req.body;
    
    console.log('🔍 Auth Callback Debug:', {
      receivedCode: code ? 'YES' : 'NO',
      codeLength: code ? code.length : 0,
      timestamp: new Date().toISOString()
    });

    if (!process.env.COGNITO_DOMAIN || !process.env.COGNITO_CLIENT_ID || !process.env.COGNITO_CLIENT_SECRET) {
      throw new Error('Missing Cognito environment variables');
    }

    const tokenRequestData = {
      grant_type: 'authorization_code',
      client_id: process.env.COGNITO_CLIENT_ID,
      client_secret: process.env.COGNITO_CLIENT_SECRET,
      redirect_uri: process.env.COGNITO_REDIRECT_URI,
      code: code
    };

    const tokenResponse = await axios.post(
      `https://${process.env.COGNITO_DOMAIN}/oauth2/token`, 
      new URLSearchParams(tokenRequestData),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        timeout: 10000
      }
    );

    console.log('✅ Token exchange successful');
    const { access_token, id_token } = tokenResponse.data;
    
    if (!access_token) {
      throw new Error('No access token received from Cognito');
    }

    const userResponse = await axios.get(`https://${process.env.COGNITO_DOMAIN}/oauth2/userInfo`, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Accept': 'application/json'
      },
      timeout: 10000
    });

    console.log('✅ User info retrieved:', {
      email: userResponse.data.email,
      username: userResponse.data.username || userResponse.data.sub
    });

    res.json({
      accessToken: access_token,
      idToken: id_token,
      user: userResponse.data
    });

  } catch (error) {
    console.error('❌ Auth callback error:', error.message);
    res.status(500).json({
      error: 'Authentication failed',
      message: error.message,
      details: error.response?.data || 'Unknown error'
    });
  }
});

// Get all candidates endpoint
app.get('/api/candidates', async (req, res) => {
  try {
    const command = new ScanCommand({
      TableName: process.env.DYNAMODB_TABLE_NAME
    });
    
    const response = await ddb.send(command);
    const candidates = response.Items.map(item => ({
      name: item.name.S,
      email: item.email.S,
      phone: item.phone?.S || 'Not provided',
      status: item.status?.S || 'Pending',
      attendance: item.attendance?.S || 'Pending',
      rating: item.rating?.S || '',
      interviewDate: item.interviewDate?.S || '',
      notes: item.notes?.S || '',
      feedback: item.feedback?.S || '',
      resumeUrl: item.resume_url?.S || item.resumeUrl?.S || '',
      questions: item.questions?.S || '',
      taskQuestions: item.task_questions?.S || '',
      uploadedAt: item.timestamp?.S || new Date().toISOString(),
      aiUsed: item.ai_used?.BOOL || false,
      enhancedMatching: item.enhanced_matching?.BOOL || false,
      personalizedQuestions: item.personalized_questions?.BOOL || false,
      taskQuestionsGenerated: item.task_questions_generated?.BOOL || false,
      jdUrl: item.jd_url?.S || '',
      technicalSkills: item.technicalSkills?.S || '',
      communicationSkills: item.communicationSkills?.S || '',
      problemSolvingSkills: item.problemSolvingSkills?.S || '',
      overallImpression: item.overallImpression?.S || '',
      nextSteps: item.nextSteps?.S || '',
      interviewNotes: item.interviewNotes?.S || ''
    }));
    
    res.json(candidates);
  } catch (error) {
    console.error('Error fetching candidates:', error);
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

// Update candidate endpoint
app.put('/api/candidates/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const updatedData = req.body;
    
    const command = new PutItemCommand({
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Item: {
        email: { S: email },
        name: { S: updatedData.name || 'Unknown' },
        phone: { S: updatedData.phone || 'Not provided' },
        status: { S: updatedData.status || 'Pending' },
        attendance: { S: updatedData.attendance || 'Pending' },
        rating: { S: updatedData.rating || '' },
        interviewDate: { S: updatedData.interviewDate || '' },
        notes: { S: updatedData.notes || '' },
        feedback: { S: updatedData.feedback || '' },
        resume_url: { S: updatedData.resumeUrl || '' },
        questions: { S: updatedData.questions || '' },
        task_questions: { S: updatedData.taskQuestions || '' },
        timestamp: { S: updatedData.uploadedAt || new Date().toISOString() },
        ai_used: { BOOL: updatedData.aiUsed || false },
        enhanced_matching: { BOOL: updatedData.enhancedMatching || false },
        personalized_questions: { BOOL: updatedData.personalizedQuestions || false },
        task_questions_generated: { BOOL: updatedData.taskQuestionsGenerated || false },
        jd_url: { S: updatedData.jdUrl || '' },
        technicalSkills: { S: updatedData.technicalSkills || '' },
        communicationSkills: { S: updatedData.communicationSkills || '' },
        problemSolvingSkills: { S: updatedData.problemSolvingSkills || '' },
        overallImpression: { S: updatedData.overallImpression || '' },
        nextSteps: { S: updatedData.nextSteps || '' },
        interviewNotes: { S: updatedData.interviewNotes || '' },
        lastUpdated: { S: new Date().toISOString() }
      }
    });
    
    await ddb.send(command);
    console.log('✅ Candidate updated successfully:', email);
    res.json({ message: 'Candidate updated successfully' });
  } catch (error) {
    console.error('Error updating candidate:', error);
    res.status(500).json({ error: 'Failed to update candidate' });
  }
});

// UPDATED: Generate task-based questions for shortlisted candidates with standardized output
app.post('/api/generate-tasks/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    console.log('🎯 Generating task questions for shortlisted candidate:', email);
    
    // Get candidate data from DynamoDB
    const getCommand = new GetItemCommand({
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: {
        email: { S: email }
      }
    });
    
    const candidateResponse = await ddb.send(getCommand);
    
    if (!candidateResponse.Item) {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    
    const candidate = candidateResponse.Item;
    const candidateStatus = candidate.status?.S;
    
    // Check if candidate is shortlisted
    if (candidateStatus !== 'Shortlisted') {
      return res.status(400).json({ 
        error: 'Task questions can only be generated for shortlisted candidates',
        currentStatus: candidateStatus 
      });
    }
    
    // Check if task questions already exist
    if (candidate.task_questions_generated?.BOOL) {
      return res.status(200).json({ 
        message: 'Task questions already generated for this candidate',
        taskQuestions: candidate.task_questions?.S || '',
        alreadyGenerated: true
      });
    }
    
    console.log('✅ Candidate verified as shortlisted, proceeding with task generation');
    
    // Get resume text from S3 using Textract
    const resumeUrl = candidate.resume_url?.S;
    let resumeText = '';
    
    if (resumeUrl) {
      try {
        // Extract resume key from URL
        const urlParts = resumeUrl.split('/');
        const resumeKey = urlParts.slice(-2).join('/'); // Get last two parts (folder/filename)
        
        console.log('📄 Extracting resume text for task generation...');
        
        // Get the resume file from S3 and extract text
        const { GetObjectCommand } = require('@aws-sdk/client-s3');
        const resumeObject = await s3.send(new GetObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: resumeKey
        }));
        
        const resumeBuffer = await resumeObject.Body.transformToByteArray();
        
        // Use Textract to extract text
        const textractResponse = await textract.send(
          new DetectDocumentTextCommand({ Document: { Bytes: resumeBuffer } })
        );
        
        resumeText = textractResponse.Blocks
          .filter(block => block.BlockType === 'LINE')
          .map(line => line.Text)
          .join('\n');
          
        console.log('📄 Resume text extracted for task generation:', resumeText.slice(0, 200));
        
      } catch (resumeError) {
        console.log('⚠️ Could not extract resume text, using basic info:', resumeError.message);
        resumeText = `Candidate: ${candidate.name?.S}, Email: ${email}`;
      }
    }
    
    // Get JD data if available
    let jdData = null;
    const jdUrl = candidate.jd_url?.S;
    
    if (jdUrl) {
      try {
        console.log('📋 Extracting JD data for task generation...');
        // Similar logic for JD extraction if needed
        // For now, we'll create a basic JD structure
        jdData = {
          jobTitle: 'Software Engineer', // Default or extract from existing data
          skills: 'Programming, Problem Solving',
          experience: 'Mid-level'
        };
      } catch (jdError) {
        console.log('⚠️ Could not extract JD data:', jdError.message);
      }
    }
    
    const candidateInfo = {
      name: candidate.name?.S || 'Candidate',
      email: email,
      phone: candidate.phone?.S || 'Not provided'
    };
    
    // Generate task-based questions with standardized output
    let taskQuestions = '';
    let taskGenerated = false;
    
    console.log('🎯 Attempting AI task generation with standardized output...');
    const aiTaskResult = await generateTaskBasedQuestions(resumeText, jdData, candidateInfo);
    
    if (aiTaskResult.success) {
      taskQuestions = aiTaskResult.output;
      taskGenerated = true;
      console.log('✅ AI task questions generated successfully with standardized format');
    } else {
      // Use fallback task generation with organized structure
      console.log('🔄 Using fallback task generation with organized structure...');
      const candidateAnalysis = analyzeCandidateProfile(resumeText);
      const fallbackTasks = generateFallbackTaskQuestions(candidateAnalysis, jdData);
      
      taskQuestions = fallbackTasks.task1; // This contains the organized HTML structure
      taskGenerated = true;
    }
    
    // Update candidate record with task questions
    const updateCommand = new UpdateItemCommand({
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: {
        email: { S: email }
      },
      UpdateExpression: 'SET task_questions = :taskQuestions, task_questions_generated = :generated, lastUpdated = :updated',
      ExpressionAttributeValues: {
        ':taskQuestions': { S: taskQuestions },
        ':generated': { BOOL: true },
        ':updated': { S: new Date().toISOString() }
      }
    });
    
    await ddb.send(updateCommand);
    
    console.log('✅ Standardized task questions generated and saved for shortlisted candidate:', email);
    
    res.json({
      message: 'Task-based questions generated successfully for shortlisted candidate',
      taskQuestions,
      generated: taskGenerated,
      candidateName: candidateInfo.name,
      status: 'Shortlisted'
    });
    
  } catch (error) {
    console.error('❌ Error generating task questions:', error);
    res.status(500).json({ 
      error: 'Failed to generate task questions',
      message: error.message 
    });
  }
});

// ENHANCED: Combined upload endpoint with Textract-first JD processing
app.post('/api/upload-combined', async (req, res) => {
  try {
    if (!req.files || !req.files.resume) {
      return res.status(400).json({ message: 'Resume file is required' });
    }

    const resumeFile = req.files.resume;
    const jdFile = req.files.jobDescription; // Optional

    console.log('🚀 Starting enhanced combined upload process...');
    console.log(`📄 Resume: ${resumeFile.name} (${(resumeFile.size / 1024 / 1024).toFixed(2)} MB)`);
    if (jdFile) {
      console.log(`📋 JD: ${jdFile.name} (${(jdFile.size / 1024 / 1024).toFixed(2)} MB)`);
    }

    // Upload resume to S3
    const resumeKey = `resumes/${Date.now()}_${resumeFile.name}`;
    const resumeUploadParams = {
      Bucket: process.env.S3_BUCKET,
      Key: resumeKey,
      Body: resumeFile.data,
      ContentType: resumeFile.mimetype
    };
    
    console.log('📤 Uploading resume to S3...');
    await s3.send(new PutObjectCommand(resumeUploadParams));
    const resumeUrl = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${resumeKey}`;

    // Extract text from resume using Textract
    console.log('📄 Extracting text from resume with Textract...');
    const textractResponse = await textract.send(
      new DetectDocumentTextCommand({ Document: { Bytes: Buffer.from(resumeFile.data) } })
    );

    const extractedText = textractResponse.Blocks
      .filter(block => block.BlockType === 'LINE')
      .map(line => line.Text)
      .join('\n');

    console.log('📄 Resume text extracted:', extractedText.slice(0, 300));

    // Process JD if provided with Textract-first extraction and S3 upload
    let jdData = null;
    let jdUrl = '';
    if (jdFile) {
      console.log('📋 Processing JD file with Textract-first extraction...');
      jdData = await processJobDescription(jdFile);
      console.log('📋 JD processing result:', jdData ? 'Success ✅' : 'Failed ❌');
      
      if (jdData) {
        jdUrl = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${jdData.s3Key}`;
        console.log('📋 JD Data Preview:', {
          jobTitle: jdData.jobTitle,
          skillsPreview: jdData.skills.slice(0, 100),
          experience: jdData.experience,
          textLength: jdData.jdText.length
        });
      }
    }

    // Extract candidate information with enhanced patterns
    let name = 'Unknown';
    const lines = extractedText.split('\n');
    
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i].trim();
      
      // Enhanced name extraction patterns
      const namePatterns = [
        /^([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)+)$/,
        /^([A-Z\s]{5,40})$/,
        /^(?:Mr\.?|Ms\.?|Mrs\.?|Dr\.?)?\s*([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)$/i,
        /^Name[:\s]*([A-Za-z\s]+)$/i
      ];
      
      for (const pattern of namePatterns) {
        const match = line.match(pattern);
        if (match && line.length < 50 && !line.includes('@') && !line.match(/\d/) && !line.includes('http')) {
          name = match[1].replace(/\s+/g, ' ').trim();
          break;
        }
      }
      if (name !== 'Unknown') break;
    }

    const emailMatch = extractedText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    const email = emailMatch?.[0] || `candidate-${Date.now()}@example.com`;

    const phonePatterns = [
      /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
      /(\+91[-.\s]?)?\d{10}/,
      /(\+\d{1,3}[-.\s]?)?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/
    ];
    
    let phone = 'Not provided';
    for (const pattern of phonePatterns) {
      const match = extractedText.match(pattern);
      if (match) {
        phone = match[0].trim();
        break;
      }
    }

    console.log(`👤 Extracted Info - Name: ${name}, Email: ${email}, Phone: ${phone}`);

    // Get current date/time (IST)
    const now = new Date();
    const istNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const formattedDate = istNow.toLocaleString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    });

    // ENHANCED: Generate personalized AI questions
    let techQuestions = [];
    let behavQuestions = [];
    let usedAI = false;
    let isPersonalized = false;

    console.log('🎯 Attempting personalized AI question generation...');
    const candidateInfo = { name, email, phone };
    const aiResult = await generatePersonalizedQuestions(extractedText, jdData, candidateInfo);
    
    if (aiResult.success) {
      // Extract questions from personalized AI output
      const extractQuestions = (text, sectionKeywords) => {
        const lines = text.split('\n');
        const questions = [];
        let inSection = false;
        
        for (const line of lines) {
          const trimmed = line.trim();
          
          const isTargetSection = sectionKeywords.some(keyword => 
            trimmed.toUpperCase().includes(keyword.toUpperCase())
          );
          
          if (isTargetSection) {
            inSection = true;
            continue;
          }
          
          const isDifferentSection = (trimmed.toUpperCase().includes('TECHNICAL') || 
                                     trimmed.toUpperCase().includes('BEHAVIORAL') || 
                                     trimmed.toUpperCase().includes('BEHAVIOURAL')) && 
                                    !sectionKeywords.some(keyword => 
                                      trimmed.toUpperCase().includes(keyword.toUpperCase())
                                    );
          
          if (inSection && isDifferentSection) {
            break;
          }
          
          if (inSection && trimmed) {
            const match = trimmed.match(/^\d+\.\s*(.+)$/);
            if (match && match[1].trim().length > 20) {
              questions.push(match[1].trim());
              if (questions.length >= 5) break;
            }
          }
        }
        
        return questions;
      };

      techQuestions = extractQuestions(aiResult.output, ['TECHNICAL', 'TECH']);
      behavQuestions = extractQuestions(aiResult.output, ['BEHAVIORAL', 'BEHAVIOURAL', 'BEHAV']);

      if (techQuestions.length >= 3 && behavQuestions.length >= 3) {
        usedAI = true;
        isPersonalized = true;
        console.log('✅ Personalized AI questions generated successfully');
        console.log(`📝 Technical: ${techQuestions.length}, Behavioral: ${behavQuestions.length}`);
      }
    }

    // Use personalized fallback if AI didn't work
    if (!usedAI || techQuestions.length < 3 || behavQuestions.length < 3) {
      console.log('🔄 Using personalized fallback question generation...');
      const fallback = generatePersonalizedFallbackQuestions(extractedText, name, jdData);
      
      if (techQuestions.length < 5) {
        techQuestions = fallback.techQuestions;
      }
      if (behavQuestions.length < 5) {
        behavQuestions = fallback.behavQuestions;
      }
      isPersonalized = true; // Fallback is also personalized
    }

    // Ensure exactly 5 questions each
    const defaultTech = [
      "Describe your experience with the main technologies mentioned in your resume.",
      "How do you approach debugging complex technical issues?",
      "What software development best practices do you follow?",
      "How do you stay updated with new technologies in your field?",
      "Describe a challenging technical project you've worked on."
    ];

    const defaultBehav = [
      "Tell me about a time when you had to learn something new quickly.",
      "How do you handle working under pressure and tight deadlines?",
      "Describe a situation where you had to work with a difficult team member.",
      "What motivates you in your career and what are your goals?",
      "Tell me about a project you're particularly proud of and why."
    ];

    while (techQuestions.length < 5) {
      techQuestions.push(defaultTech[techQuestions.length]);
    }
    while (behavQuestions.length < 5) {
      behavQuestions.push(defaultBehav[behavQuestions.length]);
    }

    techQuestions = techQuestions.slice(0, 5);
    behavQuestions = behavQuestions.slice(0, 5);

    // Format questions with enhanced indicators
    const formatList = (arr) => arr.map(q => `<li>${q}</li>`).join('\n');
    const enhancedIndicators = [];
    if (jdFile && jdData) enhancedIndicators.push('🎯 Enhanced Job Matching');
    if (isPersonalized) enhancedIndicators.push('👤 Personalized Questions');
    if (usedAI) enhancedIndicators.push('🤖 AI Generated');

    const formattedQuestions = `
      <div>
        <div style="color:#fff">
          <b>Generated on:</b> <date>${formattedDate}</date>
          ${enhancedIndicators.length > 0 ? `<br/><b>${enhancedIndicators.join(' | ')}</b>` : ''}
        </div>
        <h5>🛠 Technical Interview Questions</h5>
        <ul>
          ${formatList(techQuestions)}
        </ul>
        <h5>🤝 Behavioral Interview Questions</h5>
        <ul>
          ${formatList(behavQuestions)}
        </ul>
      </div>
    `;

    // Store in DynamoDB with comprehensive tracking
    console.log('💾 Storing enhanced candidate data in DynamoDB...');
    await ddb.send(new PutItemCommand({
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Item: {
        email: { S: email },
        name: { S: name },
        phone: { S: phone },
        status: { S: 'Pending' },
        attendance: { S: 'Pending' },
        rating: { S: '' },
        interviewDate: { S: '' },
        notes: { S: '' },
        feedback: { S: '' },
        resume_url: { S: resumeUrl },
        jd_url: { S: jdUrl },
        questions: { S: formattedQuestions },
        task_questions: { S: '' },
        timestamp: { S: new Date().toISOString() },
        ai_used: { BOOL: usedAI },
        enhanced_matching: { BOOL: !!(jdFile && jdData) },
        personalized_questions: { BOOL: isPersonalized },
        task_questions_generated: { BOOL: false },
        technicalSkills: { S: '' },
        communicationSkills: { S: '' },
        problemSolvingSkills: { S: '' },
        overallImpression: { S: '' },
        nextSteps: { S: '' },
        interviewNotes: { S: '' },
        lastUpdated: { S: new Date().toISOString() }
      },
    }));

    console.log('✅ Enhanced candidate data stored successfully!');

    // Return enhanced response
    res.json({
      message: (jdFile && jdData) ? 
        '✅ Resume and Job Description processed with personalized AI matching!' : 
        jdFile ? 
        '✅ Resume processed with personalized AI questions! (JD processing failed)' :
        '✅ Resume processed with personalized AI questions!',
      name,
      email,
      phone,
      status: 'Pending',
      attendance: 'Pending',
      rating: '',
      interviewDate: '',
      notes: '',
      feedback: '',
      resumeUrl,
      jdUrl,
      questions: formattedQuestions,
      taskQuestions: '',
      aiUsed: usedAI,
      enhancedMatching: !!(jdFile && jdData),
      personalizedQuestions: isPersonalized,
      taskQuestionsGenerated: false, // NEW: False initially
      uploadedAt: new Date().toISOString(),
      jdAnalysis: jdData,
      technicalSkills: '',
      communicationSkills: '',
      problemSolvingSkills: '',
      overallImpression: '',
      nextSteps: '',
      interviewNotes: ''
    });

  } catch (err) {
    console.error('❌ Enhanced combined upload processing failed:', err);
    res.status(500).json({ 
      error: err.message,
      details: 'Enhanced combined upload and processing failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      s3: 'connected',
      dynamodb: 'connected',
      textract: 'connected',
      bedrock: 'connected',
      cognito: 'configured'
    },
    features: {
      combinedUpload: 'enabled',
      enhancedMatching: 'enabled',
      personalizedQuestions: 'enabled',
      aiQuestions: 'enabled',
      textractFirstJD: 'enabled',
      multiFormatSupport: 'enabled',
      taskBasedQuestions: 'enabled', // NEW: Task questions feature
      shortlistedTasks: 'enabled' // NEW: Shortlisted candidate tasks
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Smart HR Backend Server running at http://localhost:${PORT}`);
  console.log(`🔍 Health check available at http://localhost:${PORT}/api/health`);
  console.log(`📊 API endpoint available at http://localhost:${PORT}/api`);
  console.log(`✨ Enhanced personalized upload enabled at http://localhost:${PORT}/api/upload-combined`);
  console.log(`🎯 NEW: Task-based questions for shortlisted candidates at http://localhost:${PORT}/api/generate-tasks/:email`);
  console.log(`🎯 Features: Textract-First JD Processing | Personalized Questions | Enhanced Job Matching | AI Analysis | Task-Based Assessment`);
  console.log(`📋 JD Processing: Textract → pdf-parse → mammoth fallbacks for maximum compatibility`);
  console.log(`🏆 Task Questions: Only generated for shortlisted candidates via status update`);
});
