# GABLE: Google Apps Script Longitudinal Participant Management

GABLE is a Google Apps Script framework for managing participants in longitudinal online experiments. It automates scheduling, reminders, session tracking, and incentive workflows so researchers can focus on building their experimental task.

> GABLE manages participants and study flow. You are responsible for building and hosting the task webpage.

## Features

- Tracks multisession progress per participant
- Sends automated reminder and status emails
- Activates sessions based on configurable schedules
- Logs all activity in a Google Sheet
- Reads participant progress from your chosen storage backend
- Supports automated gift card tracking and payouts

## Quick Start

### 1. Google Apps Script Setup

1. Create a new Google Sheet
2. Go to Extensions → Apps Script
3. Copy all `.js` files into the project
4. Update `config.js`
5. Run `initialize()`
6. Confirm setup via email

### Essential Configuration (config.js)

At the top of `config.js`, set:

- `NUM_SESSIONS`
- `NUM_GROUPS`
- `DAYS_INTERVAL`
- `GROUPS_MAPPING`

Your study definition stays exactly as before:

```javascript
STUDIES = {
  GABLE_01: {
    name: "Your Study Name",
    admin_name: "Your Name",
    website: "https://your-task-page.com",
    preexperiment: "https://your-qualtrics-link.com",
    email: "your-email@example.com",
    folderID: "your-google-drive-folder-id",
    adminCalendarId: "your-calendar-id@google.com",

    sasToken: "?sv=xxxx",
    storageAccountName: "your-storage-account",
    storageContainer: "your-container-name",

    groups: {
      number: NUM_GROUPS,
      numSessions: NUM_SESSIONS,
      giftCardAmountPerSession: 5,
      giftCardAmountAfterCompletion: 100
    }
  }
};
```

The three storage fields above were originally described as Azure related. You can keep them as is or adapt them for any backend as long as your storage helper functions know how to use them. GABLE only requires the ability to read and write JSON.

## Integration with Your Task Webpage

Your task saves a JSON state file for each participant. It can be stored in Azure, AWS, GCP, Firebase, or any storage reachable through HTTP fetch. The filename format is customizable; in the current implementation it follows:

```
pID{userId}_gable.json
```

### Required JSON Structure

```json
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

### Fields Your Task Must Maintain

| Field | Description | Updated by |
|-------|-------------|------------|
| `sessionNumber` | Current session | Task |
| `trialNumber` | Current trial | Task |
| `sessionCompleted` | Session finished | Task |
| `trialCompleted` | Trial finished | Task |
| `firstTrialStartTime` | First trial time | Task |
| `lastTrialCompletedTime` | Last trial time | Task |
| `lastSessionCompletedTime` | Session completion time | Task |
| `latestSubmissionTime` | Every save | Task |
| `sessionActivationTime` | When session opened | GABLE |
| `accountTerminated` | Removed or dropped | Admin |

### Initial File Created by GABLE

```json
{
  "sessionNumber": 0,
  "trialNumber": 0,
  "sessionCompleted": true,
  "trialCompleted": true
}
```

## Workflow

1. **Sign up**: GABLE writes the participant to the Sheet and creates the initial JSON file
2. **Session activation**: GABLE opens the next session based on your timing rules
3. **Task participation**: Your webpage updates the JSON as the participant progresses
4. **Monitoring and email**: Scheduled checks read the JSON file and update Sheets and emails
5. **Completion and incentives**: Gift card logic tracks progress and completion payments

## Time Based Triggers

Initialization creates triggers that:

- Activate sessions
- Send reminders
- Poll the storage JSON files
- Update Sheets
- Create optional summaries

## Testing and Customization

### Testing

Use a few test participants and confirm session changes, email behavior, and JSON updates.

### Customization

Edit in `config.js` and email templates:

- Session spacing
- Group definitions
- Payout amounts
- Allowed windows for completion
- Storage helper functions

## License

Add your license text here.