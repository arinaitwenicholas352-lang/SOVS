# SOVS - Secure Online Voting System
A robust, secure, and role-based online voting system designed for university elections.

## Overview
The Secure Online Voting System (SOVS) is a modern web-based electronic voting platform designed to provide secure, transparent, and efficient digital elections for a university. The system enables students,educational  organizations, or institutions to conduct elections online while ensuring voter authentication, vote integrity, confidentiality, and real-time result processing.
The platform supports multiple user roles such as administrators, election commission members, and voters, with secure authentication and election management capabilities.



## Features

- **Role-Based Access Control (RBAC)**:
  - **Students**: Vote in active elections, view results.
  - **EC Members**: Manage elections, candidates, and monitor turnout.
  - **IT Admins**: System health monitoring and full audit log access.
- **Security**:
  - **Vote Encryption**: Ballots are encrypted using AES-256 before storage.
  - **Anonymity**: Votes are stored separately from the voter registry to ensure secrecy.
  - **Integrity**: One-vote-per-student enforcement via unique constraints.
  - **Audit Logging**: Every critical action is logged with actor ID, action, and IP address.
  - **Password Hashing**: All passwords are hashed using Bcrypt.
- **Real-time Monitoring**: EC members can view anonymized turnout statistics during live elections.


##  Security Features


JWT-based authentication


Password hashing and secure login


Role-based access control


End-to-end encrypted EC messaging


Secure vote submission


Prevention of duplicate voting


Activity and audit logging


Session management



## Election Management


Create and manage elections


Draft, active, paused, and ended election states


Candidate registration and approval


Position management


Election scheduling


Real-time election monitoring



## User Roles
1. IT Administrator


Manage EC members


Monitor system logs


View all elections


System maintenance and monitoring


## 2. Election Commission (EC)


Create and manage elections


Approve candidates


Pause or end elections


Publish announcements


View voting analytics


## 3. Students/Voters


View active elections


Cast votes securely


View announcements


Access election results



## Dashboard Features


Real-time statistics


Election participation metrics


Candidate performance tracking


Live result updates


Administrative analytics



## Technology Stack For Our Prototype
Frontend


React


TypeScript


Tailwind CSS


Vite


ShadCN UI


Backend


Node.js


Express.js


Database


MySQL


Authentication


JWT Authentication




## Additional Technologies


Socket.IO (Real-time features)


Nodemailer (Email notifications)


Local Storage (Image uploads)



System Architecture
Frontend (React + Vite), REST API (Express.js Backend), MySQL      AuthenticationDatabase   & Security Layer



## Installation Guide
Prerequisites
Ensure you have installed:


Node.js


MySQL


Git



1. Clone Repository
git clone https://github.com/your-username/sovs.gitcd sovs

2. Install Dependencies
Frontend
cd frontendn pm install
Backend
cd backend npm install

3. Configure Environment Variables
Create a .env file inside the backend folder:
PORT=5000DB_HOST=localhostDB_USER=rootDB_PASSWORD=your_passwordDB_NAME=sovs_dbJWT_SECRET=your_secret_keySMTP_HOST=smtp.gmail.comSMTP_PORT=587SMTP_USER=your_emailSMTP_PASSWORD=your_password

4. Start Backend
npm run server

5. Start Frontend
npm run dev

Database Setup
Create a MySQL database:
CREATE DATABASE sovs_db;
Import your SQL schema into MySQL.

Authentication Flow


User logs in using SSO

## Password is: Password123  for all users



Backend validates credentials


JWT token generated


Token stored securely


Protected routes require authentication token



## Voting Process


Voter logs in


Active elections are displayed


Voter selects candidate(s)


Vote is encrypted and submitted


System verifies voter eligibility


Vote is stored securely


Duplicate voting prevented



## Security Considerations


Encrypted communication using HTTPS


Password hashing with bcrypt


JWT authentication


SQL injection prevention


Input validation and sanitization


Secure session handling


Role-based authorization



## Future Improvement


Biometric authentication


Multi-factor authentication (MFA)


Mobile application support


AI-powered anomaly detection




