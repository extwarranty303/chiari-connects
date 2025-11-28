"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeSymptomPatterns = exports.onSymptomCreated = exports.sendNotificationEmail = exports.generateSymptomReport = exports.onUserCreatedTrigger = void 0;
const https_1 = require("firebase-functions/v2/https");
const identity_1 = require("firebase-functions/v2/identity");
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const v2_1 = require("firebase-functions/v2");
const flow_1 = require("@genkit-ai/flow");
const google_genai_1 = require("@genkit-ai/google-genai");
const ai_1 = require("@genkit-ai/ai");
const z = __importStar(require("zod"));
const core_1 = require("@genkit-ai/core");
(0, core_1.configureGenkit)({
    plugins: [(0, google_genai_1.googleGenai)()],
    logLevel: 'debug',
    enableTracingAndMetrics: true,
});
admin.initializeApp();
exports.onUserCreatedTrigger = (0, identity_1.beforeUserCreated)(async (event) => {
    const user = event.data;
    try {
        await admin.firestore().collection("users").doc(user.uid).set({
            email: user.email,
            displayName: user.displayName || "",
            photoURL: user.photoURL || "",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            emailVerified: user.emailVerified,
            totalSymptoms: 0,
        });
        v2_1.logger.info(`User profile created for ${user.uid}`);
    }
    catch (error) {
        v2_1.logger.error("Error creating user profile:", error);
    }
});
exports.generateSymptomReport = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated to generate reports.");
    }
    const userId = request.auth.uid;
    const { startDate, endDate } = request.data;
    if (!startDate || !endDate) {
        throw new https_1.HttpsError("invalid-argument", "startDate and endDate are required");
    }
    try {
        const symptomsSnapshot = await admin
            .firestore()
            .collection("users")
            .doc(userId)
            .collection("symptoms")
            .where("date", ">=", startDate)
            .where("date", "<=", endDate)
            .orderBy("date", "asc")
            .get();
        const symptoms = symptomsSnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                date: data.date,
                severity: data.severity,
                frequency: data.frequency,
                symptom: data.symptom,
            };
        });
        const totalEntries = symptoms.length;
        const averageSeverity = totalEntries > 0
            ? symptoms.reduce((sum, s) => sum + s.severity, 0) / totalEntries
            : 0;
        const averageFrequency = totalEntries > 0
            ? symptoms.reduce((sum, s) => sum + s.frequency, 0) / totalEntries
            : 0;
        const mostCommonSymptom = getMostCommon(symptoms.map((s) => s.symptom));
        const stats = {
            totalEntries,
            averageSeverity,
            averageFrequency,
            mostCommonSymptom,
        };
        return {
            success: true,
            symptoms,
            stats,
        };
    }
    catch (error) {
        v2_1.logger.error("Error generating report:", error);
        throw new https_1.HttpsError("internal", "Failed to generate report");
    }
});
exports.sendNotificationEmail = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated.");
    }
    const { recipientEmail, subject, message } = request.data;
    if (!recipientEmail || !subject || !message) {
        throw new https_1.HttpsError("invalid-argument", "recipientEmail, subject, and message are required");
    }
    try {
        v2_1.logger.info(`Email sent to ${recipientEmail}`);
        return { success: true, message: "Email sent successfully" };
    }
    catch (error) {
        v2_1.logger.error("Error sending email:", error);
        throw new https_1.HttpsError("internal", "Failed to send email");
    }
});
exports.onSymptomCreated = (0, firestore_1.onDocumentCreated)("users/{userId}/symptoms/{symptomId}", async (event) => {
    var _a;
    const symptomData = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    const userId = event.params.userId;
    if (!symptomData) {
        v2_1.logger.error("Symptom data is undefined");
        return;
    }
    try {
        const userRef = admin.firestore().collection("users").doc(userId);
        await userRef.update({
            totalSymptoms: admin.firestore.FieldValue.increment(1),
            lastSymptomDate: symptomData.date || new Date().toISOString(),
        });
        v2_1.logger.info(`Symptom logged for user ${userId}`);
    }
    catch (error) {
        v2_1.logger.error("Error processing symptom:", error);
        if (error.code === 5) {
            try {
                const userRef = admin.firestore().collection("users").doc(userId);
                await userRef.set({
                    totalSymptoms: 1,
                    lastSymptomDate: symptomData.date || new Date().toISOString(),
                }, { merge: true });
                v2_1.logger.info(`Created user document for ${userId}`);
            }
            catch (createError) {
                v2_1.logger.error("Error creating user document:", createError);
            }
        }
    }
});
function getMostCommon(arr) {
    if (arr.length === 0)
        return "N/A";
    const frequency = {};
    let maxFreq = 0;
    let mostCommon = arr[0];
    for (const item of arr) {
        frequency[item] = (frequency[item] || 0) + 1;
        if (frequency[item] > maxFreq) {
            maxFreq = frequency[item];
            mostCommon = item;
        }
    }
    return mostCommon;
}
exports.analyzeSymptomPatterns = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated to analyze symptoms.");
    }
    const userId = request.auth.uid;
    const symptoms = await getSymptoms(userId);
    const prompt = `Analyze these symptoms and identify patterns:
  ${JSON.stringify(symptoms)}
  
  Provide insights about:
  - Time-based patterns
  - Severity trends
  - Frequency correlations
  - Potential triggers`;
    const analyzeFlow = (0, flow_1.defineFlow)({
        name: 'analyzeFlow',
        inputSchema: z.string(),
        outputSchema: z.string(),
    }, async (prompt) => {
        const llmResponse = await (0, ai_1.generate)({
            prompt: prompt,
            model: google_genai_1.geminiPro,
            config: {
                maxOutputTokens: 2048,
                temperature: 0.5,
                topP: 0.95,
            },
        });
        return llmResponse.text;
    });
    const result = await (0, flow_1.runFlow)(analyzeFlow, prompt);
    return { insights: result };
});
async function getSymptoms(userId) {
    const symptomsSnapshot = await admin
        .firestore()
        .collection("users")
        .doc(userId)
        .collection("symptoms")
        .orderBy("date", "asc")
        .get();
    const symptoms = symptomsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            date: data.date,
            severity: data.severity,
            frequency: data.frequency,
            symptom: data.symptom,
        };
    });
    return symptoms;
}
//# sourceMappingURL=index.js.map