import React from 'react';
import ConnectionTester from './ConnectionTester';

const Settings: React.FC = () => {

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">System Settings</h1>
        <p className="text-gray-500 mt-2">View system information and connection status.</p>
      </div>

      <div className="space-y-8">

        {/* FIX: Add ConnectionTester component to the settings page */}
        <ConnectionTester />

        {/* Account & System Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                  <span className="block text-gray-500">Agent Name</span>
                  <span className="font-medium">John Doe</span>
              </div>
              <div>
                  <span className="block text-gray-500">Department</span>
                  <span className="font-medium">Outbound Sales</span>
              </div>
              <div>
                  <span className="block text-gray-500">System Version</span>
                  <span className="font-medium">v4.0.0 (Direct API Integration)</span>
              </div>
               <div>
                  <span className="block text-gray-500">API Auth Endpoint</span>
                  <span className="font-medium font-mono text-xs text-gray-600">.../oauth2/token</span>
              </div>
              <div>
                  <span className="block text-gray-500">API Check Endpoint</span>
                  <span className="font-medium font-mono text-xs text-gray-600">.../dncr/v0/check</span>
              </div>
              <div>
                  <span className="block text-gray-500">Connection Mode</span>
                   <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                      Direct to Etisalat API
                   </span>
              </div>
          </div>
        </div>

        <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 mt-4">
            <h4 className="text-sky-800 font-semibold text-sm">Direct API Connection</h4>
            <p className="text-sky-700 text-xs mt-1 leading-relaxed">
              This application is configured to connect directly from the browser to the Etisalat API endpoints. This method requires your device's public IP address to be whitelisted by the API provider.
            </p>
             <p className="text-sky-700 text-xs mt-2 leading-relaxed font-semibold">
                If you experience connection errors (e.g., CORS, Failed to Fetch), verify that your IP is correctly configured for access in the Etisalat Developer Portal.
            </p>
        </div>


      </div>
    </div>
  );
};

export default Settings;
