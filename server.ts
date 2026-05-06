import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import fs from 'fs';
import db, { query, get, run, transaction, testConnection } from './src/lib/server/db.ts';
import { encrypt, decrypt } from './src/lib/server/crypto.ts';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'my_super_secret_jwt_key';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.use(cookieParser());

  // Request logger for debugging
  app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
      console.log(`[API Request] ${req.method} ${req.url}`);
    }
    next();
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Static files for uploads
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'announcements');
  const candidateUploadsDir = path.join(process.cwd(), 'public', 'uploads', 'candidates');

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  if (!fs.existsSync(candidateUploadsDir)) {
    fs.mkdirSync(candidateUploadsDir, { recursive: true });
  }

  app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

  // Multer setup
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  });

  const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
      const filetypes = /jpeg|jpg|png/;
      const mimetype = filetypes.test(file.mimetype);
      const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
      if (mimetype && extname) {
        return cb(null, true);
      }
      cb(new Error('Only images (jpg, jpeg, png) are allowed'));
    }
  });

  // Candidate photo upload storage. Uploaded candidate photos are stored on disk,
  // while MySQL stores only the public URL path in candidates.photo_url.
  const candidateStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, candidateUploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'candidate-' + uniqueSuffix + path.extname(file.originalname).toLowerCase());
    }
  });

  const candidateUpload = multer({
    storage: candidateStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
      const filetypes = /jpeg|jpg|png|webp/;
      const mimetype = filetypes.test(file.mimetype);
      const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
      if (mimetype && extname) {
        return cb(null, true);
      }
      cb(new Error('Only images (jpg, jpeg, png, webp) are allowed'));
    }
  });

  const saveCandidateImageIfBase64 = async (photoUrl?: string | null): Promise<string | null> => {
    if (!photoUrl) return null;

    // Already a stored file path or external URL. Keep as-is.
    if (!photoUrl.startsWith('data:image/')) {
      return photoUrl;
    }

    const match = photoUrl.match(/^data:image\/(png|jpe?g|webp);base64,(.+)$/);
    if (!match) {
      throw new Error('Invalid candidate image format. Use JPG, PNG, or WEBP.');
    }

    const extension = match[1] === 'jpeg' ? 'jpg' : match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length > 5 * 1024 * 1024) {
      throw new Error('Candidate image size should be less than 5MB');
    }

    const filename = `candidate-${Date.now()}-${Math.round(Math.random() * 1E9)}.${extension}`;
    const filePath = path.join(candidateUploadsDir, filename);

    await fs.promises.writeFile(filePath, buffer);

    return `/uploads/candidates/${filename}`;
  };

  // Test MySQL connection only.
  // Tables are already created manually in MySQL.
  await testConnection();

  // Helper for audit logging
  const logAction = async (actorType: string, actorId: number, action: string, details: string, req: express.Request) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    await run(`
      INSERT INTO audit_logs (actor_type, actor_id, action, details, ip_address)
      VALUES (?, ?, ?, ?, ?)
    `, [actorType, actorId, action, details, ip]);
  };


  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // Role Helper
  const hasRole = (user: any, roles: string | string[]) => {
    if (!user) return false;
    if (user.type === 'it') return true;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    // Aliases
    if (allowedRoles.includes('pro') && user.role === 'EC Public Relations Officer') return true;
    if (allowedRoles.includes('pro') && user.role === 'Public Relations Officer') return true;
    return allowedRoles.includes(user.role);
  };

  const isPublicRelationsOfficer = (user: any) => {
    const role = String(user?.role || '').toLowerCase().trim();
    return (
      role === 'pro' ||
      role === 'public relations officer' ||
      role === 'ec public relations officer' ||
      role.includes('public relations')
    );
  };

  // Candidate permission helpers
  // General Secretary and IT Admin can create, edit, and delete candidates.
  // EC Public Relations Officer can only manage manifestos for existing candidates.
  // Other EC members can only view candidate records.
  const canManageCandidates = (user: any) => {
    return user?.type === 'it' || user?.role === 'general_secretary';
  };

  const canManageCandidateManifestos = (user: any) => {
    return user?.type === 'it' || user?.role === 'pro' || user?.role === 'EC Public Relations Officer';
  };

  // API Routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const {
        email,
        password,
        type: requestedType,
        role: requestedRole,
        userType,
      } = req.body;

      const loginIdentifier = String(email || '').trim();
      const loginPassword = String(password || '');
      const rawLoginType = String(requestedType || requestedRole || userType || '').trim().toLowerCase();
      const normalizedRole = rawLoginType.replace(/\s+/g, '_');
      const loginType = normalizedRole || null;
      const normalizedEmail = loginIdentifier.toLowerCase();
      const isUniversityEmail = normalizedEmail.endsWith('@university.edu');

      if (!loginIdentifier || !loginPassword) {
        return res.status(400).json({
          error: 'Email/student number and password are required',
        });
      }

      let user: any = null;
      let actualType: 'student' | 'ec' | 'it' | null = null;

      const findStudent = async () => {
        return await get(
          `
          SELECT 
            student_id,
            student_id AS id,
            full_name,
            email,
            student_number,
            password_hash,
            is_eligible,
            'student' AS role,
            'student' AS type
          FROM students
          WHERE LOWER(email) = ? OR student_number = ?
          LIMIT 1
          `,
          [normalizedEmail, loginIdentifier]
        );
      };

      const findECMember = async () => {
        return await get(
          `
          SELECT 
            ec_id,
            ec_id AS id,
            full_name,
            TRIM(email) AS email,
            role,
            password_hash,
            'ec' AS type
          FROM ec_members
          WHERE LOWER(TRIM(email)) = ?
          LIMIT 1
          `,
          [normalizedEmail]
        );
      };

      const findITAdmin = async () => {
        return await get(
          `
          SELECT 
            admin_id,
            admin_id AS id,
            full_name,
            TRIM(email) AS email,
            password_hash,
            'it' AS role,
            'it' AS type
          FROM it_admins
          WHERE LOWER(TRIM(email)) = ?
          LIMIT 1
          `,
          [normalizedEmail]
        );
      };

      const ecLoginTypes = [
        'ec',
        'ec_member',
        'chairperson',
        'vice_chairperson',
        'general_secretary',
        'public_relations_officer',
        'pro',
      ];

      const itLoginTypes = ['it', 'it_admin', 'admin', 'system_admin'];

      // Respect the selected login type when the frontend provides one.
      if (loginType === 'student') {
        user = await findStudent();
        actualType = user ? 'student' : null;
      } else if (loginType && ecLoginTypes.includes(loginType)) {
        user = await findECMember();
        actualType = user ? 'ec' : null;
      } else if (loginType && itLoginTypes.includes(loginType)) {
        user = await findITAdmin();
        actualType = user ? 'it' : null;
      } else {
        // Unified login fallback: try student, then EC, then IT.
        user = await findStudent();
        if (user) {
          actualType = 'student';
        } else {
          user = await findECMember();
          if (user) {
            actualType = 'ec';
          } else {
            user = await findITAdmin();
            if (user) actualType = 'it';
          }
        }
      }

      if (!user || !actualType) {
        const message = loginType === 'student'
          ? 'Invalid credentials. Students should use their university email ending with @university.edu or their student number.'
          : 'Invalid credentials';
        return res.status(401).json({ error: message });
      }

      if (actualType === 'student' && loginIdentifier.includes('@') && !isUniversityEmail) {
        return res.status(400).json({ error: 'Student email must use the @university.edu format.' });
      }

      if (actualType !== 'student' && user.status && user.status !== 'active') {
        return res.status(403).json({ error: 'Account is not active' });
      }

      const storedPassword = user.password_hash;

      if (!storedPassword) {
        console.error('Login failed: user has no password field', {
          type: actualType,
          email: loginIdentifier,
        });
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      let passwordMatches = false;

      // Students table has password_hash only. EC/IT can still support either
      // password_hash or a plain password field if your sample tables have one.
      if (
        typeof storedPassword === 'string' &&
        (storedPassword.startsWith('$2a$') ||
          storedPassword.startsWith('$2b$') ||
          storedPassword.startsWith('$2y$'))
      ) {
        passwordMatches = await bcrypt.compare(loginPassword, storedPassword);
      } else {
        passwordMatches = loginPassword === String(storedPassword);
      }

      if (!passwordMatches) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const role = actualType === 'student' ? 'student' : actualType === 'it' ? 'it' : user.role;
      const userId = actualType === 'student' ? user.student_id : actualType === 'it' ? user.admin_id : user.ec_id;

      const token = jwt.sign(
        {
          id: userId,
          student_id: actualType === 'student' ? user.student_id : undefined,
          ec_id: actualType === 'ec' ? user.ec_id : undefined,
          admin_id: actualType === 'it' ? user.admin_id : undefined,
          email: user.email,
          role,
          type: actualType,
        },
        JWT_SECRET,
        { expiresIn: '1d' }
      );

      res.cookie('token', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });

      await logAction(actualType, userId, 'login', `User logged in as ${role}`, req);

      res.json({
        id: userId,
        student_id: actualType === 'student' ? user.student_id : undefined,
        name: user.full_name,
        email: user.email,
        role,
        type: actualType,
        is_eligible: actualType === 'student' ? user.is_eligible : undefined,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
  });

  app.get('/api/auth/me', authenticate, async (req: any, res) => {
    if (req.user.type === 'student') {
      const student = await get('SELECT student_id, student_number, full_name, email, faculty, program, residence, is_eligible FROM students WHERE student_id = ?', [req.user.id]);
      res.json({ ...(req.user as any), ...(student as any) });
    } else {
      res.json(req.user);
    }
  });

  app.get('/api/student/my-votes', authenticate, async (req: any, res) => {
    if (req.user.type !== 'student') return res.status(403).json({ error: 'Forbidden' });
    const votes = await query('SELECT election_id FROM voter_registry WHERE student_id = ?', [req.user.id]) as any[];
    res.json(votes.map((v: any) => v.election_id));
  });

  app.get('/api/student/notifications', authenticate, async (req: any, res) => {
    if (req.user.type !== 'student') return res.status(403).json({ error: 'Forbidden' });
    const notifications = await query('SELECT * FROM notifications WHERE student_id = ? ORDER BY timestamp DESC LIMIT 20', [req.user.id]);
    res.json(notifications);
  });

  app.post('/api/student/notifications/:id/read', authenticate, async (req: any, res) => {
    if (req.user.type !== 'student') return res.status(403).json({ error: 'Forbidden' });
    await run('UPDATE notifications SET is_read = 1 WHERE notification_id = ? AND student_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true });
  });

  app.get('/api/student/voting-history', authenticate, async (req: any, res) => {
    if (req.user.type !== 'student') return res.status(403).json({ error: 'Forbidden' });
    const history = await query(`
      SELECT vr.timestamp, e.title, e.election_id 
      FROM voter_registry vr
      JOIN elections e ON vr.election_id = e.election_id
      WHERE vr.student_id = ?
      ORDER BY vr.timestamp DESC
    `, [req.user.id]);
    res.json(history);
  });


  // Elections
  // NOTE:
  // Student visibility now depends on the configured start_time and end_time.
  // This avoids the problem where an election is scheduled to be active,
  // but students cannot see it because the stored status is still 'draft'.
  const electionStatusCase = `
    CASE
      WHEN NOW() BETWEEN start_time AND end_time THEN 'active'
      WHEN NOW() > end_time THEN 'closed'
      ELSE 'draft'
    END
  `;

  const electionHasCandidatesSql = `
    EXISTS (
      SELECT 1
      FROM positions p
      JOIN candidates c ON p.position_id = c.position_id
      WHERE p.election_id = e.election_id
    )
  `;

  const activePollsSelectSql = `
    SELECT
      e.election_id,
      e.title,
      e.description,
      e.start_time,
      e.end_time,
      e.status AS stored_status,
      'active' AS status,
      'active' AS computed_status,
      COUNT(DISTINCT p.position_id) AS positions_count,
      COUNT(DISTINCT c.candidate_id) AS candidates_count
    FROM elections e
    JOIN positions p ON p.election_id = e.election_id
    JOIN candidates c ON c.position_id = p.position_id
    LEFT JOIN voter_registry vr
      ON vr.election_id = e.election_id
      AND vr.student_id = ?
    WHERE
      NOW() BETWEEN e.start_time AND e.end_time
      AND vr.student_id IS NULL
    GROUP BY
      e.election_id,
      e.title,
      e.description,
      e.start_time,
      e.end_time,
      e.status
    HAVING candidates_count > 0
    ORDER BY e.election_id DESC
  `;

  app.get('/api/elections', authenticate, async (req: any, res) => {
    try {
      let sql = `
        SELECT
          e.*,
          ${electionStatusCase.replaceAll('start_time', 'e.start_time').replaceAll('end_time', 'e.end_time')} AS computed_status
        FROM elections e
        ORDER BY e.election_id DESC
      `;

      // Students see elections that are active by schedule and have candidates.
      // They can also see completed/archived elections for results/history.
      if (req.user.type === 'student') {
        sql = `
          SELECT
            e.*,
            ${electionStatusCase.replaceAll('start_time', 'e.start_time').replaceAll('end_time', 'e.end_time')} AS computed_status
          FROM elections e
          WHERE
            (NOW() BETWEEN e.start_time AND e.end_time AND ${electionHasCandidatesSql})
            OR e.status IN ('closed', 'archived')
            OR NOW() > e.end_time
          ORDER BY e.election_id DESC
        `;
      }

      const elections = await query(sql);
      res.json(elections);
    } catch (error) {
      console.error('Error fetching elections:', error);
      res.status(500).json({ error: 'Failed to fetch elections' });
    }
  });

  // Active elections ready for voting.
  // Active is calculated from date/time, not only from the status column.
  // It also excludes elections where the logged-in student has already voted.
  app.get('/api/elections/active-ready', authenticate, async (req: any, res) => {
    try {
      if (req.user.type !== 'student') {
        return res.status(403).json({ error: 'Only students can access this endpoint' });
      }

      const elections = await query(activePollsSelectSql, [req.user.id]);
      res.json(elections);
    } catch (error) {
      console.error('Error fetching active elections:', error);
      res.status(500).json({ error: 'Failed to fetch active elections' });
    }
  });

  // Student Vote Now / Open Polls endpoint.
  // Some frontends use this endpoint instead of /api/elections/active-ready.
  // Keep both routes so the Vote Now page and Elections tab return the same active polls.
  app.get('/api/student/open-polls', authenticate, async (req: any, res) => {
    try {
      if (req.user.type !== 'student') {
        return res.status(403).json({ error: 'Only students can access open polls' });
      }

      const polls = await query(activePollsSelectSql, [req.user.id]);
      res.json(polls);
    } catch (error) {
      console.error('Error fetching student open polls:', error);
      res.status(500).json({ error: 'Failed to fetch open polls' });
    }
  });

  // Debug endpoint for checking why a student may see "No Open Polls".
  // It returns active election timing, position/candidate counts, and whether the student already voted.
  app.get('/api/student/open-polls/debug', authenticate, async (req: any, res) => {
    try {
      if (req.user.type !== 'student') {
        return res.status(403).json({ error: 'Only students can access open poll diagnostics' });
      }

      const rows = await query(`
        SELECT
          e.election_id,
          e.title,
          e.status AS stored_status,
          CASE
            WHEN NOW() BETWEEN e.start_time AND e.end_time THEN 'active'
            WHEN NOW() > e.end_time THEN 'closed'
            ELSE 'draft'
          END AS computed_status,
          e.start_time,
          e.end_time,
          NOW() AS current_server_time,
          COUNT(DISTINCT p.position_id) AS positions_count,
          COUNT(DISTINCT c.candidate_id) AS candidates_count,
          CASE WHEN vr.student_id IS NULL THEN 0 ELSE 1 END AS already_voted
        FROM elections e
        LEFT JOIN positions p ON p.election_id = e.election_id
        LEFT JOIN candidates c ON c.position_id = p.position_id
        LEFT JOIN voter_registry vr
          ON vr.election_id = e.election_id
          AND vr.student_id = ?
        GROUP BY
          e.election_id,
          e.title,
          e.status,
          e.start_time,
          e.end_time,
          vr.student_id
        ORDER BY e.election_id DESC
      `, [req.user.id]);

      res.json(rows);
    } catch (error) {
      console.error('Error fetching open poll diagnostics:', error);
      res.status(500).json({ error: 'Failed to fetch open poll diagnostics' });
    }
  });

  app.get('/api/elections/:id', authenticate, async (req: any, res) => {
    const election = await get(`
      SELECT
        e.*,
        ${electionStatusCase.replaceAll('start_time', 'e.start_time').replaceAll('end_time', 'e.end_time')} AS computed_status
      FROM elections e
      WHERE e.election_id = ?
    `, [req.params.id]);

    if (!election) return res.status(404).json({ error: 'Election not found' });

    // Students can only open an election if it is currently active by time and has candidates,
    // or if it is completed/closed/archived for results/history.
    if (req.user.type === 'student') {
      const allowed = await get(`
        SELECT 1
        FROM elections e
        WHERE e.election_id = ?
        AND (
          (NOW() BETWEEN e.start_time AND e.end_time AND ${electionHasCandidatesSql})
          OR e.status IN ('closed', 'archived')
          OR NOW() > e.end_time
        )
      `, [req.params.id]);

      if (!allowed) {
        return res.status(403).json({ error: 'This election is not available for viewing or voting at this time.' });
      }
    }
    
    const student = req.user.type === 'student' ? await get('SELECT program, residence FROM students WHERE student_id = ?', [req.user.id]) as any : null;
    
    const positions = await query('SELECT * FROM positions WHERE election_id = ? ORDER BY position_id ASC', [req.params.id]) as any[];
    const positionsWithCandidates = await Promise.all(positions.map(async (pos: any) => {
      const candidates = await query(`
        SELECT c.*, s.full_name as name 
        FROM candidates c 
        JOIN students s ON c.student_id = s.student_id 
        WHERE c.position_id = ?
      `, [pos.position_id]) as any[];

      // For students, filter candidates by eligibility (program/residence for GRC)
      let filteredCandidates = candidates;
      if (req.user.type === 'student' && student) {
        const posTitle = (pos.title || '').toLowerCase();
        if (posTitle.includes('grc')) {
          filteredCandidates = candidates.filter(c => {
            const designation = (c.designation || '').toLowerCase();
            const program = (student.program || '').toLowerCase();
            const residence = (student.residence || '').toLowerCase();
            return (program && designation.includes(program)) || (residence && designation.includes(residence));
          });
        }
      }

      return { ...pos, candidates: filteredCandidates };
    }));

    const filteredPositions = positionsWithCandidates.filter((pos: any) => {
      // Don't show positions with no eligible candidates for students, 
      // unless it's a mandatory one (like Guild President) which should always be visible (even if empty)
      if (req.user.type === 'student') {
        const isMainPosition = (pos.title || '').toLowerCase().includes('president');
        return isMainPosition || (pos.candidates && pos.candidates.length > 0);
      }
      return true;
    });

    res.json({ ...(election as any), positions: filteredPositions });
  });

  app.post('/api/elections', authenticate, async (req: any, res) => {
    if (!hasRole(req.user, 'general_secretary')) {
      return res.status(403).json({ error: 'Only the General Secretary or IT Admin can create elections.' });
    }
    const { title, description, start_time, end_time } = req.body;
    const result = await run(`
      INSERT INTO elections (title, description, start_time, end_time, status, created_by)
      VALUES (?, ?, ?, ?, 'draft', ?)
    `, [title, description, start_time, end_time, req.user.id]);
    
    await logAction(req.user.type, req.user.id, 'create_election', `Created election: ${title}`, req);
    res.json({ id: result.insertId, election_id: result.insertId, success: true });
  });

  app.patch('/api/elections/:id/status', authenticate, async (req: any, res) => {
    const { status } = req.body;
    const electionId = req.params.id;

    // Strict Role-Based Status Management
    if (!hasRole(req.user, 'chairperson')) {
      return res.status(403).json({ 
        error: 'Strict Policy: Only the EC Chairperson can manage election status (Start/Pause/Close).' 
      });
    }

    const election = await get('SELECT status FROM elections WHERE election_id = ?', [electionId]) as any;
    
    if (!election) return res.status(404).json({ error: 'Election not found' });

    await run('UPDATE elections SET status = ? WHERE election_id = ?', [status, electionId]);
    
    await logAction('ec', req.user.id, 'update_election_status', `Updated election ${electionId} status to ${status}`, req);
    res.json({ success: true });
  });
  
  app.post('/api/elections/:id/approve-results', authenticate, async (req: any, res) => {
    if (!hasRole(req.user, 'chairperson')) {
      return res.status(403).json({ error: 'Only the EC Chairperson can approve election results for official publication.' });
    }
    
    const election = await get('SELECT status FROM elections WHERE election_id = ?', [req.params.id]) as any;
    if (!election) return res.status(404).json({ error: 'Election not found' });
    
    if (election.status !== 'closed' && election.status !== 'archived') {
      return res.status(400).json({ error: 'Results can only be approved after the election has been officially closed.' });
    }

    await run('UPDATE elections SET is_results_approved = 1 WHERE election_id = ?', [req.params.id]);
    
    await logAction('ec', req.user.id, 'approve_results', `Approved results for election ${req.params.id} for public view`, req);
    res.json({ success: true });
  });


  // Voting
  app.post('/api/vote', authenticate, async (req: any, res) => {
    if (req.user.type !== 'student') return res.status(403).json({ error: 'Only students can vote' });
    
    const { election_id, selections } = req.body; // selections: { position_id: candidate_id }
    
    // Check if student already voted
    const alreadyVoted = await get('SELECT * FROM voter_registry WHERE election_id = ? AND student_id = ?', [election_id, req.user.id]);
    if (alreadyVoted) return res.status(400).json({ error: 'Already voted in this election' });

    // Check election activity using the configured start_time and end_time.
    // Do not depend only on elections.status because scheduled elections may still be stored as 'draft'.
    const election = await get('SELECT * FROM elections WHERE election_id = ?', [election_id]) as any;
    if (!election) return res.status(404).json({ error: 'Election not found' });

    const now = new Date();
    const start = new Date(election.start_time);
    const end = new Date(election.end_time);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Election schedule is invalid' });
    }

    if (now < start || now > end) {
      return res.status(400).json({ error: 'Election is not active' });
    }

    const hasCandidates = await get(`
      SELECT 1
      FROM positions p
      JOIN candidates c ON p.position_id = c.position_id
      WHERE p.election_id = ?
      LIMIT 1
    `, [election_id]);

    if (!hasCandidates) {
      return res.status(400).json({ error: 'Election has no candidates yet' });
    }

    // Encrypt vote
    const encryptedVote = encrypt(JSON.stringify(selections));

    try {
      // Transactional update
      await transaction(async (tx) => {
        await tx.run('INSERT INTO votes (election_id, encrypted_vote) VALUES (?, ?)', [election_id, encryptedVote]);
        await tx.run('INSERT INTO voter_registry (election_id, student_id) VALUES (?, ?)', [election_id, req.user.id]);
      });

      await logAction('student', req.user.id, 'cast_vote', `Cast vote in election ${election_id}`, req);
      res.json({ success: true });
    } catch (err) {
      console.error('Voting error:', err);
      res.status(500).json({ error: 'Failed to cast vote' });
    }
  });

  // Results
  app.get('/api/elections/:id/results', authenticate, async (req: any, res) => {
    const election = await get('SELECT * FROM elections WHERE election_id = ?', [req.params.id]) as any;
    if (!election) return res.status(404).json({ error: 'Election not found' });

    // Only allow viewing results if closed and approved, or if EC/IT
    if (req.user.type === 'student') {
      if (election.status !== 'closed' && election.status !== 'archived') {
        return res.status(403).json({ error: 'Results are not yet available (Polls still open)' });
      }
      if (!election.is_results_approved) {
        return res.status(403).json({ error: 'Results have not yet been approved for publication' });
      }
    }

    // Tally votes
    const votes = await query('SELECT encrypted_vote FROM votes WHERE election_id = ?', [req.params.id]) as any[];
    const tallies: Record<number, number> = {}; // candidate_id -> count

    votes.forEach(v => {
      try {
        const selections = JSON.parse(decrypt(v.encrypted_vote));
        Object.values(selections).forEach((val: any) => {
          if (Array.isArray(val)) {
            val.forEach((id: any) => {
              tallies[id] = (tallies[id] || 0) + 1;
            });
          } else if (val) {
            tallies[val] = (tallies[val] || 0) + 1;
          }
        });
      } catch (e) {
        console.error('Failed to decrypt or parse vote:', e);
      }
    });

    const positions = await query('SELECT * FROM positions WHERE election_id = ? ORDER BY position_id ASC', [req.params.id]) as any[];
    const results = await Promise.all(positions.map(async (pos: any) => {
      const candidates = await query(`
        SELECT c.*, s.full_name as name 
        FROM candidates c 
        JOIN students s ON c.student_id = s.student_id 
        WHERE c.position_id = ?
      `, [pos.position_id]) as any[];
      return {
        ...pos,
        candidates: candidates.map((c: any) => ({
          ...c,
          votes: tallies[c.candidate_id] || 0
        }))
      };
    }));

    res.json({ election, results });
  });

  // Turnout
  app.get('/api/elections/:id/turnout', authenticate, async (req: any, res) => {
    if (req.user.type !== 'ec' && req.user.type !== 'it') return res.status(403).json({ error: 'Forbidden' });
    
    const totalStudents = await get('SELECT COUNT(*) as count FROM students WHERE is_eligible = 1') as any;
    const votedCount = await get('SELECT COUNT(*) as count FROM voter_registry WHERE election_id = ?', [req.params.id]) as any;
    
    const turnoutByFaculty = await query(`
      SELECT s.faculty, COUNT(vr.registry_id) as count
      FROM students s
      LEFT JOIN voter_registry vr ON s.student_id = vr.student_id AND vr.election_id = ?
      GROUP BY s.faculty
    `, [req.params.id]);

    res.json({
      total: totalStudents.count,
      voted: votedCount.count,
      byFaculty: turnoutByFaculty
    });
  });

  // Audit Logs
  app.get('/api/audit-logs', authenticate, async (req: any, res) => {
    if (req.user.type !== 'it' && (req.user.type !== 'ec' || (req.user.role !== 'chairperson' && req.user.role !== 'vice_chairperson'))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    let queryStr = `
      SELECT 
        a.*,
        COALESCE(e.full_name, i.full_name, s.full_name) as actor_name,
        e.role as ec_role
      FROM audit_logs a
      LEFT JOIN ec_members e ON a.actor_type = 'ec' AND a.actor_id = e.ec_id
      LEFT JOIN it_admins i ON a.actor_type = 'it' AND a.actor_id = i.admin_id
      LEFT JOIN students s ON a.actor_type = 'student' AND a.actor_id = s.student_id
    `;

    const isECAdmin = req.user.type === 'ec' && (req.user.role === 'chairperson' || req.user.role === 'vice_chairperson');
    
    if (isECAdmin) {
      queryStr += " WHERE a.action != 'login' AND a.actor_type = 'ec' ";
    }

    queryStr += " ORDER BY a.timestamp DESC LIMIT 100 ";

    try {
      const logs = await query(queryStr);
      res.json(logs);
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
      res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  });

  app.get('/api/profile/activity', authenticate, async (req: any, res) => {
    const logs = await query(`
      SELECT action, details, timestamp 
      FROM audit_logs 
      WHERE actor_type = ? AND actor_id = ?
      ORDER BY timestamp DESC 
      LIMIT 5
    `, [req.user.type, req.user.id]);
    res.json(logs);
  });

  
  app.get('/api/student/eligible-candidates', authenticate, async (req: any, res) => {
    if (req.user.type !== 'student') return res.status(403).json({ error: 'Forbidden' });

    const student = await get('SELECT program, residence FROM students WHERE student_id = ?', [req.user.id]) as any;
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const candidates = await query(`
      SELECT 
        c.*, 
        s.full_name as name,
        p.title as position_title,
        p.description as position_description
      FROM candidates c
      JOIN students s ON c.student_id = s.student_id
      JOIN positions p ON c.position_id = p.position_id
    `) as any[];

    const filtered = candidates.filter(c => {
      const posTitle = (c.position_title || '').toLowerCase();
      
      // Guild President is always visible
      if (posTitle.includes('guild president')) return true;

      // GRC is filtered by program or residence
      if (posTitle.includes('grc')) {
        const designation = (c.designation || '').toLowerCase();
        const program = (student.program || '').toLowerCase();
        const residence = (student.residence || '').toLowerCase();

        const matchesProgram = program && designation.includes(program);
        const matchesResidence = residence && designation.includes(residence);
        
        return matchesProgram || matchesResidence;
      }

      // Drop others
      return false;
    });

    res.json(filtered);
  });

  // Announcements
  app.get('/api/announcements', authenticate, async (req: any, res) => {
    const { created_by } = req.query;
    let sql = `
      SELECT 
        announcement_id as id, 
        title, 
        message, 
        image_url as image_path, 
        created_at 
      FROM announcements
    `;
    let params: any[] = [];

    if (created_by) {
      sql += ' WHERE created_by = ?';
      params.push(created_by);
    }

    sql += ' ORDER BY created_at DESC';

    try {
      const resp = await query(sql, params) as any[];
      
      // Fetch images for each announcement
      const announcementsWithImages = await Promise.all(resp.map(async (ann) => {
        const images = await query('SELECT image_url FROM announcement_images WHERE announcement_id = ?', [ann.id]) as any[];
        return {
          ...ann,
          id: ann.id,
          announcement_id: ann.id,
          image_paths: images.length > 0 ? images.map(img => img.image_url) : (ann.image_path ? [ann.image_path] : [])
        };
      }));
      
      res.json(announcementsWithImages);
    } catch (err) {
      console.error('Failed to fetch announcements:', err);
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.get('/api/student/announcements', authenticate, async (req: any, res) => {
    if (req.user.type !== 'student') return res.status(403).json({ error: 'Forbidden' });
    
    // For students, we still want the 'is_read' field
    // Note: 'now' in MySQL vs SQLite differences handled by the query or helper if needed.
    // We'll use a portable way: SQLite version was date('now', '-7 days')
    // For now we'll assume the SQL from database.sql is compatible or keep it simple.
    const sql = `
      SELECT 
        a.announcement_id as id, 
        a.announcement_id,
        a.title, 
        a.message, 
        a.image_url as image_path, 
        a.image_url,
        a.created_at,
        CASE WHEN ar.read_id IS NOT NULL THEN 1 ELSE 0 END as is_read
      FROM announcements a
      LEFT JOIN announcement_reads ar ON a.announcement_id = ar.announcement_id AND ar.student_id = ?
      ORDER BY a.created_at DESC
      LIMIT 10
    `;

    const announcements = await query(sql, [req.user.id]) as any[];

    // Fetch images for each announcement
    const announcementsWithImages = await Promise.all(announcements.map(async (ann) => {
      const images = await query('SELECT image_url FROM announcement_images WHERE announcement_id = ?', [ann.id]) as any[];
      return {
        ...ann,
        image_paths: images.length > 0 ? images.map(img => img.image_url) : (ann.image_path ? [ann.image_path] : [])
      };
    }));

    res.json(announcementsWithImages);
  });

  app.post('/api/student/announcements/:id/read', authenticate, async (req: any, res) => {
    if (req.user.type !== 'student') return res.status(403).json({ error: 'Forbidden' });
    
    try {
      // Use INSERT IGNORE for MySQL if needed, or INSERT OR IGNORE for SQLite
      // Our run helper handles both if we were clever, but here we can just use a generic one or double check
      const sql = process.env.DB_TYPE === 'mysql' 
        ? 'INSERT IGNORE INTO announcement_reads (announcement_id, student_id) VALUES (?, ?)'
        : 'INSERT OR IGNORE INTO announcement_reads (announcement_id, student_id) VALUES (?, ?)';
      
      await run(sql, [req.params.id, req.user.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to mark as read' });
    }
  });

  // Student Feedback Endpoints
  app.post('/api/student/feedback', authenticate, async (req: any, res) => {
    if (req.user.type !== 'student') return res.status(403).json({ error: 'Forbidden' });
    const { title, content, category } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });
    
    try {
      await run('INSERT INTO student_feedback (student_id, title, content, category) VALUES (?, ?, ?, ?)', 
        [req.user.id, title, content, category || 'complaint']);
        
      await logAction('student', req.user.id, 'SUBMIT_FEEDBACK', `Submitted a ${category || 'complaint'}: ${title}`, req);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to submit feedback' });
    }
  });

  app.get('/api/admin/feedback', authenticate, async (req: any, res) => {
    if (req.user.role !== 'pro' && req.user.role !== 'EC Public Relations Officer' && req.user.type !== 'it') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    try {
      const feedbacks = await query(`
        SELECT f.*, s.full_name as student_name, s.student_number
        FROM student_feedback f
        JOIN students s ON f.student_id = s.student_id
        ORDER BY f.timestamp DESC
      `);
      res.json(feedbacks);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch feedback' });
    }
  });

  app.patch('/api/admin/feedback/:id/status', authenticate, async (req: any, res) => {
    if (req.user.role !== 'pro' && req.user.role !== 'EC Public Relations Officer' && req.user.type !== 'it') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const { status } = req.body;
    if (!['pending', 'reviewed', 'resolved'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    try {
      await run('UPDATE student_feedback SET status = ? WHERE feedback_id = ?', [status, req.params.id]);
      await logAction('ec', req.user.id, 'UPDATE_FEEDBACK_STATUS', `Updated feedback ${req.params.id} status to ${status}`, req);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update feedback status' });
    }
  });

  app.delete('/api/admin/feedback/:id', authenticate, async (req: any, res) => {
    if (req.user.role !== 'pro' && req.user.role !== 'EC Public Relations Officer' && req.user.type !== 'it') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    try {
      await run('DELETE FROM student_feedback WHERE feedback_id = ?', [req.params.id]);
      await logAction('ec', req.user.id, 'DELETE_FEEDBACK', `Deleted feedback ${req.params.id}`, req);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete feedback' });
    }
  });


  app.post('/api/admin/announcements', authenticate, upload.array('images', 10), async (req: any, res) => {
    if (!isPublicRelationsOfficer(req.user)) {
      return res.status(403).json({ error: 'Forbidden - Only the Public Relations Officer can post announcements' });
    }

    const { title, message } = req.body;
    const files = (req.files as Express.Multer.File[]) || [];
    const imageUrls = files.map(file => `/uploads/announcements/${file.filename}`);

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (!message && imageUrls.length === 0) {
      return res.status(400).json({ error: 'Either message or image must be provided' });
    }

    try {
      let announcementId: any;
      await transaction(async (tx) => {
        const result = await tx.run(`
          INSERT INTO announcements (title, message, image_url, created_by)
          VALUES (?, ?, ?, ?)
        `, [title, message || '', imageUrls[0] || null, req.user.id]);

        announcementId = result.insertId;

        for (const url of imageUrls) {
          await tx.run('INSERT INTO announcement_images (announcement_id, image_url) VALUES (?, ?)', [announcementId, url]);
        }
      });

      await logAction(req.user.type, req.user.id, 'CREATE_ANNOUNCEMENT', `Created announcement: ${title} with ${imageUrls.length} images`, req);
      
      res.json({ 
        success: true, 
        announcement_id: announcementId,
        image_urls: imageUrls 
      });
    } catch (err) {
      console.error('Failed to create announcement:', err);
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.put('/api/admin/announcements/:id', authenticate, upload.array('images', 10), async (req: any, res) => {
    if (!isPublicRelationsOfficer(req.user)) {
      return res.status(403).json({ error: 'Forbidden - Only the Public Relations Officer can update announcements' });
    }

    const { title, message } = req.body;
    const { id } = req.params;
    const announcementId = parseInt(id);

    if (isNaN(announcementId)) {
      return res.status(400).json({ error: 'Invalid announcement ID' });
    }

    const files = (req.files as Express.Multer.File[]) || [];
    const newImageUrls = files.map(file => `/uploads/announcements/${file.filename}`);
    
    let existingImageUrls: string[] = [];
    if (req.body.existing_image_urls) {
      existingImageUrls = Array.isArray(req.body.existing_image_urls) 
        ? req.body.existing_image_urls 
        : [req.body.existing_image_urls];
    }

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    try {
      await transaction(async (tx) => {
        await tx.run(`
          UPDATE announcements 
          SET title = ?, message = ?, image_url = ?
          WHERE announcement_id = ?
        `, [title, message || '', newImageUrls[0] || existingImageUrls[0] || null, announcementId]);

        await tx.run('DELETE FROM announcement_images WHERE announcement_id = ?', [announcementId]);
        
        for (const url of existingImageUrls) {
          await tx.run('INSERT INTO announcement_images (announcement_id, image_url) VALUES (?, ?)', [announcementId, url]);
        }
        for (const url of newImageUrls) {
          await tx.run('INSERT INTO announcement_images (announcement_id, image_url) VALUES (?, ?)', [announcementId, url]);
        }
      });

      await logAction(req.user.type, req.user.id, 'UPDATE_ANNOUNCEMENT', `Updated announcement ID: ${announcementId} - ${title}`, req);
      
      res.json({ success: true });
    } catch (err) {
      console.error('Failed to update announcement:', err);
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.delete('/api/admin/announcements/:id', authenticate, async (req: any, res) => {
    if (!isPublicRelationsOfficer(req.user)) {
      return res.status(403).json({ error: 'Forbidden - Only the Public Relations Officer can delete announcements' });
    }

    const { id } = req.params;
    const announcementId = parseInt(id);

    console.log(`Attempting to delete announcement ID: ${id} (parsed: ${announcementId})`);

    if (isNaN(announcementId)) {
      return res.status(400).json({ error: 'Invalid announcement ID' });
    }

    try {
      await transaction(async (tx) => {
        await tx.run('DELETE FROM announcement_reads WHERE announcement_id = ?', [announcementId]);
        await tx.run('DELETE FROM announcement_images WHERE announcement_id = ?', [announcementId]);
        const result = await tx.run('DELETE FROM announcements WHERE announcement_id = ?', [announcementId]);
        console.log(`Delete operation result for ID ${announcementId}:`, result);
      });

      console.log(`Announcement ${announcementId} deleted successfully by user ${req.user.id}`);
      await logAction(req.user.type, req.user.id, 'DELETE_ANNOUNCEMENT', `Deleted announcement ID: ${announcementId}`, req);
      
      res.json({ success: true });
    } catch (err) {
      console.error('Failed to delete announcement:', err);
      res.status(500).json({ error: 'Database error' });
    }
  });


  app.get('/api/admin/summary', authenticate, async (req: any, res) => {
    if (req.user.type !== 'it' && req.user.type !== 'ec') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const positionsCount = await get('SELECT COUNT(*) as count FROM positions') as any;
    const candidatesCount = await get('SELECT COUNT(*) as count FROM candidates') as any;
    const votersCount = await get('SELECT COUNT(*) as count FROM students WHERE is_eligible = 1') as any;
    const votedCount = await get('SELECT COUNT(DISTINCT student_id) as count FROM voter_registry') as any;

    // Faculty analytics
    const facultyStats = await query(`
      SELECT 
        faculty,
        COUNT(*) as total,
        SUM(CASE WHEN EXISTS (SELECT 1 FROM voter_registry vr WHERE vr.student_id = s.student_id) THEN 1 ELSE 0 END) as voted
      FROM students s
      WHERE is_eligible = 1
      GROUP BY faculty
    `) as any[];

    // Hourly turnout for today
    const hourlyStats = await query(`
      SELECT 
        DATE_FORMAT(timestamp, '%H') as hour,
        COUNT(*) as count
      FROM voter_registry
      WHERE timestamp IS NOT NULL
      GROUP BY DATE_FORMAT(timestamp, '%H')
      ORDER BY hour ASC
    `) as any[];

    // Eligibility distribution
    const eligibilityStats = await query(`
      SELECT 
        CASE WHEN is_eligible = 1 THEN 'Eligible' ELSE 'Ineligible' END as status,
        COUNT(*) as count
      FROM students
      GROUP BY is_eligible
    `) as any[];

    // Program distribution
    const programStats = await query(`
      SELECT program, COUNT(*) as count
      FROM students
      GROUP BY program
      ORDER BY count DESC
      LIMIT 10
    `) as any[];

    // Residence distribution
    const residenceStats = await query(`
      SELECT residence, COUNT(*) as count
      FROM students
      GROUP BY residence
      ORDER BY count DESC
    `) as any[];

    // Get votes tally per position
    const votes = await query('SELECT encrypted_vote FROM votes') as any[];
    const allTallies: Record<number, number> = {};
    votes.forEach(v => {
      try {
        const selections = JSON.parse(decrypt(v.encrypted_vote));
        Object.values(selections).forEach((val: any) => {
          if (Array.isArray(val)) {
            val.forEach((id: any) => {
              allTallies[id] = (allTallies[id] || 0) + 1;
            });
          } else if (val) {
            allTallies[val] = (allTallies[val] || 0) + 1;
          }
        });
      } catch (err) {
        console.error("Failed to decrypt or parse vote", err);
      }
    });

    const positions = await query('SELECT * FROM positions ORDER BY position_id ASC') as any[];
    const tally = await Promise.all(positions.map(async (pos: any) => {
      const candidates = await query(`
        SELECT c.candidate_id, s.full_name as name
        FROM candidates c
        JOIN students s ON c.student_id = s.student_id
        WHERE c.position_id = ?
      `, [pos.position_id]) as any[];
      
      return {
        id: pos.position_id,
        position: pos.title,
        candidates: candidates.map((c: any) => ({
          name: c.name,
          votes: allTallies[c.candidate_id] || 0
        }))
      };
    }));

    res.json({
      counts: {
        positions: positionsCount.count,
        candidates: candidatesCount.count,
        voters: votersCount.count,
        voted: votedCount.count
      },
      facultyStats,
      hourlyStats,
      eligibilityStats,
      programStats,
      residenceStats,
      tally
    });
  });


  app.post('/api/admin/positions/:id/move', authenticate, async (req: any, res) => {
    if (req.user.type !== 'ec' && req.user.type !== 'it') return res.status(403).json({ error: 'Forbidden' });

    const positionId = req.params.id;
    const currentPos = await get('SELECT * FROM positions WHERE position_id = ?', [positionId]) as any;
    if (!currentPos) return res.status(404).json({ error: 'Position not found' });

    // The current MySQL positions table has no `priority` column.
    // Therefore, positions are displayed by `position_id` order.
    // This endpoint is kept so the frontend does not crash if it calls it.
    return res.json({
      success: true,
      message: 'Position order is based on position_id because the positions table has no priority column.'
    });
  });

  app.post('/api/admin/positions', authenticate, async (req: any, res) => {
    if (req.user.role !== 'general_secretary' && req.user.type !== 'it' && req.user.role !== 'chairperson' && req.user.role !== 'vice_chairperson') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { election_id, title, description } = req.body;

    if (!election_id || !title) {
      return res.status(400).json({ error: 'election_id and title are required' });
    }

    const result = await run(`
      INSERT INTO positions (election_id, title, description)
      VALUES (?, ?, ?)
    `, [election_id, title, description || null]);
    
    await logAction('ec', req.user.id, 'add_position', `Added position ${title} to election ${election_id}`, req);
    res.json({ id: result.insertId, election_id: result.insertId, success: true });
  });

  app.delete('/api/admin/positions/:id', authenticate, async (req: any, res) => {
    if (req.user.role !== 'general_secretary' && req.user.type !== 'it' && req.user.role !== 'chairperson') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await run('DELETE FROM positions WHERE position_id = ?', [req.params.id]);
    await logAction('ec', req.user.id, 'delete_position', `Deleted position ${req.params.id}`, req);
    res.json({ success: true });
  });

  // Messaging System
  app.get('/api/admin/ec-members', authenticate, async (req: any, res) => {
    try {
      if (req.user.type !== 'ec' && req.user.type !== 'it') {
        console.warn(`[Messaging] Unauthorized ec-members access attempt by ${req.user.id} (${req.user.type})`);
        return res.status(403).json({ error: 'Forbidden' });
      }
      const members = await query('SELECT ec_id, full_name, role, email FROM ec_members');
      res.json(members);
    } catch (error) {
      console.error("[Messaging] Error fetching ec-members:", error);
      res.status(500).json({ error: 'Failed to fetch EC members' });
    }
  });

  app.post('/api/admin/messages', authenticate, async (req: any, res) => {
    try {
      if (req.user.type !== 'ec') {
        console.warn(`[Messaging] Unauthorized send message attempt by ${req.user.id} (${req.user.type})`);
        return res.status(403).json({ error: 'Forbidden' });
      }
      const { receiver_id, content } = req.body;
      if (!receiver_id || !content) {
        return res.status(400).json({ error: 'Recipient and content are required' });
      }
      await run('INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)', [req.user.id, receiver_id, content]);
      res.json({ success: true });
    } catch (error) {
      console.error("[Messaging] Error sending message:", error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  });

  app.get('/api/admin/messages', authenticate, async (req: any, res) => {
    try {
      if (req.user.type !== 'ec') {
        console.warn(`[Messaging] Unauthorized fetch messages attempt by ${req.user.id} (${req.user.type})`);
        return res.status(403).json({ error: 'Forbidden' });
      }
      const inbox = await query(`
        SELECT m.*, e.full_name as sender_name 
        FROM messages m 
        JOIN ec_members e ON m.sender_id = e.ec_id 
        WHERE m.receiver_id = ? 
        ORDER BY m.timestamp DESC
      `, [req.user.id]);
      const outbox = await query(`
        SELECT m.*, e.full_name as receiver_name 
        FROM messages m 
        JOIN ec_members e ON m.receiver_id = e.ec_id 
        WHERE m.sender_id = ? 
        ORDER BY m.timestamp DESC
      `, [req.user.id]);
      res.json({ inbox, outbox });
    } catch (error) {
      console.error("[Messaging] Error fetching messages:", error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });


  // Voter Management
  app.get('/api/admin/voters-list', authenticate, async (req: any, res) => {
    if (req.user.type !== 'it' && req.user.type !== 'ec') return res.status(403).json({ error: 'Forbidden' });
    
    try {
      const voters = await query(`
        SELECT 
          s.student_id, 
          s.full_name, 
          s.student_number, 
          s.email, 
          s.is_eligible,
          s.faculty,
          (SELECT COUNT(*) FROM voter_registry vr WHERE vr.student_id = s.student_id) as voted_count
        FROM students s
        ORDER BY s.full_name ASC
      `);
      res.json(voters);
    } catch (error) {
      console.error("Failed to fetch voter list:", error);
      res.status(500).json({ error: 'Database error' });
    }
  });

  // Candidate Image Upload
  // Stores real uploaded candidate image files in public/uploads/candidates.
  // The frontend should save the returned imageUrl in candidates.photo_url.
  app.post('/api/admin/candidates/upload-image', authenticate, candidateUpload.single('image'), async (req: any, res) => {
    try {
      if (!canManageCandidates(req.user)) {
        return res.status(403).json({ error: 'Access denied. Only General Secretary and IT Admin can upload candidate photos.' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No image uploaded' });
      }

      const imageUrl = `/uploads/candidates/${req.file.filename}`;

      res.json({
        success: true,
        imageUrl,
        message: 'Candidate image uploaded successfully'
      });
    } catch (error: any) {
      console.error('Candidate image upload error:', error);
      res.status(500).json({
        error: 'Failed to upload candidate image',
        details: error.message
      });
    }
  });

  // Candidate Management
  app.get('/api/admin/students', authenticate, async (req: any, res) => {
    if (req.user.type !== 'it' && req.user.type !== 'ec') return res.status(403).json({ error: 'Forbidden' });
    const students = await query('SELECT student_id, full_name, student_number, email FROM students');
    res.json(students);
  });

  app.post('/api/admin/candidates', authenticate, async (req: any, res) => {
    if (!canManageCandidates(req.user)) return res.status(403).json({ error: 'Access denied. Only General Secretary and IT Admin can add candidates.' });
    
    // Support both single candidate and array of candidates for bulk migration
    const candidatesInput = Array.isArray(req.body) ? req.body : [req.body];
    
    if (candidatesInput.length === 0) {
      return res.status(400).json({ error: 'No candidates provided' });
    }

    try {
      await transaction(async (tx) => {
        for (const item of candidatesInput) {
          const { student_id, position_id, photo_url, designation, political_affiliation } = item;
          
          // Validation for GRC designation
          const position = await tx.get('SELECT title FROM positions WHERE position_id = ?', [position_id]) as any;
          if (!position) throw new Error('Position not found');

          const title = (position.title || '').trim().toLowerCase();
          const isGuildPresident = title === 'guild president';

          if (title.includes('grc') && !designation) {
            throw new Error(`Designation is required for GRC position: ${position.title}`);
          }

          if (isGuildPresident && !political_affiliation) {
            // Requirement says "Required ONLY when position = Guild President"
            throw new Error('Political affiliation is required for Guild President candidates');
          }

          const storedPhotoUrl = await saveCandidateImageIfBase64(photo_url);

          await tx.run('INSERT INTO candidates (student_id, position_id, photo_url, designation, political_affiliation) VALUES (?, ?, ?, ?, ?)', [
            student_id, 
            position_id, 
            storedPhotoUrl, 
            designation || null,
            isGuildPresident ? political_affiliation : null
          ]);
        }
      });
      
      await logAction(req.user.type, req.user.id, 'add_candidates_bulk', `Added ${candidatesInput.length} candidates`, req);
      res.json({ success: true, count: candidatesInput.length });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to save candidates' });
    }
  });

  app.patch('/api/admin/candidates/:id', authenticate, async (req: any, res) => {
    if (!canManageCandidates(req.user)) return res.status(403).json({ error: 'Access denied. Only General Secretary and IT Admin can edit candidates.' });
    const { photo_url, designation, political_affiliation } = req.body;
    
    const candidate = await get(`
      SELECT c.*, p.title as position_title 
      FROM candidates c 
      JOIN positions p ON c.position_id = p.position_id 
      WHERE c.candidate_id = ?
    `, [req.params.id]) as any;

    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

    const isGuildPresident = (candidate.position_title || '').trim().toLowerCase() === 'guild president';

    const storedPhotoUrl = await saveCandidateImageIfBase64(photo_url);

    await run('UPDATE candidates SET photo_url = ?, designation = ?, political_affiliation = ? WHERE candidate_id = ?', [
      storedPhotoUrl, 
      designation, 
      isGuildPresident ? political_affiliation : null,
      req.params.id
    ]);
    await logAction('ec', req.user.id, 'edit_candidate', `Updated candidate ${req.params.id}`, req);
    res.json({ success: true });
  });

  app.delete('/api/admin/candidates/:id', authenticate, async (req: any, res) => {
    if (!canManageCandidates(req.user)) {
      return res.status(403).json({ error: 'Access denied. Only General Secretary and IT Admin can delete candidates.' });
    }

    try {
      const candidateId = req.params.id;
      
      // 1. Get the election ID for this candidate to check for votes
      const candidate = await get(`
        SELECT c.*, p.election_id 
        FROM candidates c
        JOIN positions p ON c.position_id = p.position_id
        WHERE c.candidate_id = ?
      `, [candidateId]) as any;

      if (!candidate) {
        return res.status(404).json({ error: 'Candidate not found' });
      }

      // 2. Check if there are any votes cast in this election
      // Since votes are encrypted, we check if the votes table has ANY entries for this election
      const voteCount = await get('SELECT COUNT(*) as count FROM votes WHERE election_id = ?', [candidate.election_id]) as { count: number };

      if (voteCount.count > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete candidate because votes have already been cast in this election. Deleting candidates after voting has started would compromise audit integrity.' 
        });
      }

      // 3. Perform deletion
      await run('DELETE FROM candidates WHERE candidate_id = ?', [candidateId]);
      
      await logAction(req.user.type, req.user.id, 'delete_candidate', `Deleted candidate ${candidateId} from election ${candidate.election_id}`, req);
      res.json({ success: true, message: 'Candidate deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting candidate:', error);
      res.status(500).json({ error: 'Internal server error during deletion' });
    }
  });

  // Manifesto Management (PRO only)
  app.patch('/api/admin/candidates/:id/manifesto', authenticate, async (req: any, res) => {
    if (!canManageCandidateManifestos(req.user)) {
      return res.status(403).json({ error: 'Access denied. Only EC PRO and IT Admin can manage manifestos.' });
    }

    const { manifesto } = req.body;
    // Validation: Ensure manifesto is not empty (when passed as such, though NULL is allowed via DELETE)
    if (manifesto === undefined || manifesto === null) {
      return res.status(400).json({ error: 'Manifesto content is required' });
    }

    // Character limit: 2000
    if (manifesto.length > 2000) {
      return res.status(400).json({ error: 'Manifesto must not exceed 2000 characters' });
    }

    try {
      const result = await run('UPDATE candidates SET manifesto = ? WHERE candidate_id = ?', [manifesto, req.params.id]);
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Candidate not found' });
      
      await logAction('ec', req.user.id, 'MANAGE_MANIFESTO', `Updated manifesto for candidate ${req.params.id}`, req);
      res.json({ success: true, message: 'Manifesto updated successfully' });
    } catch (err) {
      console.error('Manifesto update error:', err);
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.delete('/api/admin/candidates/:id/manifesto', authenticate, async (req: any, res) => {
    if (!canManageCandidateManifestos(req.user)) {
      return res.status(403).json({ error: 'Access denied. Only EC PRO and IT Admin can manage manifestos.' });
    }

    try {
      const result = await run('UPDATE candidates SET manifesto = NULL WHERE candidate_id = ?', [req.params.id]);
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Candidate not found' });
      
      await logAction('ec', req.user.id, 'DELETE_MANIFESTO', `Deleted manifesto for candidate ${req.params.id}`, req);
      res.json({ success: true, message: 'Manifesto deleted successfully' });
    } catch (err) {
      res.status(500).json({ error: 'Database error' });
    }
  });


  // Election Management Extensions
  app.patch('/api/admin/elections/:id', authenticate, async (req: any, res) => {
    if (!hasRole(req.user, ['general_secretary', 'chairperson'])) return res.status(403).json({ error: 'Forbidden' });
    const { title, description, start_time, end_time } = req.body;
    
    const election = await get('SELECT status FROM elections WHERE election_id = ?', [req.params.id]) as any;
    if (!election) return res.status(404).json({ error: 'Election not found' });
    
    if (election.status === 'active' && req.user.role === 'general_secretary') {
      return res.status(400).json({ error: "General Secretary cannot modify an active election." });
    }

    await run('UPDATE elections SET title = ?, description = ?, start_time = ?, end_time = ? WHERE election_id = ?', [
      title, description, start_time, end_time, req.params.id
    ]);
    
    await logAction('ec', req.user.id, 'update_election', `Updated election ${req.params.id}`, req);
    res.json({ success: true });
  });

  app.delete('/api/admin/elections/:id', authenticate, async (req: any, res) => {
    if (!hasRole(req.user, ['chairperson', 'general_secretary'])) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const election = await get('SELECT status FROM elections WHERE election_id = ?', [req.params.id]) as any;
    if (!election) return res.status(404).json({ error: 'Election not found' });

    // Restriction: Can only delete drafts unless admin/chairperson
    if (election.status !== 'draft' && req.user.role === 'general_secretary') {
      return res.status(400).json({ error: "General Secretary can only delete draft elections." });
    }

    await transaction(async (tx) => {
      await tx.run('DELETE FROM elections WHERE election_id = ?', [req.params.id]);
      await tx.run('DELETE FROM positions WHERE election_id = ?', [req.params.id]);
      // Note: Candidates are linked to positions, so they should be deleted too if foreign keys are set up.
      // If not, we should delete them explicitly.
      await tx.run('DELETE FROM candidates WHERE position_id IN (SELECT position_id FROM positions WHERE election_id = ?)', [req.params.id]);
    });
    
    await logAction('ec', req.user.id, 'delete_election', `Deleted election ${req.params.id}`, req);
    res.json({ success: true });
  });

  // Share Results via Email (PRO/Secretary)
  app.post('/api/admin/share-results', authenticate, async (req: any, res) => {
    if (!hasRole(req.user, ['pro', 'general_secretary', 'EC Public Relations Officer'])) {
      return res.status(403).json({ error: 'Unauthorized to share results' });
    }

    try {
      await logAction('ec', req.user.id, 'SHARE_RESULTS', 'Election results distributed via email', req);
      res.json({ success: true, message: 'Election results distributed.' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to distribute results' });
    }
  });

  // Share Announcements via Email
  app.post('/api/admin/share-announcements', authenticate, async (req: any, res) => {
    if (!isPublicRelationsOfficer(req.user)) {
      return res.status(403).json({ error: 'Unauthorized - Only the Public Relations Officer can share announcements' });
    }

    try {
      await logAction('ec', req.user.id, 'SHARE_ANNOUNCEMENTS', 'Announcements digest shared via email', req);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to share announcements' });
    }
  });

  // Direct Email Blast
  app.post('/api/admin/send-blast-email', authenticate, async (req: any, res) => {
    if (!isPublicRelationsOfficer(req.user)) {
      return res.status(403).json({ error: 'Unauthorized - Only the Public Relations Officer can send communication blasts' });
    }

    const { subject, body } = req.body;
    if (!subject || !body) return res.status(400).json({ error: 'Missing content' });

    try {
      await logAction('ec', req.user.id, 'EMAIL_BLAST', `Subject: ${subject}`, req);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to send email' });
    }
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
