// Amazon Logistics Data Extractor - Chrome Extension
// Version 1.3.0

let authToken = null;
let currentUser = null;

// Check if JWT token is expired
function isTokenExpired(token) {
  if (!token) return true;
  
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp) {
      return Date.now() >= payload.exp * 1000;
    }
    return false;
  } catch (error) {
    console.error('Error parsing token:', error);
    return true;
  }
}

// Handle expired token
function handleExpiredToken() {
  authToken = null;
  currentUser = null;
  chrome.storage.local.remove(['authToken', 'currentUser']);
  updateAuthStatus(false);
  showStatus('Session expired. Please login again.', 'error');
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  // Set default date to today
  const dateInput = document.getElementById('dateInput');
  const today = new Date().toISOString().split('T')[0];
  dateInput.value = today;
  dateInput.max = today;
  
  // Display environment badge
  displayEnvironmentBadge();
  
  // Setup event listeners
  setupEventListeners();
  
  // Restore auth token from storage
  chrome.storage.local.get(['authToken', 'currentUser'], (result) => {
    if (result.authToken) {
      if (isTokenExpired(result.authToken)) {
        handleExpiredToken();
      } else {
        authToken = result.authToken;
        currentUser = result.currentUser;
        updateAuthStatus(true);
      }
    }
  });
});

function displayEnvironmentBadge() {
  const badge = document.getElementById('envBadge');
  if (badge && typeof CONFIG !== 'undefined') {
    badge.textContent = CONFIG.environment.toUpperCase();
    if (CONFIG.environment === 'local') {
      badge.style.background = '#ffc107';
      badge.style.color = '#333';
    } else {
      badge.style.background = '#28a745';
      badge.style.color = 'white';
    }
    badge.title = `API: ${CONFIG.vehicleApi.baseUrl}`;
  }
}

function setupEventListeners() {
  // Tab switching
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.getAttribute('data-tab');
      switchTab(tabName);
    });
  });

  // Login/Logout
  document.getElementById('loginBtn').addEventListener('click', authenticate);
  document.getElementById('logoutBtn').addEventListener('click', logout);
  
  // Main actions
  document.getElementById('parseRoutesBtn').addEventListener('click', fetchAndDisplayRoutes);
  document.getElementById('saveJsonBtn').addEventListener('click', () => {
    if (window.parsedJourneys) {
      const date = document.getElementById('dateInput').value;
      saveJourneysAsJson(window.parsedJourneys, date);
    }
  });
  
  // Fleet management actions
  document.getElementById('fetchFleetBtn').addEventListener('click', fetchFleetVehicles);
  document.getElementById('syncFleetBtn').addEventListener('click', syncMissingVehicles);
  
  // Help modal
  document.getElementById('helpBtn').addEventListener('click', () => {
    document.getElementById('helpModal').classList.add('show');
  });
  document.getElementById('closeHelpBtn').addEventListener('click', () => {
    document.getElementById('helpModal').classList.remove('show');
  });
  document.getElementById('closeHelpBtn2').addEventListener('click', () => {
    document.getElementById('helpModal').classList.remove('show');
  });
  
  // Refresh button
  document.getElementById('refreshBtn').addEventListener('click', () => {
    location.reload();
  });
  
  // Review modal
  document.getElementById('closeReviewBtn').addEventListener('click', () => {
    document.getElementById('reviewModal').classList.remove('show');
  });
  
  // Close modals on outside click
  document.getElementById('helpModal').addEventListener('click', (e) => {
    if (e.target.id === 'helpModal') {
      e.target.classList.remove('show');
    }
  });
  document.getElementById('reviewModal').addEventListener('click', (e) => {
    if (e.target.id === 'reviewModal') {
      e.target.classList.remove('show');
    }
  });
  
  // Close modals on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.getElementById('helpModal').classList.remove('show');
      document.getElementById('reviewModal').classList.remove('show');
    }
  });
  
  // Login on Enter in password field
  document.getElementById('password').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') authenticate();
  });
}

// Tab switching
function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab-button').forEach(btn => {
    if (btn.getAttribute('data-tab') === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    if (content.id === `${tabName}Tab`) {
      content.classList.add('active');
    } else {
      content.classList.remove('active');
    }
  });

  // Hide/show results section based on active tab
  const resultsSection = document.getElementById('results');
  const fleetResultsSection = document.getElementById('fleetResults');
  
  if (tabName === 'fleet') {
    // Hide routes results when on fleet tab
    resultsSection.classList.add('hidden');
    // Show fleet results if data exists
    if (fleetVehicles.length > 0) {
      fleetResultsSection.classList.remove('hidden');
    }
  } else if (tabName === 'routes') {
    // Hide fleet results when on routes tab
    fleetResultsSection.classList.add('hidden');
    // Show routes results if data exists
    if (window.parsedJourneys) {
      resultsSection.classList.remove('hidden');
    }
  }

  // Clear status message when switching tabs
  document.getElementById('status').classList.add('hidden');
}

// Authentication
async function authenticate() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  
  if (!username || !password) {
    showStatus('Please enter username and password', 'error');
    return;
  }
  
  const loginBtn = document.getElementById('loginBtn');
  loginBtn.disabled = true;
  showStatus('Authenticating...', 'loading');
  
  try {
    const response = await fetch(`${CONFIG.vehicleApi.baseUrl}${CONFIG.vehicleApi.authenticate}`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    if (!response.ok) {
      throw new Error('Authentication failed');
    }
    
    const data = await response.json();
    authToken = data.token;
    currentUser = data.username || username;
    
    chrome.storage.local.set({ authToken, currentUser });
    updateAuthStatus(true);
    document.getElementById('password').value = '';
    showStatus(`✅ Logged in as ${currentUser}`, 'success');
    
    // Refresh display if we have data
    if (window.parsedJourneys) {
      fetchAndDisplayRoutes();
    }
    
  } catch (error) {
    console.error('Authentication error:', error);
    showStatus('❌ Authentication failed. Check your credentials.', 'error');
  } finally {
    loginBtn.disabled = false;
  }
}

function logout() {
  authToken = null;
  currentUser = null;
  chrome.storage.local.remove(['authToken', 'currentUser']);
  updateAuthStatus(false);
  showStatus('Logged out successfully', 'info');
  
  // Refresh display if we have data
  if (window.parsedJourneys) {
    displayJourneys(window.parsedJourneys, [], {});
  }
}

function updateAuthStatus(isAuthenticated) {
  const authBar = document.getElementById('authBar');
  const authSection = document.getElementById('authSection');
  const currentUsernameSpan = document.getElementById('currentUsername');
  
  if (isAuthenticated) {
    authBar.classList.remove('hidden');
    authSection.classList.add('hidden');
    currentUsernameSpan.textContent = currentUser;
  } else {
    authBar.classList.add('hidden');
    authSection.classList.remove('hidden');
  }
}

// Fetch routes from Amazon and display
async function fetchAndDisplayRoutes() {
  const date = document.getElementById('dateInput').value;
  
  if (!date) {
    showStatus('Please select a date', 'error');
    return;
  }
  
  showStatus('Fetching routes from Amazon Logistics...', 'loading');
  document.getElementById('results').classList.add('hidden');
  
  try {
    const routesUrl = `${CONFIG.amazonLogistics.baseUrl}${CONFIG.amazonLogistics.routeSummaries}?historicalDay=false&localDate=${date}&serviceAreaId=${CONFIG.amazonLogistics.serviceAreaId}`;
    
    const response = await fetch(routesUrl, { credentials: 'include' });
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Amazon session expired. Please login to logistics.amazon.com first.');
      }
      if (response.status === 502 || response.status === 503 || response.status === 504) {
        throw new Error('Amazon session expired or service unavailable. Please refresh logistics.amazon.com and try again.');
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    let data;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      const preMatch = text.match(/<pre[^>]*>(.*?)<\/pre>/s);
      data = preMatch ? JSON.parse(preMatch[1]) : JSON.parse(text);
    }
    
    // Parse routes
    const journeys = parseRoutes(data);
    window.parsedJourneys = journeys;
    
    // Batch check: existing reviews + vehicle/driver status in one API call
    let routeChecks = {};
    
    if (authToken && !isTokenExpired(authToken)) {
      showStatus('Checking routes...', 'loading');
      routeChecks = await batchCheckRoutes(journeys, date);
    }
    
    // Display journeys
    displayJourneys(journeys, routeChecks);
    document.getElementById('saveJsonBtn').disabled = false;
    
    const total = journeys.valid.length + journeys.invalid.length;
    showStatus(`✅ Found ${total} routes`, 'success');
    
  } catch (error) {
    console.error('Error fetching routes:', error);
    if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
      showStatus('⚠️ Amazon session expired. Please login to logistics.amazon.com first.', 'error');
    } else {
      showStatus(`❌ ${error.message}`, 'error');
    }
  }
}

// Batch check: validate all routes in a single API call
// Returns vehicle status, driver status, existing review info, and recommended action
async function batchCheckRoutes(journeys, date) {
  if (!authToken) return {};
  
  const allJourneys = [...journeys.valid, ...journeys.invalid];
  
  const request = {
    reviewDate: date,
    routes: allJourneys.map(j => ({
      routeCode: j.routeCode,
      vehicleVin: j.vinNumber || null,
      driverPhone: j.transporterPhone || null,
      driverFirstName: getFirstName(j.transporterName),
      driverLastName: getLastName(j.transporterName)
    }))
  };

  try {
    const response = await fetch(
      `${CONFIG.vehicleApi.baseUrl}/api/VehicleReviews/byExtension/batch-check`,
      {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      }
    );

    if (!response.ok) {
      console.error('Batch check failed:', response.status);
      return {};
    }
    
    const result = await response.json();
    console.log('Batch check response:', result);
    
    // Convert to lookup by routeCode
    const checksByRoute = {};
    result.results.forEach(r => {
      checksByRoute[r.routeCode] = r;
    });
    
    return checksByRoute;
  } catch (error) {
    console.error('Batch check error:', error);
    return {};
  }
}

// Parse routes from Amazon data
function parseRoutes(data) {
  const validJourneys = [];
  const invalidJourneys = [];
  
  if (!data.rmsRouteSummaries || !Array.isArray(data.rmsRouteSummaries)) {
    throw new Error('Invalid data structure: missing rmsRouteSummaries');
  }
  
  // Create transporter lookup map
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
    const startTime = new Date(route.plannedDepartureTime);
    const endTime = new Date(startTime.getTime() + (10 * 60 * 60 * 1000));
    
    const vin = route.transporters?.[0]?.vin || null;
    const transporterId = route.transporters?.[0]?.transporterId || null;
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
      transporterInitials: transporterDetails?.initials || null,
      transporterPhone: transporterDetails?.phone || null,
      transporterEmail: transporterDetails?.email || null,
      itineraryId: route.transporters?.[0]?.itineraryId || null
    };
    
    if (journey.transporterId && journey.itineraryId) {
      validJourneys.push(journey);
    } else {
      invalidJourneys.push(journey);
    }
  });
  
  return { valid: validJourneys, invalid: invalidJourneys };
}

// Display journeys in table
// routeChecks contains batch check results with: vehicleStatus, driverStatus, reviewExists, action
function displayJourneys(journeys, routeChecks = {}) {
  const resultsDiv = document.getElementById('results');
  const routesList = document.getElementById('routesList');
  
  routesList.innerHTML = '';
  
  const allJourneys = [...journeys.valid, ...journeys.invalid];
  
  if (allJourneys.length > 0) {
    // Update the routes count in the header
    const routesCountSpan = document.getElementById('routesCount');
    if (routesCountSpan) {
      routesCountSpan.textContent = `(${allJourneys.length})`;
    }
    
    const tableContainer = document.createElement('div');
    tableContainer.className = 'table-container';
    const table = document.createElement('table');
    table.innerHTML = `
      <thead>
        <tr>
          <th>Route</th>
          <th>Driver Name</th>
          <th>Phone</th>
          <th>VIN</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="allRoutes"></tbody>
    `;
    tableContainer.appendChild(table);
    routesList.appendChild(tableContainer);
  
    const tbody = document.getElementById('allRoutes');
    
    // Store routeChecks globally for row updates
    window.routeChecks = routeChecks;
  
    allJourneys.forEach((journey, index) => {
      const row = document.createElement('tr');
      row.setAttribute('data-route', journey.routeCode);
      const check = routeChecks[journey.routeCode] || null;
      
      // Check data availability
      const hasVin = !!journey.vinNumber;
      const hasPhone = !!journey.transporterPhone;
      
      // Get status from batch check response
      const vehicleStatus = check?.vehicleStatus;
      const driverStatus = check?.driverStatus;
      const action = check?.action || 'CREATE_ONLY';
      const reviewExists = check?.reviewExists || false;
      const reviewStatus = check?.reviewStatus;
      
      // Build VIN cell based on vehicleStatus
      let vinCell = '';
      if (!hasVin) {
        vinCell = '<span class="text-muted">N/A</span>';
      } else if (vehicleStatus === 'NOT_FOUND') {
        vinCell = `<span class="cell-error" title="Vehicle not found in system">⚠️ ${journey.vinNumber}</span>`;
      } else if (vehicleStatus === 'INVALID_VIN_FORMAT') {
        vinCell = `<span class="cell-error" title="Invalid VIN format">⚠️ ${journey.vinNumber}</span>`;
      } else if (vehicleStatus === 'FOUND') {
        vinCell = `<span class="cell-ok">${journey.vinNumber}</span>`;
      } else {
        vinCell = journey.vinNumber;
      }
      
      // Build phone cell based on driverStatus
      let phoneCell = '';
      if (!hasPhone) {
        phoneCell = '<span class="text-muted">N/A</span>';
      } else if (driverStatus === 'NOT_FOUND') {
        phoneCell = `<span class="cell-error" title="Driver not found in system">⚠️ ${journey.transporterPhone}</span>`;
      } else if (driverStatus === 'INVALID_PHONE_FORMAT') {
        phoneCell = `<span class="cell-error" title="Invalid phone format">⚠️ ${journey.transporterPhone}</span>`;
      } else if (driverStatus === 'FOUND' || driverStatus === 'MULTIPLE_FOUND') {
        phoneCell = `<span class="cell-ok">${journey.transporterPhone}</span>`;
      } else {
        phoneCell = journey.transporterPhone;
      }
      
      // Build status and actions based on action from API
      let statusCell = '';
      let actionButtons = '';
      
      if (action === 'ALREADY_EXISTS') {
        // Review already exists for this route+date - no actions available
        const status = reviewStatus || 'CREATED';
        statusCell = `<span class="status-badge ${status.toLowerCase()}">${status}</span>`;
        actionButtons = '<span class="text-muted">—</span>';
      } else if (authToken) {
        statusCell = '<span class="text-muted">—</span>';
        
        if (action === 'CAN_SEND') {
          // Both vehicle and driver found - show Send directly and Create buttons
          actionButtons = `
            <button class="btn btn-success btn-small" data-index="${index}" data-action="send" title="Create and send notification immediately"><i class="fa-solid fa-paper-plane"></i> Send</button>
            <button class="btn btn-primary btn-small" data-index="${index}" data-action="create" title="Create as pending (no notification)"><i class="fa-solid fa-plus"></i> Create</button>
          `;
        } else {
          // CREATE_ONLY: Vehicle or driver not found - show only Create button
          actionButtons = `
            <button class="btn btn-primary btn-small" data-index="${index}" data-action="create" title="Create as pending (send later from Dashboard)"><i class="fa-solid fa-plus"></i> Create</button>
          `;
        }
      } else {
        statusCell = '<span class="text-muted">—</span>';
        actionButtons = '<span class="text-muted">Login required</span>';
      }
      
      row.innerHTML = `
        <td>${journey.routeCode || 'N/A'}</td>
        <td>${journey.transporterName || 'N/A'}</td>
        <td>${phoneCell}</td>
        <td>${vinCell}</td>
        <td style="text-align: center;">${statusCell}</td>
        <td class="actions-cell">${actionButtons}</td>
      `;
      tbody.appendChild(row);
    });
  
    // Store journeys for button handlers
    window.allJourneysFlat = allJourneys;
    
    // Add click handlers for action buttons
    document.querySelectorAll('.btn[data-action="send"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        const index = parseInt(button.getAttribute('data-index'));
        showReviewDialog(window.allJourneysFlat[index], true);
      });
    });
    
    document.querySelectorAll('.btn[data-action="create"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        const index = parseInt(button.getAttribute('data-index'));
        showReviewDialog(window.allJourneysFlat[index], false);
      });
    });
  }
  
  resultsDiv.classList.remove('hidden');
}

// Show review confirmation dialog
function showReviewDialog(journey, sendNotification) {
  if (!authToken) {
    showStatus('Please authenticate first', 'error');
    return;
  }

  if (isTokenExpired(authToken)) {
    handleExpiredToken();
    return;
  }

  const modal = document.getElementById('reviewModal');
  const modalTitle = document.getElementById('reviewModalTitle');
  const modalBody = document.getElementById('reviewModalBody');
  const confirmBtn = document.getElementById('reviewModalConfirm');
  const cancelBtn = document.getElementById('reviewModalCancel');
  
  modalTitle.innerHTML = sendNotification 
    ? '<i class="fa-solid fa-paper-plane"></i> Create & Send Inspection' 
    : '<i class="fa-solid fa-plus"></i> Create Review (Pending)';
  
  const alertHtml = sendNotification 
    ? `<div class="preview-alert success">
        <i class="fa-solid fa-circle-check"></i> <strong>Ready to Send</strong> - The driver will receive an email/SMS notification immediately.
      </div>`
    : `<div class="preview-alert info">
        <i class="fa-solid fa-clock"></i> <strong>Pending Status</strong> - No notification will be sent. You can send later from the Dashboard.
      </div>`;
  
  modalBody.innerHTML = `
    <div class="review-preview">
      <div class="preview-section">
        <h4><i class="fa-solid fa-clipboard-list"></i> Review Details</h4>
        <div class="preview-row"><strong>Route:</strong> ${journey.routeCode || 'N/A'}</div>
        <div class="preview-row"><strong>Vehicle VIN:</strong> ${journey.vinNumber || 'N/A'}</div>
        <div class="preview-row"><strong>Driver:</strong> ${journey.transporterName || 'N/A'}</div>
        <div class="preview-row"><strong>Phone:</strong> ${journey.transporterPhone || 'N/A'}</div>
        <div class="preview-row"><strong>Email:</strong> ${journey.transporterEmail || 'N/A'}</div>
      </div>
      <div class="preview-section">
        <h4><i class="fa-solid fa-sliders"></i> Review Options</h4>
        <label for="reviewNotes">Notes:</label>
        <textarea id="reviewNotes" rows="2" placeholder="Enter review notes...">Damage inspection</textarea>
        <label for="reviewPositions">Positions (comma-separated):</label>
        <input type="text" id="reviewPositions" value="Roof, Top" placeholder="Roof, Top, Front, Back, Left, Right, Inside" />
      </div>
      ${alertHtml}
    </div>
  `;
  
  confirmBtn.innerHTML = sendNotification 
    ? '<i class="fa-solid fa-paper-plane"></i> Create & Send' 
    : '<i class="fa-solid fa-plus"></i> Create as Pending';
  confirmBtn.className = sendNotification ? 'btn-modal btn-success' : 'btn-modal btn-primary';
  
  // Replace buttons to remove old listeners
  const newConfirmBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
  const newCancelBtn = cancelBtn.cloneNode(true);
  cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
  
  newConfirmBtn.addEventListener('click', async () => {
    const notes = document.getElementById('reviewNotes').value;
    const positions = document.getElementById('reviewPositions').value;
    modal.classList.remove('show');
    await submitReview(journey, notes, positions, sendNotification);
  });
  
  newCancelBtn.addEventListener('click', () => {
    modal.classList.remove('show');
  });
  
  modal.classList.add('show');
}

// Submit review to API
async function submitReview(journey, notes, positions, sendNotification) {
  if (!authToken || isTokenExpired(authToken)) {
    handleExpiredToken();
    return;
  }

  const mode = sendNotification ? 'Creating and sending' : 'Creating';
  showStatus(`${mode} review...`, 'loading');

  try {
    const positionsArray = positions 
      ? positions.split(',').map(p => p.trim()).filter(p => p) 
      : [];

    const response = await fetch(`${CONFIG.vehicleApi.baseUrl}${CONFIG.vehicleApi.reviews}`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        vehicleVin: journey.vinNumber,
        driverPhone: journey.transporterPhone,
        driverEmail: journey.transporterEmail,
        driverFirstName: getFirstName(journey.transporterName),
        driverLastName: getLastName(journey.transporterName),
        notes: notes || 'Damage inspection',
        routeCode: journey.routeCode,
        positions: positionsArray,
        sendNotification: sendNotification
      })
    });

    if (!response.ok) {
      let errorMessage = `Failed to create review (${response.status})`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        errorMessage = await response.text() || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    const status = result.workflowStatus || (sendNotification ? 'SENT' : 'PENDING');
    
    showStatus(`✅ Review created! Status: ${status}`, 'success');
    console.log('Review created:', result);
    
    // Update only the affected row instead of refreshing the whole table
    updateRowAfterCreate(journey.routeCode, status);

  } catch (error) {
    console.error('Submit error:', error);
    showStatus(`❌ ${error.message}`, 'error');
  }
}

// Update only the affected row after review creation
function updateRowAfterCreate(routeCode, reviewStatus) {
  const row = document.querySelector(`tr[data-route="${routeCode}"]`);
  if (!row) {
    console.warn(`Row not found for route: ${routeCode}`);
    return;
  }
  
  // Update the status cell (5th column, index 4)
  const statusCell = row.cells[4];
  if (statusCell) {
    statusCell.innerHTML = `<span class="status-badge ${reviewStatus.toLowerCase()}">${reviewStatus}</span>`;
  }
  
  // Update the actions cell (6th column, index 5) - no more actions available
  const actionsCell = row.cells[5];
  if (actionsCell) {
    actionsCell.innerHTML = '<span class="text-muted">—</span>';
  }
  
  // Update the global routeChecks to reflect the new state
  if (window.routeChecks && window.routeChecks[routeCode]) {
    window.routeChecks[routeCode].action = 'ALREADY_EXISTS';
    window.routeChecks[routeCode].reviewExists = true;
    window.routeChecks[routeCode].reviewStatus = reviewStatus;
  }
  
  console.log(`Row updated for route ${routeCode}: status=${reviewStatus}`);
}

// Helper functions
function getFirstName(fullName) {
  if (!fullName) return null;
  return fullName.trim().split(' ')[0] || null;
}

function getLastName(fullName) {
  if (!fullName) return null;
  const parts = fullName.trim().split(' ');
  return parts.length > 1 ? parts.slice(1).join(' ') : null;
}

function showStatus(message, type) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.classList.remove('hidden');
}

function saveJourneysAsJson(journeys, date) {
  const allJourneys = [...journeys.valid, ...journeys.invalid];
  
  const exportData = {
    exportDate: new Date().toISOString(),
    routeDate: date,
    totalRoutes: allJourneys.length,
    reviews: allJourneys.map(j => ({
      driverPhone: j.transporterPhone,
      driverEmail: j.transporterEmail,
      driverFirstName: getFirstName(j.transporterName),
      driverLastName: getLastName(j.transporterName),
      vin: j.vinNumber,
      routeCode: j.routeCode,
      transporterName: j.transporterName
    }))
  };
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `journeys-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showStatus(`✓ Saved ${allJourneys.length} journeys`, 'success');
}

// Fleet Management Functions
let fleetVehicles = [];
let missingVehicles = [];

// Fetch fleet vehicles from Amazon Fleet Management API
async function fetchFleetVehicles() {
  if (!authToken) {
    showStatus('Please login to Vehicle API first', 'error');
    return;
  }

  if (isTokenExpired(authToken)) {
    handleExpiredToken();
    return;
  }

  showStatus('Fetching fleet vehicles from Amazon...', 'loading');
  document.getElementById('syncFleetBtn').disabled = true;

  try {
    const fleetUrl = `${CONFIG.amazonLogistics.baseUrl}${CONFIG.amazonLogistics.fleetVehicles}`;
    
    const response = await fetch(fleetUrl, { credentials: 'include' });
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Amazon session expired. Please login to logistics.amazon.com first.');
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.data || !data.data.vehicles || !Array.isArray(data.data.vehicles)) {
      throw new Error('Invalid fleet data structure');
    }

    fleetVehicles = data.data.vehicles;
    console.log(`📦 Fetched ${fleetVehicles.length} fleet vehicles`);

    // Check which vehicles exist in our system
    await checkFleetVehiclesInSystem();

  } catch (error) {
    console.error('Error fetching fleet vehicles:', error);
    showStatus(`❌ ${error.message}`, 'error');
  }
}

// Check which fleet vehicles exist in the Vehicle API system
async function checkFleetVehiclesInSystem() {
  showStatus('Checking vehicles in system...', 'loading');

  try {
    const vins = fleetVehicles.map(v => v.vin).filter(vin => vin);
    
    if (vins.length === 0) {
      showStatus('No valid VINs found in fleet data', 'error');
      return;
    }

    // Check each VIN against the Vehicle API
    const checkPromises = vins.map(async (vin) => {
      try {
        const response = await fetch(
          `${CONFIG.vehicleApi.baseUrl}${CONFIG.vehicleApi.vehicleByVin}/${vin}`,
          {
            method: 'GET',
            headers: {
              'accept': 'application/json',
              'Authorization': `Bearer ${authToken}`
            }
          }
        );

        // 404 means vehicle doesn't exist
        if (response.status === 404) {
          return { vin, exists: false };
        }
        
        if (response.ok) {
          return { vin, exists: true };
        }
        
        return { vin, exists: false };
      } catch (error) {
        console.error(`Error checking VIN ${vin}:`, error);
        return { vin, exists: false };
      }
    });

    const results = await Promise.all(checkPromises);
    const missingVins = results.filter(r => !r.exists).map(r => r.vin);
    
    // Get full vehicle data for missing vehicles
    missingVehicles = fleetVehicles.filter(v => missingVins.includes(v.vin));

    console.log(`✅ Found ${fleetVehicles.length - missingVehicles.length} existing vehicles`);
    console.log(`⚠️ Found ${missingVehicles.length} missing vehicles`);

    // Display fleet vehicles table
    displayFleetVehicles(fleetVehicles, missingVehicles);

    if (missingVehicles.length > 0) {
      showStatus(
        `✅ Found ${fleetVehicles.length} fleet vehicles. ${missingVehicles.length} not in system. Select vehicles and click "Sync Selected Vehicles".`,
        'success'
      );
      document.getElementById('syncFleetBtn').disabled = false;
    } else {
      showStatus(
        `✅ All ${fleetVehicles.length} fleet vehicles already exist in the system!`,
        'success'
      );
      document.getElementById('syncFleetBtn').disabled = true;
    }

  } catch (error) {
    console.error('Error checking vehicles:', error);
    showStatus(`❌ Error checking vehicles: ${error.message}`, 'error');
  }
}

// Display fleet vehicles in a table with checkboxes
function displayFleetVehicles(allVehicles, missing) {
  const fleetResults = document.getElementById('fleetResults');
  const fleetList = document.getElementById('fleetList');
  const fleetCount = document.getElementById('fleetCount');
  
  fleetList.innerHTML = '';
  fleetCount.textContent = `(${allVehicles.length} total, ${missing.length} missing)`;

  if (allVehicles.length > 0) {
    const tableContainer = document.createElement('div');
    tableContainer.className = 'table-container';
    const table = document.createElement('table');
    table.innerHTML = `
      <thead>
        <tr>
          <th style="width: 40px;"></th>
          <th>VIN</th>
          <th>Year</th>
          <th>Make</th>
          <th>Model</th>
          <th>License</th>
          <th>DSP ID</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody id="fleetTableBody"></tbody>
    `;
    tableContainer.appendChild(table);
    fleetList.appendChild(tableContainer);

    const tbody = document.getElementById('fleetTableBody');
    const missingVins = missing.map(v => v.vin);

    allVehicles.forEach((vehicle, index) => {
      const row = document.createElement('tr');
      const isMissing = missingVins.includes(vehicle.vin);
      
      // Checkbox cell
      let checkboxCell = '';
      if (isMissing) {
        checkboxCell = `<input type="checkbox" class="fleet-vehicle-checkbox" data-vin="${vehicle.vin}" data-index="${index}" />`;
      } else {
        checkboxCell = '<span style="color: #00a86b; font-size: 14px;">✓</span>';
      }

      // Status indicator
      let statusBadge = '';
      if (isMissing) {
        statusBadge = '<span class="cell-error" title="Not in system">⚠️ Missing</span>';
      } else {
        statusBadge = '<span class="cell-ok" title="Already in system">✓ Exists</span>';
      }

      row.innerHTML = `
        <td style="text-align: center;">${checkboxCell}</td>
        <td>${vehicle.vin || 'N/A'}</td>
        <td>${vehicle.year || 'N/A'}</td>
        <td>${vehicle.make || 'N/A'}</td>
        <td>${vehicle.model || 'N/A'}</td>
        <td>${vehicle.registrationNo || 'N/A'}</td>
        <td>${vehicle.dspVehicleId || 'N/A'}</td>
        <td>${statusBadge}</td>
      `;

      // Add visual distinction for existing vehicles
      if (!isMissing) {
        row.style.opacity = '0.6';
        row.style.backgroundColor = '#f8f9fa';
      }

      tbody.appendChild(row);
    });

    // Setup select all checkbox
    const selectAllCheckbox = document.getElementById('selectAllFleet');
    selectAllCheckbox.checked = false;
    selectAllCheckbox.addEventListener('change', (e) => {
      const checkboxes = document.querySelectorAll('.fleet-vehicle-checkbox');
      checkboxes.forEach(cb => cb.checked = e.target.checked);
      updateSyncButtonState();
    });

    // Setup individual checkboxes
    document.querySelectorAll('.fleet-vehicle-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', updateSyncButtonState);
    });
  }

  fleetResults.classList.remove('hidden');
}

// Update sync button state based on checkbox selection
function updateSyncButtonState() {
  const selectedCheckboxes = document.querySelectorAll('.fleet-vehicle-checkbox:checked');
  const syncBtn = document.getElementById('syncFleetBtn');
  
  if (selectedCheckboxes.length > 0) {
    syncBtn.disabled = false;
    syncBtn.innerHTML = `<i class="fa-solid fa-sync"></i> Sync Selected Vehicles (${selectedCheckboxes.length})`;
  } else {
    syncBtn.disabled = true;
    syncBtn.innerHTML = '<i class="fa-solid fa-sync"></i> Sync Selected Vehicles';
  }
}

// Sync missing vehicles to the Vehicle API
async function syncMissingVehicles() {
  if (!authToken || isTokenExpired(authToken)) {
    handleExpiredToken();
    return;
  }

  // Get selected vehicles
  const selectedCheckboxes = document.querySelectorAll('.fleet-vehicle-checkbox:checked');
  const selectedVins = Array.from(selectedCheckboxes).map(cb => cb.getAttribute('data-vin'));
  const vehiclesToSync = missingVehicles.filter(v => selectedVins.includes(v.vin));

  if (vehiclesToSync.length === 0) {
    showStatus('No vehicles selected to sync', 'info');
    return;
  }

  showStatus(`Syncing ${vehiclesToSync.length} vehicles...`, 'loading');
  document.getElementById('syncFleetBtn').disabled = true;

  let successCount = 0;
  let failCount = 0;
  const errors = [];

  for (const vehicle of vehiclesToSync) {
    try {
      // Map fleet vehicle data to Vehicle API format
      const vehicleData = {
        vin: vehicle.vin,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        licensePlate: vehicle.registrationNo || '',
        type: vehicle.serviceTier || '',
        status: 'Active',
        color: null,
        mileage: null,
        purchaseDate: null,
        warrantyExpiry: null,
        requireDot: false,
        notes: [
          `Imported from Amazon Fleet`,
          `Fleet Status: ${vehicle.status}`,
          `DSP Vehicle ID: ${vehicle.dspVehicleId || 'N/A'}`,
          `Ownership: ${vehicle.vehicleOwnershipType || 'Unknown'}`
        ]
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

      if (response.ok) {
        successCount++;
        console.log(`✅ Added vehicle: ${vehicle.vin}`);
      } else {
        failCount++;
        const errorText = await response.text();
        errors.push(`${vehicle.vin}: ${errorText}`);
        console.error(`❌ Failed to add vehicle ${vehicle.vin}:`, errorText);
      }

      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      failCount++;
      errors.push(`${vehicle.vin}: ${error.message}`);
      console.error(`❌ Error adding vehicle ${vehicle.vin}:`, error);
    }
  }

  // Show results
  if (successCount > 0 && failCount === 0) {
    showStatus(
      `✅ Successfully added ${successCount} vehicle${successCount > 1 ? 's' : ''} to the system!`,
      'success'
    );
    // Remove synced vehicles from missing list
    missingVehicles = missingVehicles.filter(v => !selectedVins.includes(v.vin));
    // Refresh the table
    await checkFleetVehiclesInSystem();
  } else if (successCount > 0 && failCount > 0) {
    showStatus(
      `⚠️ Added ${successCount} vehicles, but ${failCount} failed. Check console for details.`,
      'warning'
    );
    console.error('Failed vehicles:', errors);
    // Remove successfully synced vehicles from missing list
    const failedVins = errors.map(e => e.split(':')[0]);
    missingVehicles = missingVehicles.filter(v => selectedVins.includes(v.vin) && failedVins.includes(v.vin));
    // Refresh the table
    await checkFleetVehiclesInSystem();
  } else {
    showStatus(
      `❌ Failed to add vehicles. Check console for details.`,
      'error'
    );
    console.error('All vehicles failed:', errors);
    document.getElementById('syncFleetBtn').disabled = false;
  }
}


