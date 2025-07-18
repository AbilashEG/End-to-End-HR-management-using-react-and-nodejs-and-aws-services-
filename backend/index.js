const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { TextractClient, DetectDocumentTextCommand } = require('@aws-sdk/client-textract');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { DynamoDBClient, PutItemCommand, ScanCommand } = require('@aws-sdk/client-dynamodb');

dotenv.config();

// TEMPORARY WORKAROUND: Force correct environment variables
console.log('🔧 Applying temporary environment variable overrides...');
process.env.COGNITO_REDIRECT_URI = 'http://localhost:3000/callback';
process.env.COGNITO_DOMAIN = 'us-east-1obypurn3b.auth.us-east-1.amazoncognito.com';
process.env.COGNITO_CLIENT_ID = '4hjvp1nlag5srb2mrn3cqolnjb';
process.env.COGNITO_CLIENT_SECRET = 'k92phqri8bpr783chp8fp1qg6bk69fo9dd7np6vr357len3qspc';
process.env.COGNITO_LOGOUT_URI = 'http://localhost:3000/';
process.env.COGNITO_REGION = 'us-east-1';




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

// Fallback question generator
function generateFallbackQuestions(extractedText, name) {
  const skillsMatch = extractedText.match(/Languages:\s*([^\n]+)/i);
  const toolsMatch = extractedText.match(/Tools:\s*([^\n]+)/i);
  const skills = skillsMatch ? skillsMatch[1] : "Python, SQL, HTML5";
  const tools = toolsMatch ? toolsMatch[1] : "AWS, GitHub, MySQL";
  
  const primarySkill = skills.split(',')[0]?.trim() || 'Python';
  const primaryTool = tools.split(',')[0]?.trim() || 'AWS';

  const techQuestions = [
    `Explain your experience with ${primarySkill} and how you've used it in your projects.`,
    `How would you optimize a SQL query for better performance in a large database?`,
    `Describe a challenging technical problem you solved recently and your approach.`,
    `What ${primaryTool} services have you worked with and how did you use them?`,
    `How do you ensure code quality and maintainability in your projects?`
  ];

  const behavQuestions = [
    `Tell me about a time when you had to learn a new technology quickly. How did you approach it?`,
    `How do you handle tight deadlines and pressure in your work?`,
    `Describe a situation where you had to work with a difficult team member. How did you handle it?`,
    `What motivates you in your career and what are your long-term goals?`,
    `Tell me about a project you're particularly proud of and why.`
  ];

  return { techQuestions, behavQuestions };
}

app.get('/api', (req, res) => {
  res.send('✅ Smart HR API is working!');
});

// ENHANCED: Cognito authentication callback endpoint with detailed debugging
app.post('/api/auth/callback', async (req, res) => {
  try {
    const { code } = req.body;
    
    console.log('🔍 Auth Callback Debug:', {
      receivedCode: code ? 'YES' : 'NO',
      codeLength: code ? code.length : 0,
      timestamp: new Date().toISOString()
    });

    // Validate environment variables
    if (!process.env.COGNITO_DOMAIN || !process.env.COGNITO_CLIENT_ID || !process.env.COGNITO_CLIENT_SECRET) {
      throw new Error('Missing Cognito environment variables');
    }

    // Build token request data
    const tokenRequestData = {
      grant_type: 'authorization_code',
      client_id: process.env.COGNITO_CLIENT_ID,
      client_secret: process.env.COGNITO_CLIENT_SECRET,
      redirect_uri: process.env.COGNITO_REDIRECT_URI,
      code: code
    };

    console.log('🔍 Token Request Debug:', {
      url: `https://${process.env.COGNITO_DOMAIN}/oauth2/token`,
      grant_type: tokenRequestData.grant_type,
      client_id: tokenRequestData.client_id,
      redirect_uri: tokenRequestData.redirect_uri,
      hasClientSecret: !!tokenRequestData.client_secret,
      hasCode: !!tokenRequestData.code
    });

    // Exchange code for tokens
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

    // Get user info
    console.log('🔍 Fetching user info...');
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
    console.error('❌ Auth callback error details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method
    });

    // Return detailed error information
    const errorResponse = {
      error: 'Authentication failed',
      message: error.message,
      details: error.response?.data || 'Unknown error',
      status: error.response?.status || 500
    };

    res.status(500).json(errorResponse);
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
      uploadedAt: item.timestamp?.S || new Date().toISOString(),
      aiUsed: item.ai_used?.BOOL || false
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
        name: { S: updatedData.name },
        phone: { S: updatedData.phone || 'Not provided' },
        status: { S: updatedData.status || 'Pending' },
        attendance: { S: updatedData.attendance || 'Pending' },
        rating: { S: updatedData.rating || '' },
        interviewDate: { S: updatedData.interviewDate || '' },
        notes: { S: updatedData.notes || '' },
        feedback: { S: updatedData.feedback || '' },
        resume_url: { S: updatedData.resumeUrl || '' },
        questions: { S: updatedData.questions || '' },
        timestamp: { S: updatedData.uploadedAt || new Date().toISOString() },
        ai_used: { BOOL: updatedData.aiUsed || false }
      }
    });
    
    await ddb.send(command);
    res.json({ message: 'Candidate updated successfully' });
  } catch (error) {
    console.error('Error updating candidate:', error);
    res.status(500).json({ error: 'Failed to update candidate' });
  }
});

// FIXED: Enhanced upload endpoint with S3 ACL issue resolved
app.post('/api/upload', async (req, res) => {
  try {
    if (!req.files || !req.files.resume) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const file = req.files.resume;
    const key = `${Date.now()}_${file.name}`;

    // ✅ FIXED: Upload to S3 WITHOUT ACL parameter (this was causing the error)
    const uploadParams = {
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: file.data,
      ContentType: file.mimetype
      // ✅ REMOVED: ACL: 'public-read' - this was causing the "bucket doesn't allow ACLs" error
    };
    
    console.log('📤 Uploading to S3 without ACL...');
    await s3.send(new PutObjectCommand(uploadParams));

    const resumeUrl = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    console.log(`✅ Successfully uploaded to S3: ${resumeUrl}`);

    // Textract - extract text
    console.log('📄 Extracting text with Textract...');
    const textractResponse = await textract.send(
      new DetectDocumentTextCommand({ Document: { Bytes: Buffer.from(file.data) } })
    );
    const extractedText = textractResponse.Blocks
      .filter(block => block.BlockType === 'LINE')
      .map(line => line.Text)
      .join('\n');

    console.log('📄 Extracted Text:', extractedText.slice(0, 300));

    // Extract name (robust for uppercase/Indian names)
    let name = 'Unknown';
    const lines = extractedText.split('\n');
    for (let i = 0; i < Math.min(6, lines.length); i++) {
      const properCase = lines[i].trim().match(/^([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)+)$/);
      const allCaps = lines[i].trim().match(/^([A-Z\s]{5,})$/);
      if (properCase) {
        name = properCase[1];
        break;
      } else if (allCaps && lines[i].trim().length < 30) {
        name = allCaps[1].replace(/\s+/g, ' ').trim();
        break;
      }
    }

    // Extract email
    const emailMatch = extractedText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b/i);
    const email = emailMatch?.[0] || `anonymous-${Date.now()}@example.com`;

    // Extract phone number
    const phoneMatch = extractedText.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    const phone = phoneMatch?.[0] || 'Not provided';

    console.log(`👤 Name: ${name}`);
    console.log(`📧 Email: ${email}`);
    console.log(`📞 Phone: ${phone}`);

    // Get current date/time (IST)
    const now = new Date();
    const istNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    };
    const formattedDate = istNow.toLocaleString('en-IN', options);

    // Initialize questions with fallback
    let techQuestions = [];
    let behavQuestions = [];
    let usedAI = false;

    // Try Bedrock first
    try {
      const prompt = `Generate exactly 10 interview questions for this resume:

Technical Questions (1-5):
1. 
2. 
3. 
4. 
5. 

Behavioural Questions (6-10):
6. 
7. 
8. 
9. 
10. 

Resume: ${extractedText}

Output only the numbered questions, nothing else.`;

      console.log('🤖 Attempting Bedrock API call...');
      
      const inputVariants = [
        { input: prompt, max_tokens: 1000, temperature: 0.7 },
        { prompt: prompt, max_tokens: 1000, temperature: 0.7 },
        { messages: [{ role: "user", content: prompt }], max_tokens: 1000, temperature: 0.7 },
        { text: prompt, max_tokens: 1000, temperature: 0.7 },
        { input: prompt }
      ];

      let modelRawOutput = '';
      
      for (let i = 0; i < inputVariants.length; i++) {
        try {
          console.log(`🔄 Trying Bedrock input format ${i + 1}...`);
          
          const bedrockResponse = await bedrock.send(
            new InvokeModelCommand({
              modelId: process.env.BEDROCK_MODEL_ID,
              contentType: 'application/json',
              accept: 'application/json',
              body: JSON.stringify(inputVariants[i]),
            })
          );

          const bodyBuffer = await bedrockResponse.body.transformToString();
          console.log(`📥 Bedrock response ${i + 1}:`, bodyBuffer.slice(0, 200));

          let parsed = {};
          try {
            parsed = JSON.parse(bodyBuffer);
          } catch {
            parsed.output = bodyBuffer;
          }

          // Try to extract meaningful output
          if (parsed.output && parsed.output.trim()) {
            modelRawOutput = parsed.output;
            break;
          } else if (parsed.completion && parsed.completion.trim()) {
            modelRawOutput = parsed.completion;
            break;
          } else if (parsed.choices && Array.isArray(parsed.choices) && parsed.choices[0] && parsed.choices[0].text && parsed.choices[0].text.trim()) {
            modelRawOutput = parsed.choices[0].text;
            break;
          } else if (parsed.response && parsed.response.trim()) {
            modelRawOutput = parsed.response;
            break;
          }
        } catch (error) {
          console.log(`❌ Bedrock format ${i + 1} failed:`, error.message);
          continue;
        }
      }

      if (modelRawOutput && modelRawOutput.trim()) {
        console.log('🎯 Bedrock succeeded! Raw output:', modelRawOutput.slice(0, 300));
        
        // Extract numbered questions
        function extractNumberedRange(raw, min, max) {
          let lines = raw.split('\n');
          return lines
            .map(line => {
              const numMatch = line.match(/^(\d+)\.\s(.+)/);
              if (!numMatch) return null;
              const n = Number(numMatch[1]);
              if (n >= min && n <= max) return numMatch[2].trim();
              return null;
            })
            .filter(Boolean);
        }

        const extractedTech = extractNumberedRange(modelRawOutput, 1, 5);
        const extractedBehav = extractNumberedRange(modelRawOutput, 6, 10);

        if (extractedTech.length >= 3 || extractedBehav.length >= 3) {
          techQuestions = extractedTech.slice(0, 5);
          behavQuestions = extractedBehav.slice(0, 5);
          usedAI = true;
          console.log('✅ Successfully extracted questions from AI');
        }
      }
    } catch (error) {
      console.log('❌ Bedrock failed completely:', error.message);
    }

    // Use fallback if AI didn't work
    if (!usedAI || (techQuestions.length === 0 && behavQuestions.length === 0)) {
      console.log('🔄 Using fallback question generation...');
      const fallback = generateFallbackQuestions(extractedText, name);
      techQuestions = fallback.techQuestions;
      behavQuestions = fallback.behavQuestions;
    }

    // Ensure we have 5 questions of each type
    while (techQuestions.length < 5) {
      techQuestions.push(`Describe your experience with the technologies mentioned in your resume.`);
    }
    while (behavQuestions.length < 5) {
      behavQuestions.push(`Tell me about a challenging situation you faced and how you handled it.`);
    }

    function formatList(arr) {
      return arr.slice(0, 5).map(q => `<li>${q}</li>`).join('\n');
    }

    const formattedQuestions = `
      <div>
        <div style="color:#fff">
          <b>Current date:</b> <date>${formattedDate}</date>
        </div>
        <h5>🛠 Technical Interview Questions</h5>
        <ul>
          ${formatList(techQuestions)}
        </ul>
        <h5>🤝 Behavioural Interview Questions</h5>
        <ul>
          ${formatList(behavQuestions)}
        </ul>
      </div>
    `;

    console.log('✅ Questions generated successfully!');

    // Store in DynamoDB with HR workflow structure
    console.log('💾 Storing candidate data in DynamoDB...');
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
        questions: { S: formattedQuestions },
        timestamp: { S: new Date().toISOString() },
        ai_used: { BOOL: usedAI }
      },
    }));

    console.log('✅ Candidate data stored successfully!');

    // Return complete candidate object for HR workflow
    res.json({
      message: '✅ Resume uploaded and processed successfully!',
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
      questions: formattedQuestions,
      aiUsed: usedAI,
      uploadedAt: new Date().toISOString()
    });

  } catch (err) {
    console.error('❌ Upload failed:', err);
    res.status(500).json({ 
      error: err.message,
      details: 'Resume upload and processing failed'
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
