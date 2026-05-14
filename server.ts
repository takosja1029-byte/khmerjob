import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import axios from 'axios';
import multer from 'multer';
import FormData from 'form-data';
import nodemailer from 'nodemailer';
import admin from 'firebase-admin';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const firebaseConfig = require('./firebase-applet-config.json');

dotenv.config();

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const __dirname = path.resolve();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

const client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Email Transporter (Lazy)
let mailTransporter: any = null;
function getMailTransporter() {
  if (mailTransporter) return mailTransporter;
  if (!process.env.SMTP_HOST) return null;
  
  mailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return mailTransporter;
}

async function sendEmailApplication(job: any, fullName: string, email: string, file?: Express.Multer.File) {
  const transporter = getMailTransporter();
  const toEmail = `hr@${job.company.toLowerCase().replace(/\s+/g, '')}.com.kh`;

  if (!transporter) {
    console.log('\n--- SIMULATED EMAIL NOTIFICATION ---');
    console.log(`To: ${toEmail}`);
    console.log(`Subject: New Application for ${job.title}`);
    console.log(`Applicant: ${fullName} <${email}>`);
    if (file) console.log(`Attached CV: ${file.originalname} (${file.size} bytes)`);
    console.log('-------------------------------------\n');
    return { success: true, simulated: true };
  }

  try {
    await transporter.sendMail({
      from: `"JobConnect Cambodia" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `[Job Application] ${job.title} - ${fullName}`,
      html: `
        <h2>New Job Application</h2>
        <p><b>Position:</b> ${job.title}</p>
        <p><b>Company:</b> ${job.company}</p>
        <hr />
        <p><b>Applicant Name:</b> ${fullName}</p>
        <p><b>Applicant Email:</b> ${email}</p>
        <p><i>Please find the attached CV for review.</i></p>
      `,
      attachments: file ? [
        {
          filename: file.originalname,
          content: file.buffer,
        }
      ] : []
    });
    return { success: true, simulated: false };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, simulated: false };
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'));
    }
  }
});

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function sendTelegramApplication(
  message: string, 
  file?: Express.Multer.File
): Promise<{ success: boolean; simulated: boolean; error?: string }> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log('\n--- SIMULATED TELEGRAM NOTIFICATION ---');
    console.log(message.replace(/<[^>]*>/g, '')); // Strip HTML for console
    if (file) {
      console.log(`[File Attachment]: ${file.originalname} (${file.size} bytes)`);
    }
    console.log('----------------------------------------\n');
    return { success: true, simulated: true };
  }

  const chatIDTip = "Tip: You can get your numeric User/Chat ID by messaging @userinfobot or @GetMyChatID_Bot in Telegram.";

  // Pre-flight checks
  const botIdFromToken = TELEGRAM_BOT_TOKEN.split(':')[0];
  const isBotToken = (id: string) => id.includes(':');
  const isNumeric = (id: string) => /^-?\d+$/.test(id);
  const isUsername = (id: string) => id.startsWith('@');

  console.log(`[Telegram] Sending application to Chat ID: ${TELEGRAM_CHAT_ID}`);

  if (isBotToken(TELEGRAM_CHAT_ID)) {
    return { 
      success: false, 
      simulated: false, 
      error: `Configuration Error: TELEGRAM_CHAT_ID looks like a Bot Token. Please provide your personal numeric User/Chat ID instead. ${chatIDTip}` 
    };
  }

  if (TELEGRAM_CHAT_ID === botIdFromToken) {
    return {
      success: false,
      simulated: false,
      error: `Configuration Error: You provided the Bot's own ID as the Chat ID. A bot cannot message itself. Please provide your personal numeric User/Chat ID. ${chatIDTip}`
    };
  }

  if (!isNumeric(TELEGRAM_CHAT_ID) && !isUsername(TELEGRAM_CHAT_ID)) {
    return {
      success: false,
      simulated: false,
      error: `Configuration Error: TELEGRAM_CHAT_ID must be a numeric ID (e.g., 123456789) or a @username. You provided "${TELEGRAM_CHAT_ID}". ${chatIDTip}`
    };
  }

  try {
    if (file) {
      // Send document with caption
      const form = new FormData();
      form.append('chat_id', TELEGRAM_CHAT_ID);
      form.append('document', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });
      form.append('caption', message);
      form.append('parse_mode', 'HTML');

      await axios.post(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`,
        form,
        { headers: form.getHeaders() }
      );
    } else {
      // Just send message
      await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      });
    }
    return { success: true, simulated: false };
  } catch (error: any) {
    const telegramError = error.response?.data?.description || error.message;
    console.error('Telegram API Error:', telegramError);
    
    let userFriendlyError = telegramError;
    const lowError = telegramError.toLowerCase();
    
    if (lowError.includes("can't send messages to the bot")) {
      userFriendlyError = `Invalid Chat ID: You provided a Bot ID or Token instead of a personal User ID. A bot cannot message itself. ${chatIDTip}`;
    } else if (lowError.includes("bot was blocked")) {
      userFriendlyError = "Blocked: Please 'Start' your bot in Telegram first.";
    } else if (lowError.includes("chat not found")) {
      userFriendlyError = `Chat Not Found: The Bot doesn't know you. ${chatIDTip}`;
    }
    
    return { success: false, simulated: false, error: userFriendlyError };
  }
}

// In-memory data
let companies = [
  {
    id: 'aba',
    name: 'ABA Bank',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/ABA_Bank_Logo.svg/512px-ABA_Bank_Logo.svg.png',
    industry: 'Banking & Finance',
    website: 'https://www.ababank.com',
    size: '5,000+ employees',
    founded: '1996',
    location: 'Phnom Penh, Cambodia',
    description: 'ABA Bank is Cambodia\'s leading private commercial bank with the largest network of branches and self-service kiosks. We are committed to providing the best digital banking experience to all Cambodians.',
    benefits: ['Competitive Salary', 'Performance Bonus', 'Health Insurance', 'Retirement Plan', 'Professional Development'],
  },
  {
    id: 'grab',
    name: 'Grab',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Grab_logo.svg/512px-Grab_logo.svg.png',
    industry: 'Technology / Super-app',
    website: 'https://www.grab.com',
    size: '10,000+ employees',
    founded: '2012',
    location: 'Southeast Asia',
    description: 'Grab is Southeast Asia\'s leading super-app that provides everyday services such as ride-hailing, food delivery, and digital payments to millions of users across the region.',
    benefits: ['Flexible Working', 'Stunning Offices', 'Grab Credits', 'Medical Coverage', 'Stock Options'],
  },
  {
    id: 'coca-cola',
    name: 'Coca-Cola',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Coca-Cola_logo.svg/512px-Coca-Cola_logo.svg.png',
    industry: 'Fast Moving Consumer Goods (FMCG)',
    website: 'https://www.coca-cola.com',
    size: '700,000+ employees (Global)',
    founded: '1886',
    location: 'Global',
    description: 'The Coca-Cola Company is a total beverage company, offering over 500 brands in more than 200 countries and territories. In Cambodia, we are a major employer and distribution leader.',
    benefits: ['Global Career Paths', 'Wellness Programs', 'Corporate Discounts', 'Training and Mentorship', 'Social Events'],
  },
  {
    id: 'prudential',
    name: 'Prudential',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/e/e0/Prudential_PLC_logo.svg/512px-Prudential_PLC_logo.svg.png',
    industry: 'Insurance & Financial Services',
    website: 'https://www.prudential.com.kh',
    size: '1,000+ employees (Local)',
    founded: '1848',
    location: 'Phnom Penh, Cambodia',
    description: 'Prudential Cambodia is part of Prudential plc, providing life insurance and financial solutions. We help people get the most out of life by protecting their health and wealth.',
    benefits: ['Performance Incentive', 'Staff Insurance', 'Annual Leave', 'Team Building', 'Modern Workspace'],
  },
  {
    id: 'soma-software',
    name: 'Soma Software',
    logo: 'https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=100&h=100&fit=crop',
    industry: 'Technology',
    website: 'https://www.soma.com.kh',
    size: '50-200 employees',
    founded: '2015',
    location: 'Phnom Penh, Cambodia',
    description: 'Soma Software is a leading tech firm in Cambodia specializing in digital transformation and custom software development for enterprises.',
    benefits: ['Growth Opportunities', 'Tech Allowance', 'Free Lunch', 'Annual Retreat'],
  },
  {
    id: 'vattanac-bank',
    name: 'Vattanac Bank',
    logo: 'https://images.unsplash.com/photo-1572044162444-ad60f128bde2?w=100&h=100&fit=crop',
    industry: 'Banking',
    website: 'https://www.vattanacbank.com',
    size: '1,000+ employees',
    founded: '2002',
    location: 'Phnom Penh, Cambodia',
    description: 'Vattanac Bank is a leading local bank in Cambodia known for its service excellence and commitment to the community.',
    benefits: ['Bonus Program', 'Insurance Coverage', 'Training'],
  },
  {
    id: 'smart-axiata',
    name: 'Smart Axiata',
    logo: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=100&h=100&fit=crop',
    industry: 'Telecommunications',
    website: 'https://www.smart.com.kh',
    size: '1,000+ employees',
    founded: '2008',
    location: 'Phnom Penh, Cambodia',
    description: 'Smart Axiata Co., Ltd., Cambodia\'s leading mobile telecommunications operator, currently serves 8 million subscribers under the "Smart" brand.',
    benefits: ['Performance Incentive', 'Wellness Program', 'Global Opportunities'],
  },
  {
    id: 'cellcard',
    name: 'Cellcard',
    logo: 'https://images.unsplash.com/photo-1599305090748-36636238b75a?w=100&h=100&fit=crop',
    industry: 'Telecommunications',
    website: 'https://www.cellcard.com.kh',
    size: '500-1,000 employees',
    founded: '1997',
    location: 'Phnom Penh, Cambodia',
    description: 'Cellcard is the only 100% Cambodian-owned mobile network operator and has been a cornerstone of the country\'s communications for over two decades.',
    benefits: ['Employee Discounts', 'Health Plans', 'Annual Party'],
  },
  {
    id: 'sabay-digital',
    name: 'Sabay Digital',
    logo: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&h=100&fit=crop',
    industry: 'Digital Media & Entertainment',
    website: 'https://www.sabay.com.kh',
    size: '100-250 employees',
    founded: '2007',
    location: 'Phnom Penh, Cambodia',
    description: 'Sabay Digital is a tech-focused media company in Cambodia, providing news, entertainment, and e-sports content to millions of fans.',
    benefits: ['Creative Workspace', 'Flexible Hours', 'Fun Team Events'],
  },
  {
    id: 'nham24',
    name: 'Nham24',
    logo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
    industry: 'On-demand Delivery',
    website: 'https://www.nham24.com',
    size: '500+ employees',
    founded: '2016',
    location: 'Phnom Penh, Cambodia',
    description: 'Nham24 is Cambodia\'s first and largest super-app for food delivery, grocery shopping, and express shipping.',
    benefits: ['Dynamic Environment', 'Meal Vouchers', 'Transport Support'],
  }
];

let jobs = [
  {
    id: '1',
    title: 'Senior Frontend Engineer',
    company: 'Soma Software',
    companyId: 'soma-software',
    location: 'Phnom Penh, CM',
    salary: '$2,500 - $4,500',
    type: 'Full-time',
    logo: 'https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=100&h=100&fit=crop',
    category: 'Development',
    postedAt: '2h ago',
    urgent: true,
    description: 'We are looking for a rockstar Frontend Engineer to join our core team. You will be responsible for building smooth user experiences using React and Framer Motion.',
    companySize: '50-200 employees',
  },
  {
    id: '2',
    title: 'Product Designer (UI/UX)',
    company: 'Vattanac Bank',
    companyId: 'vattanac-bank',
    location: 'Remote (Cambodia)',
    salary: '$1,800 - $3,200',
    type: 'Remote',
    logo: 'https://images.unsplash.com/photo-1572044162444-ad60f128bde2?w=100&h=100&fit=crop',
    category: 'Design',
    postedAt: '5h ago',
    urgent: false,
    description: 'Help us redefine banking in Cambodia. Join our design team to create the most intuitive financial tools in the region.',
  },
  {
    id: '3',
    title: 'Marketing Manager',
    company: 'Smart Axiata',
    companyId: 'smart-axiata',
    location: 'Phnom Penh',
    salary: '$1,500 - $2,500',
    type: 'Full-time',
    category: 'Marketing',
    postedAt: '1h ago',
    urgent: true,
    description: 'Lead our next-generation marketing campaigns for mobile connectivity. Strong background in digital strategy required.',
  },
  {
    id: '4',
    title: 'Sales & Distribution Manager',
    company: 'Coca-Cola',
    companyId: 'coca-cola',
    location: 'Phnom Penh',
    salary: '$1,500 - $2,800',
    type: 'Full-time',
    category: 'Sales',
    postedAt: '12h ago',
    urgent: false,
    description: 'Join the world\'s leading beverage company. We are looking for an experienced Sales Manager to lead our distribution network in the Greater Phnom Penh area.',
    companySize: '700,000+ employees (Global)',
  },
  {
    id: '5',
    title: 'Customer Support Lead',
    company: 'Grab',
    companyId: 'grab',
    location: 'Phnom Penh',
    salary: '$1,200 - $2,000',
    type: 'Full-time',
    category: 'Customer Service',
    postedAt: '1 day ago',
    urgent: false,
    description: 'Manage a team of support specialists ensuring the best experience for Grab users in Cambodia. Excellent communication and leadership skills required.',
    companySize: '10,000+ employees',
  },
  {
    id: '6',
    title: 'Senior Backend Developer (Golang)',
    company: 'ABA Bank',
    companyId: 'aba',
    location: 'Phnom Penh',
    salary: '$3,000 - $5,500',
    type: 'Full-time',
    category: 'Development',
    postedAt: '3h ago',
    urgent: true,
    description: 'Help scale Cambodia\'s leading mobile banking infrastructure. Experience with high-performance microservices and distributed systems required.',
    companySize: '5,000+ employees',
  },
  {
    id: '7',
    title: 'Digital Content Creator',
    company: 'Sabay Digital',
    companyId: 'sabay-digital',
    location: 'Phnom Penh',
    salary: '$600 - $1,200',
    type: 'Contract',
    logo: 'https://images.unsplash.com/photo-1492724441997-5dc865305da7?w=100&h=100&fit=crop',
    category: 'Marketing',
    postedAt: '6h ago',
    urgent: false,
    description: 'Produce engaging video and social media content for Cambodia\'s largest digital media platform.',
  },
  {
    id: '8',
    title: 'Performance Marketing Specialist',
    company: 'Cellcard',
    companyId: 'cellcard',
    location: 'Siem Reap',
    salary: '$1,000 - $1,800',
    type: 'Remote',
    category: 'Marketing',
    postedAt: '4h ago',
    urgent: true,
    description: 'Drive growth through data-driven performance campaigns. Strong experience with FB Ads Manager and Google Ads is a must.',
  },
  {
    id: '9',
    title: 'Financial Consultant',
    company: 'Prudential',
    companyId: 'prudential',
    location: 'Phnom Penh',
    salary: '$1,200 - $2,500',
    type: 'Full-time',
    category: 'Sales',
    postedAt: '8h ago',
    urgent: false,
    description: 'Join Cambodia\'s leading life insurance provider. Help families secure their future through professional financial planning and insurance solutions.',
    companySize: '1,000+ employees (Local)',
  },
  {
    id: '10',
    title: 'Customer Success Specialist',
    company: 'Nham24',
    companyId: 'nham24',
    location: 'Phnom Penh',
    salary: '$700 - $1,300',
    type: 'Full-time',
    logo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
    category: 'Customer Service',
    postedAt: '1h ago',
    urgent: true,
    description: 'Ensure our customers and merchants have the best possible experience with Cambodia\'s premier delivery platform.',
  },
];

let users: any[] = [];
const savedJobs = new Map<string, string[]>();
const jobAlerts = new Map<string, any[]>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.cookies.auth_token;
    if (!token) return next();
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (e) {
      // Invalid token
    }
    next();
  };

  // Firebase Auth Sync
  app.post('/api/auth/firebase-sync', async (req, res) => {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'No token provided' });

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const { name, email, picture } = decodedToken;

      const token = jwt.sign({ name: name || 'User', email, picture }, JWT_SECRET, { expiresIn: '7d' });
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
      });

      res.json({ success: true, user: { name, email, picture } });
    } catch (error) {
      console.error('Firebase token verification failed', error);
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  // API Routes
  console.log('--- System Configuration ---');
  console.log(`Telegram Bot: ${TELEGRAM_BOT_TOKEN ? '✅ Configured' : '❌ Not Configured'}`);
  console.log(`Telegram Chat: ${TELEGRAM_CHAT_ID ? '✅ Configured' : '❌ Not Configured'}`);
  console.log(`Email (SMTP): ${process.env.SMTP_HOST ? '✅ Configured' : '❌ Not Configured'}`);
  console.log('---------------------------');

  app.get('/api/jobs/saved', authenticate, (req: any, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Please sign in to view saved jobs' });
    }
    const userSaved = savedJobs.get(req.user.email) || [];
    const savedJobsList = jobs.filter(job => userSaved.includes(job.id));
    res.json(savedJobsList);
  });

  app.post('/api/jobs/:id/save', authenticate, (req: any, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Please sign in to save jobs' });
    }
    const { id } = req.params;
    const userEmail = req.user.email;
    
    if (!savedJobs.has(userEmail)) {
      savedJobs.set(userEmail, []);
    }
    
    const userSaved = savedJobs.get(userEmail)!;
    if (!userSaved.includes(id)) {
      userSaved.push(id);
    }
    
    res.json({ success: true, savedIds: userSaved });
  });

  app.post('/api/jobs/:id/unsave', authenticate, (req: any, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Please sign in to unsave jobs' });
    }
    const { id } = req.params;
    const userEmail = req.user.email;
    
    if (savedJobs.has(userEmail)) {
      const userSaved = savedJobs.get(userEmail)!;
      savedJobs.set(userEmail, userSaved.filter(jobId => jobId !== id));
    }
    
    res.json({ success: true, savedIds: savedJobs.get(userEmail) || [] });
  });

  app.get('/api/alerts', authenticate, (req: any, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const userEmail = req.user.email;
    const alerts = jobAlerts.get(userEmail) || [];
    
    // Enrich alerts with "new matches" count
    const enrichedAlerts = alerts.map(alert => {
      const matches = jobs.filter(job => {
        // Check if job was posted after last check
        // (For demo purposes, we'll just check if it matches filters)
        
        const f = alert.filters;
        const matchesCategory = f.category === 'All' || job.category === f.category;
        const matchesSearch = !f.searchTerm || 
          job.title.toLowerCase().includes(f.searchTerm.toLowerCase()) ||
          job.company.toLowerCase().includes(f.searchTerm.toLowerCase());
        const matchesType = f.types.length === 0 || f.types.includes(job.type);
        
        let matchesSalary = true;
        if (f.salaryRange !== 'Any Salary') {
          const salaryVal = parseInt(job.salary.replace(/[^0-9]/g, ''));
          if (f.salaryRange === '$500 - $1,000') matchesSalary = salaryVal >= 500 && salaryVal <= 1000;
          else if (f.salaryRange === '$1,000 - $2,000') matchesSalary = salaryVal >= 1000 && salaryVal <= 2000;
          else if (f.salaryRange === '$2,000 - $3,000') matchesSalary = salaryVal >= 2000 && salaryVal <= 3000;
          else if (f.salaryRange === '$3,000+') matchesSalary = salaryVal >= 3000;
        }

        return matchesCategory && matchesSearch && matchesType && matchesSalary;
      });

      return {
        ...alert,
        matchCount: matches.length
      };
    });

    res.json(enrichedAlerts);
  });

  app.post('/api/alerts', authenticate, (req: any, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { name, filters } = req.body;
    const userEmail = req.user.email;
    
    if (!jobAlerts.has(userEmail)) {
      jobAlerts.set(userEmail, []);
    }
    
    const newAlert = {
      id: Math.random().toString(36).substr(2, 9),
      name: name || 'Job Alert',
      filters,
      createdAt: new Date().toISOString(),
      lastChecked: new Date().toISOString()
    };
    
    jobAlerts.get(userEmail)!.push(newAlert);
    res.json(newAlert);
  });

  app.put('/api/alerts/:id', authenticate, (req: any, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    const { name, filters } = req.body;
    const userEmail = req.user.email;
    
    if (jobAlerts.has(userEmail)) {
      const alerts = jobAlerts.get(userEmail)!;
      const index = alerts.findIndex(a => a.id === id);
      if (index !== -1) {
        alerts[index] = {
          ...alerts[index],
          name: name || alerts[index].name,
          filters: filters || alerts[index].filters,
          updatedAt: new Date().toISOString()
        };
        return res.json(alerts[index]);
      }
    }
    
    res.status(404).json({ error: 'Alert not found' });
  });

  app.delete('/api/alerts/:id', authenticate, (req: any, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    const userEmail = req.user.email;
    
    if (jobAlerts.has(userEmail)) {
      const remaining = jobAlerts.get(userEmail)!.filter(a => a.id !== id);
      jobAlerts.set(userEmail, remaining);
    }
    
    res.json({ success: true });
  });

  app.get('/api/jobs', (req, res) => {
    res.json(jobs);
  });

  app.get('/api/companies/:id', (req, res) => {
    const { id } = req.params;
    const company = companies.find(c => c.id === id || c.name === id);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json(company);
  });

  app.post('/api/jobs', authenticate, (req: any, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Please sign in to post a job' });
    }
    const newJob = {
      ...req.body,
      id: Math.random().toString(36).substr(2, 9),
      postedAt: 'Just now',
    };
    jobs = [newJob, ...jobs];
    res.status(201).json(newJob);
  });

  app.post('/api/jobs/:id/apply', authenticate, (req: any, res: any, next: any) => {
    upload.single('cv')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  }, async (req: any, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Please sign in to apply for this job' });
    }

    const { id } = req.params;
    const { fullName, email } = req.body;
    const cvFile = req.file;
    const job = jobs.find(j => j.id === id);
    console.log(`[Apply] Processing application for job: ${job?.title} from ${fullName}`);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (!fullName || !email) {
      return res.status(400).json({ error: 'Full Name and Email are required.' });
    }

    if (!cvFile) {
      return res.status(400).json({ error: 'Please upload your CV in PDF format.' });
    }

    // Send Email Notification
    const emailResult = await sendEmailApplication(job, fullName, email, cvFile);

    // Send Telegram Notification
    const message = `
<b>🚀 New Job Application!</b>

<b>Job:</b> ${escapeHtml(job.title)}
<b>Company:</b> ${escapeHtml(job.company)}

<b>Applicant Details:</b>
<b>Name:</b> ${escapeHtml(fullName)}
<b>Email:</b> ${escapeHtml(email)}
<b>File:</b> ${escapeHtml(cvFile.originalname)}

<i>Sent from JobConnect Cambodia</i>
    `;

    const telegramResult = await sendTelegramApplication(message, cvFile);

    const isSimulated = emailResult.simulated && telegramResult.simulated;
    
    // Determine overall success
    // If user provided Telegram keys, Telegram MUST succeed for success to be true
    // If they only have simulation, it's a "simulated success"
    let isSuccess = false;
    if (isSimulated) {
      isSuccess = true;
    } else {
      // If Telegram is live (not simulated), it must succeed
      const telegramOk = telegramResult.simulated || telegramResult.success;
      // If Email is live (not simulated), it must succeed
      const emailOk = emailResult.simulated || emailResult.success;
      
      isSuccess = telegramOk && emailOk;
    }

    // Construct descriptive message
    let statusMessage = 'Application processed!';
    if (isSimulated) {
      statusMessage = 'Application Simulated! Set API keys in Settings to go live.';
    } else if (!isSuccess) {
      const parts = [];
      if (!emailResult.simulated && !emailResult.success) parts.push('Email failed');
      if (!telegramResult.simulated && !telegramResult.success) {
        parts.push(`Telegram Error: ${telegramResult.error || 'Unknown'}`);
      }
      statusMessage = parts.join(' & ') || 'Application delivery failed.';
    } else {
      const active = [];
      if (!emailResult.simulated) active.push('Email');
      if (!telegramResult.simulated) active.push('Telegram');
      statusMessage = `Application sent via ${active.join(' & ')}!`;
    }

    res.status(isSuccess ? 200 : 500).json({ 
      success: isSuccess, 
      simulated: isSimulated,
      message: statusMessage
    });
  });

  // Manual Auth Routes
  app.post('/api/auth/signup', (req, res) => {
    const { name, email, password } = req.body;
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'User already exists' });
    }
    const user = { name, email, password }; // In production, hash the password!
    users.push(user);
    
    const token = jwt.sign({ name, email }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });
    res.status(201).json({ user: { name, email } });
  });

  app.post('/api/auth/signin', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Account not found. Please sign up first.' });
    }
    
    if (user.password !== password) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }
    
    const token = jwt.sign({ name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });
    res.json({ user: { name: user.name, email: user.email } });
  });

  // Google OAuth URL
  app.get('/api/auth/google/url', (req, res) => {
    const redirectUri = `${APP_URL}/auth/google/callback`.replace('http://localhost:3000', req.headers.origin || 'http://localhost:3000');
    
    // Fallback for demo if no keys
    if (!GOOGLE_CLIENT_ID) {
       return res.json({ 
         url: `/auth/demo-callback?name=Demo%20User&email=demo@example.com` 
       });
    }

    const url = client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'],
      redirect_uri: redirectUri,
    });
    res.json({ url });
  });

  // Google OAuth Callback
  app.get(['/auth/google/callback', '/auth/google/callback/'], async (req, res) => {
    const { code } = req.query;
    const redirectUri = `${APP_URL}/auth/google/callback`.replace('http://localhost:3000', req.headers.origin || 'http://localhost:3000');

    try {
      const { tokens } = await client.getToken({
        code: code as string,
        redirect_uri: redirectUri,
      });
      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      
      const user = {
        name: payload?.name,
        email: payload?.email,
        picture: payload?.picture,
      };

      const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
      });

      res.send(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'AUTH_SUCCESS', user: ${JSON.stringify(user)} }, '*');
              window.close();
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('Auth error', error);
      res.status(500).send('Authentication failed');
    }
  });

  // Demo Callback for when no keys are provided
  app.get('/auth/demo-callback', (req, res) => {
    const user = {
      name: req.query.name as string || 'Demo User',
      email: req.query.email as string || 'demo@example.com',
      picture: 'https://i.pravatar.cc/150?u=demo',
    };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '1h' });
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });
    res.send(`
      <html>
        <body>
          <script>
            window.opener.postMessage({ type: 'AUTH_SUCCESS', user: ${JSON.stringify(user)} }, '*');
            window.close();
          </script>
        </body>
      </html>
    `);
  });

  app.get('/api/auth/me', authenticate, (req: any, res) => {
    if (req.user) {
      res.json({ user: req.user });
    } else {
      res.status(401).json({ user: null });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });
    res.json({ success: true });
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
