// Global state
let authToken = null;
let currentUser = null;

// Check if JWT token is expired
function isTokenExpired(token) {
  if (!token) return true;
  
  try {
    // JWT tokens have 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    
    // Decode the payload (second part)
    const payload = JSON.parse(atob(parts[1]));
    
    // Check if exp claim exists and is expired
    if (payload.exp) {
      const expirationTime = payload.exp * 1000; // Convert to milliseconds
      const now = Date.now();
      return now >= expirationTime;
    }
    
    return false; // No expiration claim, assume valid
  } catch (error) {
    console.error('Error parsing token:', error);
    return true; // If we can't parse it, treat as expired
  }
}

// Handle expired token - clear and show login
function handleExpiredToken() {
  authToken = null;
  currentUser = null;
  chrome.storage.local.remove(['authToken', 'currentUser']);
  updateAuthStatus(false);
  showAuthStatus('Session expired. Please login again.', 'error');
}

// Show auth-specific status message
function showAuthStatus(message, type) {
  const authStatusEl = document.getElementById('authStatus');
  if (authStatusEl) {
    authStatusEl.textContent = message;
    authStatusEl.className = `auth-status ${type}`;
    authStatusEl.classList.remove('hidden');
  }
}

// Hide auth status message
function hideAuthStatus() {
  const authStatusEl = document.getElementById('authStatus');
  if (authStatusEl) {
    authStatusEl.classList.add('hidden');
  }
}

// Parse routes and display journey data
document.addEventListener('DOMContentLoaded', () => {
  const dateInput = document.getElementById('dateInput');
  const today = new Date().toISOString().split('T')[0];
  dateInput.value = today;
  dateInput.max = today;
  
  // Display environment badge
  const envBadge = document.getElementById('envBadge');
  if (envBadge && typeof CONFIG !== 'undefined') {
    envBadge.textContent = CONFIG.environment;
    envBadge.classList.add(CONFIG.environment);
    envBadge.title = `API: ${CONFIG.vehicleApi.baseUrl}`;
  }

  // Help modal handlers
  const helpModal = document.getElementById('helpModal');
  const helpBtn = document.getElementById('helpBtn');
  const closeHelpBtn = document.getElementById('closeHelpBtn');
  const closeHelpBtn2 = document.getElementById('closeHelpBtn2');

  helpBtn.addEventListener('click', () => {
    helpModal.classList.add('show');
  });

  closeHelpBtn.addEventListener('click', () => {
    helpModal.classList.remove('show');
  });

  closeHelpBtn2.addEventListener('click', () => {
    helpModal.classList.remove('show');
  });

  // Close modal when clicking outside
  helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) {
      helpModal.classList.remove('show');
    }
  });

  // Close modal with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && helpModal.classList.contains('show')) {
      helpModal.classList.remove('show');
    }
  });

  // Check for stored token
  chrome.storage.local.get(['authToken', 'currentUser'], (result) => {
    if (result.authToken) {
      // Check if token is expired
      if (isTokenExpired(result.authToken)) {
        handleExpiredToken();
      } else {
        authToken = result.authToken;
        currentUser = result.currentUser;
        updateAuthStatus(true);
      }
    }
  });
  
  // Logout handler
  document.getElementById('logoutBtn').addEventListener('click', () => {
    authToken = null;
    currentUser = null;
    chrome.storage.local.remove(['authToken', 'currentUser']);
    updateAuthStatus(false);
    hideAuthStatus();
    
    // Re-render journeys table if we have data (to hide Review buttons)
    if (window.parsedJourneys) {
      displayJourneys(window.parsedJourneys);
    }
  });
  
  // Login handler
  const loginBtn = document.getElementById('loginBtn');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  
  loginBtn.addEventListener('click', async () => {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (!username || !password) {
      showAuthStatus('Please enter username and password', 'error');
      return;
    }
    
    loginBtn.disabled = true;
    showAuthStatus('Authenticating...', 'loading');
    
    try {
      const response = await fetch(`${CONFIG.vehicleApi.baseUrl}${CONFIG.vehicleApi.authenticate}`, {
        method: 'POST',
        headers: {
          'accept': '*/*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Authentication failed (${response.status}): ${errorText || response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.token) {
        throw new Error('No token received from server');
      }
      
      authToken = data.token;
      currentUser = data.username || username;
      
      // Store token in chrome.storage
      chrome.storage.local.set({ authToken, currentUser });
      
      updateAuthStatus(true);
      hideAuthStatus();
      
      // Clear password field
      passwordInput.value = '';
      
      // Re-render journeys table if we have data (to show Review buttons)
      if (window.parsedJourneys) {
        displayJourneys(window.parsedJourneys);
      }
      
    } catch (error) {
      console.error('Authentication error:', error);
      let errorMessage = 'Auth failed: ';
      
      if (error.message.includes('Failed to fetch')) {
        errorMessage += 'Cannot connect to API server.';
      } else {
        errorMessage += error.message;
      }
      
      showAuthStatus(errorMessage, 'error');
      updateAuthStatus(false);
    } finally {
      loginBtn.disabled = false;
    }
  });
});

// Save JSON button handler
document.getElementById('saveJsonBtn').addEventListener('click', () => {
  if (!window.parsedJourneys) {
    showStatus('No journeys to save. Fetch journeys first.', 'error');
    return;
  }
  
  const date = document.getElementById('dateInput').value;
  saveJourneysAsJson(window.parsedJourneys, date);
});

document.getElementById('parseRoutesBtn').addEventListener('click', async () => {
  const date = document.getElementById('dateInput').value;
  
  if (!date) {
    showStatus('Please select a date', 'error');
    return;
  }
  
  showStatus('Fetching routes from Amazon Logistics...', 'loading');
  document.getElementById('results').classList.add('hidden');
  
  // First, fetch to get the service area ID from the current page
  // We'll use a dummy service area ID initially, then extract the real one from the response
  const routesUrl = `${CONFIG.amazonLogistics.baseUrl}${CONFIG.amazonLogistics.routeSummaries}?historicalDay=false&localDate=${date}&serviceAreaId=${CONFIG.amazonLogistics.serviceAreaId}`;
  
  try {
    // Open URL in new tab and fetch data
    const response = await fetch(routesUrl, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    let data;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // Try to parse from HTML
      const text = await response.text();
      const preMatch = text.match(/<pre[^>]*>(.*?)<\/pre>/s);
      if (preMatch) {
        data = JSON.parse(preMatch[1]);
      } else {
        data = JSON.parse(text);
      }
    }
    
    // Parse routes like C# GetJourneysFromRoutes
    const journeys = parseRoutes(data);
    displayJourneys(journeys);
    
    // Enable Save JSON button
    document.getElementById('saveJsonBtn').disabled = false;
    
    showStatus(`✓ Parsed ${journeys.valid.length} valid routes (${journeys.invalid.length} invalid)`, 'success');
    
  } catch (error) {
    // Check if it's a CORS/redirect error (Amazon session expired)
    if (error.message.includes('CORS') || 
        error.message.includes('Failed to fetch') || 
        error.message.includes('NetworkError') ||
        error.name === 'TypeError') {
      showStatus('⚠️ Amazon session expired. Please open Amazon Logistics in a new tab, log in, then try again.', 'error');
    } else {
      showStatus('Error: ' + error.message, 'error');
    }
    console.error('Error:', error);
  }
});

function parseRoutes(data) {
  const validJourneys = [];
  const invalidJourneys = [];
  
  if (!data.rmsRouteSummaries || !Array.isArray(data.rmsRouteSummaries)) {
    throw new Error('Invalid data structure: missing rmsRouteSummaries');
  }
  
  // Create a lookup map for transporter details
  const transporterMap = {};
  if (data.transporters && Array.isArray(data.transporters)) {
    data.transporters.forEach(t => {
      transporterMap[t.transporterId] = {
        firstName: t.firstName,
        lastName: t.lastName,
        initials: t.initials,
        phone: t.workPhoneNumber,
        email: t.email || t.workEmail || null
      };
    });
  }
  
  data.rmsRouteSummaries.forEach(route => {
    // Convert Unix timestamp (milliseconds) to Date
    const unixTimestampSeconds = route.plannedDepartureTime / 1000;
    const startTime = new Date(unixTimestampSeconds * 1000);
    const endTime = new Date(startTime.getTime() + (10 * 60 * 60 * 1000)); // Add 10 hours
    
    // Get VIN and transporter info from first transporter
    const vin = route.transporters && route.transporters.length > 0 ? route.transporters[0].vin : null;
    const transporterId = route.transporters && route.transporters.length > 0 ? route.transporters[0].transporterId : null;
    const transporterDetails = transporterId ? transporterMap[transporterId] : null;
    
    const journey = {
      vinNumber: vin,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      distance: 0,
      routeCode: route.routeCode,
      companyId: route.companyId,
      transporterId: transporterId,
      transporterName: transporterDetails ? `${transporterDetails.firstName} ${transporterDetails.lastName}` : null,
      transporterInitials: transporterDetails ? transporterDetails.initials : null,
      transporterPhone: transporterDetails ? transporterDetails.phone : null,
      transporterEmail: transporterDetails ? transporterDetails.email : null,
      itineraryId: route.transporters && route.transporters.length > 0 ? route.transporters[0].itineraryId : null
    };
    
    // Validate like C# code
    if (journey.transporterId && journey.itineraryId) {
      validJourneys.push(journey);
    } else {
      invalidJourneys.push(journey);
    }
  });
  
  return { valid: validJourneys, invalid: invalidJourneys };
}

function displayJourneys(journeys) {
  const resultsDiv = document.getElementById('results');
  const routesList = document.getElementById('routesList');
  
  routesList.innerHTML = '';
  
  // Only create table for valid journeys if there are any
  if (journeys.valid.length > 0) {
    const validHeader = document.createElement('h3');
    validHeader.textContent = `Routes (${journeys.valid.length})`;
    validHeader.style.color = '#667eea';
    routesList.appendChild(validHeader);
    const tableContainer = document.createElement('div');
    tableContainer.className = 'table-container';
    const table = document.createElement('table');
    table.innerHTML = `
      <thead>
        <tr>
          <th>Route</th>
          <th>Badge</th>
          <th>Driver Name</th>
          <th>Phone</th>
          <th>VIN</th>
          <th>Start Time</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="validRoutes"></tbody>
    `;
    tableContainer.appendChild(table);
    routesList.appendChild(tableContainer);
  
    const tbody = document.getElementById('validRoutes');
  
    // Display valid journeys
    journeys.valid.forEach((journey, index) => {
      const row = document.createElement('tr');
    
      // Check if route has all required fields for review
      const hasRequiredFields = journey.routeCode && journey.vinNumber && journey.transporterPhone && journey.transporterName;
      const reviewButton = hasRequiredFields && authToken 
        ? `<button class="btn-small review-btn" data-index="${index}">📝 Review</button>`
        : '';
    
      row.innerHTML = `
        <td>${journey.routeCode}</td>
        <td><strong>${journey.transporterInitials || 'N/A'}</strong></td>
        <td>${journey.transporterName || 'N/A'}</td>
        <td>${journey.transporterPhone || 'N/A'}</td>
        <td>${journey.vinNumber || 'N/A'}</td>
        <td>${formatDateTime(journey.startTime)}</td>
        <td>
          ${reviewButton}
        </td>
      `;
      tbody.appendChild(row);
    });
  
    // Add click handlers for review buttons
    document.querySelectorAll('.review-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.getAttribute('data-index'));
        showReviewDialog(journeys.valid[index]);
      });
    });
  }
  
  // Display invalid journeys if any
  if (journeys.invalid.length > 0) {
    const invalidHeader = document.createElement('h4');
    invalidHeader.textContent = `Invalid Routes (${journeys.invalid.length})`;
    invalidHeader.style.color = '#dc3545';
    routesList.appendChild(invalidHeader);
    
    const invalidTableContainer = document.createElement('div');
    invalidTableContainer.className = 'table-container';
    const invalidTable = document.createElement('table');
    invalidTable.innerHTML = `
      <thead>
        <tr>
          <th>Route Code</th>
          <th>Badge</th>
          <th>Driver Name</th>
          <th>Phone</th>
          <th>VIN</th>
          <th>Start Time</th>
          <th>Missing</th>
        </tr>
      </thead>
      <tbody id="invalidRoutes"></tbody>
    `;
    invalidTableContainer.appendChild(invalidTable);
    routesList.appendChild(invalidTableContainer);
    
    const invalidTbody = document.getElementById('invalidRoutes');
    
    journeys.invalid.forEach(journey => {
      const row = document.createElement('tr');
      row.className = 'invalid';
      const missing = [];
      if (!journey.transporterId) missing.push('Transporter ID');
      if (!journey.itineraryId) missing.push('Itinerary ID');
      
      row.innerHTML = `
        <td>${journey.routeCode}</td>
        <td>${journey.transporterInitials || 'N/A'}</td>
        <td>${journey.transporterName || 'N/A'}</td>
        <td>${journey.transporterPhone || 'N/A'}</td>
        <td>${journey.vinNumber || 'N/A'}</td>
        <td>${formatDateTime(journey.startTime)}</td>
        <td>${missing.join(', ')}</td>
      `;
      invalidTbody.appendChild(row);
    });
  }
  
  resultsDiv.classList.remove('hidden');
  
  // Store for download
  window.parsedJourneys = journeys;
}

function formatDateTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

function showReviewDialog(journey) {
  if (!authToken) {
    showStatus('Please authenticate first', 'error');
    return;
  }
  
  // Use the new check endpoint to validate vehicle and driver
  checkAndSubmitReview(journey);
}

async function checkAndSubmitReview(journey) {
  if (!authToken) {
    showStatus('Please authenticate first', 'error');
    return;
  }

  // Check if token is expired
  if (isTokenExpired(authToken)) {
    handleExpiredToken();
    return;
  }

  showStatus('Checking vehicle and driver...', 'loading');

  try {
    // First, call the check endpoint to see what exists
    const checkResult = await checkVehicleAndDriver(journey);
    
    if (!checkResult) {
      showStatus('❌ Failed to check vehicle and driver status', 'error');
      return;
    }

    console.log('Check result:', checkResult);

    // Handle vehicle not found
    if (checkResult.vehicleStatus === 'NOT_FOUND') {
      const vehicleCreated = await handleVehicleNotFound(journey);
      if (!vehicleCreated) {
        return; // User cancelled or creation failed
      }
    } else if (checkResult.vehicleStatus !== 'FOUND') {
      showStatus(`❌ Vehicle error: ${checkResult.vehicleMessage}`, 'error');
      return;
    }

    // Handle driver not found
    if (checkResult.driverStatus === 'NOT_FOUND') {
      const driverCreated = await handleDriverNotFound(journey);
      if (!driverCreated) {
        return; // User cancelled or creation failed
      }
    } else if (checkResult.driverStatus === 'MULTIPLE_FOUND') {
      // Show user the matching drivers and let them choose or confirm
      const selectedDriver = await handleMultipleDrivers(checkResult.matchingDrivers, journey);
      if (!selectedDriver) {
        return; // User cancelled
      }
      // The API will handle selecting the right driver based on name
    } else if (checkResult.driverStatus !== 'FOUND') {
      showStatus(`❌ Driver error: ${checkResult.driverMessage}`, 'error');
      return;
    }

    // Now prompt for review details and submit
    await promptAndSubmitReview(journey);

  } catch (error) {
    console.error('Check and submit error:', error);
    showStatus(`❌ Error: ${error.message}`, 'error');
  }
}

async function checkVehicleAndDriver(journey) {
  try {
    const checkData = {
      vehicleVin: journey.vinNumber,
      driverPhone: journey.transporterPhone,
      driverEmail: journey.transporterEmail,
      driverFirstName: getFirstName(journey.transporterName),
      driverLastName: getLastName(journey.transporterName)
    };

    const response = await fetch(`${CONFIG.vehicleApi.baseUrl}${CONFIG.vehicleApi.reviewsCheck}`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(checkData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Check failed:', errorText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Check error:', error);
    return null;
  }
}

function getFirstName(fullName) {
  if (!fullName) return null;
  const parts = fullName.trim().split(' ');
  return parts[0] || null;
}

function getLastName(fullName) {
  if (!fullName) return null;
  const parts = fullName.trim().split(' ');
  return parts.length > 1 ? parts.slice(1).join(' ') : null;
}

async function handleVehicleNotFound(journey) {
  const confirmCreate = confirm(
    `🚗 Vehicle not found!\n\n` +
    `VIN: ${journey.vinNumber}\n\n` +
    `Do you want to create this vehicle?\n\n` +
    `Note: You will need to provide Make, Model, Year, and Type.`
  );

  if (!confirmCreate) {
    showStatus('Review cancelled - vehicle not created', 'info');
    return false;
  }

  // Prompt for vehicle details
  const make = prompt('Enter vehicle Make (e.g., Ford, Mercedes, RAM):', 'Ford');
  if (!make) {
    showStatus('Review cancelled - Make is required', 'info');
    return false;
  }

  const model = prompt('Enter vehicle Model (e.g., Transit, Sprinter, ProMaster):', 'Transit');
  if (!model) {
    showStatus('Review cancelled - Model is required', 'info');
    return false;
  }

  const yearStr = prompt('Enter vehicle Year:', new Date().getFullYear().toString());
  const year = parseInt(yearStr);
  if (!year || year < 1990 || year > new Date().getFullYear() + 1) {
    showStatus('Review cancelled - Valid year is required', 'info');
    return false;
  }

  const type = prompt('Enter vehicle Type (e.g., Van, Truck, Car):', 'Van');
  if (!type) {
    showStatus('Review cancelled - Type is required', 'info');
    return false;
  }

  return await createVehicle(journey.vinNumber, make, model, year, type);
}

async function handleDriverNotFound(journey) {
  const firstName = getFirstName(journey.transporterName) || journey.transporterInitials || 'Unknown';
  const lastName = getLastName(journey.transporterName) || '';

  const confirmCreate = confirm(
    `👤 Driver not found!\n\n` +
    `Name: ${journey.transporterName || journey.transporterInitials || 'N/A'}\n` +
    `Phone: ${journey.transporterPhone}\n` +
    `Email: ${journey.transporterEmail || 'N/A'}\n\n` +
    `Do you want to create this driver?`
  );

  if (!confirmCreate) {
    showStatus('Review cancelled - driver not created', 'info');
    return false;
  }

  // Confirm/edit driver details
  const confirmedFirstName = prompt('Confirm First Name:', firstName);
  if (!confirmedFirstName) {
    showStatus('Review cancelled - First name is required', 'info');
    return false;
  }

  const confirmedLastName = prompt('Confirm Last Name:', lastName);
  // Last name can be empty

  const confirmedPhone = prompt('Confirm Phone:', journey.transporterPhone);
  if (!confirmedPhone || confirmedPhone.length < 10) {
    showStatus('Review cancelled - Valid phone is required', 'info');
    return false;
  }

  const confirmedEmail = prompt('Confirm Email (optional):', journey.transporterEmail || '');

  return await createDriver(confirmedFirstName, confirmedLastName, confirmedPhone, confirmedEmail);
}

async function handleMultipleDrivers(matchingDrivers, journey) {
  // Build a message showing all matching drivers
  let message = `⚠️ Multiple drivers found with this phone/email!\n\n`;
  matchingDrivers.forEach((driver, index) => {
    message += `${index + 1}. ${driver.fullName} (${driver.phone})\n`;
  });
  message += `\nThe system will try to match by name: ${journey.transporterName}\n\n`;
  message += `Continue with automatic selection?`;

  const confirmed = confirm(message);
  if (!confirmed) {
    showStatus('Review cancelled', 'info');
    return null;
  }

  return true; // Let the API handle the selection
}

async function promptAndSubmitReview(journey) {
  // Prompt for review notes
  const notes = prompt(
    `Submit review for Route ${journey.routeCode}\n\n` +
    `Driver: ${journey.transporterName || journey.transporterInitials}\n` +
    `VIN: ${journey.vinNumber || 'N/A'}\n\n` +
    `Enter review notes:`,
    'Damage inspection'
  );

  if (!notes) {
    showStatus('Review cancelled', 'info');
    return;
  }

  // Prompt for positions
  const positions = prompt(
    'Enter damage positions (comma-separated):\n' +
    'Available: Roof, Top, Front, Back, Left, Right, Inside',
    'Roof, Top'
  );

  if (!positions) {
    showStatus('Review cancelled', 'info');
    return;
  }

  await submitReview(journey, notes, positions);
}

async function createVehicle(vin, make, model, year, type) {
  if (!authToken || !vin) return false;

  // Check if token is expired
  if (isTokenExpired(authToken)) {
    handleExpiredToken();
    return false;
  }

  showStatus('Creating vehicle...', 'loading');

  try {
    const vehicleData = {
      vin: vin,
      make: make,
      model: model,
      year: year,
      type: type,
      status: 'Active',
      licensePlate: ''
    };

    const response = await fetch(
      `${CONFIG.vehicleApi.baseUrl}${CONFIG.vehicleApi.vehicles}`,
      {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(vehicleData)
      }
    );

    if (!response.ok) {
      let errorMessage = `Failed to create vehicle (${response.status})`;
      try {
        const errorData = await response.json();
        if (errorData.error === 'VEHICLE_VIN_EXISTS') {
          showStatus(`❌ Vehicle with this VIN already exists!`, 'error');
          return false;
        }
        errorMessage = errorData.message || errorMessage;
      } catch {
        const errorText = await response.text();
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    showStatus('✅ Vehicle created successfully!', 'success');
    console.log('Vehicle created:', result);
    return true;

  } catch (error) {
    console.error('Vehicle creation error:', error);
    showStatus(`❌ Failed to create vehicle: ${error.message}`, 'error');
    return false;
  }
}

async function createDriver(firstName, lastName, phone, email) {
  if (!authToken) return false;

  // Check if token is expired
  if (isTokenExpired(authToken)) {
    handleExpiredToken();
    return false;
  }

  showStatus('Creating driver...', 'loading');

  try {
    const personData = {
      firstName: firstName,
      lastName: lastName || '',
      phone: phone,
      email: email || '',
      status: 1, // Approved
      hasDot: false
    };

    const response = await fetch(
      `${CONFIG.vehicleApi.baseUrl}${CONFIG.vehicleApi.persons}`,
      {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(personData)
      }
    );

    if (!response.ok) {
      let errorMessage = `Failed to create driver (${response.status})`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || JSON.stringify(errorData);
      } catch {
        const errorText = await response.text();
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    showStatus('✅ Driver created successfully!', 'success');
    console.log('Driver created:', result);
    return true;

  } catch (error) {
    console.error('Driver creation error:', error);
    showStatus(`❌ Failed to create driver: ${error.message}`, 'error');
    return false;
  }
}

async function submitReview(journey, notes, positions) {
  if (!authToken) {
    showStatus('Authentication required', 'error');
    return;
  }

  // Check if token is expired
  if (isTokenExpired(authToken)) {
    handleExpiredToken();
    return;
  }

  showStatus('Submitting review...', 'loading');

  try {
    // Parse positions into array
    const positionsArray = positions.split(',').map(p => p.trim());

    const reviewData = {
      vehicleVin: journey.vinNumber,
      driverPhone: journey.transporterPhone,
      driverEmail: journey.transporterEmail,
      driverFirstName: getFirstName(journey.transporterName),
      driverLastName: getLastName(journey.transporterName),
      notes: notes,
      routeCode: journey.routeCode,
      positions: positionsArray,
      sendNotification: true
    };

    console.log('Submitting review:', reviewData);

    const response = await fetch(`${CONFIG.vehicleApi.baseUrl}${CONFIG.vehicleApi.reviews}`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(reviewData)
    });

    if (!response.ok) {
      let errorMessage = `Failed to submit review (${response.status})`;
      try {
        const errorData = await response.json();
        // Handle specific error codes
        if (errorData.error === 'VEHICLE_NOT_FOUND') {
          showStatus(`❌ Vehicle not found. Please create it first.`, 'error');
          return;
        }
        if (errorData.error === 'DRIVER_NOT_FOUND') {
          showStatus(`❌ Driver not found. Please create them first.`, 'error');
          return;
        }
        errorMessage = errorData.message || errorMessage;
      } catch {
        const errorText = await response.text();
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    showStatus(`✅ Review submitted successfully for route ${journey.routeCode}!`, 'success');
    console.log('Review result:', result);

  } catch (error) {
    console.error('Review submission error:', error);
    let errorMessage = '❌ Failed to submit review: ';

    if (error.message.includes('Failed to fetch')) {
      errorMessage += 'Cannot connect to API server.';
    } else {
      errorMessage += error.message;
    }

    showStatus(errorMessage, 'error');
  }
}

function updateAuthStatus(isAuthenticated) {
  const authBar = document.getElementById('authBar');
  const authSection = document.getElementById('authSection');
  const currentUsernameSpan = document.getElementById('currentUsername');
  
  if (isAuthenticated) {
    // Show auth bar, hide auth section
    authBar.classList.remove('hidden');
    authSection.classList.add('hidden');
    currentUsernameSpan.textContent = currentUser;
  } else {
    // Hide auth bar, show auth section
    authBar.classList.add('hidden');
    authSection.classList.remove('hidden');
  }
}

function showStatus(message, type) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.classList.remove('hidden');
}

function saveJourneysAsJson(journeys, date) {
  // Combine all journeys (valid and invalid) into a format ready for review submission
  const allJourneys = [...journeys.valid, ...journeys.invalid];
  
  const exportData = {
    exportDate: new Date().toISOString(),
    routeDate: date,
    totalRoutes: allJourneys.length,
    validRoutes: journeys.valid.length,
    invalidRoutes: journeys.invalid.length,
    reviews: allJourneys.map(journey => ({
      // Data for VehicleReviewRequestByPhoneVin DTO
      driverPhone: journey.transporterPhone || null,
      driverEmail: journey.transporterEmail || null,
      driverFirstName: journey.transporterName ? journey.transporterName.split(' ')[0] : null,
      driverLastName: journey.transporterName ? journey.transporterName.split(' ').slice(1).join(' ') : null,
      vin: journey.vinNumber || null,
      notes: '',
      damagePositions: [],
      // Additional metadata
      _metadata: {
        routeCode: journey.routeCode,
        transporterId: journey.transporterId,
        transporterInitials: journey.transporterInitials,
        transporterName: journey.transporterName,
        startTime: journey.startTime,
        itineraryId: journey.itineraryId,
        isValid: !!(journey.transporterId && journey.itineraryId),
        missingFields: getMissingFields(journey)
      }
    }))
  };
  
  // Create and download the JSON file
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `journeys-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showStatus(`✓ Saved ${allJourneys.length} journeys to journeys-${date}.json`, 'success');
}

function getMissingFields(journey) {
  const missing = [];
  if (!journey.vinNumber) missing.push('VIN');
  if (!journey.transporterPhone) missing.push('Phone');
  if (!journey.transporterName) missing.push('Driver Name');
  if (!journey.transporterId) missing.push('Transporter ID');
  if (!journey.itineraryId) missing.push('Itinerary ID');
  return missing;
}
