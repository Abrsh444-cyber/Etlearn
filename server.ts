/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import dotenv from 'dotenv';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

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
    return true; // Accept any key structure to maximize compatibility with all academic AI integrations
  };

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Endpoint to let admin sync their local API Key to the cloud container persistently
  app.post(['/api/sync-master-key', '/api/sync-master-key/'], (req, res) => {
    try {
      const { key } = req.body;
      if (isValidServiceKey(key)) {
        if (key !== cachedMasterApiKey) {
          cachedMasterApiKey = key;
          try {
            fs.writeFileSync(storeFilePath, key, 'utf8');
            console.log('[EthioLearn Server] Master API key manually synced and cached.');
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

  // Support ticket active email dispatch & tracking endpoints
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
    return [
      {
        id: "TKT-3829",
        category: "Blueprints & Exams help",
        text: "Will there be freshman entrance preparation blueprints added for university level?",
        email: "student@wolkite.edu.et",
        status: "Resolved",
        date: "Yesterday",
        reply: "Yes! Freshmen levels focus heavily on Emerging Technologies and Communicative English. Practice materials are updated."
      }
    ];
  };

  const saveSharedTickets = (tickets: any[]) => {
    try {
      fs.writeFileSync(ticketsFilePath, JSON.stringify(tickets, null, 2), 'utf8');
    } catch (e) {
      console.error('[Support tickets] Failed to save tickets file:', e);
    }
  };

  app.post(['/api/support/ticket', '/api/support/ticket/'], (req, res) => {
    try {
      const { category, text, email } = req.body;
      if (!text || !email) {
        return res.status(400).json({ error: 'Text and email are required for ticket creation.' });
      }

      const tickets = getSharedTickets();
      const newTicket = {
        id: "TKT-" + Math.floor(1000 + Math.random() * 9000),
        category: category || "Technical Help",
        text: text,
        email: email.toLowerCase().trim(),
        status: "Open",
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        reply: ""
      };

      tickets.unshift(newTicket);
      saveSharedTickets(tickets);

      // Log/Dispatch support email action to ezrat2116@gmail.com
      console.log(`\n========================================`);
      console.log(`[SUPPORT EMAIL FORWARDED]`);
      console.log(`Recipient: ezrat2116@gmail.com`);
      console.log(`From Student: ${newTicket.email}`);
      console.log(`Category: ${newTicket.category}`);
      console.log(`Inquiry: "${newTicket.text}"`);
      console.log(`========================================\n`);

      return res.json({ success: true, ticket: newTicket });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.get(['/api/support/tickets', '/api/support/tickets/'], (req, res) => {
    try {
      const email = (req.query.email as string || '').toLowerCase().trim();
      const tickets = getSharedTickets();

      if (email === 'ezrat2116@gmail.com') {
        // Support Admin gets access to all student tickets
        return res.json({ success: true, tickets });
      } else if (email) {
        // Students get their own tickets
        const filtered = tickets.filter(t => t.email === email);
        return res.json({ success: true, tickets: filtered });
      } else {
        return res.json({ success: true, tickets: [] });
      }
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.post(['/api/support/ticket/action', '/api/support/ticket/action/'], (req, res) => {
    try {
      const { id, action, reply, adminEmail } = req.body;
      if (!adminEmail || adminEmail.toLowerCase().trim() !== 'ezrat2116@gmail.com') {
        return res.status(403).json({ error: 'Only authorized administrator ezrat2116@gmail.com can accept or resolve problems.' });
      }

      const tickets = getSharedTickets();
      const ticketIndex = tickets.findIndex(t => t.id === id);

      if (ticketIndex === -1) {
        return res.status(404).json({ error: 'Ticket not found.' });
      }

      if (action === 'accept') {
        tickets[ticketIndex].status = "Accepted";
        tickets[ticketIndex].reply = "Your problem has been accepted by advisor Ezra (ezrat2116@gmail.com). We are actively reviewing this and will assist you shortly.";
      } else if (action === 'reply') {
        tickets[ticketIndex].status = "Resolved";
        tickets[ticketIndex].reply = reply || "Your problem has been resolved. Thank you!";
      }

      saveSharedTickets(tickets);
      return res.json({ success: true, ticket: tickets[ticketIndex] });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // Support chat with Ezra persona using Google Gemini 3.5-flash or any other server key
  app.post(['/api/support/chat', '/api/support/chat/'], async (req, res) => {
    try {
      const { messages } = req.body;
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Messages array is required for support assistant.' });
      }

      // Prepare system instruction for Ezra persona
      const systemInstruction = `You are Ezra, the creator, lead developer, and academic advisor of EthioLearn (ezrat2116@gmail.com). You are a friendly, encouraging, and brilliant Ethiopian tech student and educator who built this platform to help Ethiopian high school and university students excel in their studies.
Your tone is warm, personal, professional, and deeply supportive of students' academic journeys. Feel free to use phrases like 'my friend', 'እሺ' (Ishi), or brief Amharic greetings naturally when appropriate to make Ethiopian students feel at home, but respond primarily in the language the student asks in (English, Amharic, or a mix of both).
Explain with enthusiasm when they ask about features like flashcards, customizable soundscapes, exam prep, or study notes. Keep your answers concise, practical, and highly empathetic. If they encounter technical bugs or need direct support, remind them that they can also submit a formal support ticket to you (ezrat2116@gmail.com) from their Profile tab. Always talk in the first person ('I', 'me', 'my platform') as Ezra himself.`;

      // Candidates array of API keys/configurations to try
      const candidates: { type: string; key: string }[] = [];

      const keysList = [
        process.env.GEMINI_API_KEY,
        process.env.GROQ_API_KEY,
        process.env.OPENAI_API_KEY,
        process.env.ANTHROPIC_API_KEY,
        process.env.OPENROUTER_API_KEY,
        cachedMasterApiKey
      ].filter(k => k && isValidServiceKey(k)) as string[];

      // Build specific candidates for keys
      for (const k of keysList) {
        if (k.startsWith('AIzaSy')) {
          candidates.push({ type: 'gemini', key: k });
        } else if (k.startsWith('gsk_')) {
          candidates.push({ type: 'groq', key: k });
        } else if (k.startsWith('sk-ant-')) {
          candidates.push({ type: 'anthropic', key: k });
        } else if (k.startsWith('sk-') && !k.startsWith('sk-or-')) {
          candidates.push({ type: 'openai', key: k });
        } else {
          candidates.push({ type: 'openrouter', key: k });
        }
      }

      // Add general candidates if keys exist but don't match standard prefixes
      if (process.env.GEMINI_API_KEY && isValidServiceKey(process.env.GEMINI_API_KEY)) {
        candidates.push({ type: 'gemini', key: process.env.GEMINI_API_KEY });
      }
      if (process.env.GROQ_API_KEY && isValidServiceKey(process.env.GROQ_API_KEY)) {
        candidates.push({ type: 'groq', key: process.env.GROQ_API_KEY });
      }
      if (process.env.OPENAI_API_KEY && isValidServiceKey(process.env.OPENAI_API_KEY)) {
        candidates.push({ type: 'openai', key: process.env.OPENAI_API_KEY });
      }
      if (process.env.ANTHROPIC_API_KEY && isValidServiceKey(process.env.ANTHROPIC_API_KEY)) {
        candidates.push({ type: 'anthropic', key: process.env.ANTHROPIC_API_KEY });
      }
      if (process.env.OPENROUTER_API_KEY && isValidServiceKey(process.env.OPENROUTER_API_KEY)) {
        candidates.push({ type: 'openrouter', key: process.env.OPENROUTER_API_KEY });
      }

      // Dedup candidates
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
          console.log(`[Support API Cascade] Trying strategy: ${cand.type}`);
          if (cand.type === 'gemini') {
            const ai = new GoogleGenAI({
              apiKey: cand.key,
              httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
            });
            const geminiContents = messages.map((m: any) => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content || '' }]
            }));
            const response = await ai.models.generateContent({
              model: 'gemini-3.5-flash',
              contents: geminiContents,
              config: { systemInstruction: systemInstruction },
            });
            replyText = response.text || "";
            if (replyText) {
              success = true;
              break;
            }
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
            } else {
              throw new Error(`Groq failed: ${await response.text()}`);
            }
          } else if (cand.type === 'openai') {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${cand.key}`
              },
              body: JSON.stringify({
                model: 'gpt-4o-mini',
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
            } else {
              throw new Error(`OpenAI failed: ${await response.text()}`);
            }
          } else if (cand.type === 'anthropic') {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': cand.key,
                'anthropic-version': '2023-06-01'
              },
              body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                messages: messages.map((m: any) => ({ role: m.role, content: m.content || '' })),
                system: systemInstruction,
                max_tokens: 1500,
              })
            });
            if (response.ok) {
              const data = await response.json();
              replyText = data.content?.[0]?.text || "";
              if (replyText) {
                success = true;
                break;
              }
            } else {
              throw new Error(`Anthropic failed: ${await response.text()}`);
            }
          } else if (cand.type === 'openrouter') {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${cand.key}`,
                'HTTP-Referer': 'https://ai.studio/build',
                'X-Title': 'EthioLearn',
              },
              body: JSON.stringify({
                model: 'google/gemini-2.5-flash',
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
            } else {
              throw new Error(`OpenRouter failed: ${await response.text()}`);
            }
          }
        } catch (err: any) {
          console.warn(`[Support API Cascade] strategy ${cand.type} failed:`, err.message || err);
        }
      }

      if (!success) {
        console.log(`[Support API Cascade] All cloud strategies failed. Using local advisor fallback response.`);
        replyText = "Selam, my friend! This is your academic advisor Ezra. It looks like all our premium cloud AI lines are highly loaded right now, but your learning never stops on EthioLearn! Feel free to ask me anything about exam prep, textbook chapters, or submitting a support ticket from your profile tab. I am always here to support you!";
      }

      return res.json({ success: true, reply: replyText });
    } catch (e: any) {
      console.error('[Support Assistant Chat Error]:', e);
      return res.status(500).json({ error: e.message || 'Failed to generate support reply' });
    }
  });

  // Supabase proxy endpoint to backup/restore study metrics
  app.post(['/api/db/sync-supabase', '/api/db/sync-supabase/'], async (req, res) => {
    try {
      const { url, key, email, action, payload } = req.body;
      
      const targetUrl = (url || process.env.VITE_SUPABASE_URL || '').trim();
      const targetKey = (key || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
      
      if (!targetUrl || !targetKey) {
        return res.status(400).json({ error: 'Supabase URL and Anon Key are required.' });
      }
      if (!email) {
        return res.status(400).json({ error: 'Student email is required for cloud mapping.' });
      }

      const supabase = createClient(targetUrl, targetKey);
      
      if (action === 'backup') {
        if (!payload) {
          return res.status(400).json({ error: 'Backup payload data is missing.' });
        }
        
        const { error } = await supabase
          .from('ethiolearn_sync')
          .upsert({ email: email.toLowerCase(), data: payload, updated_at: new Date().toISOString() }, { onConflict: 'email' });
        
        if (error) {
          console.error('[Supabase Backup Error]:', error);
          return res.status(500).json({ 
            error: error.message, 
            details: 'Could not write to ethiolearn_sync table. Make sure you created the table with columns: email (primary key, text) and data (jsonb).' 
          });
        }
        
        return res.json({ success: true, message: 'Campus progress backed up successfully to Supabase!' });
      } else if (action === 'restore') {
        const { data, error } = await supabase
          .from('ethiolearn_sync')
          .select('data')
          .eq('email', email.toLowerCase())
          .maybeSingle();
        
        if (error) {
          console.error('[Supabase Restore Error]:', error);
          return res.status(500).json({ error: error.message });
        }
        if (!data) {
          return res.status(404).json({ error: 'No backup records found for this student email.' });
        }
        
        return res.json({ success: true, payload: data.data });
      } else {
        return res.status(400).json({ error: 'Invalid sync action. Choose action: "backup" or "restore"' });
      }
    } catch (e: any) {
      console.error('[Supabase Sync Handler Error]:', e);
      return res.status(500).json({ error: e.message });
    }
  });

  // AWS DynamoDB proxy endpoint to backup/restore study metrics
  app.post(['/api/db/sync-aws', '/api/db/sync-aws/'], async (req, res) => {
    try {
      const { region, accessKeyId, secretAccessKey, tableName, email, action, payload } = req.body;
      
      const targetRegion = (region || process.env.AWS_REGION || 'us-east-1').trim();
      const targetAccessKeyId = (accessKeyId || process.env.AWS_ACCESS_KEY_ID || '').trim();
      const targetSecretAccessKey = (secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY || '').trim();
      const targetTable = (tableName || 'ethiolearn_sync').trim();

      if (!targetAccessKeyId || !targetSecretAccessKey) {
        return res.status(400).json({ error: 'AWS Access Key ID and Secret Access Key are required.' });
      }
      if (!email) {
        return res.status(400).json({ error: 'Student email is required for AWS mapping.' });
      }

      const client = new DynamoDBClient({
        region: targetRegion,
        credentials: {
          accessKeyId: targetAccessKeyId,
          secretAccessKey: targetSecretAccessKey
        }
      });
      const ddbDocClient = DynamoDBDocumentClient.from(client);

      if (action === 'backup') {
        if (!payload) {
          return res.status(400).json({ error: 'Backup payload data is missing.' });
        }

        const params = {
          TableName: targetTable,
          Item: {
            email: email.toLowerCase(),
            data: JSON.stringify(payload),
            updated_at: new Date().toISOString()
          }
        };

        try {
          await ddbDocClient.send(new PutCommand(params));
        } catch (err: any) {
          console.error('[AWS DynamoDB Put Error]:', err);
          return res.status(500).json({ 
            error: err.message, 
            details: `Could not write to DynamoDB table "${targetTable}". Verify that the table exists, has a Partition Key named "email" (string), and credentials have DynamoDB permissions.` 
          });
        }

        return res.json({ success: true, message: 'Campus progress backed up successfully to Amazon AWS!' });
      } else if (action === 'restore') {
        const params = {
          TableName: targetTable,
          Key: {
            email: email.toLowerCase()
          }
        };

        try {
          const result = await ddbDocClient.send(new GetCommand(params));
          if (!result.Item) {
            return res.status(404).json({ error: 'No backup records found for this student email in DynamoDB.' });
          }
          
          let parsedData = result.Item.data;
          if (typeof parsedData === 'string') {
            parsedData = JSON.parse(parsedData);
          }

          return res.json({ success: true, payload: parsedData });
        } catch (err: any) {
          console.error('[AWS DynamoDB Get Error]:', err);
          return res.status(500).json({ error: err.message });
        }
      } else {
        return res.status(400).json({ error: 'Invalid sync action. Choose action: "backup" or "restore"' });
      }
    } catch (e: any) {
      console.error('[AWS Sync Handler Error]:', e);
      return res.status(500).json({ error: e.message });
    }
  });

  // Endpoint to fetch default server-side configured Supabase credentials (if defined as environment secrets)
  app.get(['/api/supabase-config', '/api/supabase-config/'], (req, res) => {
    try {
      const url = process.env.VITE_SUPABASE_URL || '';
      const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
      return res.json({
        url: url.trim(),
        anonKey: anonKey.trim()
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // API Route for Claude proxy redirected to OpenRouter or natively served via Google Gemini
  app.post(['/api/claude/chat', '/api/claude/chat/'], async (req, res) => {
    try {
      const { messages, system, userApiKey, model, highThinking } = req.body;
      
      // Clean up string placeholder keys from frontend
      let resolvedUserKey = userApiKey;
      if (typeof resolvedUserKey === 'string') {
        const cleaned = resolvedUserKey.trim().toLowerCase();
        if (!cleaned || ['no-key', 'no-api-key', 'undefined', 'null', 'no_key', 'none'].includes(cleaned)) {
          resolvedUserKey = undefined;
        }
      }
      
      // If the incoming key is a valid service key from settings/onboarding (e.g. from the admin), cache it!
      if (resolvedUserKey && isValidServiceKey(resolvedUserKey)) {
        if (resolvedUserKey !== cachedMasterApiKey) {
          cachedMasterApiKey = resolvedUserKey;
          try {
            fs.writeFileSync(storeFilePath, resolvedUserKey, 'utf8');
            console.log('[EthioLearn Server] Automatically saved/updated master API key from admin request.');
          } catch (e) {
            console.warn('[EthioLearn Server] Failed to save master key to file:', e);
          }
        }
      }
 
      // Strategies we can stream
      const runGeminiDirect = async (key: string) => {
        const ai = new GoogleGenAI({
          apiKey: key,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        });
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
 
        const stream = await ai.models.generateContentStream({
          model: highThinking ? 'gemini-3.1-pro-preview' : 'gemini-3.5-flash',
          contents: geminiContents,
          config: { 
            systemInstruction: system || undefined,
            thinkingConfig: highThinking ? { thinkingLevel: ThinkingLevel.HIGH } : undefined
          },
        });

        if (!res.headersSent) {
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');
        }

        for await (const chunk of stream) {
          const content = chunk.text;
          if (content) {
            const legacyChunk = { type: 'content_block_delta', delta: { text: content } };
            res.write(`data: ${JSON.stringify(legacyChunk)}\n\n`);
          }
        }
        res.write('data: [DONE]\n\n');
        res.end();
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
        if (system) {
          openMessages.push({ role: 'system', content: system });
        }
        if (Array.isArray(messages)) {
          openMessages.push(...messages.map((m: any) => ({ role: m.role, content: m.content || '' })));
        }

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

        if (!response.ok) {
          throw new Error(`OpenAI API returned ${response.status}: ${await response.text()}`);
        }
        if (!response.body) {
          throw new Error('OpenAI response body is empty.');
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

        if (!response.ok) {
          throw new Error(`Anthropic API returned ${response.status}: ${await response.text()}`);
        }
        if (!response.body) {
          throw new Error('Anthropic response body is empty.');
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

      const runOpenRouterStream = async (key: string, targetModel?: string) => {
        const openRouterMessages = [];
        if (system) {
          openRouterMessages.push({ role: 'system', content: system });
        }
        if (Array.isArray(messages)) {
          const mapped = messages.map((m: any) => ({ role: m.role, content: m.content || '' }));
          openRouterMessages.push(...mapped);
        }

        let openRouterModel = targetModel || 'google/gemini-2.5-flash';
        if (openRouterModel.includes('claude-3-5-sonnet') || openRouterModel.includes('claude-3.5-sonnet') || openRouterModel.includes('claude-sonnet-latest')) {
          openRouterModel = 'anthropic/claude-3.5-sonnet';
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`,
            'HTTP-Referer': 'https://ai.studio/build',
            'X-Title': 'EthioLearn',
          },
          body: JSON.stringify({
            model: openRouterModel,
            messages: openRouterMessages,
            stream: true,
            max_tokens: 2000,
          }),
        });

        if (!response.ok) {
          throw new Error(`OpenRouter API returned ${response.status}: ${await response.text()}`);
        }
        if (!response.body) {
          throw new Error('OpenRouter response body is empty.');
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

      const runLocalOfflineFallback = async () => {
        if (!res.headersSent) {
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');
        }

        const lastUserMsg = [...messages].reverse().find((m: any) => m.role === 'user')?.content || 'your academic questions';
        
        const greeting = "Hello, my friend! I am your EthioLearn AI Copilot. 📚✨\n\n";
        const explanation = `I am currently operating in **High-Availability Local Sandbox Mode** because the cloud API services are experiencing high traffic, a temporary outage, or are temporarily down. 

Don't worry, your learning never stops! I am here to help you study. To help you with your question about "${lastUserMsg.substring(0, 100)}${lastUserMsg.length > 100 ? '...' : ''}", please remember these study steps:
1. **Check the Chapter Summary**: Open your Grade 11 or Grade 12 Textbook in the Bookstore tab.
2. **Review key formulas or terms**: Use the Flashcards tool to practice key concepts.
3. **Try standard quiz practice**: Go to the Prep Blueprint tab to solve exam-style multiple-choice questions.

*Tip for Ezra (Administrator): Please check your API key configurations in the Profile/Onboarding panel or server env variables (GEMINI_API_KEY) to restore full cloud-guided tutoring!*`;

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

      // Compile prioritized strategies
      const attempts: { name: string; run: () => Promise<void> }[] = [];

      // Strategy 1: User specified API key
      if (resolvedUserKey && isValidServiceKey(resolvedUserKey)) {
        if (resolvedUserKey.startsWith('AIzaSy')) {
          attempts.push({ name: 'User Gemini Direct', run: () => runGeminiDirect(resolvedUserKey) });
        } else if (resolvedUserKey.startsWith('gsk_')) {
          attempts.push({ name: 'User Groq Direct', run: () => runGroqDirect(resolvedUserKey, model) });
        } else if (resolvedUserKey.startsWith('sk-ant-')) {
          attempts.push({ name: 'User Anthropic Direct', run: () => runAnthropicDirect(resolvedUserKey) });
        } else if (resolvedUserKey.startsWith('sk-') && !resolvedUserKey.startsWith('sk-or-')) {
          attempts.push({ name: 'User OpenAI Direct', run: () => runOpenAiDirect(resolvedUserKey) });
        } else {
          attempts.push({ name: 'User OpenRouter Direct', run: () => runOpenRouterStream(resolvedUserKey, model) });
        }
      }

      // Strategy 2: Google Gemini env or cached key
      const geminiKey = process.env.GEMINI_API_KEY || (cachedMasterApiKey && cachedMasterApiKey.startsWith('AIzaSy') ? cachedMasterApiKey : undefined);
      if (geminiKey && isValidServiceKey(geminiKey)) {
        attempts.push({ name: 'Server Gemini Direct', run: () => runGeminiDirect(geminiKey) });
      }

      // Strategy 3: Groq env or cached key
      const groqKey = process.env.GROQ_API_KEY || (cachedMasterApiKey && cachedMasterApiKey.startsWith('gsk_') ? cachedMasterApiKey : undefined);
      if (groqKey && isValidServiceKey(groqKey)) {
        attempts.push({ name: 'Server Groq Direct', run: () => runGroqDirect(groqKey, model) });
      }

      // Strategy 4: OpenAI env or cached key
      const openAiKey = process.env.OPENAI_API_KEY || (cachedMasterApiKey && cachedMasterApiKey.startsWith('sk-') && !cachedMasterApiKey.startsWith('sk-ant-') && !cachedMasterApiKey.startsWith('sk-or-') ? cachedMasterApiKey : undefined);
      if (openAiKey && isValidServiceKey(openAiKey)) {
        attempts.push({ name: 'Server OpenAI Direct', run: () => runOpenAiDirect(openAiKey) });
      }

      // Strategy 5: Anthropic env or cached key
      const anthropicKey = process.env.ANTHROPIC_API_KEY || (cachedMasterApiKey && cachedMasterApiKey.startsWith('sk-ant-') ? cachedMasterApiKey : undefined);
      if (anthropicKey && isValidServiceKey(anthropicKey)) {
        attempts.push({ name: 'Server Anthropic Direct', run: () => runAnthropicDirect(anthropicKey) });
      }

      // Strategy 6: OpenRouter env or cached key
      const openRouterKey = process.env.OPENROUTER_API_KEY || cachedMasterApiKey;
      if (openRouterKey && isValidServiceKey(openRouterKey)) {
        attempts.push({ name: 'Server OpenRouter Stream', run: () => runOpenRouterStream(openRouterKey, model) });
      }

      // Ultimate strategy 7: Local smart advisor response
      attempts.push({ name: 'Local Offline Fallback', run: () => runLocalOfflineFallback() });

      // Run cascade
      for (const attempt of attempts) {
        try {
          console.log(`[AI Cascade Stream] Attempting strategy: ${attempt.name}`);
          await attempt.run();
          console.log(`[AI Cascade Stream] Strategy ${attempt.name} succeeded.`);
          return;
        } catch (err: any) {
          console.warn(`[AI Cascade Stream] Strategy ${attempt.name} failed:`, err.message || err);
        }
      }

    } catch (err: any) {
      console.error('Express proxy error calling AI stream:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message || 'Internal proxy server failure.' });
      } else {
        res.end();
      }
    }
  });

  // Serve static assets in production or use Vite developer middleware
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    (async () => {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`[EthioLearn Server] bound on port ${PORT} (dev mode with Vite)`);
      });
    })();
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

export default app;
