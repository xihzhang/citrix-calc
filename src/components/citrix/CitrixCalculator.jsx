import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ResourceAnalysisCard, LoadDistributionChart } from './components';

const CitrixCalculator = () => {
  // Original site state
  const [sites, setSites] = useState([
    { name: 'eBay SLC', physicalServers: 60, physicalCPU: 3840 },
    { name: 'eBay LVS', physicalServers: 60, physicalCPU: 3840 }
  ]);

  // New server configuration states
  const [serverConfig, setServerConfig] = useState({
    serverPhysicalCPU: 64,     // Physical CPU per server
    vmsPerServer: 16,          // VMs per server
    vcpuPerVM: 8,             // Virtual CPU per VM
    maxSessionsPerVM: 2,      // Max sessions per VM
  });

  // Calculated CPU states
  const [sessionCPU, setSessionCPU] = useState({
    physical: 0,
    virtual: 0
  });
  const [ratio, setRatio] = useState(0);

  // Other states remain the same
  const [maxSessions, setMaxSessions] = useState(2000);
  const [loadFactor, setLoadFactor] = useState(100);
  const [failoverSite, setFailoverSite] = useState('none');
  const [hourlyData, setHourlyData] = useState([]);
  const [resourceAnalysis, setResourceAnalysis] = useState({
    normalOps: { margin: 0, status: 'Calculating...' },
    failover: [],
    recommendation: { cpu: 0, coverage: 0 },
    metrics: {
      n1ResilienceTargetSessions: 0,
      usageEfficiency: 0,
      roi: 0
    }
  });

  // Calculate CPU values based on server configuration
  const calculateCPUValues = (config) => {
    const totalVCPUs = config.vmsPerServer * config.vcpuPerVM;
    const newRatio = totalVCPUs / config.serverPhysicalCPU;
    const totalSessionsPerServer = config.vmsPerServer * config.maxSessionsPerVM;
    
    const physicalCPUPerSession = config.serverPhysicalCPU / totalSessionsPerServer;
    const virtualCPUPerSession = totalVCPUs / totalSessionsPerServer;

    setRatio(newRatio);
    setSessionCPU({
      physical: parseFloat(physicalCPUPerSession.toFixed(2)),
      virtual: parseFloat(virtualCPUPerSession.toFixed(2))
    });
  };

  // Update server configuration
  const updateServerConfig = (field, value) => {
    const newConfig = { ...serverConfig, [field]: parseFloat(value) };
    setServerConfig(newConfig);
    calculateCPUValues(newConfig);
    
    // Update all sites' physical CPU when server CPU changes
    const newSites = sites.map(site => ({
      ...site,
      physicalCPU: site.physicalServers * newConfig.serverPhysicalCPU
    }));
    setSites(newSites);
  };

  useEffect(() => {
    calculateCPUValues(serverConfig);
  }, []);

  const addSite = () => {
    if (sites.length < 4) {
      const siteNames = {
        3: 'eBay AMS',
        4: 'eBay BLR'
      };
      setSites([...sites, { 
        name: siteNames[sites.length + 1] || `Site ${sites.length + 1}`, 
        physicalServers: 0,
        physicalCPU: 0 
      }]);
    }
  };

  const removeSite = () => {
    if (sites.length > 2) {
      setSites(sites.slice(0, -1));
      if (failoverSite === sites[sites.length - 1].name) {
        setFailoverSite('none');
      }
    }
  };

  const updateSite = (index, field, value) => {
    const newSites = [...sites];
    const updatedSite = { ...newSites[index], [field]: value };
    
    // If updating physical servers, handle the value properly
    if (field === 'physicalServers') {
      // Convert to string to handle input properly
      const valueStr = value.toString();
      
      // Remove leading zeros but keep single zero
      const cleanValue = valueStr.replace(/^0+(?=\d)/, '');
      
      // Convert back to number for calculations
      updatedSite.physicalServers = cleanValue === '' ? '' : parseInt(cleanValue);
      updatedSite.physicalCPU = cleanValue === '' ? 0 : updatedSite.physicalServers * serverConfig.serverPhysicalCPU;
    }
    
    newSites[index] = updatedSite;
    setSites(newSites);
  };

  const generateHourlyLoad = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const usVolume = 0.66;
    const euVolume = 0.34;
    const apacLoad = 0.1;
    
    return hours.map(hour => {
      const peakLoad = usVolume;
      const usLoad = hour >= 14 && hour <= 23 ? peakLoad : 
                     (hour >= 0 && hour <= 2 ? peakLoad : usVolume * 0.1);
      const euLoad = hour >= 8 && hour <= 16 ? euVolume : 
                     (hour >= 7 && hour <= 17 ? euVolume * 0.5 : euVolume * 0.1);
      const additionalLoad = hour >= 7 && hour <= 10 ? apacLoad : 0;
      
      const totalLoad = (usLoad + euLoad + additionalLoad) * 100;
      
      return {
        hour: `${hour.toString().padStart(2, '0')}:00`,
        load: Math.round(totalLoad),
        sessions: Math.round(maxSessions * (totalLoad / 100))
      };
    });
  };

  const analyzeResources = () => {
    const n1ResilienceTargetSessions = Math.round(maxSessions * (loadFactor / 100));
    const totalRequired = n1ResilienceTargetSessions * sessionCPU.physical;
    const currentCapacity = sites.reduce((acc, site) => acc + site.physicalCPU, 0);
    
    const failoverScenarios = sites.map(failingSite => {
      const remainingSites = sites.filter(site => site.name !== failingSite.name);
      const remainingCapacity = remainingSites.reduce((acc, site) => acc + site.physicalCPU, 0);
      const gap = totalRequired - remainingCapacity;
      return {
        site: failingSite.name,
        capacity: remainingCapacity,
        gap: gap,
        status: remainingCapacity >= totalRequired ? 'Resilient' : 'At Risk'
      };
    });

    const euSessions = n1ResilienceTargetSessions * 0.34;
    const euRequiredCPU = Math.ceil(euSessions * sessionCPU.physical);
    const amsSite = sites.find(s => s.name === 'eBay AMS');
    const euGap = amsSite ? euRequiredCPU - amsSite.physicalCPU : euRequiredCPU;

    setResourceAnalysis({
      normalOps: {
        margin: currentCapacity - totalRequired,
        status: currentCapacity >= totalRequired ? 'Sufficient' : 'Insufficient'
      },
      failover: failoverScenarios,
      recommendation: {
        cpu: Math.max(0, Math.max(...failoverScenarios.map(s => s.gap))),
        euGap: Math.max(0, euGap)
      },
      metrics: {
        n1ResilienceTargetSessions,
        usageEfficiency: Math.round((totalRequired / currentCapacity) * 100),
        roi: currentCapacity > 0 ? Math.round((n1ResilienceTargetSessions / currentCapacity) * 100) : 0
      }
    });
  };

  useEffect(() => {
    const data = generateHourlyLoad();
    setHourlyData(data);
    analyzeResources();
  }, [maxSessions, sites, loadFactor, sessionCPU]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header with IRP logo */}
        <div className="flex items-center justify-between mb-8 bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center space-x-4">
            <img 
              src="./irp.png" 
              alt="IRP Logo" 
              className="w-12 h-12 object-contain"
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">eBay IRP</h1>
              <p className="text-sm text-gray-600">Capacity & Resilience Calculator</p>
            </div>
          </div>
          <div className="text-right text-sm text-gray-600">
            <p>Tech Infrastructure</p>
            <p>Global Load Balancing</p>
          </div>
        </div>
        <Card className="w-full bg-white">
          <CardHeader>
            <CardTitle>Citrix Capacity and Failover Calculator</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Step 1: Server Configuration */}
              <Card className="p-4">
                <div className="space-y-4">
                  <div className="border-b pb-2">
                    <h3 className="text-xl font-semibold">Step 1: Server Configuration</h3>
                    <p className="text-sm text-gray-600">Configure your standard server specifications</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Server's Physical CPU</label>
                      <Input
                        type="number"
                        value={serverConfig.serverPhysicalCPU}
                        onChange={(e) => updateServerConfig('serverPhysicalCPU', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Virtual Machines Per Server</label>
                      <Input
                        type="number"
                        value={serverConfig.vmsPerServer}
                        onChange={(e) => updateServerConfig('vmsPerServer', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Virtual CPU per VM</label>
                      <Input
                        type="number"
                        value={serverConfig.vcpuPerVM}
                        onChange={(e) => updateServerConfig('vcpuPerVM', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Max Sessions Per VM</label>
                      <Input
                        type="number"
                        value={serverConfig.maxSessionsPerVM}
                        onChange={(e) => updateServerConfig('maxSessionsPerVM', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium mb-2">Calculated Values:</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Physical CPU per Session</label>
                        <Input
                          type="number"
                          value={sessionCPU.physical}
                          disabled
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">vCPU/pCPU Ratio</label>
                        <Input
                          type="number"
                          value={ratio}
                          disabled
                          className={`${
                            ratio >= 1.5 ? 'bg-red-50 text-red-900' : 
                            ratio >= 1.25 ? 'bg-yellow-50 text-yellow-900' : 
                            ratio > 0 ? 'bg-green-50 text-green-900' : ''
                          }`}
                        />
                        <div className="mt-1 text-xs">
                          {ratio >= 1.5 ? (
                            <span className="text-red-600">High ratio may impact performance</span>
                          ) : ratio >= 1.25 ? (
                            <span className="text-yellow-600">Moderate oversubscription</span>
                          ) : ratio > 0 ? (
                            <span className="text-green-600">Healthy ratio</span>
                          ) : null}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Virtual CPU per Session</label>
                        <Input
                          type="number"
                          value={sessionCPU.virtual}
                          disabled
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Step 2: Site Resources */}
              <Card className="p-4">
                <div className="space-y-4">
                  <div className="border-b pb-2">
                    <h3 className="text-xl font-semibold">Step 2: Site Resources</h3>
                    <p className="text-sm text-gray-600">Configure your site resources and server distribution</p>
                  </div>
                  
                  <div className="flex gap-4 items-center mb-4">
                    <Button 
                      onClick={addSite}
                      disabled={sites.length >= 4}
                      className="w-32"
                    >
                      Add Site
                    </Button>
                    <Button 
                      onClick={removeSite}
                      disabled={sites.length <= 2}
                      className="w-32"
                    >
                      Remove Site
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {sites.map((site, index) => (
                      <div key={index} className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                        <div>
                          <label className="block text-sm font-medium mb-1">Site Name</label>
                          <Input
                            value={site.name}
                            onChange={(e) => updateSite(index, 'name', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Physical Server Count</label>
                          <Input
                            type="number"
                            value={site.physicalServers}
                            onChange={(e) => updateSite(index, 'physicalServers', parseInt(e.target.value))}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Total Physical CPU</label>
                          <div className="space-y-2">
                            <Input
                              type="number"
                              value={site.physicalCPU}
                              disabled
                            />
                            <div className="text-sm text-gray-600">
                              Supported Sessions: {Math.floor(site.physicalCPU / sessionCPU.physical).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Step 3: Session and Resilience Configuration */}
              <Card className="p-4">
                <div className="space-y-4">
                  <div className="border-b pb-2">
                    <h3 className="text-xl font-semibold">Step 3: Capacity Planning</h3>
                    <p className="text-sm text-gray-600">Define your session requirements and resilience targets</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Max Concurrent Sessions</label>
                      <Input
                        type="number"
                        value={maxSessions}
                        onChange={(e) => setMaxSessions(parseInt(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Resilience Target Coverage (%)</label>
                      <Input
                        type="number"
                        value={loadFactor}
                        min="1"
                        max="100"
                        onChange={(e) => setLoadFactor(parseInt(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-sm text-blue-700 space-y-2">
                      <p><strong>N-1 Resilience Strategy</strong></p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Enables 99.9% High Availability by ensuring system continues operating when one site fails</li>
                        <li>Provides cost-effective balance between reliability and resource investment</li>
                        <li>Distributes workload across remaining sites during failures</li>
                        <li>Supports business continuity with minimal service disruption</li>
                      </ul>
                      
                      <p><strong>N-2 vs N-1 Consideration</strong></p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>While N-2 resilience could provide higher availability (99.99%+)</li>
                        <li>N-2 requires significantly higher infrastructure investment</li>
                        <li>Additional cost of N-2 typically outweighs the marginal availability improvement</li>
                        <li>N-1 offers optimal balance of high availability and cost efficiency</li>
                      </ul>

                      <p className="italic mt-2">This calculator focuses on N-1 resilience as the recommended approach for achieving 99.9% HA while maintaining reasonable infrastructure costs and ROI.</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Step 4: Analysis */}
              <Card className="p-4">
                <div className="space-y-4">
                  <div className="border-b pb-2">
                    <h3 className="text-xl font-semibold">Step 4: Generate Analysis</h3>
                    <p className="text-sm text-gray-600">Generate comprehensive resource analysis report</p>
                  </div>

                  <div className="flex justify-center">
                    <Button 
                      onClick={() => {
                        analyzeResources();
                        const newHourlyData = generateHourlyLoad();
                        setHourlyData(newHourlyData);
                      }}
                      className="w-64 h-12"
                    >
                      Generate N-1 Resilience Analysis
                    </Button>
                  </div>
                </div>
              </Card>

              <ResourceAnalysisCard 
                resourceAnalysis={resourceAnalysis}
                sites={sites}
                maxSessions={maxSessions}
                loadFactor={loadFactor}
                sessionCPU={sessionCPU}
                serverPhysicalCPU={serverConfig.serverPhysicalCPU}
              />

              <LoadDistributionChart hourlyData={hourlyData} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CitrixCalculator;