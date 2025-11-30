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
    
    // Fetch existing reviews and check vehicle/driver status
    let existingReviews = [];
    let routeChecks = {};
    
    if (authToken && !isTokenExpired(authToken)) {
      showStatus('Checking existing reviews...', 'loading');
      existingReviews = await getReviewsByDate(date);
      
      showStatus('Checking vehicles and drivers...', 'loading');
      routeChecks = await checkAllRoutes(journeys);
    }
    
    // Display journeys
    displayJourneys(journeys, existingReviews, routeChecks);
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

// Get reviews for a specific date
async function getReviewsByDate(date) {
  if (!authToken) return [];
  
  try {
    const response = await fetch(
      `${CONFIG.vehicleApi.baseUrl}/api/VehicleReviews?reviewDate=${date}&limit=100`,
      {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    if (!response.ok) return [];
    
    const result = await response.json();
    return result.items || [];
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return [];
  }
}

// Check vehicle/driver status for all routes
async function checkAllRoutes(journeys) {
  const allJourneys = [...journeys.valid, ...journeys.invalid];
  const checks = {};
  
  for (const journey of allJourneys) {
    if (journey.vinNumber || journey.transporterPhone) {
      try {
        const result = await checkVehicleAndDriver(journey);
        if (result) {
          checks[journey.routeCode] = result;
        }
      } catch (error) {
        console.error(`Check failed for ${journey.routeCode}:`, error);
      }
    }
  }
  
  return checks;
}

// Check if vehicle and driver exist
async function checkVehicleAndDriver(journey) {
  try {
    const response = await fetch(
      `${CONFIG.vehicleApi.baseUrl}${CONFIG.vehicleApi.reviewsCheck}`,
      {
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
          driverLastName: getLastName(journey.transporterName)
        })
      }
    );

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Check error:', error);
    return null;
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
function displayJourneys(journeys, existingReviews = [], routeChecks = {}) {
  const resultsDiv = document.getElementById('results');
  const routesList = document.getElementById('routesList');
  
  routesList.innerHTML = '';
  
  // Create review lookup by routeCode
  const reviewsByRoute = {};
  existingReviews.forEach(review => {
    if (review.routeCode) {
      reviewsByRoute[review.routeCode] = review;
    }
  });
  
  const allJourneys = [...journeys.valid, ...journeys.invalid];
  
  if (allJourneys.length > 0) {
    const header = document.createElement('h3');
    header.textContent = `All Routes (${allJourneys.length})`;
    header.style.color = '#667eea';
    routesList.appendChild(header);
    
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
  
    allJourneys.forEach((journey, index) => {
      const row = document.createElement('tr');
      const checkResult = routeChecks[journey.routeCode] || null;
      const existingReview = reviewsByRoute[journey.routeCode] || null;
      
      // Check data availability
      const hasVin = !!journey.vinNumber;
      const hasPhone = !!journey.transporterPhone;
      
      // Check vehicle/driver existence
      const vehicleExists = checkResult?.vehicleStatus === 'FOUND';
      const vehicleNotFound = checkResult?.vehicleStatus === 'NOT_FOUND';
      const driverExists = checkResult?.driverStatus === 'FOUND' || checkResult?.driverStatus === 'MULTIPLE_FOUND';
      const driverNotFound = checkResult?.driverStatus === 'NOT_FOUND';
      
      // Build VIN cell
      let vinCell = '';
      if (!hasVin) {
        vinCell = '<span class="text-muted">N/A</span>';
      } else if (vehicleNotFound) {
        vinCell = `<span class="cell-error" title="Vehicle not found in system">⚠️ ${journey.vinNumber}</span>`;
      } else if (vehicleExists) {
        vinCell = `<span class="cell-ok">✅ ${journey.vinNumber}</span>`;
      } else {
        vinCell = journey.vinNumber;
      }
      
      // Build phone cell
      let phoneCell = '';
      if (!hasPhone) {
        phoneCell = '<span class="text-muted">N/A</span>';
      } else if (driverNotFound) {
        phoneCell = `<span class="cell-error" title="Driver not found in system">⚠️ ${journey.transporterPhone}</span>`;
      } else if (driverExists) {
        phoneCell = `<span class="cell-ok">✅ ${journey.transporterPhone}</span>`;
      } else {
        phoneCell = journey.transporterPhone;
      }
      
      // Build status and actions
      let statusCell = '';
      let actionButtons = '';
      
      if (existingReview) {
        // Review already exists
        const status = existingReview.workflowStatus || 'CREATED';
        statusCell = `<span class="status-badge ${status.toLowerCase()}">${status}</span>`;
        actionButtons = '<span class="text-muted">—</span>';
      } else {
        statusCell = '<span class="text-muted">—</span>';
        
        // Can only create if both vehicle AND driver exist
        const canCreate = vehicleExists && driverExists;
        
        if (authToken) {
          if (canCreate) {
            actionButtons = `
              <button class="btn-create-send" data-index="${index}" title="Create and send immediately">📧 Send directly</button>
              <button class="btn-create-only" data-index="${index}" title="Create as pending">📝 Create Review</button>
            `;
          } else {
            // Show why we can't create
            const missing = [];
            if (vehicleNotFound) missing.push('Vehicle');
            if (driverNotFound) missing.push('Driver');
            if (!hasVin) missing.push('VIN');
            if (!hasPhone) missing.push('Phone');
            
            const tooltip = missing.length > 0 
              ? `Missing: ${missing.join(', ')}. Create in Dashboard first.`
              : 'Checking...';
            actionButtons = `<span class="text-muted action-disabled" title="${tooltip}">Create in Dashboard</span>`;
          }
        } else {
          actionButtons = '<span class="text-muted">Login required</span>';
        }
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
    
    // Add click handlers
    document.querySelectorAll('.btn-create-send').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.getAttribute('data-index'));
        showReviewDialog(window.allJourneysFlat[index], true);
      });
    });
    
    document.querySelectorAll('.btn-create-only').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.getAttribute('data-index'));
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
  
  modalTitle.textContent = sendNotification 
    ? '📧 Create & Send Inspection' 
    : '📝 Create Review (Pending)';
  
  const alertHtml = sendNotification 
    ? `<div class="preview-alert success">
        ✅ <strong>Ready to Send</strong> - The driver will receive an email/SMS notification immediately.
      </div>`
    : `<div class="preview-alert info">
        📝 <strong>Pending Status</strong> - No notification will be sent. You can send later from the Dashboard.
      </div>`;
  
  modalBody.innerHTML = `
    <div class="review-preview">
      <div class="preview-section">
        <h4>📋 Review Details</h4>
        <div class="preview-row"><strong>Route:</strong> ${journey.routeCode || 'N/A'}</div>
        <div class="preview-row"><strong>Vehicle VIN:</strong> ${journey.vinNumber || 'N/A'}</div>
        <div class="preview-row"><strong>Driver:</strong> ${journey.transporterName || 'N/A'}</div>
        <div class="preview-row"><strong>Phone:</strong> ${journey.transporterPhone || 'N/A'}</div>
        <div class="preview-row"><strong>Email:</strong> ${journey.transporterEmail || 'N/A'}</div>
      </div>
      <div class="preview-section">
        <h4>📝 Review Options</h4>
        <label for="reviewNotes">Notes:</label>
        <textarea id="reviewNotes" rows="2" placeholder="Enter review notes...">Damage inspection</textarea>
        <label for="reviewPositions">Positions (comma-separated):</label>
        <input type="text" id="reviewPositions" value="Roof, Top" placeholder="Roof, Top, Front, Back, Left, Right, Inside" />
      </div>
      ${alertHtml}
    </div>
  `;
  
  confirmBtn.textContent = sendNotification ? '📧 Create & Send' : '📝 Create as Pending';
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
    
    // Refresh routes after a short delay
    setTimeout(fetchAndDisplayRoutes, 1500);

  } catch (error) {
    console.error('Submit error:', error);
    showStatus(`❌ ${error.message}`, 'error');
  }
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
