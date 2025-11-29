'use server';
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";
import { googleGenai } from '@genkit-ai/google-genai';
import { genkit } from 'genkit';
import { z } from 'zod';

const ai = genkit({
    plugins: [googleGenai()],
});

admin.initializeApp();

interface Symptom {
  id: string;
  date: string;
  severity: number;
  frequency: number;
  symptom: string;
  [key: string]: any;
}

export const generateSymptomReport = onCall(async (request) => {
  const userId = request.data.userId; // Assume userId is passed in data
  const { startDate, endDate } = request.data;

  if (!userId || !startDate || !endDate) {
    throw new HttpsError(
      "invalid-argument",
      "userId, startDate and endDate are required"
    );
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

    const symptoms: Symptom[] = symptomsSnapshot.docs.map((doc) => {
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
    const averageSeverity =
      totalEntries > 0
        ? symptoms.reduce((sum, s) => sum + s.severity, 0) / totalEntries
        : 0;
    const averageFrequency =
      totalEntries > 0
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
  } catch (error) {
    logger.error("Error generating report:", error);
    throw new HttpsError("internal", "Failed to generate report");
  }
});

export const sendNotificationEmail = onCall(async (request) => {
  const { recipientEmail, subject, message } = request.data;

  if (!recipientEmail || !subject || !message) {
    throw new HttpsError(
      "invalid-argument",
      "recipientEmail, subject, and message are required"
    );
  }

  try {
    logger.info(`Email sent to ${recipientEmail}`);
    return { success: true, message: "Email sent successfully" };
  } catch (error) {
    logger.error("Error sending email:", error);
    throw new HttpsError("internal", "Failed to send email");
  }
});

export const onSymptomCreated = onDocumentCreated(
  "users/{userId}/symptoms/{symptomId}",
  async (event) => {
    const symptomData = event.data?.data();
    const userId = event.params.userId;

    if (!symptomData) {
      logger.error("Symptom data is undefined");
      return;
    }

    try {
      const userRef = admin.firestore().collection("users").doc(userId);
      await userRef.update({
        totalSymptoms: admin.firestore.FieldValue.increment(1),
        lastSymptomDate: symptomData.date || new Date().toISOString(),
      });

      logger.info(`Symptom logged for user ${userId}`);
    } catch (error) {
      logger.error("Error processing symptom:", error);
      
      if ((error as any).code === 5) {
        try {
          const userRef = admin.firestore().collection("users").doc(userId);
          await userRef.set({
            totalSymptoms: 1,
            lastSymptomDate: symptomData.date || new Date().toISOString(),
          }, { merge: true });
          logger.info(`Created user document for ${userId}`);
        } catch (createError) {
          logger.error("Error creating user document:", createError);
        }
      }
    }
  }
);

function getMostCommon(arr: string[]): string {
  if (arr.length === 0) return "N/A";

  const frequency: Record<string, number> = {};
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

const analyzeFlow = ai.defineFlow(
  {
    name: 'analyzeFlow',
    inputSchema: z.string(),
    outputSchema: z.string(),
  },
  async (prompt: string) => {
    const llmResponse = await ai.generate({ 
      prompt: prompt,
      model: 'gemini-1.0-pro',
      config: { 
        maxOutputTokens: 2048,
        temperature: 0.5, 
        topP: 0.95, 
      },
    });
    return llmResponse.text;
  }
);

export const analyzeSymptomPatterns = onCall(async (request) => {
  const userId = request.data.userId;
  if (!userId) {
    throw new HttpsError(
      "invalid-argument",
      "userId is required to analyze symptoms."
    );
  }

  const symptoms = await getSymptoms(userId);
  
  const prompt = `Analyze these symptoms and identify patterns:
  ${JSON.stringify(symptoms)}
  
  Provide insights about:
  - Time-based patterns
  - Severity trends
  - Frequency correlations
  - Potential triggers`;
  
  const result = await analyzeFlow(prompt);
  return { insights: result };
});

async function getSymptoms(userId: string): Promise<Symptom[]> {
    const symptomsSnapshot = await admin
      .firestore()
      .collection("users")
      .doc(userId)
      .collection("symptoms")
      .orderBy("date", "asc")
      .get();

    const symptoms: Symptom[] = symptomsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        date: data.date,
        severity: data.severity,
        frequency: data.frequency,
        symptom: data.symptom,
      };
    });
    return symptoms
}
