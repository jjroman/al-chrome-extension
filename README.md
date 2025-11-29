# Amazon Logistics Data Extractor

A Chrome extension to extract journey and route data from Amazon Logistics and submit vehicle reviews to the Vehicle API.

## Features

- 📊 Extract route summaries from Amazon Logistics
- 🔐 Authenticate with Vehicle API
- 🚗 Automatic vehicle creation if not exists
- 👤 Automatic driver creation if not exists
- 🔍 Smart driver matching when multiple drivers share phone/email
- 📝 Submit vehicle reviews with damage positions
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
4. Once authenticated, you'll see your username displayed and can start working

#### Step 3: Select a Date and Get Journeys

1. Select the date you want to retrieve routes for using the date picker
2. Click the **Get Journeys** button
3. The extension will fetch route data from Amazon Logistics
4. Valid and invalid routes will be displayed in separate tables

#### Step 4: Submit Reviews

1. For routes with complete information, click the **📝 Review** button
2. The extension will check if the vehicle and driver exist:
   - **Vehicle not found**: You'll be prompted to create it with Make, Model, Year, and Type
   - **Driver not found**: You'll be prompted to create them with their contact info
   - **Multiple drivers found**: The system will try to match by name, or ask for confirmation
3. Enter review notes and damage positions
4. Submit the review to the Vehicle API

---

## Technical Documentation

### Architecture

The extension uses Chrome's Manifest V3 and communicates with two APIs:
- **Amazon Logistics API**: Fetches route summaries
- **Vehicle API**: Handles authentication, vehicles, persons (drivers), and reviews

### Environment Configuration

The extension supports multiple environments (local development vs production). Configure the environment in `config.js`:

```javascript
// Change this to switch environments
const ENVIRONMENT = 'production'; // Options: 'local', 'production'
```

#### Available Environments

| Environment | Description | API URL |
|-------------|-------------|---------|
| `local` | Local development | `https://localhost:7001` |
| `production` | Deployed Azure API | `https://vehicle-api20250712121147-...` |

#### How to Switch Environments

1. Open `config.js` in a text editor
2. Change the `ENVIRONMENT` variable:
   ```javascript
   const ENVIRONMENT = 'local'; // For local development
   // OR
   const ENVIRONMENT = 'production'; // For production
   ```
3. If using local, update the port in `ENVIRONMENTS.local.vehicleApi.baseUrl` if needed
4. Reload the extension in Chrome (`chrome://extensions/` → click refresh icon)

#### Visual Environment Indicator

The extension displays an environment badge in the header:
- 🟢 **PRODUCTION** (green) - Using deployed API
- 🟡 **LOCAL** (yellow) - Using local development server

Hover over the badge to see the full API URL.

### Configuration

All API endpoints are configured in `config.js`:

```javascript
const ENVIRONMENT = 'production'; // Options: 'local', 'production'

const ENVIRONMENTS = {
  local: {
    vehicleApi: {
      baseUrl: 'https://localhost:7001', // Update to your local port
      // ... endpoints
    }
  },
  production: {
    vehicleApi: {
      baseUrl: 'https://vehicle-api20250712121147-cwg9d7fyeugehbc5.westus-01.azurewebsites.net',
      // ... endpoints
    }
  }
};

const CONFIG = {
  environment: ENVIRONMENT,
  amazonLogistics: { /* ... */ },
  vehicleApi: ENVIRONMENTS[ENVIRONMENT].vehicleApi
};
```

#### Configuration Options

| Property | Description |
|----------|-------------|
| `amazonLogistics.baseUrl` | Amazon Logistics base URL |
| `amazonLogistics.routeSummaries` | Route summaries endpoint path |
| `amazonLogistics.serviceAreaId` | Service area ID for route queries |
| `vehicleApi.baseUrl` | Vehicle API base URL |
| `vehicleApi.authenticate` | Authentication endpoint |
| `vehicleApi.vehicles` | Vehicles CRUD endpoint |
| `vehicleApi.vehicleByVin` | Get vehicle by VIN endpoint |
| `vehicleApi.persons` | Persons (drivers) CRUD endpoint |
| `vehicleApi.reviews` | Vehicle reviews submission endpoint |
| `vehicleApi.reviewsCheck` | Pre-check endpoint for vehicle/driver validation |

### API Endpoints

#### 1. Authentication

**Endpoint:** `POST /api/Users/authenticate`

Authenticates users and returns a JWT token.

**Request:**
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

#### 2. Get Route Summaries (Amazon Logistics)

**Endpoint:** `GET /operations/execution/api/route-summaries`

**Query Parameters:**
- `historicalDay`: boolean (false)
- `localDate`: string (YYYY-MM-DD format)
- `serviceAreaId`: string (UUID)

**Response:** Contains `rmsRouteSummaries` array and `transporters` array with route/driver information.

#### 3. Pre-Check Vehicle and Driver

**Endpoint:** `POST /api/VehicleReviews/byExtension/check`

Validates if vehicle and driver exist before creating a review. Returns detailed status for each.

**Headers:**
- `Authorization: Bearer {token}`
- `Content-Type: application/json`

**Request:**
```json
{
  "vehicleVin": "string (17 chars)",
  "driverPhone": "string",
  "driverEmail": "string (optional)",
  "driverFirstName": "string (optional, for matching)",
  "driverLastName": "string (optional, for matching)"
}
```

**Response:**
```json
{
  "vehicleStatus": "FOUND | NOT_FOUND | INVALID_VIN_FORMAT | MISSING_VIN",
  "vehicleId": "string (if found)",
  "vehicleInfo": "Make Model (LicensePlate)",
  "vehicleMessage": "string",
  "driverStatus": "FOUND | NOT_FOUND | MULTIPLE_FOUND | INVALID_PHONE_FORMAT | MISSING_PHONE",
  "driverId": "string (if found)",
  "driverInfo": "Full Name",
  "driverMessage": "string",
  "matchingDrivers": [{ "id": "", "fullName": "", "phone": "", "email": "" }],
  "canCreateReview": true
}
```

#### 4. Create Vehicle

**Endpoint:** `POST /api/Vehicles`

**Headers:**
- `Authorization: Bearer {token}`
- `Content-Type: application/json`

**Request:**
```json
{
  "vin": "string (17 chars)",
  "make": "string (required)",
  "model": "string (required)",
  "year": 2024,
  "type": "string (required)",
  "status": "Active",
  "licensePlate": "string (optional)"
}
```

**Error Response (409 Conflict - Duplicate VIN):**
```json
{
  "error": "VEHICLE_VIN_EXISTS",
  "message": "A vehicle with VIN 'XXX' already exists in your company.",
  "vehicleId": "existing-vehicle-id"
}
```

#### 5. Create Person (Driver)

**Endpoint:** `POST /api/Persons`

**Headers:**
- `Authorization: Bearer {token}`
- `Content-Type: application/json`

**Request:**
```json
{
  "firstName": "string (required)",
  "lastName": "string",
  "phone": "string (required)",
  "email": "string",
  "status": 1,
  "hasDot": false
}
```

#### 6. Submit Review

**Endpoint:** `POST /api/VehicleReviews/byExtension`

**Headers:**
- `Authorization: Bearer {token}`
- `Content-Type: application/json`

**Request:**
```json
{
  "vehicleVin": "string (17 chars)",
  "driverPhone": "string",
  "driverEmail": "string (optional)",
  "driverFirstName": "string (optional, for matching)",
  "driverLastName": "string (optional, for matching)",
  "notes": "string",
  "routeCode": "string",
  "positions": ["Roof", "Top", "Front", "Back", "Left", "Right", "Inside"],
  "sendNotification": true
}
```

**Error Responses:**
```json
{ "error": "VEHICLE_NOT_FOUND", "message": "Vehicle not found in your company", "vin": "..." }
{ "error": "DRIVER_NOT_FOUND", "message": "Driver not found in your company", "phone": "...", "firstName": "...", "lastName": "..." }
{ "error": "INVALID_VIN_FORMAT", "message": "Invalid VIN format. VIN must be 17 characters long." }
{ "error": "INVALID_PHONE_FORMAT", "message": "Invalid phone number format." }
```

### Review Submission Flow

```
┌─────────────────────────────────────────────────────────┐
│                  Click "Review" Button                  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│         POST /api/VehicleReviews/byExtension/check      │
│         (Validate vehicle & driver existence)           │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   Vehicle Status?     │
              └───────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
         ▼                ▼                ▼
      FOUND          NOT_FOUND       INVALID_VIN
         │                │                │
         │                ▼                ▼
         │         ┌────────────┐    Show error
         │         │ Create     │    & abort
         │         │ Vehicle?   │
         │         └────────────┘
         │                │
         │         ┌──────┴──────┐
         │         ▼             ▼
         │       Yes            No
         │         │             │
         │         ▼             ▼
         │    Prompt for      Abort
         │    Make, Model,
         │    Year, Type
         │         │
         │         ▼
         │    POST /api/Vehicles
         │         │
         │    ┌────┴────┐
         │    ▼         ▼
         │  Success   Error (409 = VIN exists)
         │    │         │
         │    │         ▼
         │    │      Show error & abort
         │    │
         └────┴────────────────────────────┐
                                           │
                                           ▼
                             ┌───────────────────────┐
                             │    Driver Status?     │
                             └───────────────────────┘
                                           │
              ┌────────────────┬───────────┴───────────┬────────────────┐
              │                │                       │                │
              ▼                ▼                       ▼                ▼
           FOUND          NOT_FOUND            MULTIPLE_FOUND     INVALID_PHONE
              │                │                       │                │
              │                ▼                       ▼                ▼
              │         ┌────────────┐         ┌────────────┐      Show error
              │         │  Create    │         │  Show list │      & abort
              │         │  Driver?   │         │  of matches│
              │         └────────────┘         └────────────┘
              │                │                       │
              │         ┌──────┴──────┐               │
              │         ▼             ▼               │
              │       Yes            No               │
              │         │             │               ▼
              │         ▼             ▼         Confirm auto-
              │    Confirm/Edit    Abort        selection by
              │    Name, Phone,                 firstName +
              │    Email                        lastName?
              │         │                             │
              │         ▼                      ┌──────┴──────┐
              │    POST /api/Persons           ▼             ▼
              │         │                    Yes            No
              │    ┌────┴────┐                │             │
              │    ▼         ▼                │             ▼
              │  Success   Error              │           Abort
              │    │         │                │
              │    │         ▼                │
              │    │      Show error          │
              │    │      & abort             │
              │    │                          │
              └────┴──────────────────────────┘
                             │
                             ▼
              ┌─────────────────────────────────────────┐
              │        Prompt for Review Details        │
              │        - Notes (default: "Damage        │
              │          inspection")                   │
              │        - Positions (Roof, Top, Front,   │
              │          Back, Left, Right, Inside)     │
              └─────────────────────────────────────────┘
                             │
                      ┌──────┴──────┐
                      ▼             ▼
                   Filled        Cancelled
                      │             │
                      │             ▼
                      │           Abort
                      ▼
              ┌─────────────────────────────────────────┐
              │    POST /api/VehicleReviews/byExtension │
              │    - vehicleVin                         │
              │    - driverPhone, driverEmail           │
              │    - driverFirstName, driverLastName    │
              │    - notes, routeCode, positions        │
              │    - sendNotification: true             │
              └─────────────────────────────────────────┘
                             │
                      ┌──────┴──────┐
                      ▼             ▼
                   Success        Error
                      │             │
                      ▼             ▼
              ✅ "Review         Show error
              submitted          message
              successfully!"
```

### Error Handling Summary

| Error Code | When | User Action |
|------------|------|-------------|
| `INVALID_VIN_FORMAT` | VIN not 17 characters | Check VIN in Amazon data |
| `INVALID_PHONE_FORMAT` | Phone < 10 characters | Check phone in Amazon data |
| `VEHICLE_NOT_FOUND` | Vehicle doesn't exist | Create vehicle with Make/Model/Year/Type |
| `DRIVER_NOT_FOUND` | Driver doesn't exist | Create driver with name/phone/email |
| `VEHICLE_VIN_EXISTS` | VIN already in company | Vehicle already exists, proceed |
| `MULTIPLE_FOUND` | Multiple drivers match | Auto-select by name or confirm |

### Permissions Required

The extension requires the following Chrome permissions (defined in `manifest.json`):

| Permission | Purpose |
|------------|---------|
| `downloads` | Export journey data |
| `tabs` | Access current tab information |
| `storage` | Store authentication tokens locally |

**Host Permissions:**
- `https://logistics.amazon.com/*` - Access Amazon Logistics data
- `https://vehicle-api20250712121147-cwg9d7fyeugehbc5.westus-01.azurewebsites.net/*` - Access Vehicle API

### Token Management

- JWT tokens are stored in Chrome's local storage
- Tokens are automatically validated on extension load
- Expired tokens trigger automatic logout with a prompt to re-authenticate
- Token expiration is checked before each API call

### Troubleshooting


For detailed troubleshooting guides, see the `/documentation` folder:
- `INSTALLATION.md` - Installation instructions
- `QUICK_START.md` - Quick start guide
- `TROUBLESHOOTING.md` - Common issues and solutions
- `DEBUG_GUIDE.md` - Debugging tips
- `CRASH_DIAGNOSTICS.md` - Crash diagnostics

---

## Version

Current version: **1.1.1**

### Changelog

#### v1.1.1 (2024-11-29)
- Added environment configuration support (local/production)
- Added visual environment badge indicator in header
- Added localhost permissions for local development
- Added Help button with comprehensive user guide modal
- Updated manifest to support localhost connections

#### v1.1.0 (2024-11-29)
- Added pre-check endpoint to validate vehicle and driver before review
- Added automatic vehicle creation with Make, Model, Year, Type prompts
- Added automatic driver creation from Amazon Logistics data
- Added smart driver matching when multiple drivers share phone/email
- Added structured error responses with error codes
- Improved error handling and user feedback
- Updated API endpoints to use new request/response formats

#### v1.0.7
- Initial release with basic review functionality
