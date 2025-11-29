// Configuration file for API endpoints
// Change this to 'local' for local development or 'production' for deployed API
const ENVIRONMENT = 'local'; // Options: 'local', 'production'

const ENVIRONMENTS = {
  local: {
    vehicleApi: {
      baseUrl: 'https://localhost:7287', // Local development server
      authenticate: '/api/Users/authenticate',
      vehicles: '/api/Vehicles',
      vehicleByVin: '/api/Vehicles/search/vin',
      persons: '/api/Persons',
      reviews: '/api/VehicleReviews/byExtension',
      reviewsCheck: '/api/VehicleReviews/byExtension/check'
    }
  },
  production: {
    vehicleApi: {
      baseUrl: 'https://vehicle-api20250712121147-cwg9d7fyeugehbc5.westus-01.azurewebsites.net',
      authenticate: '/api/Users/authenticate',
      vehicles: '/api/Vehicles',
      vehicleByVin: '/api/Vehicles/search/vin',
      persons: '/api/Persons',
      reviews: '/api/VehicleReviews/byExtension',
      reviewsCheck: '/api/VehicleReviews/byExtension/check'
    }
  }
};

const CONFIG = {
  // Current environment
  environment: ENVIRONMENT,
  
  // Amazon Logistics API (same for all environments)
  amazonLogistics: {
    baseUrl: 'https://logistics.amazon.com',
    routeSummaries: '/operations/execution/api/route-summaries',
    serviceAreaId: 'ffbac4b5-8850-48e8-86bd-4403685d46d7'
  },
  
  // Vehicle API (environment-specific)
  vehicleApi: ENVIRONMENTS[ENVIRONMENT].vehicleApi
};

// Log current environment on load (helpful for debugging)
console.log(`🔧 Extension running in ${ENVIRONMENT.toUpperCase()} mode`);
console.log(`📡 Vehicle API: ${CONFIG.vehicleApi.baseUrl}`);
