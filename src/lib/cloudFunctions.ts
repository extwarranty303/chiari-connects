import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/firebase'; // Your Firebase app instance

const functions = getFunctions(app);

// ============================================
// Call Generate Symptom Report Function
// ============================================
export async function generateSymptomReport(startDate: string, endDate: string) {
  const generateReport = httpsCallable(functions, 'generateSymptomReport');
  
  try {
    const result = await generateReport({ startDate, endDate });
    return result.data;
  } catch (error: any) {
    console.error('Error generating report:', error);
    throw new Error(error.message || 'Failed to generate report');
  }
}

// ============================================
// Call Send Notification Email Function
// ============================================
export async function sendNotificationEmail(
  recipientEmail: string,
  subject: string,
  message: string
) {
  const sendEmail = httpsCallable(functions, 'sendNotificationEmail');
  
  try {
    const result = await sendEmail({ recipientEmail, subject, message });
    return result.data;
  } catch (error: any) {
    console.error('Error sending email:', error);
    throw new Error(error.message || 'Failed to send email');
  }
}