'use client';

import { useState } from 'react';
import {
  useCollection,
  useFirebase,
  useUserAuthState,
  useMemoFirebase,
} from '@/firebase';
import {
  collection,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

interface Symptom {
  date: any; 
  symptom: string;
  severity: number;
  frequency: number;
}

export default function SymptomTracker() {
  const [symptom, setSymptom] = useState('');
  const [severity, setSeverity] = useState(5);
  const [frequency, setFrequency] = useState(5);
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const { firestore, app } = useFirebase(); 
  const { user } = useUserAuthState();

  const symptomsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'users', user.uid, 'symptoms'),
      orderBy('date', 'desc')
    );
  }, [firestore, user]);

  const { data: symptoms, isLoading, error } = useCollection<Symptom>(symptomsQuery);

  const addSymptom = async () => {
    if (!symptom.trim() || !user || !firestore) return;

    await addDoc(collection(firestore, 'users', user.uid, 'symptoms'), {
      date: serverTimestamp(),
      symptom,
      severity,
      frequency,
    });

    setSymptom('');
    setSeverity(5);
    setFrequency(5);
  };

  const analyzeSymptoms = async () => {
    if (!app) return; 
    setAnalyzing(true);
    const functions = getFunctions(app);
    const analyzeSymptomPatterns = httpsCallable(functions, 'analyzeSymptomPatterns');
    try {
      const result = await analyzeSymptomPatterns();
      setAnalysis(result.data.insights);
    } catch (error) {
      console.error("Error analyzing symptoms:", error);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Symptom Tracker</h1>

      <div className="mb-4 p-4 border rounded-lg">
        <h2 className="font-bold mb-2">Add a New Symptom</h2>
        <input
          type="text"
          value={symptom}
          onChange={(e) => setSymptom(e.target.value)}
          placeholder="Symptom (e.g., Headache)"
          className="w-full p-2 border rounded mb-2"
        />
        <div className="mb-2">
          <label>Severity: {severity}</label>
          <input
            type="range"
            min="1"
            max="10"
            value={severity}
            onChange={(e) => setSeverity(Number(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="mb-2">
          <label>Frequency: {frequency}</label>
          <input
            type="range"
            min="1"
            max="10"
            value={frequency}
            onChange={(e) => setFrequency(Number(e.target.value))}
            className="w-full"
          />
        </div>
        <button onClick={addSymptom} className="bg-blue-500 text-white p-2 rounded">
          Add Symptom
        </button>
      </div>

      <div className="mb-4">
        <button onClick={analyzeSymptoms} className="bg-green-500 text-white p-2 rounded" disabled={analyzing}> 
          {analyzing ? 'Analyzing...' : 'Analyze Symptoms (AI)'}
        </button>
        {analysis && (
          <div className="mt-4 p-4 border rounded-lg bg-gray-100">
            <h3 className="font-bold mb-2">AI-Powered Analysis</h3>
            <p>{analysis}</p>
          </div>
        )}
      </div>

      <div>
        <h2 className="font-bold mb-2">Symptom History</h2>
        {isLoading && <p>Loading...</p>}
        {error && <p className="text-red-500">Error: {error.message}</p>}
        {symptoms && symptoms.length > 0 ? (
          <ul>
            {symptoms.map((symptom) => (
              <li key={symptom.id} className="mb-2 p-2 border rounded-lg">
                <p><strong>Symptom:</strong> {symptom.symptom}</p>
                <p><strong>Date:</strong> {symptom.date?.toDate().toLocaleString()}</p> 
                <p><strong>Severity:</strong> {symptom.severity}</p>
                <p><strong>Frequency:</strong> {symptom.frequency}</p>
              </li>
            ))}
          </ul>
        ) : (
          !isLoading && <p>No symptoms recorded yet.</p>
        )}
      </div>
    </div>
  );
}
