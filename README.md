# Amazon Logistics Data Extractor

A Chrome extension to extract journey and route data from Amazon Logistics and submit vehicle reviews to the Vehicle API.

## Features

- 📊 Extract route summaries from Amazon Logistics
- 🔐 Authenticate with Vehicle API
- ✅ Automatic check for existing reviews (shows **CREATED** badge)
- ⚠️ Visual indicators for missing vehicles/drivers (red highlighting)
- 📧 Send reviews directly or create as pending
- 📥 Export journey data

## Getting Started

### Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top right)
3. Click **Load unpacked** and select the `al-chrome-extension` folder
4. The extension icon will appear in your browser toolbar

### Usage

#### Step 1: Login to Amazon Logistics

First, make sure you are logged into [Amazon Logistics](https://logistics.amazon.com) in your browser.

#### Step 2: Login to the Vehicle API

1. Click on the extension icon in your browser toolbar
2. In the **Authentication** section, enter your credentials:
   - **Username**: Your Vehicle API username
   - **Password**: Your Vehicle API password
3. Click the **Login** button
4. Once authenticated, you'll see your username displayed

#### Step 3: Select a Date and Get Journeys

1. Select the date you want to retrieve routes for using the date picker
2. Click the **Get Journeys** button
3. The extension will:
   - Fetch route data from Amazon Logistics
   - Check for existing reviews on that date
   - Verify vehicle/driver existence for each route
4. Routes are displayed with visual status indicators

#### Step 4: Understand Route Status Indicators

Each route displays its current status:

| Indicator | Meaning |
|-----------|---------|
| ✅ **CREATED** badge | Review already exists for this route (any status) |
| ⚠️ Red VIN | Vehicle not found in system - must be created in Dashboard first |
| ⚠️ Red Phone | Driver not found in system - must be created in Dashboard first |
| ✅ Green checkmarks | Vehicle and driver verified and ready |

#### Step 5: Submit Reviews

For routes where both vehicle and driver exist:

| Button | Description |
|--------|-------------|
| **📧 Send directly** | Creates review AND sends notification (email/SMS) immediately |
| **📝 Create Review** | Creates review in PENDING status without notification |

**Important Notes:**
- Buttons are **disabled** if vehicle or driver doesn't exist
- Routes with existing reviews show **CREATED** badge instead of buttons
- Create missing vehicles/drivers in the Dashboard before using the extension
- Pending reviews can be sent later from the Dashboard

---

## Visual Status Guide

### Route Display

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Route Code │ VIN          │ Driver Phone │ Status      │ Actions         │
├──────────────────────────────────────────────────────────────────────────┤
│ ABC-123    │ ✅ VIN12345  │ ✅ 555-1234  │ Ready       │ [Send] [Create] │
│ DEF-456    │ ⚠️ VIN67890  │ ✅ 555-5678  │ No vehicle  │ (disabled)      │
│ GHI-789    │ ✅ VIN11111  │ ⚠️ 555-9999  │ No driver   │ (disabled)      │
│ JKL-012    │ ✅ VIN22222  │ ✅ 555-0000  │ ✅ CREATED  │ (none)          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Status Meanings

| Status | What to Do |
|--------|------------|
| **Ready** (green) | Click Send or Create to submit review |
| **No vehicle** (red VIN) | Go to Dashboard → Vehicles → Create the vehicle first |
| **No driver** (red phone) | Go to Dashboard → Persons → Create the driver first |
| **CREATED** (badge) | Review already exists - no action needed |

---

## Technical Documentation

### Architecture

The extension uses Chrome's Manifest V3 and communicates with two APIs:
- **Amazon Logistics API**: Fetches route summaries
- **Vehicle API**: Handles authentication and reviews

### Environment Configuration

Configure the environment in `config.js`:

```javascript
const ENVIRONMENT = 'production'; // Options: 'local', 'production'
```

#### Available Environments

| Environment | Description | API URL |
|-------------|-------------|---------|
| `local` | Local development | `https://localhost:7001` |
| `production` | Deployed Azure API | `https://vehicle-api20250712121147-...` |

#### Visual Environment Indicator

The extension displays an environment badge in the header:
- 🟢 **PRODUCTION** (green) - Using deployed API
- 🟡 **LOCAL** (yellow) - Using local development server

### Configuration

All API endpoints are configured in `config.js`:

```javascript
const CONFIG = {
  environment: ENVIRONMENT,
  amazonLogistics: {
    baseUrl: 'https://logistics.amazon.com',
    routeSummaries: '/operations/execution/api/route-summaries',
    serviceAreaId: 'xxx-xxx-xxx'
  },
  vehicleApi: {
    baseUrl: 'https://...',
    authenticate: '/api/Users/authenticate',
    reviews: '/api/VehicleReviews/byExtension',
    reviewsCheck: '/api/VehicleReviews/byExtension/check',
    reviewsByDate: '/api/VehicleReviews'
  }
};
```

### API Endpoints

#### 1. Authentication

**Endpoint:** `POST /api/Users/authenticate`

```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "token": "jwt-token-string",
  "username": "string"
}
```

#### 2. Get Existing Reviews

**Endpoint:** `GET /api/VehicleReviews?reviewDate={YYYY-MM-DD}`

Returns all reviews for a given date to check which routes already have reviews.

**Response:**
```json
[
  {
    "id": "string",
    "routeCode": "ABC-123",
    "status": "Pending | Sent | Completed | ..."
  }
]
```

#### 3. Pre-Check Vehicle and Driver

**Endpoint:** `POST /api/VehicleReviews/byExtension/check`

Batch validates if vehicles and drivers exist.

**Request:**
```json
{
  "vehicleVin": "string (17 chars)",
  "driverPhone": "string",
  "driverEmail": "string (optional)",
  "driverFirstName": "string (optional)",
  "driverLastName": "string (optional)"
}
```

**Response:**
```json
{
  "vehicleStatus": "FOUND | NOT_FOUND | INVALID_VIN_FORMAT",
  "vehicleId": "string (if found)",
  "vehicleInfo": "Make Model (LicensePlate)",
  "driverStatus": "FOUND | NOT_FOUND | MULTIPLE_FOUND",
  "driverId": "string (if found)",
  "driverInfo": "Full Name",
  "canCreateReview": true
}
```

#### 4. Submit Review

**Endpoint:** `POST /api/VehicleReviews/byExtension`

```json
{
  "vehicleVin": "string (17 chars)",
  "driverPhone": "string",
  "driverEmail": "string (optional)",
  "driverFirstName": "string (optional)",
  "driverLastName": "string (optional)",
  "notes": "string",
  "routeCode": "string",
  "positions": ["Roof", "Top", "Front", "Back", "Left", "Right", "Inside"],
  "sendNotification": true
}
```

### Review Submission Flow

```
┌─────────────────────────────────────────────────────────┐
│               Click "Get Journeys" Button               │
└─────────────────────────────────────────────────────────┘
                          │
           ┌──────────────┴──────────────┐
           ▼                             ▼
┌─────────────────────┐     ┌─────────────────────────────┐
│ Fetch routes from   │     │ Fetch existing reviews for  │
│ Amazon Logistics    │     │ selected date               │
└─────────────────────┘     └─────────────────────────────┘
           │                             │
           └──────────────┬──────────────┘
                          ▼
┌─────────────────────────────────────────────────────────┐
│     Check vehicle/driver existence for all routes       │
│     POST /api/VehicleReviews/byExtension/check          │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Display routes with indicators             │
└─────────────────────────────────────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
   ✅ CREATED        ⚠️ Missing       ✅ Ready
   (has review)      (no vehicle      (both exist)
                      or driver)
         │                │                │
         ▼                ▼                ▼
   No actions        Buttons          Show Send
   available         disabled         & Create
                                      buttons
```

### Permissions Required

| Permission | Purpose |
|------------|---------|
| `downloads` | Export journey data |
| `tabs` | Access current tab information |
| `storage` | Store authentication tokens locally |

**Host Permissions:**
- `https://logistics.amazon.com/*` - Access Amazon Logistics data
- `https://vehicle-api20250712121147-cwg9d7fyeugehbc5.westus-01.azurewebsites.net/*` - Access Vehicle API
- `https://localhost:*/*` - Local development

### Token Management

- JWT tokens are stored in Chrome's local storage
- Tokens are automatically validated on extension load
- Expired tokens trigger automatic logout
- Token expiration is checked before each API call

### Troubleshooting

For detailed troubleshooting guides, see the `/documentation` folder:
- `INSTALLATION.md` - Installation instructions
- `QUICK_START.md` - Quick start guide
- `TROUBLESHOOTING.md` - Common issues and solutions
- `DEBUG_GUIDE.md` - Debugging tips
- `CRASH_DIAGNOSTICS.md` - Crash diagnostics

#### Common Issues

| Issue | Solution |
|-------|----------|
| Buttons disabled | Vehicle or driver doesn't exist - create in Dashboard first |
| Red VIN displayed | Vehicle not found - add it in Dashboard → Vehicles |
| Red Phone displayed | Driver not found - add it in Dashboard → Persons |
| All routes show CREATED | Reviews already submitted for this date |
| Login fails | Check credentials and API connectivity |

---

## Version

Current version: **1.3.0**

### Changelog

#### v1.3.0 (2025-01-XX)
- **Simplified Flow**: Removed vehicle/driver creation from extension
  - Vehicles and drivers must now be created in the Dashboard before using extension
  - Extension shows visual indicators for missing entities instead of creation prompts
- **Visual Status Indicators**:
  - ⚠️ Red VIN with icon when vehicle doesn't exist in system
  - ⚠️ Red Phone with icon when driver doesn't exist in system
  - ✅ Green checkmarks when vehicle/driver are verified
- **Existing Review Detection**:
  - Automatically fetches existing reviews for selected date
  - Routes with existing reviews show ✅ **CREATED** badge
  - Action buttons removed for routes that already have reviews
- **Disabled Actions**:
  - Send/Create buttons disabled when vehicle or driver is missing
  - Clear messaging about why actions are unavailable
- Improved performance by batch-checking all routes at once
- Cleaner UI without complex creation modals

#### v1.2.0 (2025-11-29)
- Two-Mode Creation with Send directly / Create Review buttons
- Enhanced Vehicle Creation Modal with Make/Model dropdowns
- Enhanced Driver Creation Modal with form validation
- Multiple Drivers Modal for handling matches

#### v1.1.1 (2025-11-29)
- Added environment configuration support (local/production)
- Added visual environment badge indicator
- Added Help button with user guide modal

#### v1.1.0 (2025-11-29)
- Added pre-check endpoint to validate vehicle and driver
- Added automatic vehicle/driver creation
- Added smart driver matching

#### v1.0.7
- Initial release with basic review functionality
