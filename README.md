# GABLE - Google Apps Script Longitudinal Participant Management

GABLE automates participant management for longitudinal online psychological experiments using Google Apps Script. It handles scheduling, reminders, session tracking, and gift card distribution, allowing researchers to focus on their experimental tasks.

**Note:** GABLE manages participants only—you must develop your own task webpage separately.

## What GABLE Does

- Tracks participant sessions and trials across multiple timepoints
- Sends automated email reminders and notifications
- Monitors completion status and validates sessions
- Manages gift card distribution
- Provides real-time tracking via Google Sheets
- Integrates with Azure Blob Storage for participant data

## Quick Start

### 1. Initial Setup

1. Create a new Google Sheet
2. Go to **Extensions → Apps Script**
3. Copy all `.js` files from this repository into your Apps Script project
4. Configure `config.js` with your study settings (see below)
5. Run the `initialize()` function from `main.js`
6. Check your email for configuration confirmation

### 2. Essential Configuration (`config.js`)

Update these required fields in the `STUDIES` object:

```javascript
STUDIES = {
  GABLE_01: {
    name: "Your Study Name",
    admin_name: "Your Name",
    website: "https://your-task-page.com",  // Your task webpage URL
    preexperiment: "https://your-qualtrics-link.com",
    email: 'your-email@example.com',
    folderID: "your-google-drive-folder-id",
    adminCalendarId: "your-calendar-id@google.com",
    
    // Azure Storage (where participant data lives)
    sasToken: "?sv=xxxx",
    storageAccountName: "your-storage-account",
    storageContainer: "your-container-name",
    
    // Study parameters
    groups: {
      number: NUM_GROUPS,  // Adjust NUM_GROUPS at top of file
      numSessions: NUM_SESSIONS,  // Adjust NUM_SESSIONS at top of file
      giftCardAmountPerSession: 5,
      giftCardAmountAfterCompletion: 100
    }
  }
}
```

Adjust these constants at the top of `config.js`:
- `NUM_SESSIONS`: Total number of sessions in your study
- `NUM_GROUPS`: Number of experimental groups
- `DAYS_INTERVAL`: Days between each session
- `GROUPS_MAPPING`: Define your group names/conditions

## Integration with Your Task Webpage

### Critical: Participant Data Structure

Your task webpage **must** write participant data to Azure Blob Storage as JSON files with this structure:

```javascript
{
  "userId": "fa4ae08",
  "group": "G11",
  "sessionNumber": 1,
  "trialNumber": 5,
  "firstTrialStartTime": "12/10/2025 10:35:00 AM",
  "sessionCompleted": true,
  "trialCompleted": true,
  "accountTerminated": false,
  "lastTrialCompletedTime": "12/10/2025 11:35:00 AM",
  "lastSessionCompletedTime": "12/10/2025 11:35:00 AM",
  "sessionActivationTime": "12/10/2025 10:30:00 AM",
  "latestSubmissionTime": "",
  "loginData": [],
  "trialStartTimesData": {},
  "trialCompletedTimesData": {},
  "sessionStartTimes": {},
  "sessionCompletedTimes": {}
}
```

### Required Fields Your Task Page Must Update

GABLE reads and processes these fields via scheduled triggers:

| Field | Description | When to Update |
|-------|-------------|----------------|
| `sessionNumber` | Current session (1-indexed) | When participant starts a new session |
| `trialNumber` | Current trial within session | After each trial completion |
| `sessionCompleted` | Session is finished | When all trials in session are done |
| `trialCompleted` | Current trial is finished | After each trial |
| `firstTrialStartTime` | First trial start timestamp | When user starts first trial |
| `lastTrialCompletedTime` | Most recent trial completion | After each trial |
| `lastSessionCompletedTime` | Session completion timestamp | When session finishes |
| `sessionActivationTime` | When session became available | Set by GABLE initially, don't overwrite |
| `latestSubmissionTime` | Most recent data submission | On every data save |
| `accountTerminated` | User dropped out or was removed | If user needs to be excluded |

### Initial JSON File Creation

When a participant signs up, GABLE creates their initial JSON file with:
- `sessionNumber: 0`
- `trialNumber: 0`
- `sessionCompleted: true`
- `trialCompleted: true`

Your task page should increment these values as the participant progresses.

### File Naming Convention

Store participant data as: `{userId}.json` in your Azure container.

## How GABLE Works

1. **Participant Sign-Up**: User fills Google Form → GABLE creates their data file in Azure
2. **Session Activation**: Time-based triggers activate next session → updates `sessionActivationTime`
3. **Monitoring**: GABLE checks Azure files every few hours for completion status
4. **Emails**: Sends reminders, completion confirmations, and gift card codes automatically
5. **Tracking**: All activities logged in Google Sheets with color-coded status

## Time-Based Triggers

GABLE uses Google Apps Script triggers to:
- Check for session completions (reads your Azure files)
- Send reminder emails for incomplete sessions
- Activate new sessions after the specified interval
- Generate daily summary reports

Triggers are created automatically during initialization.

## Important Notes

### Your Task Webpage Responsibilities

✅ **Your task page must:**
- Read the participant's JSON file from Azure at session start
- Update `sessionNumber`, `trialNumber`, and timestamps during the task
- Set `sessionCompleted: true` and `trialCompleted: true` when appropriate
- Write updates back to Azure after every significant event

❌ **Your task page should NOT:**
- Modify `userId`, `group`, or `sessionActivationTime`
- Skip updating completion flags—GABLE relies on these
- Use different date formats (use: "MM/DD/YYYY HH:MM:SS AM/PM")

### Date Format

Always use: `"12/10/2025 10:35:00 AM"` format for all timestamp fields.

### Testing

Test with a few participants first. Check the Google Sheet to ensure:
- Colors update correctly (green → blue after completion)
- Email notifications are sent
- Session numbers increment properly

## Customization

Most customization happens in `config.js`:
- Session timing and intervals
- Email templates (in various functions)
- Gift card amounts
- Grace periods for late completions
- Valid time windows for task completion

## Troubleshooting

**Participants not advancing sessions:**
- Check Azure file permissions (SAS token)
- Verify `sessionCompleted` is being set to `true`
- Ensure date format matches exactly

**Emails not sending:**
- Check Gmail quotas (Apps Script has daily limits)
- Verify email addresses in `config.js`

**Data not syncing:**
- Confirm Azure credentials in `config.js`
- Check Apps Script trigger logs: **Apps Script Editor → Executions**

## Support

For issues or questions about GABLE, please open an issue on GitHub or contact the maintainers listed in `config.js`.

---

**License:** [Add your license here]
