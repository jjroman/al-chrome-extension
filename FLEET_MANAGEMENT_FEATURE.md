# Fleet Management Feature - Implementation Summary

## Overview
Added fleet vehicle synchronization capability to the Chrome extension, allowing users to fetch vehicles from Amazon Fleet Management API and automatically add missing vehicles to the Vehicle API system.

## Changes Made

### 1. Configuration (`config.js`)
**Added:**
- Fleet Management API endpoint: `/fleet-management/api/vehicles?vehicleStatuses=ACTIVE,MAINTENANCE,PENDING`

```javascript
amazonLogistics: {
  baseUrl: 'https://logistics.amazon.com',
  routeSummaries: '/operations/execution/api/route-summaries',
  fleetVehicles: '/fleet-management/api/vehicles?vehicleStatuses=ACTIVE,MAINTENANCE,PENDING',
  serviceAreaId: 'ffbac4b5-8850-48e8-86bd-4403685d46d7'
}
```

### 2. User Interface (`popup-minimal.html`)
**Added:**
- New "Fleet Management" card with two buttons:
  - **Fetch Fleet Vehicles**: Retrieves all vehicles from Amazon Fleet Management
  - **Sync Missing Vehicles**: Adds missing vehicles to Vehicle API (disabled until fetch completes)
- Fleet-specific status message area
- Warning status style (yellow/orange) for partial success scenarios

### 3. Core Logic (`popup-minimal.js`)
**Added Functions:**

#### `fetchFleetVehicles()`
- Fetches all vehicles from Amazon Fleet Management API
- Validates response data structure
- Calls `checkFleetVehiclesInSystem()` to compare with existing vehicles

#### `checkFleetVehiclesInSystem()`
- Checks each VIN against Vehicle API using `/api/Vehicles/search/vin/{vin}`
- Uses HTTP 404 status to identify missing vehicles
- Updates UI with sync status and enables/disables sync button accordingly

#### `syncMissingVehicles()`
- Iterates through missing vehicles and adds them via POST to `/api/Vehicles`
- Maps Amazon Fleet data to Vehicle API format:
  - `vin`, `make`, `model`, `year` from fleet data
  - `licensePlate` from `registrationNo`
  - `companyId` defaults to 1 (configurable)
  - `notes` includes fleet status and DSP ID
- Provides detailed success/failure reporting
- Implements rate limiting (100ms delay between requests)

#### `showFleetStatus()`
- Displays status messages in the fleet-specific status area
- Auto-hides success/error messages after 5 seconds

**Event Listeners:**
- Added listeners for `fetchFleetBtn` and `syncFleetBtn`

### 4. Version Update (`manifest.json`)
- Updated version from `1.3.0` to `1.4.0`
- Updated description to include "fleet vehicle synchronization"

### 5. Documentation (`README.md`)
**Added:**
- New section "Step 3: (Optional) Sync Fleet Vehicles"
- Detailed instructions on using the fleet management feature
- Benefits explanation

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Clicks "Fetch Fleet Vehicles"           │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  GET https://logistics.amazon.com/fleet-management/api/vehicles │
│  ?vehicleStatuses=ACTIVE,MAINTENANCE,PENDING                    │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  Parse Response: data.data.vehicles[] (VIN, Make, Model, Year) │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  For each VIN:                                                  │
│  GET /api/Vehicles/search/vin/{vin}                             │
│  - 200 OK → Vehicle exists                                      │
│  - 404 Not Found → Vehicle missing                              │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  Display: "X vehicles found, Y missing"                         │
│  Enable "Sync Missing Vehicles" button                          │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│           User Clicks "Sync Missing Vehicles"                   │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  For each missing vehicle:                                      │
│  POST /api/Vehicles                                             │
│  Body: {vin, make, model, year, licensePlate, companyId, notes}│
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  Display: "Successfully added X vehicles"                       │
└─────────────────────────────────────────────────────────────────┘
```

## API Endpoints Used

### Amazon Fleet Management (Read-only)
- **Endpoint**: `GET /fleet-management/api/vehicles`
- **Query Params**: `vehicleStatuses=ACTIVE,MAINTENANCE,PENDING`
- **Authentication**: Session-based (Amazon Logistics login)
- **Response Structure**:
  ```json
  {
    "data": {
      "vehicles": [
        {
          "vin": "string",
          "year": number,
          "make": "string",
          "model": "string",
          "registrationNo": "string",
          "status": "string",
          "dspVehicleId": "string"
        }
      ]
    }
  }
  ```

### Vehicle API (Read & Write)
1. **Check Vehicle Exists**
   - **Endpoint**: `GET /api/Vehicles/search/vin/{vin}`
   - **Authentication**: Bearer token
   - **Response**: 200 (exists) or 404 (doesn't exist)

2. **Create Vehicle**
   - **Endpoint**: `POST /api/Vehicles`
   - **Authentication**: Bearer token
   - **Body**:
     ```json
     {
       "vin": "string",
       "make": "string",
       "model": "string",
       "year": number,
       "licensePlate": "string",
       "color": null,
       "companyId": 1,
       "notes": "string"
     }
     ```

## Configuration Options

### Adjustable Parameters
- **Company ID**: Currently defaults to `1` in `syncMissingVehicles()` function
- **Rate Limiting**: 100ms delay between vehicle creation requests
- **Status Auto-hide**: 5 seconds for success/error messages

### To Change Company ID
In `popup-minimal.js`, line ~900, modify:
```javascript
companyId: 1, // Change this value as needed
```

## Error Handling

### Amazon Session Expired
- **Detection**: HTTP 401/403 from Amazon APIs
- **User Message**: "Amazon session expired. Please login to logistics.amazon.com first."
- **Action**: User must refresh Amazon Logistics page and retry

### Vehicle API Authentication
- **Detection**: Token expiration check before each operation
- **Action**: Automatically triggers `handleExpiredToken()`, prompts re-login

### Partial Sync Failures
- **Behavior**: Continues syncing remaining vehicles even if some fail
- **Reporting**: Shows count of successes and failures
- **Logging**: Failed vehicles logged to console with error details

## Testing Checklist

- [ ] Fetch fleet vehicles (verify API call and response parsing)
- [ ] Check vehicles against system (verify VIN lookups)
- [ ] Sync missing vehicles (verify POST requests and data mapping)
- [ ] Handle all existing vehicles scenario (button should be disabled)
- [ ] Handle partial sync failures (verify error reporting)
- [ ] Test with expired Amazon session (verify error message)
- [ ] Test with expired Vehicle API token (verify re-login prompt)
- [ ] Verify vehicles appear correctly in Vehicle API after sync

## Future Enhancements

1. **Batch Vehicle Creation**: Send multiple vehicles in one API call if endpoint supports it
2. **Company Selection**: Add dropdown to select company before syncing
3. **Filter Options**: Allow filtering by vehicle type, status, or date range
4. **Sync History**: Track and display sync history/timestamps
5. **Diff View**: Show detailed comparison of fleet vs. system vehicles
6. **Update Existing**: Option to update vehicle details if they've changed in fleet
7. **Selective Sync**: Allow user to select which vehicles to sync via checkboxes

## Notes

- Fleet data refresh frequency depends on Amazon's API
- Vehicle creation is rate-limited to avoid overwhelming the API
- All operations require both Amazon Logistics and Vehicle API authentication
- Fleet API uses session-based authentication (cookies), Vehicle API uses JWT tokens
