# Founder Dashboard - Quick Reference Guide

## Access the Dashboard
**URL:** `https://your-domain.com/founder`  
**Required Role:** `founder` or `ops_admin`

---

## The 13 Systems at a Glance

### 🏥 **OPERATIONAL HEALTH**

**1. System Health** - Is everything running?
- Overall system status (HEALTHY/WARNING/DEGRADED/CRITICAL)
- Storage, Validation Rules, NEMSIS, Exports subsystems
- Critical issues requiring immediate attention
- Auto-refresh: Every 30 seconds

**2. Storage & Quota** - Are we running out of space?
- Total storage usage and quota tracking
- Breakdown by category (documents, images, exports)
- Recent activity feed
- Auto-refresh: Every 45 seconds

**3. Builder Systems** - Are validation rules working?
- Validation rule engine health
- NEMSIS compliance status
- Builder system diagnostics
- Auto-refresh: Every 45 seconds

**4. Failed Operations** - What's broken?
- Failed storage operations
- Error categorization and frequency
- Retry status monitoring
- Auto-refresh: Every 30 seconds

**5. Recent Activity** - What just happened?
- Real-time activity feed
- Audit trail of critical events
- User action tracking
- Auto-refresh: Every 30 seconds

---

### 💰 **FINANCIAL SYSTEMS**

**6. AI Billing Assistant** - Are we getting paid?
- **Unpaid Claims:** Total value outstanding
- **Overdue Claims:** Past-due amounts
- **Billing Accuracy Score:** Quality metric
- **AI Chat:** Ask billing questions in natural language
- **AI Insights:** Proactive recommendations
- Auto-refresh: Every 60 seconds

**7. Accounting Dashboard** - What's our financial position?
- **Cash Balance:** Current cash + trend analysis
- **Accounts Receivable:** Aging breakdown (Current, 30-60, 60-90, 90+ days)
- **P&L Statement:** Monthly/Quarterly/Yearly view
- **Tax Summary:** Estimated liability, filing status
- AI insights for cash flow, AR aging, revenue trends
- Auto-refresh: Every 60 seconds

**8. Expenses & Receipts** - Are expenses processed?
- **OCR Queue:** Pending receipt processing
- **OCR Failures:** Failed scans requiring attention
- **Unposted Expenses:** Ready for accounting
- **Approval Workflows:** Workflow status
- Processing time metrics
- Auto-refresh: Every 60 seconds

---

### 📞 **COMMUNICATION SYSTEMS**

**9. Email Dashboard** - Are we responding to emails?
- Email statistics (sent, received, delivery rate)
- **Emails Needing Response:** HIGH PRIORITY
- Failed deliveries tracking
- Recent email activity
- **AI Email Drafting:** Generate responses automatically
- Communication effectiveness scoring
- Auto-refresh: Every 60 seconds

**10. Phone System (Telnyx)** - Are we missing calls?
- Active calls count
- Missed calls tracking
- Voicemail count
- **Ava AI Responses:** Hours saved by AI
- Customer satisfaction score
- IVR route analytics
- Auto-refresh: Every 45 seconds

---

### 📊 **DATA & ANALYTICS**

**11. ePCR Import (ImageTrend/ZOLL)** - Is data flowing in?
- Import history and statistics
- **ImageTrend Elite** integration status
- **ZOLL RescueNet** integration status
- Validation error tracking
- Success/failure rates by vendor
- Auto-refresh: Every 60 seconds

**12. Marketing Analytics** - Are we growing?
- **Demo Requests:** Total, pending, converted
- **Lead Generation:** Qualified leads, sources
- **Campaigns:** Active campaigns, performance
- **Pipeline:** 4-stage funnel (Awareness → Decision)
- **ROI Analysis:** Marketing spend and returns
- Top performing channels
- AI-generated insights
- Auto-refresh: Every 60 seconds

**13. Reporting & Analytics** - Can we export data?
- System-wide report generation metrics
- **NEMSIS Compliance Exports:** Success rate
- Custom dashboard builder statistics
- Automated report tracking
- Data pipeline health (S3, databases, APIs)
- Analytics API uptime and performance
- Auto-refresh: Every 60 seconds

---

## The Founder's 4 Priority Questions

### ❓ Question 1: "Is the system healthy and operational?"
**Look at:**
- System Health Widget (top of dashboard)
- Builder Systems Widget
- Failed Operations Widget
- Storage Quota Widget

**Red Flags:**
- Status: CRITICAL or DEGRADED
- "Immediate Attention Required" alerts
- Failed operations > 10
- Storage usage > 80%

---

### ❓ Question 2: "Are we making money and staying compliant?"
**Look at:**
- AI Billing Assistant (unpaid/overdue claims)
- Accounting Dashboard (cash, AR, P&L)
- Expenses Dashboard (unposted expenses)
- Reporting Dashboard (NEMSIS compliance rate)

**Red Flags:**
- Overdue claims > $10,000
- Billing accuracy < 85%
- AR over 90 days > 25% of total
- NEMSIS compliance < 95%
- Quarterly tax filings overdue

---

### ❓ Question 3: "Are customers and prospects engaged?"
**Look at:**
- Email Dashboard (emails needing response)
- Phone System (missed calls, voicemail)
- Marketing Analytics (demo conversion rate)

**Red Flags:**
- Emails needing response > 10
- Missed calls > 5
- Demo conversion rate < 15%
- Customer satisfaction score < 80%

---

### ❓ Question 4: "Can I access data and insights when needed?"
**Look at:**
- ePCR Import Widget (import success rate)
- Reporting Dashboard (export failures)
- Recent Activity Widget (data flow)

**Red Flags:**
- ePCR import success rate < 90%
- Export failures > 0
- Analytics API status: DEGRADED or CRITICAL
- Data pipeline errors

---

## Using the AI Billing Assistant

### Step 1: Review AI Insights
Check the "AI Billing Insights" section for proactive recommendations:
- **Billing Issues:** Claims with problems
- **Optimization:** Ways to improve accuracy
- **Urgent Actions:** Immediate attention needed

### Step 2: Ask Questions
Click "Ask AI Billing Assistant" and type natural language questions:
- "Why is claim #12345 denied?"
- "What's the average reimbursement for ALS transports?"
- "How do I appeal a denial from Blue Cross?"
- "Show me claims pending over 60 days"

### Step 3: Review Suggested Actions
Each AI insight includes a "Suggested Action" button - click to navigate to the relevant screen.

---

## Understanding Health Status Colors

| Status | Color | Meaning | Action Required |
|--------|-------|---------|-----------------|
| HEALTHY | Green | Normal operation | Monitor |
| WARNING | Yellow | Minor issues detected | Review soon |
| DEGRADED | Orange | Performance issues | Investigate today |
| CRITICAL | Red | System failure | **IMMEDIATE ACTION** |

---

## Auto-Refresh Intervals

All widgets refresh automatically:

| Widget | Interval | Why |
|--------|----------|-----|
| System Health | 30s | Critical monitoring |
| Storage Quota | 45s | Resource tracking |
| Recent Activity | 30s | Real-time feed |
| Builder Systems | 45s | Build monitoring |
| Failed Operations | 30s | Error alerting |
| Email Dashboard | 60s | Communication tracking |
| AI Billing | 60s | Financial stability |
| Phone System | 45s | Active call monitoring |
| ePCR Import | 60s | Batch processing |
| Accounting | 60s | Financial data |
| Expenses | 60s | Processing queue |
| Marketing | 60s | Analytics aggregation |
| Reporting | 60s | Report generation |

**Manual Refresh:** Reload the page to force immediate update across all widgets.

---

## Common Scenarios & Actions

### Scenario 1: System Health is CRITICAL
1. Check "Critical Issues" list
2. Review Failed Operations widget
3. Check Storage Quota (is it full?)
4. Contact tech team with issue details

### Scenario 2: Billing Accuracy Score Dropped Below 85%
1. Click into AI Billing Assistant
2. Review AI Insights for root causes
3. Check "Recent Billing Activity" for flagged items
4. Use AI Chat to ask "Why did billing accuracy drop?"

### Scenario 3: Many Emails Needing Response
1. Review Email Dashboard
2. Check "Emails Needing Response" section
3. Use AI Email Drafting for quick responses
4. Prioritize based on urgency indicator

### Scenario 4: ePCR Import Failures
1. Check ePCR Import Widget
2. Review validation errors
3. Identify vendor (ImageTrend or ZOLL)
4. Check import history for patterns
5. Contact vendor support if persistent

### Scenario 5: Cash Balance Trending Down
1. Review Accounting Dashboard
2. Check AR aging (are collections slow?)
3. Review P&L (are costs increasing?)
4. Check AI Insight for cash flow recommendations
5. Review unpaid claims in AI Billing Assistant

---

## Security & Access Control

**Who can access the Founder Dashboard?**
- Users with role: `founder`
- Users with role: `ops_admin`

**What is logged?**
- Every time you view any widget
- Every AI chat question asked
- Every email sent/drafted
- Every call made
- All critical data access

**Where are logs stored?**
- Forensic Audit Log (searchable in compliance portal)
- Event Log (Recent Activity widget)

---

## Mobile Access

The dashboard is accessible on mobile devices but optimized for desktop/tablet viewing due to the density of information.

**Best Practice:**
- Use tablet (iPad) for field review
- Desktop for detailed analysis
- Mobile for critical alerts only

---

## Performance Tips

1. **Limit Open Tabs:** Dashboard uses auto-refresh - multiple tabs = multiple API calls
2. **Use Filters:** When available, filter data to reduce load times
3. **Bookmark Directly:** Bookmark `/founder` for instant access
4. **Check Network:** Slow dashboard = check your internet connection first

---

## Getting Help

### Dashboard Issues
1. Check System Health widget first
2. Review Failed Operations
3. Contact: tech-support@fusionems.com

### Billing Questions
1. Use AI Billing Assistant chat first
2. Review AI Insights
3. Contact: billing@fusionems.com

### Data Import Issues
1. Check ePCR Import widget
2. Review validation errors
3. Contact vendor support (ImageTrend/ZOLL)

### General Platform Questions
1. Check Reporting Dashboard
2. Review Recent Activity
3. Contact: support@fusionems.com

---

## Quick Wins - What to Check Daily

### Morning Review (5 minutes)
1. ✅ System Health - Is it GREEN?
2. ✅ Emails Needing Response - Any urgent?
3. ✅ Missed Calls - Follow up needed?
4. ✅ Failed Operations - Any new failures?

### Afternoon Review (5 minutes)
5. ✅ AI Billing Insights - Any urgent actions?
6. ✅ Overdue Claims - Increasing or decreasing?
7. ✅ Marketing Demo Requests - Any new leads?
8. ✅ ePCR Import Status - Any failures?

### End of Day Review (10 minutes)
9. ✅ Cash Balance - Trend direction?
10. ✅ Accounts Receivable Aging - Getting worse?
11. ✅ Recent Activity - Any unusual events?
12. ✅ Overall Dashboard - All systems GREEN?

---

**Last Updated:** 2026-01-26  
**Dashboard Version:** 2.0  
**Status:** Production Ready ✅
