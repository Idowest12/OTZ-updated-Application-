# Project Proposal: Clinical Care & ART Patient Management System (CC-PMS)

---

## 1. Executive Summary

The **Clinical Care & ART Patient Management System (CC-PMS)** is an enterprise-grade, secure healthcare application engineered to optimize antiretroviral therapy (ART) management, retention in care, enhanced adherence counseling (EAC), viral load tracking, and clinical appointment workflows for healthcare facilities and community care programs.

The system addresses the operational challenges faced by clinical teams—such as Lost-to-Follow-Up (LTFU) tracking, unsuppressed viral load management, scheduling bottlenecks, and strict patient confidentiality (HIPAA/NDPR)—by providing an integrated, real-time, privacy-first management platform.

This proposal outlines the functional specifications, technical architecture, security & privacy controls, deployment topologies (including private network / intranet isolation), data backup & recovery protocols, and the implementation roadmap for institutional rollout.

---

## 2. Project Background & Problem Statement

### 2.1 Clinical Challenges Addressed
1. **Retention and LTFU Risk**: Identifying missed appointments and patients at risk of being lost to follow-up requires immediate alerts before patients default on medication.
2. **Viral Load Suppression Cascade**: Tracking unsuppressed viral load results (≥1,000 copies/mL) and coordinating mandatory Enhanced Adherence Counseling (EAC) sessions across multiple clinical touches (online/phone + physical sessions) often suffers from documentation gaps.
3. **Data Privacy in Public Clinical Environments**: High-traffic clinics expose Patient Health Information (PHI/PII) on screens to passing patients and unauthorized visitors.
4. **Inter-Departmental Coordination**: Clinicians, counselors, laboratory technicians, and receptionists require tailored permission levels without compromising overall data integrity.
5. **Network Reliability & Data Sovereignty**: Facilities requiring operation within closed intranets, local LANs, or private VPNs must ensure zero unauthorized external data leakage.

---

## 3. Core System Modules & Functional Scope

### 3.1 Patient Management & Cohort Lifecycle
- **Unique Identification**: Clinic ID indexing with collision prevention and validation.
- **Cohort Lifecycle Tracking**:
  - `Active`: Regular clinical attendance and medication pickups.
  - `LTFU` (Lost to Follow-up): Automated classification when visits lapse past grace thresholds.
  - `Transferred Out`: Comprehensive transfer documentation with receiving facility metadata.
  - `Graduated`: Completed adolescent-to-adult care transitions or community model graduation.
  - `Deceased`: Dignified, audited status transition.
- **Patient Reactivation Workflow**: Formal audit trails when re-engaging LTFU patients back into active care.

### 3.2 Enhanced Adherence Counseling (EAC) & Viral Load Cascade
- **Automated EAC Enrollment**: Direct trigger upon recording viral load $\ge 1,000\text{ copies/mL}$.
- **Multi-Phase Session Tracking**:
  - **Session 1 (Virtual/Phone Adherence Review)**: Identification of barriers, pill counts, routine check.
  - **Session 2 (In-Depth Behavioral Support)**: Side-effect management, mental health, disclosure support.
  - **Session 3 (Physical Clinic Review & Repeat VL Order)**: Final readiness evaluation prior to repeat viral load testing.
- **Viral Load Trajectory Visualization**: Visual trending of historical viral load results over time.

### 3.3 Clinical Encounters & Pharmacy Pickup Logging
- Multiple visit classification types:
  - *Drug Pickup & VL Test*
  - *Drug Pickup (Client / Proxy)*
  - *Clinical Review*
  - *Adherence Counseling*
  - *Transfer Out / Reactivation*
- Synchronized appointment date auto-calculation for next medication refill.

### 3.4 Interactive Appointment & Scheduling Calendar
- Visual month/week/day calendar showing scheduled patient pickups and counseling sessions.
- Status workflows (`Pending`, `Completed`, `Missed`).
- Quick-filter for upcoming 7-day, 14-day, and 30-day cohorts.

### 3.5 Privacy Mode & PII Masking (On-Screen Protection)
- **One-Click Privacy Guard**: Instant client-side masking of sensitive fields (Clinic IDs $\rightarrow$ `CLN-***48`, Full Names $\rightarrow$ `J*** D***`, Phone Numbers $\rightarrow$ `+234 *** *** 89`).
- Enables clinicians to operate workstations in public consultation spaces or shared nursing stations without risking shoulder-surfing breaches.

### 3.6 Role-Based Access Control (RBAC) & Governance
- **Predefined Role Profiles**:
  - **Admin / Superuser**: Full system configuration, user provisioning, global exports, and audit access.
  - **Clinician**: Clinical review, visit logging, prescription review, and patient enrollment.
  - **Counselor**: EAC counseling tracks, psycho-social notes, and adherence plans.
  - **Lab Tech**: Viral load result batch entry and laboratory test status updates.
  - **Receptionist**: Patient check-in, demographic updates, and appointment scheduling.
  - **General Staff**: Read-only directory access with PII restrictions.

### 3.7 Analytics & Programmatic Reporting
- **Key Performance Indicators (KPIs)**:
  - Total Active Cohort vs. LTFU Rates.
  - Overall Viral Suppression Rate ($\% < 1,000\text{ copies/mL}$).
  - Pending Viral Load eligible cohort.
  - 30-Day Appointment Forecasts.
- **Export Capabilities**: Clean Excel (.xlsx) and JSON backup exports for national reporting (PEPFAR, UNAIDS 95-95-95 indicators).

---

## 4. Technical Architecture

```
+-------------------------------------------------------------------------+
|                         PRESENTATION LAYER                              |
|   React 19 + TypeScript + Tailwind CSS + Lucide Icons + Motion Engine   |
|   (Responsive Web App: Desktop Workstations, Tablets & Mobile Units)    |
+------------------------------------+------------------------------------+
                                     |
                                     | Encrypted HTTPS / TLS 1.3 / WSS
                                     v
+------------------------------------+------------------------------------+
|                         APPLICATION LAYER                               |
|   Express API Server + Node.js LTS Runtime + Real-Time WebSocket Engine |
|   - Authentication Middleware (JWT / Firebase Auth / Session Tokens)    |
|   - RBAC Policy Enforcement Engine                                      |
|   - Automated LTFU & Appointment Notification Service                   |
+------------------------------------+------------------------------------+
                                     |
                +--------------------+--------------------+
                |                                         |
                v                                         v
+---------------+---------------+         +---------------+---------------+
|    PRIMARY CLOUD / LOCAL      |         |     OFFLINE / LOCAL STORAGE   |
|   Firestore NoSQL / Postgres  |         |   IndexedDB / SQLite Engine   |
|   - Real-time Subscriptions   |         |   - Local Cache Storage       |
|   - Granular Security Rules   |         |   - Resilience to Outages     |
|   - Encrypted at Rest (AES256)|         |   - Auto Re-sync on Reconnect |
+-------------------------------+         +-------------------------------+
```

### 4.1 Technology Stack Summary
- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Motion (Animations), Recharts (Data Visualization), Lucide React.
- **Backend & Middleware**: Node.js / Express.js, TypeScript, RESTful Services, WebSockets for live roster synchronization.
- **Database Options**:
  - *Cloud-Enabled Deployment*: Google Cloud Firestore with real-time snapshot listeners and distributed indexing.
  - *On-Premises / Air-Gapped Deployment*: PostgreSQL / SQLite database engine with local encrypted backups.
- **Security & Cryptography**: AES-256 at-rest encryption, TLS 1.3 in-transit encryption, bcrypt password hashing, SHA-256 tamper-evident audit logging.

---

## 5. Security Threat Modeling & Mitigation Strategy

Deploying healthcare applications requires addressing specific threat vectors, particularly when operating on local hospital networks or hybrid cloud setups.

| Threat Vector | Risk Level | Mitigation Architecture in CC-PMS |
| :--- | :---: | :--- |
| **Shoulder Surfing / Visual Snooping** | Medium | Built-in **Privacy Mode** masks patient names, clinic IDs, and contact numbers on clinical monitors in open triage areas. |
| **Unauthorized Privilege Escalation** | High | Strict Role-Based Access Control (RBAC) validated both at UI layer and server-side request pipelines. |
| **Data Tampering / Record Erasure** | High | Immutable append-only audit trail logs every create, update, delete, and role modification event with user identity and timestamp. |
| **Man-in-the-Middle (MitM) on Local LAN** | High | Enforced HTTPS / TLS termination, Strict-Transport-Security (HSTS), and certificate pinning across internal subnets. |
| **Ransomware / Local Hardware Failure** | Critical | Dual automated backup strategy: scheduled encrypted cloud snapshots + local daily air-gapped export (.xlsx / JSON). |
| **Session Hijacking on Shared Terminals** | Medium | Inactivity timeouts, single-session validation, and rapid logout controls for shared clinic workstations. |

---

## 6. Private Network & Deployment Topologies

To meet diverse institutional compliance requirements, the system supports three flexible deployment models:

### Model A: Dedicated Private Intranet (Air-Gapped / Zero Internet Access)
- **Use Case**: Maximum data sovereignty, high-security hospital facilities.
- **Infrastructure**: Local on-premise server (Ubuntu Linux LTS / Docker container) hosted inside the hospital's dedicated local area network (LAN).
- **Access**: Restricted to internal IPs (e.g., `192.168.1.0/24` or `10.0.0.0/8`). Zero incoming or outgoing internet traffic required.
- **Database**: Local high-availability database cluster with automated disk volume mirroring.

### Model B: Secure Private Network with Encrypted Site-to-Site VPN
- **Use Case**: Multi-branch health networks sharing centralized patient records.
- **Infrastructure**: Central cloud-hosted instance accessible exclusively through WireGuard / IPsec VPN tunnels or Tailscale zero-trust network overlay.
- **Access**: Public IP access is completely disabled. Only authenticated VPN endpoints can connect.

### Model C: Zero-Trust Web Deployment (Cloud-Hosted with Restrictive WAF)
- **Use Case**: Community health workers and decentralized mobile outreach teams.
- **Infrastructure**: Hosted on containerized cloud infrastructure with Google Cloud Armor / Cloudflare WAF, IP-whitelisting, and Multi-Factor Authentication (MFA).

---

## 7. Data Backup, Retention & Disaster Recovery Plan

```
                   +--------------------------------+
                   |     LIVE PRODUCTION DATABASE   |
                   +---------------+----------------+
                                   |
            +----------------------+----------------------+
            |                                             |
            v (Every 1 Hour)                              v (Daily / On-Demand)
+-----------------------+                     +-----------------------+
|  HOT REPLICATION      |                     |  COLD EXPORT ARCHIVE  |
|  Real-time Snapshots  |                     |  Encrypted JSON/XLSX  |
|  Point-In-Time (PITR) |                     |  Air-gapped Storage   |
+-----------------------+                     +-----------------------+
            |                                             |
            +----------------------+----------------------+
                                   |
                                   v
                   +--------------------------------+
                   |  OFFSITE ENCRYPTED REPOSITORY  |
                   |  (3-2-1 Backup Rule Compliant) |
                   +--------------------------------+
```

### 7.1 The 3-2-1 Backup Methodology
1. **3 Copies of Data**: 1 Production copy + 1 Secondary local replica + 1 Offsite archive.
2. **2 Different Media**: Database disk volume snapshots + Compressed offsite encrypted archives.
3. **1 Offsite / Air-Gapped Location**: Stored in a separate physical or cloud storage vault with immutability locks.

### 7.2 Recovery Objectives
- **Recovery Point Objective (RPO)**: $< 1\text{ hour}$ (Maximum potential data loss window in disaster scenario).
- **Recovery Time Objective (RTO)**: $< 15\text{ minutes}$ (Time required to spin up cold standby container).

---

## 8. Implementation Roadmap & Project Milestones

```
+-----------------------------------------------------------------------+
| Phase 1: Architecture & Baseline Setup (Weeks 1 - 2)                   |
| - Finalize deployment topology (LAN / VPN / Cloud)                    |
| - User accounts, RBAC matrix, and facility parameters setup           |
+-----------------------------------+-----------------------------------+
                                    |
                                    v
+-----------------------------------------------------------------------+
| Phase 2: Data Ingestion & Legacy Migration (Weeks 3 - 4)              |
| - Sanitization and batch import of existing patient registers (.xlsx) |
| - Validation of clinic number uniqueness and cohort states            |
+-----------------------------------+-----------------------------------+
                                    |
                                    v
+-----------------------------------------------------------------------+
| Phase 3: Clinical Staff Training & Pilot Testing (Weeks 5 - 6)        |
| - Departmental training (Clinicians, Counselors, Records Officers)    |
| - Parallel run with paper registers for verification                  |
+-----------------------------------+-----------------------------------+
                                    |
                                    v
+-----------------------------------------------------------------------+
| Phase 4: Full Production Go-Live & Handover (Week 7+)                 |
| - Complete switchover to primary digital workflow                     |
| - Automated backup validation & continuous SLA maintenance            |
+-----------------------------------------------------------------------+
```

---

## 9. Deliverables & Documentation Package

Upon acceptance of this project, the implementing team will receive:

1. **Production Codebase**: Full source code repository with zero external proprietary lock-ins.
2. **Operational Manuals**:
   - *Administrator Guide*: User provisioning, audit trail inspection, and backup management.
   - *Clinical User Guide*: Patient intake, EAC counseling tracking, and viral load logging.
3. **Automated Migration Tooling**: Pre-built Excel/CSV import parser with format validation.
4. **Disaster Recovery Runbook**: Step-by-step restoration guide from backup files.
5. **Security & Compliance Audit Report**: Verification checklist for local health data privacy standards.

---

## 10. Conclusion & Approval

The **Clinical Care & ART Patient Management System (CC-PMS)** provides a robust, scalable, and secure technological foundation to accelerate viral suppression, retain patients in life-saving care, and safeguard sensitive health data.

**Prepared By:** Healthcare Systems Engineering Team  
**Date:** August 2026  
**Document Version:** 1.0.0 (Production Release Proposal)

---
