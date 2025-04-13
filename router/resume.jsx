const express = require('express');
const router = express.Router();
const { OpenAI } = require("openai");
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.API_KEY,
    baseURL: "https://openrouter.ai/api/v1"
});

// Add proper error handling for missing API key
if (!process.env.API_KEY) {
    console.error("API Key is missing");
    process.exit(1); // Exit if no API key
}

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/upload', upload.single('resume'), async (req, res) => {
    console.log("Upload endpoint hit"); // Debug log
    
    try {
        if (!req.file) {
            console.log("No file uploaded");
            return res.status(400).json({ 
                success: false, 
                error: "No resume file uploaded" 
            });
        }

        console.log(`Received file: ${req.file.originalname}, type: ${req.file.mimetype}`);

        let resumeText = '';
        const mimeType = req.file.mimetype;

        try {
            if (mimeType === 'application/pdf') {
                const pdfData = await pdfParse(req.file.buffer);
                resumeText = pdfData.text;
            } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                const result = await mammoth.extractRawText({ buffer: req.file.buffer });
                resumeText = result.value;
            } else if (mimeType === 'text/plain') {
                resumeText = req.file.buffer.toString('utf8');
            } else {
                return res.status(400).json({ 
                    success: false, 
                    error: "Unsupported file type. Please upload PDF, DOCX, or TXT." 
                });
            }
        } catch (parseError) {
            console.error("Error parsing file:", parseError);
            return res.status(400).json({ 
                success: false, 
                error: "Error parsing file. Please check the file format." 
            });
        }

        console.log("Resume text length:", resumeText.length);
        
        if (!resumeText || resumeText.length < 50) {
            return res.status(400).json({ 
                success: false, 
                error: "Resume content is empty or too short to analyze." 
            });
        }

        // Truncate very long resumes to avoid API limits
        const truncatedResume = resumeText.length > 10000 
            ? resumeText.substring(0, 10000) + "... [truncated]"
            : resumeText;

        const improvementPrompt = `As a professional career coach, analyze this resume and provide:
1. Specific improvement suggestions for format, content, and impact
2. Strengths and weaknesses
3. Key skills identified (technical and soft skills)

Resume:
${truncatedResume}`;

        const jobsPrompt = `Based on these skills from a resume, recommend:
1. 3-5 most suitable job titles
2. Industries that would value these skills
3. Salary ranges for each role (if possible)
4. Missing skills that would make the candidate more competitive

Skills identified:
${truncatedResume}`;

        console.log("Sending requests to OpenAI...");
        
        const [improvementResponse, jobsResponse] = await Promise.all([
            openai.chat.completions.create({
                model: "openai/gpt-3.5-turbo",
                messages: [{ role: "user", content: improvementPrompt }],
                temperature: 0.7
            }),
            openai.chat.completions.create({
                model: "openai/gpt-3.5-turbo",
                messages: [{ role: "user", content: jobsPrompt }],
                temperature: 0.7
            })
        ]);

        console.log("Received OpenAI responses");

        const improvementTips = improvementResponse?.choices?.[0]?.message?.content || "No improvement tips generated";
        const jobRecommendations = jobsResponse?.choices?.[0]?.message?.content || "No job recommendations generated";

        console.log("Improvement tips:", improvementTips.substring(0, 50) + "...");
        console.log("Job recommendations:", jobRecommendations.substring(0, 50) + "...");

        res.status(200).json({ 
            success: true, 
            improvementTips, 
            jobRecommendations 
        });

    } catch (err) {
        console.error("Error in upload endpoint:", err);
        res.status(500).json({ 
            success: false, 
            error: err.message || "An unexpected error occurred" 
        });
    }
});

module.exports = router;