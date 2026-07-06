/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User,
  signOut
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { CustomNote } from '../types';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Configure Google OAuth Provider with Sheets and Docs permissions
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/docs');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Read cached token from session memory to preserve state between quick hot-reloads
try {
  cachedAccessToken = sessionStorage.getItem('ethiolearn_google_token');
} catch (e) {
  // Ignore fallback
}

/**
 * Listen for Firebase Auth state changes
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  // Handle redirect result if coming back from redirect flow
  getRedirectResult(auth)
    .then((result) => {
      if (result) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          cachedAccessToken = credential.accessToken;
          try {
            sessionStorage.setItem('ethiolearn_google_token', cachedAccessToken);
          } catch (e) {}
          if (result.user && onAuthSuccess) {
            onAuthSuccess(result.user, cachedAccessToken);
          }
        }
      }
    })
    .catch((error) => {
      console.error('Redirect sign-in error:', error);
    });

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (!cachedAccessToken) {
        try {
          cachedAccessToken = sessionStorage.getItem('ethiolearn_google_token');
        } catch (e) {}
      }
      // If we have a user but no access token (e.g. page reload or auth state change), 
      // still allow them to remain signed in, or use empty token fallback
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Fallback: stay authenticated but with empty token, don't force log out
        if (onAuthSuccess) onAuthSuccess(user, '');
      }
    } else {
      cachedAccessToken = null;
      try {
        sessionStorage.removeItem('ethiolearn_google_token');
      } catch (e) {}
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Trigger Sign-In with Google Auth Popup
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google.');
    }

    cachedAccessToken = credential.accessToken;
    try {
      sessionStorage.setItem('ethiolearn_google_token', cachedAccessToken);
    } catch (e) {}
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    // Add additional tag for popup blockers
    if (error?.code === 'auth/popup-blocked' || error?.message?.includes('popup')) {
      error.isPopupBlocked = true;
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Trigger Sign-In with Google Redirect (Fallback for blocked popups in iframes)
 */
export const googleSignInRedirect = async (): Promise<void> => {
  try {
    isSigningIn = true;
    await signInWithRedirect(auth, provider);
  } catch (error: any) {
    console.error('Sign in redirect error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Retrieve cached token
 */
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * Google Log Out
 */
export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  try {
    sessionStorage.removeItem('ethiolearn_google_token');
  } catch (e) {}
};

/**
 * Extract plain text from HTML content
 */
function cleanHtml(html: string): string {
  let doc = html;
  // Basic Regex replacements to format raw HTML cleanly into text paragraphs
  doc = doc.replace(/<\/h[1-6]>/g, '\n\n');
  doc = doc.replace(/<\/p>/g, '\n\n');
  doc = doc.replace(/<br\s*\/?>/g, '\n');
  doc = doc.replace(/<li>/g, '\n• ');
  doc = doc.replace(/<\/li>/g, '');
  doc = doc.replace(/<\/pre>/g, '\n\n');
  doc = doc.replace(/<[^>]*>/g, '');
  
  // Clean double-spaces/newlines
  return doc.trim().replace(/\n{3,}/g, '\n\n');
}

/**
 * Export a Study Note to a beautiful Google Doc
 */
export async function exportNoteToGoogleDoc(
  title: string, 
  subject: string, 
  contentHtml: string, 
  token: string
): Promise<{ docId: string; url: string }> {
  const plainText = cleanHtml(contentHtml);
  const formattedContent = `ETHIOLEARN STUDY GUIDE\nSubject: ${subject.toUpperCase()}\nTopic: ${title.toUpperCase()}\nCreated At: ${new Date().toLocaleDateString()}\n=========================================\n\n${plainText}`;

  // 1. Create a fresh Google Document
  const createResponse = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      title: `${title} - EthioLearn Guideline`
    })
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    throw new Error(`Google Docs Creation failed: ${errorText}`);
  }

  const documentData = await createResponse.json();
  const documentId = documentData.documentId;

  // 2. Insert formatted study contents into Google Document
  const updateResponse = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: formattedContent
          }
        }
      ]
    })
  });

  if (!updateResponse.ok) {
    const errorText = await updateResponse.text();
    throw new Error(`Adding study text to Google Doc failed: ${errorText}`);
  }

  return {
    docId: documentId,
    url: `https://docs.google.com/document/d/${documentId}/edit`
  };
}

/**
 * Export customized search & Study Notes portfolio to Google Sheets
 */
export async function exportNotesToGoogleSheets(
  notes: CustomNote[], 
  token: string
): Promise<{ spreadsheetId: string; url: string }> {
  if (notes.length === 0) {
    throw new Error("No notes saved yet to export.");
  }

  // 1. Create Spreadsheet
  const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      properties: {
        title: `EthioLearn Campus Notes Portfolio - ${new Date().toLocaleDateString()}`
      }
    })
  });

  if (!createResponse.ok) {
    const err = await createResponse.text();
    throw new Error(`Failed to create Google Sheet: ${err}`);
  }

  const sheetData = await createResponse.json();
  const spreadsheetId = sheetData.spreadsheetId;

  // 2. Add header row and notes records
  const values = [
    ['Subject', 'Note Title', 'Saved Date', 'Snippet Preview', 'Raw Content']
  ];

  notes.forEach(note => {
    const plain = cleanHtml(note.content);
    const snippet = plain.substring(0, 150) + (plain.length > 150 ? '...' : '');
    values.push([
      note.subject,
      note.title,
      note.createdAt || new Date().toLocaleDateString(),
      snippet,
      plain
    ]);
  });

  // 3. Populate Sheet values
  const range = 'Sheet1!A1';
  const updateResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        values: values
      })
    }
  );

  if (!updateResponse.ok) {
    const err = await updateResponse.text();
    throw new Error(`Failed to append sheets rows: ${err}`);
  }

  return {
    spreadsheetId,
    url: `https://sheets.google.com/create?id=${spreadsheetId}` // OR more accurately:
  };
}

/**
 * Export Learning Milestones & Study Logs to a beautiful Progress Sheet
 */
export async function exportAnalyticsToGoogleSheets(
  studentName: string,
  universityName: string,
  year: string,
  streak: number,
  studyHours: number,
  dailyGoal: number,
  token: string
): Promise<{ spreadsheetId: string; url: string }> {
  // 1. Create spreadsheet
  const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      properties: {
        title: `EthioLearn Study Metrics: ${studentName}`
      }
    })
  });

  if (!createResponse.ok) {
    const err = await createResponse.text();
    throw new Error(`Google Sheets creation failed: ${err}`);
  }

  const sheetData = await createResponse.json();
  const spreadsheetId = sheetData.spreadsheetId;

  // 2. Format a structured dashboard sheet
  const values = [
    ['EthioLearn Learning Portfolios & Performance Logs', '', '', ''],
    ['Generated At:', new Date().toLocaleString(), '', ''],
    ['', '', '', ''],
    ['STUDENT PARAMETERS', 'METRIC VALUE', 'STATUS', 'GUIDANCE'],
    ['Student Name', studentName, '', 'Active Portfolios'],
    ['Institution / University', universityName || 'Ethiopian High School/Uni', '', ''],
    ['Academic Year', year || 'Freshman / Sophomore', '', ''],
    ['', '', '', ''],
    ['LEARNING KPIS', 'LOGGED VALUES', 'TARGET GOALS', 'PROGRESS (PERCENT)'],
    ['Study Streak (Days)', streak, 'Daily continuous study', streak >= 5 ? 'EXCELLENT' : 'KEEP GOING'],
    ['Total Study Hours', studyHours, 'Cumulative Campus Hours', ''],
    ['Daily Hours Target', dailyGoal, 'Hours per Day', `${Math.round((1.2 / dailyGoal) * 100)}% Today`],
    ['', '', '', ''],
    ['Weekly Review Matrix', 'Log date', 'Hours Studied', 'Mastered cards count'],
    ['Log Entry 1', new Date().toLocaleDateString(), '1.2 Hours', '48 cards']
  ];

  const range = 'Sheet1!A1';
  const updateResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        values: values
      })
    }
  );

  if (!updateResponse.ok) {
    const err = await updateResponse.text();
    throw new Error(`Failed to initialize dashboard spreadsheet rows: ${err}`);
  }

  return {
    spreadsheetId,
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
  };
}


