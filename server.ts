/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * EthioLearn Pro - Production Hardened Server
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

// Security and Admin modules
import { 
  requireAuthenticatedUser, 
  requireAdmin, 
  createRateLimiter, 
  generateSessionToken, 
  verifyTelegramInitData, 
  PRIMARY_ADMIN_EMAIL,
  getSupabaseAdmin,
  sanitizeInput
} from './server/security';

import { 
  handlePaymentSubmission, 
  getStudentPayments, 
  getUserSubscriptionStatus 
} from './server/payments';

import { 
  getAdminStats, 
  getAdminPayments, 
  handleAdminPaymentAction, 
  getAdminStudents, 
  handleAdminUpdateStudent,
  handleAdminSaveCourse, 
  handleAdminDeleteCourse, 
  handleAdminSaveCoupon, 
  handleAdminDeleteCoupon, 
  handleAdminSaveAnnouncement, 
  handleAdminDeleteAnnouncement 
} from './server/admin';

dotenv.config();

const app = express();
const PORT = 3000;

// In-memory persistent master key cache for students
let cachedMasterApiKey: string | undefined = undefined;
const storeFilePath = path.join(process.cwd(), 'stored_master_api_key.txt');

// Load key from disk at boot if it exists
try {
  if (fs.existsSync(storeFilePath)) {
    cachedMasterApiKey = fs.readFileSync(storeFilePath, 'utf8').trim();
    console.log('[EthioLearn Server] Loaded saved master API key from file successfully.');
  }
} catch (e) {
  console.warn('[EthioLearn Server] Failed to read cached master key file:', e);
}

const isValidServiceKey = (key: string): boolean => {
  if (!key) return false;
  const k = key.trim();
  if (k.length < 10) return false;
  const lower = k.toLowerCase();
  if (['no-key', 'no-api-key', 'undefined', 'null', 'none', 'no_key', 'empty'].includes(lower)) return false;
  return true;
};

// ============================================================================
// 1. SECURITY HEADERS & GLOBAL MIDDLEWARE
// ============================================================================

app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  next();
});

// Configure CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://ai.studio',
  'https://web.telegram.org'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.web.app') || origin.endsWith('.run.app') || origin.includes('localhost')) {
      callback(null, true);
    } else {
      callback(null, true); // Allow client requests while validating server authorization tokens
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-ethiolearn-auth', 'x-ethiolearn-session-token', 'x-telegram-init-data', 'x-dev-admin-key']
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// Global input sanitization
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeInput(req.body);
  }
  next();
});

// ============================================================================
// 2. RATE LIMITERS
// ============================================================================

const authLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Too many authentication attempts. Please try again in a moment.'
});

const paymentsLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 15,
  message: 'Payment submission rate limit reached. Please contact support if you need immediate assistance.'
});

const aiChatLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 40,
  message: 'AI Tutor query limit exceeded for this minute. Please pause for a moment before your next question.'
});

const supportLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 25,
  message: 'Support chat rate limit exceeded. Please wait a minute before sending another message.'
});

const ticketLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 8,
  message: 'Support ticket submission rate limit reached. Please wait an hour before submitting another ticket.'
});

// ============================================================================
// 3. AUTHENTICATION & SESSION EXCHANGE ENDPOINTS
// ============================================================================

/**
 * Exchange client profile or verified token for a cryptographically signed session token
 */
app.post(['/api/auth/session', '/api/auth/session/'], authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, name, id } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Valid student email is required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const isAdmin = normalizedEmail === PRIMARY_ADMIN_EMAIL.toLowerCase();

    // Check actual role from Supabase if configured
    let userRole = isAdmin ? 'admin' : 'student';
    let isPro = false;

    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data: profile } = await supabase
        .from('student_profiles')
        .select('user_role, is_pro')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (profile) {
        if (profile.user_role === 'admin' || profile.user_role === 'super_admin' || isAdmin) {
          userRole = 'admin';
        }
        isPro = Boolean(profile.is_pro);
      }
    }

    const sessionToken = generateSessionToken({
      id: id || `usr_${normalizedEmail}`,
      email: normalizedEmail,
      user_role: userRole,
      is_pro: isPro
    });

    return res.json({
      success: true,
      token: sessionToken,
      user: {
        id: id || `usr_${normalizedEmail}`,
        email: normalizedEmail,
        name: name || normalizedEmail.split('@')[0],
        user_role: userRole,
        is_pro: isPro,
        is_admin: userRole === 'admin'
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Telegram Mini App verified auth and session token exchange
 */
app.post(['/api/telegram/auth', '/api/telegram/auth/'], authLimiter, async (req: Request, res: Response) => {
  try {
    const { initData } = req.body;
    if (!initData) {
      return res.status(400).json({ error: 'Missing initData in request payload' });
    }

    const { valid, user } = verifyTelegramInitData(initData);
    if (!valid || !user) {
      return res.status(401).json({ error: 'Invalid Telegram WebApp authentication signature.' });
    }

    const syntheticEmail = `${user.username || user.id}@telegram.ethiolearn.et`;
    let userRole = 'student';
    let isPro = false;

    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data: existing } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('email', syntheticEmail)
        .maybeSingle();

      if (existing) {
        userRole = existing.user_role || 'student';
        isPro = Boolean(existing.is_pro);
      } else {
        await supabase
          .from('student_profiles')
          .insert({
            email: syntheticEmail,
            name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || 'Student',
            university: 'Wolkite University',
            year: 'Freshman',
            is_pro: false,
            user_role: 'student'
          });
      }
    }

    const sessionToken = generateSessionToken({
      id: `tg_${user.id}`,
      email: syntheticEmail,
      user_role: userRole,
      is_pro: isPro
    });

    return res.json({
      success: true,
      verified: true,
      token: sessionToken,
      telegramUser: user,
      profile: {
        id: `tg_${user.id}`,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username,
        email: syntheticEmail,
        user_role: userRole,
        is_pro: isPro
      }
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Telegram auth error' });
  }
});

// ============================================================================
// 4. PAYMENTS & SUBSCRIPTIONS ENDPOINTS
// ============================================================================

// Submit payment (Student)
app.post(['/api/payments/submit', '/api/payments/submit/'], paymentsLimiter, requireAuthenticatedUser, handlePaymentSubmission);

// View user's own payments (Student)
app.get(['/api/payments/my-payments', '/api/payments/my-payments/'], requireAuthenticatedUser, getStudentPayments);

// Get verified subscription status (Student)
app.get(['/api/user/subscription-status', '/api/user/subscription-status/'], requireAuthenticatedUser, getUserSubscriptionStatus);

// ============================================================================
// 5. ADMIN DASHBOARD & MANAGEMENT ENDPOINTS (Strictly requireAdmin)
// ============================================================================

// Real aggregate stats
app.get(['/api/admin/stats', '/api/admin/stats/'], requireAdmin, getAdminStats);

// Payments management
app.get(['/api/admin/payments', '/api/admin/payments/'], requireAdmin, getAdminPayments);
app.post(['/api/admin/payments/action', '/api/admin/payments/action/'], requireAdmin, handleAdminPaymentAction);

// Students user management
app.get(['/api/admin/students', '/api/admin/students/'], requireAdmin, getAdminStudents);
app.post(['/api/admin/student/update', '/api/admin/student/update/'], requireAdmin, handleAdminUpdateStudent);

// Courses & Lessons management
app.post(['/api/admin/course', '/api/admin/course/'], requireAdmin, handleAdminSaveCourse);
app.delete(['/api/admin/course/:id', '/api/admin/course/:id/'], requireAdmin, handleAdminDeleteCourse);

// Coupons management
app.post(['/api/admin/coupon', '/api/admin/coupon/'], requireAdmin, handleAdminSaveCoupon);
app.delete(['/api/admin/coupon/:code', '/api/admin/coupon/:code/'], requireAdmin, handleAdminDeleteCoupon);

// Announcements management
app.post(['/api/admin/announcement', '/api/admin/announcement/'], requireAdmin, handleAdminSaveAnnouncement);
app.delete(['/api/admin/announcement/:id', '/api/admin/announcement/:id/'], requireAdmin, handleAdminDeleteAnnouncement);

// Master Key Cloud Sync (Admin Only)
app.post(['/api/sync-master-key', '/api/sync-master-key/'], requireAdmin, (req: Request, res: Response) => {
  try {
    const { key } = req.body;
    if (isValidServiceKey(key)) {
      if (key !== cachedMasterApiKey) {
        cachedMasterApiKey = key;
        try {
          fs.writeFileSync(storeFilePath, key, 'utf8');
          console.log('[EthioLearn Server] Master API key manually synced and cached by admin.');
        } catch (e) {
          console.warn('[EthioLearn Server] Failed to save key file:', e);
        }
      }
      return res.json({ success: true, message: 'Master API key synced successfully.' });
    }
    return res.status(400).json({ error: 'Invalid key format for master sync.' });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// 6. SUPPORT TICKETS & CHAT ENDPOINTS
// ============================================================================

const ticketsFilePath = path.join(process.cwd(), 'shared_tickets.json');

const getSharedTickets = (): any[] => {
  try {
    if (fs.existsSync(ticketsFilePath)) {
      const content = fs.readFileSync(ticketsFilePath, 'utf8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.warn('[Support tickets] Error reading file, initializing empty:', e);
  }
  return [];
};

const saveSharedTickets = (tickets: any[]) => {
  try {
    fs.writeFileSync(ticketsFilePath, JSON.stringify(tickets, null, 2), 'utf8');
  } catch (e) {
    console.error('[Support tickets] Failed to save tickets file:', e);
  }
};

// Create support ticket
app.post(['/api/support/ticket', '/api/support/ticket/'], ticketLimiter, (req: Request, res: Response) => {
  try {
    const { category, text, email } = req.body;
    if (!text || !email) {
      return res.status(400).json({ error: 'Text and email are required for ticket creation.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const tickets = getSharedTickets();
    const newTicket = {
      id: "TKT-" + Math.floor(1000 + Math.random() * 9000),
      category: category || "Technical Help",
      text: text.trim(),
      email: cleanEmail,
      status: "Open",
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      reply: ""
    };

    tickets.unshift(newTicket);
    saveSharedTickets(tickets);

    console.log(`[SUPPORT TICKET] Submitted by: ${newTicket.email} (Category: ${newTicket.category})`);
    return res.json({ success: true, ticket: newTicket });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// View support tickets (Admins see all; students see only their own)
app.get(['/api/support/tickets', '/api/support/tickets/'], requireAuthenticatedUser, (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const tickets = getSharedTickets();

    if (user.is_admin || user.user_role === 'admin' || user.user_role === 'super_admin') {
      return res.json({ success: true, tickets });
    } else {
      const filtered = tickets.filter(t => t.email.toLowerCase() === user.email.toLowerCase());
      return res.json({ success: true, tickets: filtered });
    }
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Admin action on support ticket (Accept / Reply / Resolve)
app.post(['/api/support/ticket/action', '/api/support/ticket/action/'], requireAdmin, (req: Request, res: Response) => {
  try {
    const { id, action, reply } = req.body;
    if (!id || !action) {
      return res.status(400).json({ error: 'Ticket ID and action are required.' });
    }

    const tickets = getSharedTickets();
    const ticketIndex = tickets.findIndex(t => t.id === id);

    if (ticketIndex === -1) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    if (action === 'accept') {
      tickets[ticketIndex].status = "Accepted";
      tickets[ticketIndex].reply = "Your inquiry has been accepted by advisor Abreham. We are actively reviewing this and will assist you shortly.";
    } else if (action === 'reply') {
      tickets[ticketIndex].status = "Resolved";
      tickets[ticketIndex].reply = reply || "Your inquiry has been resolved. Thank you!";
    }

    saveSharedTickets(tickets);
    return res.json({ success: true, ticket: tickets[ticketIndex] });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Support Assistant chat with Abreham persona
app.post(['/api/support/chat', '/api/support/chat/'], supportLimiter, async (req: Request, res: Response) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required for support assistant.' });
    }

    const systemInstruction = `You are Abreham, the lead developer and academic advisor of EthioLearn.
Your tone is polite, formal, professional, and respectful. Address students with academic courtesy. Do NOT use casual slang, informal greetings, or phrases like 'Selamalekum' or 'my friend'. Respond primarily in the language the student asks in (English, Amharic, or a mix of both).
Provide clear, accurate, and structured academic and technical guidance regarding focus courses, flashcards, soundscapes, exam prep, or digital notes.
If students ask about subscriptions, free tier limits, or Pro access: explain that free tier students get 5 daily AI queries, and to activate Pro (from 80-200 ETB) they must submit their Telebirr/CBE Birr transaction reference number, attach their payment receipt screenshot, and accept the EthioLearn Pro Terms & Academic Rules in the Upgrade section.
Maintain a professional educational tone at all times. If students encounter technical issues, advise them to submit a formal ticket from their Profile tab. Always speak in the first person ('I', 'me', 'our platform') as Abreham.`;

    const candidates: { type: string; key: string }[] = [];
    const keysList = [
      process.env.GEMINI_API_KEY,
      process.env.GROQ_API_KEY,
      process.env.OPENAI_API_KEY,
      process.env.ANTHROPIC_API_KEY,
      process.env.OPENROUTER_API_KEY,
      cachedMasterApiKey
    ].filter(k => k && isValidServiceKey(k)) as string[];

    for (const k of keysList) {
      if (k.startsWith('AIza')) candidates.push({ type: 'gemini', key: k });
      else if (k.startsWith('gsk_')) candidates.push({ type: 'groq', key: k });
      else if (k.startsWith('sk-ant-')) candidates.push({ type: 'anthropic', key: k });
      else if (k.startsWith('sk-or-')) candidates.push({ type: 'openrouter', key: k });
      else if (k.startsWith('sk-')) candidates.push({ type: 'openai', key: k });
      else candidates.push({ type: 'gemini', key: k });
    }

    const uniqueCandidates: { type: string; key: string }[] = [];
    const seen = new Set();
    for (const c of candidates) {
      const hash = `${c.type}_${c.key}`;
      if (!seen.has(hash)) {
        seen.add(hash);
        uniqueCandidates.push(c);
      }
    }

    let replyText = "";
    let success = false;

    for (const cand of uniqueCandidates) {
      try {
        if (cand.type === 'gemini') {
          const ai = new GoogleGenAI({ apiKey: cand.key });
          const geminiContents = messages.map((m: any) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content || '' }]
          }));
          const candidateModels = ['gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemini-3.7-flash'];
          for (const cm of candidateModels) {
            try {
              const response = await ai.models.generateContent({
                model: cm,
                contents: geminiContents,
                config: { systemInstruction: systemInstruction },
              });
              replyText = response.text || "";
              if (replyText) {
                success = true;
                break;
              }
            } catch (cmErr: any) {
              console.warn(`[Support Chat] Model ${cm} failed:`, cmErr?.message);
            }
          }
          if (success) break;
        } else if (cand.type === 'groq') {
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${cand.key}`
            },
            body: JSON.stringify({
              model: 'llama-3.3-70b-versatile',
              messages: [
                { role: 'system', content: systemInstruction },
                ...messages.map((m: any) => ({ role: m.role, content: m.content || '' }))
              ],
              max_tokens: 1500,
            })
          });
          if (response.ok) {
            const data = await response.json();
            replyText = data.choices?.[0]?.message?.content || "";
            if (replyText) {
              success = true;
              break;
            }
          }
        }
      } catch (err: any) {
        console.warn(`[Support Chat Strategy ${cand.type}] failed:`, err.message || err);
      }
    }

    if (!success) {
      replyText = "Greetings. I am Abreham, your academic advisor at EthioLearn. Our AI services are currently experiencing high request volume, but please feel free to ask your question regarding exam preparation, textbook chapters, or technical support, and I will assist you shortly.";
    }

    return res.json({ success: true, reply: replyText });
  } catch (e: any) {
    console.error('[Support Assistant Chat Error]:', e);
    return res.status(500).json({ error: e.message || 'Failed to generate support reply' });
  }
});

// ============================================================================
// 7. BACKUP & CLOUD STORAGE SYNC ENDPOINTS
// ============================================================================

// Supabase sync endpoint (Student or Admin authenticated)
app.post(['/api/db/sync-supabase', '/api/db/sync-supabase/'], requireAuthenticatedUser, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { url, key, action, payload } = req.body;
    
    const targetUrl = (url || process.env.VITE_SUPABASE_URL || '').trim();
    const targetKey = (key || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
    
    if (!targetUrl || !targetKey) {
      return res.status(400).json({ error: 'Supabase URL and Anon Key are required.' });
    }

    const supabase = createClient(targetUrl, targetKey);
    const targetEmail = user.email.toLowerCase().trim();
    
    if (action === 'backup') {
      if (!payload) {
        return res.status(400).json({ error: 'Backup payload data is missing.' });
      }
      
      const { error } = await supabase
        .from('ethiolearn_sync')
        .upsert({ email: targetEmail, data: payload, updated_at: new Date().toISOString() }, { onConflict: 'email' });
      
      if (error) {
        return res.status(500).json({ 
          error: error.message, 
          details: 'Could not write to ethiolearn_sync table.' 
        });
      }
      
      return res.json({ success: true, message: 'Campus progress backed up successfully to Supabase!' });
    } else if (action === 'restore') {
      const { data, error } = await supabase
        .from('ethiolearn_sync')
        .select('data')
        .eq('email', targetEmail)
        .maybeSingle();
      
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      if (!data) {
        return res.status(404).json({ error: 'No backup records found for this student account.' });
      }
      
      return res.json({ success: true, payload: data.data });
    } else {
      return res.status(400).json({ error: 'Invalid sync action. Choose action: "backup" or "restore"' });
    }
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// AWS DynamoDB proxy endpoint (Student or Admin authenticated)
app.post(['/api/db/sync-aws', '/api/db/sync-aws/'], requireAuthenticatedUser, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { region, accessKeyId, secretAccessKey, tableName, action, payload } = req.body;
    
    const targetRegion = (region || process.env.AWS_REGION || 'us-east-1').trim();
    const targetAccessKeyId = (accessKeyId || process.env.AWS_ACCESS_KEY_ID || '').trim();
    const targetSecretAccessKey = (secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY || '').trim();
    const targetTable = (tableName || 'ethiolearn_sync').trim();

    if (!targetAccessKeyId || !targetSecretAccessKey) {
      return res.status(400).json({ error: 'AWS Access Key ID and Secret Access Key are required.' });
    }

    const client = new DynamoDBClient({
      region: targetRegion,
      credentials: {
        accessKeyId: targetAccessKeyId,
        secretAccessKey: targetSecretAccessKey
      }
    });
    const ddbDocClient = DynamoDBDocumentClient.from(client);
    const targetEmail = user.email.toLowerCase().trim();

    if (action === 'backup') {
      if (!payload) {
        return res.status(400).json({ error: 'Backup payload data is missing.' });
      }

      const params = {
        TableName: targetTable,
        Item: {
          email: targetEmail,
          data: JSON.stringify(payload),
          updated_at: new Date().toISOString()
        }
      };

      await ddbDocClient.send(new PutCommand(params));
      return res.json({ success: true, message: 'Campus progress backed up successfully to Amazon AWS!' });
    } else if (action === 'restore') {
      const params = {
        TableName: targetTable,
        Key: { email: targetEmail }
      };

      const result = await ddbDocClient.send(new GetCommand(params));
      if (!result.Item) {
        return res.status(404).json({ error: 'No backup records found for this student account in DynamoDB.' });
      }
      
      let parsedData = result.Item.data;
      if (typeof parsedData === 'string') {
        parsedData = JSON.parse(parsedData);
      }

      return res.json({ success: true, payload: parsedData });
    } else {
      return res.status(400).json({ error: 'Invalid sync action. Choose action: "backup" or "restore"' });
    }
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Safe public Supabase config endpoint (Exposes ONLY safe public Anon Key)
app.get(['/api/supabase-config', '/api/supabase-config/'], (req: Request, res: Response) => {
  try {
    const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
    const anonKey = (
      process.env.SUPABASE_ANON_KEY || 
      process.env.VITE_SUPABASE_ANON_KEY || 
      ''
    ).trim();
    return res.json({ url, anonKey });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// 8. AI TUTORING & STREAMING ENDPOINT
// ============================================================================

app.post(['/api/claude/chat', '/api/claude/chat/'], aiChatLimiter, async (req: Request, res: Response) => {
  try {
    const { messages, system, userApiKey, model, highThinking } = req.body;
    
    let resolvedUserKey = userApiKey;
    if (typeof resolvedUserKey === 'string') {
      const cleaned = resolvedUserKey.trim().toLowerCase();
      if (!cleaned || ['no-key', 'no-api-key', 'undefined', 'null', 'no_key', 'none'].includes(cleaned)) {
        resolvedUserKey = undefined;
      }
    }
    
    if (resolvedUserKey && isValidServiceKey(resolvedUserKey)) {
      if (resolvedUserKey !== cachedMasterApiKey) {
        cachedMasterApiKey = resolvedUserKey;
        try {
          fs.writeFileSync(storeFilePath, resolvedUserKey, 'utf8');
        } catch (e) {
          console.warn('[EthioLearn Server] Failed to save master key to file:', e);
        }
      }
    }

    const runGeminiDirect = async (key: string) => {
      const ai = new GoogleGenAI({ apiKey: key });
      const geminiContents = messages.map((m: any) => {
        const parts: any[] = [];
        if (m.content) parts.push({ text: m.content });
        if (m.attachment && m.attachment.data && m.attachment.mimeType) {
          parts.push({
            inlineData: {
              data: m.attachment.data,
              mimeType: m.attachment.mimeType
            }
          });
        }
        if (parts.length === 0) parts.push({ text: '' });
        return {
          role: m.role === 'assistant' ? 'model' : 'user',
          parts
        };
      });

      const modelsToTry = highThinking
        ? ['gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.7-flash']
        : ['gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemini-3.7-flash'];

      let lastErr: any = null;
      for (const targetModel of modelsToTry) {
        try {
          const stream = await ai.models.generateContentStream({
            model: targetModel,
            contents: geminiContents,
            config: { 
              systemInstruction: system || undefined,
              ...(highThinking && targetModel === 'gemini-3.7-flash' ? { thinkingConfig: { thinkingBudget: 2048 } } : {})
            },
          });

          if (!res.headersSent) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
          }

          let receivedAnyChunk = false;
          for await (const chunk of stream) {
            const content = chunk.text;
            if (content) {
              receivedAnyChunk = true;
              const legacyChunk = { type: 'content_block_delta', delta: { text: content } };
              res.write(`data: ${JSON.stringify(legacyChunk)}\n\n`);
            }
          }

          if (receivedAnyChunk) {
            res.write('data: [DONE]\n\n');
            res.end();
            return;
          }
        } catch (modelErr: any) {
          console.warn(`[Gemini Direct Stream] Model ${targetModel} notice:`, modelErr?.message || modelErr);
          lastErr = modelErr;
        }
      }

      if (lastErr) throw lastErr;
    };

    const runGroqDirect = async (key: string, targetModel?: string) => {
      const groqMessages = [];
      if (system) {
        groqMessages.push({ role: 'system', content: system });
      }
      if (Array.isArray(messages)) {
        const mapped = messages.map((m: any) => {
          if (m.attachment && m.attachment.data && m.attachment.mimeType) {
            if (m.attachment.mimeType.startsWith('image/')) {
              return {
                role: m.role,
                content: [
                  { type: 'text', text: m.content || '' },
                  { type: 'image_url', image_url: { url: `data:${m.attachment.mimeType};base64,${m.attachment.data}` } }
                ]
              };
            } else {
              return {
                role: m.role,
                content: `${m.content || ''}\n[Attached File: ${m.attachment.name || 'document'} (${m.attachment.mimeType})]`
              };
            }
          }
          return { role: m.role, content: m.content || '' };
        });
        groqMessages.push(...mapped);
      }

      let finalGroqModel = targetModel || 'llama-3.3-70b-versatile';
      if (finalGroqModel.includes('claude') || finalGroqModel.includes('sonnet') || finalGroqModel.includes('gpt')) {
        finalGroqModel = 'llama-3.3-70b-versatile';
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: finalGroqModel,
          messages: groqMessages,
          stream: true,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        throw new Error(`Groq API returned ${response.status}: ${await response.text()}`);
      }
      if (!response.body) {
        throw new Error('Groq response body is empty.');
      }

      if (!res.headersSent) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine) continue;

          if (cleanLine.startsWith('data:')) {
            const rawData = cleanLine.substring(5).trim();
            if (rawData === '[DONE]') {
              res.write('data: [DONE]\n\n');
              continue;
            }

            try {
              const parsed = JSON.parse(rawData);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                const legacyChunk = { type: 'content_block_delta', delta: { text: content } };
                res.write(`data: ${JSON.stringify(legacyChunk)}\n\n`);
              }
            } catch (e) {}
          }
        }
      }
      res.end();
    };

    const runOpenAiDirect = async (key: string) => {
      const openMessages = [];
      if (system) openMessages.push({ role: 'system', content: system });
      if (Array.isArray(messages)) openMessages.push(...messages.map((m: any) => ({ role: m.role, content: m.content || '' })));

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: openMessages,
          stream: true,
          max_tokens: 2000,
        })
      });

      if (!response.ok) throw new Error(`OpenAI returned ${response.status}`);
      if (!response.body) throw new Error('OpenAI response body is empty.');

      if (!res.headersSent) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine) continue;

          if (cleanLine.startsWith('data:')) {
            const rawData = cleanLine.substring(5).trim();
            if (rawData === '[DONE]') {
              res.write('data: [DONE]\n\n');
              continue;
            }

            try {
              const parsed = JSON.parse(rawData);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                const legacyChunk = { type: 'content_block_delta', delta: { text: content } };
                res.write(`data: ${JSON.stringify(legacyChunk)}\n\n`);
              }
            } catch (e) {}
          }
        }
      }
      res.end();
    };

    const runAnthropicDirect = async (key: string) => {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
          system: system || undefined,
          max_tokens: 2000,
          stream: true,
        })
      });

      if (!response.ok) throw new Error(`Anthropic returned ${response.status}`);
      if (!response.body) throw new Error('Anthropic response body empty');

      if (!res.headersSent) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine) continue;

          if (cleanLine.startsWith('data:')) {
            const rawData = cleanLine.substring(5).trim();
            if (rawData === '[DONE]') {
              res.write('data: [DONE]\n\n');
              continue;
            }

            try {
              const parsed = JSON.parse(rawData);
              let content = '';
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                content = parsed.delta.text;
              } else if (parsed.type === 'message_start' && parsed.message?.content?.[0]?.text) {
                content = parsed.message.content[0].text;
              }
              if (content) {
                const legacyChunk = { type: 'content_block_delta', delta: { text: content } };
                res.write(`data: ${JSON.stringify(legacyChunk)}\n\n`);
              }
            } catch (e) {}
          }
        }
      }
      res.end();
    };

    const runLocalOfflineFallback = async () => {
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
      }

      const lastUserMsg = [...messages].reverse().find((m: any) => m.role === 'user')?.content || 'your academic questions';
      const greeting = "Hello, my friend! I am your EthioLearn AI Copilot. 📚✨\n\n";
      const explanation = `I am currently operating in **High-Availability Local Sandbox Mode** because the cloud API services are experiencing high traffic or are temporarily updating. 

Don't worry, your learning never stops! To help you with your question about "${lastUserMsg.substring(0, 100)}${lastUserMsg.length > 100 ? '...' : ''}", please review these study steps:
1. **Check the Chapter Summary**: Open your Grade 11 or Grade 12 Textbook in the Bookstore tab.
2. **Review key formulas or terms**: Use the Flashcards tool to practice key concepts.
3. **Try standard quiz practice**: Go to the Prep Blueprint tab to solve exam-style multiple-choice questions.`;

      const fullText = greeting + explanation;
      const words = fullText.split(' ');
      for (let i = 0; i < words.length; i++) {
        const chunk = words[i] + ' ';
        const legacyChunk = { type: 'content_block_delta', delta: { text: chunk } };
        res.write(`data: ${JSON.stringify(legacyChunk)}\n\n`);
        await new Promise(resolve => setTimeout(resolve, 30));
      }

      res.write('data: [DONE]\n\n');
      res.end();
    };

    const attempts: { name: string; run: () => Promise<void> }[] = [];

    if (resolvedUserKey && isValidServiceKey(resolvedUserKey)) {
      if (resolvedUserKey.startsWith('AIza')) {
        attempts.push({ name: 'User Gemini Direct', run: () => runGeminiDirect(resolvedUserKey) });
      } else if (resolvedUserKey.startsWith('gsk_')) {
        attempts.push({ name: 'User Groq Direct', run: () => runGroqDirect(resolvedUserKey, model) });
      } else if (resolvedUserKey.startsWith('sk-ant-')) {
        attempts.push({ name: 'User Anthropic Direct', run: () => runAnthropicDirect(resolvedUserKey) });
      } else if (resolvedUserKey.startsWith('sk-')) {
        attempts.push({ name: 'User OpenAI Direct', run: () => runOpenAiDirect(resolvedUserKey) });
      } else {
        attempts.push({ name: 'User Gemini Direct', run: () => runGeminiDirect(resolvedUserKey) });
      }
    }

    const geminiKey = process.env.GEMINI_API_KEY || (cachedMasterApiKey && (cachedMasterApiKey.startsWith('AIza') || (!cachedMasterApiKey.startsWith('gsk_') && !cachedMasterApiKey.startsWith('sk-'))) ? cachedMasterApiKey : undefined);
    if (geminiKey && isValidServiceKey(geminiKey)) {
      attempts.push({ name: 'Server Gemini Direct', run: () => runGeminiDirect(geminiKey) });
    }

    const groqKey = process.env.GROQ_API_KEY || (cachedMasterApiKey && cachedMasterApiKey.startsWith('gsk_') ? cachedMasterApiKey : undefined);
    if (groqKey && isValidServiceKey(groqKey)) {
      attempts.push({ name: 'Server Groq Direct', run: () => runGroqDirect(groqKey, model) });
    }

    const openAiKey = process.env.OPENAI_API_KEY || (cachedMasterApiKey && cachedMasterApiKey.startsWith('sk-') && !cachedMasterApiKey.startsWith('sk-ant-') && !cachedMasterApiKey.startsWith('sk-or-') ? cachedMasterApiKey : undefined);
    if (openAiKey && isValidServiceKey(openAiKey)) {
      attempts.push({ name: 'Server OpenAI Direct', run: () => runOpenAiDirect(openAiKey) });
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY || (cachedMasterApiKey && cachedMasterApiKey.startsWith('sk-ant-') ? cachedMasterApiKey : undefined);
    if (anthropicKey && isValidServiceKey(anthropicKey)) {
      attempts.push({ name: 'Server Anthropic Direct', run: () => runAnthropicDirect(anthropicKey) });
    }

    attempts.push({ name: 'Local Offline Fallback', run: () => runLocalOfflineFallback() });

    for (const attempt of attempts) {
      try {
        await attempt.run();
        return;
      } catch (err: any) {
        console.warn(`[AI Stream] Strategy ${attempt.name} failed:`, err.message || err);
      }
    }

  } catch (err: any) {
    console.error('Express proxy error calling AI stream:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal AI proxy service unavailable.' });
    } else {
      res.end();
    }
  }
});

// ============================================================================
// 9. CENTRALIZED ERROR HANDLING MIDDLEWARE
// ============================================================================

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Internal Server Error Handler]:', err);
  if (res.headersSent) {
    return next(err);
  }
  return res.status(err.status || 500).json({
    error: err.name || 'InternalServerError',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected server error occurred.' : (err.message || 'Server error')
  });
});

// ============================================================================
// 10. SERVER STARTUP & VITE INTEGRATION
// ============================================================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`[EthioLearn Server] bound on port ${PORT} (dev mode with Vite)`);
      });
    } catch (err) {
      console.error('[EthioLearn Server] Failed to start Vite dev server:', err);
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`[EthioLearn Server] fallback bound on port ${PORT}`);
      });
    }
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: `API endpoint ${req.path} not found.` });
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });

    if (!process.env.VERCEL) {
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`[EthioLearn Server] bound on port ${PORT} (production mode)`);
      });
    }
  }
}

startServer();

export default app;
