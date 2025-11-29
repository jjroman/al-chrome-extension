# Vehicle Review Feature

## Overview
The Chrome extension now includes authentication and vehicle review submission capabilities.

## Features Added

### 1. **Authentication Section** 🔐
- Username and password input fields
- Login button to authenticate with the Vehicle API
- Authentication status indicator (✅ Authenticated / ❌ Not authenticated)
- Token is stored in Chrome storage and persists across sessions
- Pre-filled username: `jjroman`

### 2. **Review Button** 📝
- Each route row now has a "Review" button in the Actions column
- Button is disabled if:
  - User is not authenticated
  - Route has no VIN number
- Clicking the button opens a dialog to add review notes

### 3. **Review Submission Process**
When you click the Review button:
1. **Notes Dialog**: Enter review notes for the route
2. **Positions Dialog**: Enter damage positions (comma-separated)
   - Available options: Roof, Top, Front, Back, Left, Right, Inside
   - Default: "Roof, Top"
3. **Submission**: Review is sent to the Vehicle API with:
   - VIN number (as vehicleId)
   - Transporter ID (as driverId)
   - Notes
   - Route code
   - Positions array
   - sendNotification: true

## API Endpoints Used

### Authentication
```
POST https://vehicle-api20250712121147-cwg9d7fyeugehbc5.westus-01.azurewebsites.net/api/Users/authenticate
Body: { "username": "jjroman", "password": "..." }
Response: { "token": "...", "username": "..." }
```

### Submit Review
```
POST https://vehicle-api20250712121147-cwg9d7fyeugehbc5.westus-01.azurewebsites.net/api/VehicleReviews
Headers: Authorization: Bearer {token}
Body: {
  "vehicleId": "{VIN}",
  "driverId": "{transporterId}",
  "notes": "...",
  "routeCode": "...",
  "positions": ["Roof", "Top"],
  "sendNotification": true
}
```

## Important Notes

⚠️ **VIN to VehicleId Mapping**: Currently, the code uses the VIN directly as `vehicleId`. If your API requires a different ID format (like the MongoDB ObjectId shown in your example: "68c71aea9241d61bdba9765f"), you'll need to:
- Add a lookup table/function to convert VIN → vehicleId
- Or modify the API to accept VIN instead of vehicleId

⚠️ **TransporterId to DriverId Mapping**: Currently using `transporterId` directly as `driverId`. If your API requires a different format (like "68b1b84e2a2f8a83e1997dec"), you'll need to:
- Add a lookup table/function to convert transporterId → driverId
- Or modify the API to accept transporterId

## How to Use

1. **Login First**
   - Enter your password
   - Click "Login"
   - Wait for "✅ Authenticated" status

2. **Parse Routes**
   - Select date and service area
   - Click "Parse Routes & Show Journeys"
   - Wait for routes to load

3. **Submit Review**
   - Find the route you want to review
   - Click the "📝 Review" button
   - Enter notes (e.g., "Damage found on roof")
   - Enter positions (e.g., "Roof, Top")
   - Click OK to submit

4. **Check Status**
   - Success: Green status message "✅ Review submitted successfully"
   - Error: Red status message with error details

## Permissions Added
- `storage`: To persist authentication token across sessions

## UI Changes
- Added authentication section at the top
- Wider popup (1200px max width) to accommodate Actions column
- New "Actions" column with Review buttons
- Button styling (green for review buttons)
- Responsive table layout

## Security Notes
- Token is stored in Chrome's local storage
- Password field is cleared after successful login
- Token is included in Authorization header for all review requests
- HTTPS is used for all API calls
