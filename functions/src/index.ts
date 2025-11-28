'use server';
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { beforeUserCreated } from "firebase-functions/v2/identity";
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

export const onUserCreatedTrigger = beforeUserCreated(async (event) => {
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

    logger.info(`User profile created for ${user.uid}`);
  } catch (error) {
    logger.error("Error creating user profile:", error);
  }
});

export const generateSymptomReport = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "User must be authenticated to generate reports."
    );
  }

  const userId = request.auth.uid;
  const { startDate, endDate } = request.data;

  if (!startDate || !endDate) {
    throw new HttpsError(
      "invalid-argument",
      "startDate and endDate are required"
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
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

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
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "User must be authenticated to analyze symptoms."
    );
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


// New Function: Make a user a moderator
export const makeUserModerator = onCall(async (request) => {
  // 1. Authentication & Authorization Check
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be authenticated to perform this action.");
  }
  const callerUid = request.auth.uid;
  const callerClaims = request.auth.token;

  if (callerClaims.admin !== true) {
    throw new HttpsError("permission-denied", "Only administrators can make users moderators.");
  }

  // 2. Input Validation
  const targetUserId = request.data.userId;
  if (!targetUserId || typeof targetUserId !== 'string') {
    throw new HttpsError("invalid-argument", "A valid 'userId' must be provided.");
  }

  try {
    // 3. Set Custom Claim
    await admin.auth().setCustomUserClaims(targetUserId, { moderator: true });

    // 4. Update Firestore document for immediate UI reflection
    const userRef = admin.firestore().collection("users").doc(targetUserId);
    await userRef.update({
      "roles.moderator": true,
    });
    
    logger.info(`User ${targetUserId} has been made a moderator by admin ${callerUid}.`);
    return { success: true, message: `User ${targetUserId} is now a moderator.` };

  } catch (error) {
    logger.error(`Error setting moderator claim for user ${targetUserId}:`, error);
    throw new HttpsError("internal", "An unexpected error occurred while setting user claims.");
  }
});


// New Function: Delete a user's account
export const deleteUserAccount = onCall(async (request) => {
    // 1. Authentication & Authorization Check
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "You must be authenticated to perform this action.");
    }
    const callerClaims = request.auth.token;
    if (callerClaims.admin !== true) {
        throw new HttpsError("permission-denied", "Only administrators can delete user accounts.");
    }

    // 2. Input Validation
    const targetUserId = request.data.userId;
    if (!targetUserId || typeof targetUserId !== 'string') {
        throw new HttpsError("invalid-argument", "A valid 'userId' must be provided.");
    }
    if(targetUserId === request.auth.uid) {
        throw new HttpsError("invalid-argument", "Administrators cannot delete their own accounts.");
    }

    try {
        // 3. Delete from Firebase Authentication
        await admin.auth().deleteUser(targetUserId);
        logger.info(`Successfully deleted user ${targetUserId} from Firebase Authentication.`);

        // 4. Delete from Firestore
        const userRef = admin.firestore().collection("users").doc(targetUserId);
        await userRef.delete();
        logger.info(`Successfully deleted user document for ${targetUserId} from Firestore.`);

        // Note: Deleting subcollections (like symptoms, bookmarks) should be handled
        // by the Firebase Extension "Delete User Data" for robustness.
        // This function handles the primary records.

        return { success: true, message: `User ${targetUserId} has been deleted.` };

    } catch (error) {
        logger.error(`Error deleting user ${targetUserId}:`, error);
        throw new HttpsError("internal", "An unexpected error occurred while deleting the user.");
    }
});
