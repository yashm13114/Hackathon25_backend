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

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/upload', upload.single('resume'), async(req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No resume file uploaded" });
        }

        let resumeText = '';
        const mimeType = req.file.mimetype;

        // ✅ Handle PDF
        if (mimeType === 'application/pdf') {
            const pdfData = await pdfParse(req.file.buffer);
            resumeText = pdfData.text;
        }
        // ✅ Handle DOCX
        else if (
            mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ) {
            const result = await mammoth.extractRawText({ buffer: req.file.buffer });
            resumeText = result.value;
        }
        // ✅ Handle plain text
        else if (mimeType === 'text/plain') {
            resumeText = req.file.buffer.toString('utf8');
        } else {
            return res.status(400).json({ error: "Unsupported file type. Please upload PDF, DOCX, or TXT." });
        }

        if (!resumeText || resumeText.length < 50) {
            return res.status(400).json({ error: "Resume content is empty or too short to analyze." });
        }

        const prompt = `You are a resume expert. Provide *clear, constructive feedback* to improve the following resume:\n\n${resumeText}`;

        const response = await openai.chat.completions.create({
            model: "openai/gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7
        });

        const message =
            response &&
            response.choices &&
            Array.isArray(response.choices) &&
            response.choices.length > 0 &&
            response.choices[0].message &&
            response.choices[0].message.content ?
            response.choices[0].message.content :
            null;

        if (!message) {
            return res.status(500).json({ error: "Model response was empty. Please try again later." });
        }

        res.status(200).json({ success: true, tips: message });

    } catch (err) {
        console.error("Error processing resume:", err);
        res.status(500).json({ error: "An unexpected error occurred. Please try again later." });
    }
});

module.exports = router;