import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import path from 'path';
import dns from 'dns';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// Prioritize IPv4 over IPv6 in Node to avoid IPv6 drops in Docker bridge networks
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {
  // Ignored on environments where unsupported
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from both server directory and parent workspace directory
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PATCH", "DELETE"]
  }
});

// Initialize Supabase Client strictly from environment variables
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.warn("⚠️ SUPABASE_URL / VITE_SUPABASE_URL missing from environment (.env)!");
}
if (!supabaseKey) {
  console.warn("⚠️ SUPABASE_SERVICE_ROLE_KEY missing from environment (.env)! Admin DB queries will fail.");
}

const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey, {
  db: { schema: process.env.SUPABASE_SCHEMA || 'dlabs' },
  auth: { persistSession: false }
}) : null;

const JWT_SECRET = process.env.JWT_SECRET || (supabaseKey ? supabaseKey.slice(-32) : 'sms_hrms_jwt_secret');

function signJwt(payload, secret = JWT_SECRET) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyJwt(token, secret = JWT_SECRET) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const expectedSig = crypto.createHmac('sha256', secret).update(`${parts[0]}.${parts[1]}`).digest('base64url');
  if (parts[2] !== expectedSig) return null;
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  if (payload.exp && Date.now() >= payload.exp * 1000) return null;
  return payload;
}

// Basic health check endpoint
app.get(['/health', '/api/health'], (req, res) => {
  res.json({
    status: 'ok',
    service: 'SMS HRMS Backend',
    databaseConfigured: !!supabase,
    time: new Date().toISOString()
  });
});

// --- AUTHENTICATION API ---
app.post(['/api/auth/login', '/auth/login'], async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({
        error: 'Database configuration missing. Please verify SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL in .env'
      });
    }

    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data: emps, error } = await supabase
      .from('sms_hrms_employees')
      .select('*')
      .ilike('email', email.trim());

    if (error) {
      console.error('Supabase employee lookup error:', error);
      return res.status(500).json({
        error: 'Database query failed',
        details: error.message,
        cause: error.cause ? (error.cause.message || String(error.cause)) : undefined,
        code: error.code || error.cause?.code
      });
    }

    const emp = (emps || []).find(e => (e.password || 'password') === password);
    if (!emp) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (emp.status === 'inactive') {
      return res.status(403).json({ error: 'Your account is inactive. Please contact your administrator.' });
    }

    const token = signJwt({
      sub: emp.id,
      role: emp.role || 'employee',
      name: emp.name,
      email: emp.email,
      exp: Math.floor(Date.now() / 1000) + 86400 * 7 // 7 days valid
    });

    return res.json({
      token,
      employee: emp
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      error: 'Internal server error',
      details: err?.message || String(err),
      cause: err?.cause ? (err.cause.message || String(err.cause)) : undefined
    });
  }
});

// --- DIRECTORY API ---
app.get(['/api/hrms/directory', '/hrms/directory'], async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database configuration missing' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const [
      { data: employees, error: empErr },
      { data: attendance },
      { data: leaveRequests },
      { data: leaveBalances },
      { data: payroll },
      { data: advanceRequests },
      { data: locationPins },
      { data: monthlyLeaveQuota }
    ] = await Promise.all([
      supabase.from('sms_hrms_employees').select('*').order('id', { ascending: true }),
      supabase.from('sms_hrms_attendance').select('*'),
      supabase.from('sms_hrms_leave_requests').select('*'),
      supabase.from('sms_hrms_leave_balances').select('*'),
      supabase.from('sms_hrms_payroll').select('*'),
      supabase.from('sms_hrms_advance_requests').select('*'),
      supabase.from('sms_hrms_location_pins').select('*'),
      supabase.from('sms_hrms_monthly_leave_quota').select('*')
    ]);

    if (empErr) console.warn('Employees query notice:', empErr);

    return res.json({
      employees: employees || [],
      sms_hrms_attendance: attendance || [],
      sms_hrms_leave_requests: leaveRequests || [],
      sms_hrms_leave_balances: leaveBalances || [],
      sms_hrms_payroll: payroll || [],
      sms_hrms_advance_requests: advanceRequests || [],
      sms_hrms_location_pins: locationPins || [],
      sms_hrms_monthly_leave_quota: monthlyLeaveQuota || []
    });
  } catch (err) {
    console.error('Directory fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch directory data', details: err?.message });
  }
});

// --- ATTENDANCE MANAGEMENT APIS ---
app.post(['/api/hrms/attendance/record', '/hrms/attendance/record'], async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ error: 'Database not configured' });
    const { empId, date, status, checkIn, checkOut } = req.body || {};
    if (!empId || !date || !status) {
      return res.status(400).json({ error: 'empId, date, and status are required' });
    }

    // Capitalize status for DB consistency (Present, Absent, Half-day, Leave, Holiday, Mispunch, Weekoff)
    const dbStatus = status.charAt(0).toUpperCase() + status.slice(1);

    // Check if an attendance record exists for this employee and date
    const { data: existing, error: fetchErr } = await supabase
      .from('sms_hrms_attendance')
      .select('id, session_number')
      .eq('employee_id', empId)
      .eq('date', date)
      .order('session_number', { ascending: true })
      .limit(1);

    if (fetchErr) throw fetchErr;

    let result;
    if (existing && existing.length > 0) {
      const updatePayload = {
        status: dbStatus
      };
      if (checkIn !== undefined) updatePayload.check_in_time = checkIn || null;
      if (checkOut !== undefined) updatePayload.check_out_time = checkOut || null;

      const { data, error } = await supabase
        .from('sms_hrms_attendance')
        .update(updatePayload)
        .eq('id', existing[0].id)
        .select('*')
        .single();
      if (error) throw error;
      result = data;
    } else {
      const insertPayload = {
        employee_id: empId,
        date: date,
        status: dbStatus,
        check_in_time: checkIn || null,
        check_out_time: checkOut || null,
        session_number: 1
      };
      const { data, error } = await supabase
        .from('sms_hrms_attendance')
        .insert([insertPayload])
        .select('*')
        .single();
      if (error) throw error;
      result = data;
    }

    // If marked absent, deduct penalty leave (casual, 2 days)
    if (status.toLowerCase() === 'absent') {
      try {
        const { data: balance } = await supabase
          .from('sms_hrms_leave_balances')
          .select('*')
          .eq('employee_id', empId)
          .eq('leave_type', 'casual')
          .maybeSingle();

        if (balance) {
          await supabase
            .from('sms_hrms_leave_balances')
            .update({ used: Number(balance.used || 0) + 2 })
            .eq('id', balance.id);
        } else {
          await supabase
            .from('sms_hrms_leave_balances')
            .insert([{ employee_id: empId, leave_type: 'casual', total_allotted: 8, used: 2 }]);
        }
      } catch (leaveErr) {
        console.warn('Leave penalty deduction warning:', leaveErr);
      }
    }

    return res.json({ success: true, record: result });
  } catch (err) {
    console.error('Update attendance record error:', err);
    return res.status(500).json({ error: 'Failed to update attendance record', details: err?.message });
  }
});

app.post(['/api/hrms/attendance/force-close', '/hrms/attendance/force-close'], async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ error: 'Database not configured' });
    const { empId, date, time } = req.body || {};
    if (!empId || !date) {
      return res.status(400).json({ error: 'empId and date are required' });
    }

    const timeStr = time || '18:00:00';
    const { data: activeSessions, error: fetchErr } = await supabase
      .from('sms_hrms_attendance')
      .select('id')
      .eq('employee_id', empId)
      .eq('date', date)
      .is('check_out_time', null);

    if (fetchErr) throw fetchErr;

    if (activeSessions && activeSessions.length > 0) {
      for (const session of activeSessions) {
        await supabase
          .from('sms_hrms_attendance')
          .update({ check_out_time: timeStr, punch_note: 'Forced close by Admin' })
          .eq('id', session.id);
      }
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Force close session error:', err);
    return res.status(500).json({ error: 'Failed to force close session', details: err?.message });
  }
});

app.post(['/api/hrms/attendance/clock-in', '/hrms/attendance/clock-in'], async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ error: 'Database not configured' });
    const { empId, location, latLng, photoUrl, punchType, punchNote } = req.body || {};
    if (!empId) {
      return res.status(400).json({ error: 'empId is required' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toTimeString().split(' ')[0];

    const { data: existingSessions, error: sessionErr } = await supabase
      .from('sms_hrms_attendance')
      .select('session_number')
      .eq('employee_id', empId)
      .eq('date', todayStr);

    if (sessionErr) throw sessionErr;

    let nextSessionNumber = 1;
    if (existingSessions && existingSessions.length > 0) {
      const maxSession = Math.max(...existingSessions.map((s) => s.session_number || 1));
      nextSessionNumber = maxSession + 1;
    }

    const payload = {
      employee_id: empId,
      date: todayStr,
      status: 'Present',
      check_in_time: timeStr,
      check_in_location: location || null,
      check_in_lat_lng: latLng || null,
      punch_type: punchType || 'in_office',
      punch_note: punchNote || null,
      session_number: nextSessionNumber
    };
    if (photoUrl) payload.check_in_photo_url = photoUrl;

    const { data, error } = await supabase
      .from('sms_hrms_attendance')
      .insert([payload])
      .select('*')
      .single();

    if (error && (error.code === '42703' || error.code === 'PGRST204') && photoUrl) {
      delete payload.check_in_photo_url;
      const retry = await supabase.from('sms_hrms_attendance').insert([payload]).select('*').single();
      if (retry.error) throw retry.error;
      return res.json({ success: true, record: retry.data });
    } else if (error) {
      throw error;
    }

    return res.json({ success: true, record: data });
  } catch (err) {
    console.error('Clock-in error:', err);
    return res.status(500).json({ error: 'Failed to clock in', details: err?.message });
  }
});

app.post(['/api/hrms/attendance/clock-out', '/hrms/attendance/clock-out'], async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ error: 'Database not configured' });
    const { empId, photoUrl, location, latLng } = req.body || {};
    if (!empId) {
      return res.status(400).json({ error: 'empId is required' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toTimeString().split(' ')[0];

    const { data: existingSessions, error: fetchErr } = await supabase
      .from('sms_hrms_attendance')
      .select('id, session_number, check_out_time')
      .eq('employee_id', empId)
      .eq('date', todayStr)
      .order('session_number', { ascending: false });

    if (fetchErr) throw fetchErr;

    const activeSession = existingSessions?.find(s => s.check_out_time === null);

    if (activeSession) {
      const payload = {
        check_out_time: timeStr
      };
      if (photoUrl) payload.check_out_photo_url = photoUrl;
      if (location) payload.check_out_location = location;
      if (latLng) payload.check_out_lat_lng = latLng;

      const { data, error } = await supabase
        .from('sms_hrms_attendance')
        .update(payload)
        .eq('id', activeSession.id)
        .select('*')
        .single();
      if (error) throw error;
      return res.json({ success: true, record: data });
    } else {
      let nextSession = 1;
      if (existingSessions && existingSessions.length > 0) {
        nextSession = Math.max(...existingSessions.map(s => s.session_number || 1)) + 1;
      }

      const payload = {
        employee_id: empId,
        date: todayStr,
        status: 'Present',
        check_out_time: timeStr,
        session_number: nextSession
      };
      if (photoUrl) payload.check_out_photo_url = photoUrl;
      if (location) payload.check_out_location = location;
      if (latLng) payload.check_out_lat_lng = latLng;

      const { data, error } = await supabase
        .from('sms_hrms_attendance')
        .insert([payload])
        .select('*')
        .single();
      if (error) throw error;
      return res.json({ success: true, record: data });
    }
  } catch (err) {
    console.error('Clock-out error:', err);
    return res.status(500).json({ error: 'Failed to clock out', details: err?.message });
  }
});

app.get(['/api/hrms/attendance/missed-punchout', '/hrms/attendance/missed-punchout'], async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ error: 'Database not configured' });
    const { empId } = req.query;
    if (!empId) return res.status(400).json({ error: 'empId is required' });

    const todayStr = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('sms_hrms_attendance')
      .select('date')
      .eq('employee_id', empId)
      .is('check_out_time', null)
      .lt('date', todayStr)
      .order('date', { ascending: false });

    if (error) throw error;

    if (data && data.length > 0) {
      for (const session of data) {
        const { data: approvedReq } = await supabase
          .from('sms_hrms_missed_punch_requests')
          .select('id')
          .eq('employee_id', empId)
          .eq('missed_date', session.date)
          .eq('status', 'approved')
          .maybeSingle();

        if (approvedReq) {
          await supabase
            .from('sms_hrms_attendance')
            .update({ check_out_time: '18:00:00', punch_note: 'Auto-closed by system (Previously Approved)' })
            .eq('employee_id', empId)
            .eq('date', session.date)
            .is('check_out_time', null);
        } else {
          // Check if a pending request exists
          const { data: pendingReq } = await supabase
            .from('sms_hrms_missed_punch_requests')
            .select('id')
            .eq('employee_id', empId)
            .eq('missed_date', session.date)
            .eq('status', 'pending')
            .maybeSingle();

          return res.json({ missedDate: session.date, hasPending: !!pendingReq });
        }
      }
    }

    return res.json({ missedDate: null, hasPending: false });
  } catch (err) {
    console.error('Check missed punchout error:', err);
    return res.status(500).json({ error: 'Failed to check missed punchout', details: err?.message });
  }
});

app.post(['/api/hrms/attendance/auto-expire-missed', '/hrms/attendance/auto-expire-missed'], async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ error: 'Database not configured' });
    const { empId } = req.body || {};
    if (!empId) return res.status(400).json({ error: 'empId is required' });

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const cutoffTime = yesterday.toISOString();

    const { data: expiredRequests, error: fetchErr } = await supabase
      .from('sms_hrms_missed_punch_requests')
      .select('id, missed_date')
      .eq('employee_id', empId)
      .eq('punch_type', 'out')
      .eq('status', 'pending')
      .lt('created_at', cutoffTime);

    if (fetchErr) throw fetchErr;

    if (expiredRequests && expiredRequests.length > 0) {
      for (const reqItem of expiredRequests) {
        const { data: att } = await supabase
          .from('sms_hrms_attendance')
          .select('id')
          .eq('employee_id', empId)
          .eq('date', reqItem.missed_date)
          .limit(1);

        if (att && att.length > 0) {
          await supabase
            .from('sms_hrms_attendance')
            .update({ status: 'Half-day', check_out_time: '18:00:00', punch_note: 'Auto-closed by system (Missed punch)' })
            .eq('id', att[0].id);
        }

        await supabase
          .from('sms_hrms_missed_punch_requests')
          .update({
            status: 'rejected',
            admin_note: 'Auto-expired: 24-hr window passed. Marked as half-day.',
            resolved_at: new Date().toISOString()
          })
          .eq('id', reqItem.id);
      }
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Auto expire missed punches error:', err);
    return res.status(500).json({ error: 'Failed to auto-expire missed punches', details: err?.message });
  }
});

// --- OFFICE LOCATIONS API ---
app.get(['/api/hrms/office-locations', '/hrms/office-locations'], async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ error: 'Database not configured' });
    const { data, error } = await supabase.from('sms_hrms_office_locations').select('*');
    if (error) throw error;
    return res.json({ locations: data || [] });
  } catch (err) {
    console.error('Office locations fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch office locations', details: err?.message });
  }
});

app.post(['/api/hrms/office-locations', '/hrms/office-locations'], async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ error: 'Database not configured' });
    const { data, error } = await supabase.from('sms_hrms_office_locations').insert([req.body]).select('*').single();
    if (error) throw error;
    return res.json({ location: data });
  } catch (err) {
    console.error('Office location create error:', err);
    return res.status(500).json({ error: 'Failed to create office location', details: err?.message });
  }
});

app.delete(['/api/hrms/office-locations/:id', '/hrms/office-locations/:id'], async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ error: 'Database not configured' });
    const { id } = req.params;
    const { error } = await supabase.from('sms_hrms_office_locations').delete().eq('id', id);
    if (error) throw error;
    return res.json({ success: true });
  } catch (err) {
    console.error('Office location delete error:', err);
    return res.status(500).json({ error: 'Failed to delete office location', details: err?.message });
  }
});

// --- ALLOWED LOCATIONS API ---
app.get(['/api/hrms/allowed-locations', '/hrms/allowed-locations'], async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ error: 'Database not configured' });
    const { data, error } = await supabase.from('sms_hrms_office_locations').select('*').eq('is_active', true);
    if (error) throw error;
    return res.json({ locations: data || [] });
  } catch (err) {
    console.error('Allowed locations fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch allowed locations', details: err?.message });
  }
});

// --- TASKS API ---
app.get(['/api/tasks', '/tasks'], async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ error: 'Database not configured' });
    const { data, error } = await supabase.from('sms_hrms_tasks').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return res.json({ tasks: data || [] });
  } catch (err) {
    console.error('Tasks fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch tasks', details: err?.message });
  }
});

app.post(['/api/tasks', '/tasks'], async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ error: 'Database not configured' });
    const { data, error } = await supabase.from('sms_hrms_tasks').insert([req.body]).select('*').single();
    if (error) throw error;
    return res.json({ task: data });
  } catch (err) {
    console.error('Task create error:', err);
    return res.status(500).json({ error: 'Failed to create task', details: err?.message });
  }
});

app.patch(['/api/tasks/:id', '/tasks/:id'], async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ error: 'Database not configured' });
    const { id } = req.params;
    const { data, error } = await supabase.from('sms_hrms_tasks').update(req.body).eq('id', id).select('*').single();
    if (error) throw error;
    return res.json({ task: data });
  } catch (err) {
    console.error('Task update error:', err);
    return res.status(500).json({ error: 'Failed to update task', details: err?.message });
  }
});

app.delete(['/api/tasks/:id', '/tasks/:id'], async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ error: 'Database not configured' });
    const { id } = req.params;
    const { error } = await supabase.from('sms_hrms_tasks').delete().eq('id', id);
    if (error) throw error;
    return res.json({ success: true });
  } catch (err) {
    console.error('Task delete error:', err);
    return res.status(500).json({ error: 'Failed to delete task', details: err?.message });
  }
});

// --- WEBSOCKET CHAT LOGIC ---
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join_channel', (channelId) => {
    socket.join(channelId);
    console.log(`User ${socket.id} joined channel ${channelId}`);
  });

  socket.on('send_message', async (data) => {
    const { channel_id, sender_id, text, attachment_url, attachment_type, attachment_name } = data;
    console.log(`Message received in channel ${channel_id}: ${text || '[Attachment]'}`);

    const newMessage = {
      channel_id,
      sender_id,
      text: text || null,
      attachment_url: attachment_url || null,
      attachment_type: attachment_type || null,
      attachment_name: attachment_name || null,
      created_at: new Date().toISOString()
    };

    io.to(channel_id).emit('receive_message', newMessage);

    if (supabase) {
      try {
        const { error } = await supabase
          .from('sms_hrms_chat_messages')
          .insert([newMessage]);
          
        if (error) {
          console.error("Error saving message to Supabase:", error.message);
        }
      } catch (err) {
        console.error("Exception saving message to Supabase:", err);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 9640;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 SMS HRMS API & Chat Server running on port ${PORT}`);
});
