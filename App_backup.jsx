import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Button } from "./components/ui/button";
import { Alert, AlertDescription } from "./components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const CitrixCalculator = () => {
  const [sites, setSites] = useState([
    { name: 'eBay SLC', physicalCPU: 3840 },
    { name: 'eBay LVS', physicalCPU: 3840 }
  ]);
  const [ratio, setRatio] = useState(1.25);
  const [sessionCPU, setSessionCPU] = useState({ physical: 3.2, virtual: 4 });
  const [maxSessions, setMaxSessions] = useState(2000);
  const [loadFactor, setLoadFactor] = useState(100);
  const [failoverSite, setFailoverSite] = useState('none');
  const [hourlyData, setHourlyData] = useState([]);
  const [resourceAnalysis, setResourceAnalysis] = useState({
    normalOps: { margin: 0, status: 'Calculating...' },
    failover: [],
    recommendation: { cpu: 0, coverage: 0 }
  });

  const addSite = () => {
    if (sites.length < 4) {
      const siteNames = {
        3: 'eBay AMS',
        4: 'eBay BLR'
      };
      setSites([...sites, { name: siteNames[sites.length + 1] || `Site ${sites.length + 1}`, physicalCPU: 0 }]);
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

  const [n1TargetSessions, setN1TargetSessions] = useState(0);

  useEffect(() => {
    setN1TargetSessions(maxSessions * (loadFactor / 100));
  }, [maxSessions, loadFactor]);

  const analyzeResources = () => {
    const n1ResilienceTargetSessions = Math.round(maxSessions * (loadFactor / 100));
    const totalRequired = n1ResilienceTargetSessions * sessionCPU.physical;
    const currentCapacity = sites.reduce((acc, site) => acc + site.physicalCPU, 0);
    
    // Simulate each site failing
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

    // Calculate EU specific requirements (34% of total sessions)
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

  const updateSite = (index, field, value) => {
    const newSites = [...sites];
    newSites[index] = { ...newSites[index], [field]: value };
    setSites(newSites);
  };

  const calculateRequirements = (site, isFailover = false) => {
    const activeSites = isFailover ? sites.length - 1 : sites.length;
    const adjustedSessions = maxSessions * (loadFactor / 100);
    const sessionsPerSite = adjustedSessions / activeSites;
    const physicalRequired = (maxSessions * sessionCPU.physical * (loadFactor / 100)) / activeSites;
    const virtualRequired = physicalRequired * ratio;
    const capacity = site.physicalCPU > 0 
      ? Math.floor((site.physicalCPU / sessionCPU.physical) * (1 / ratio) * activeSites)
      : 0;

    return {
      physicalRequired: physicalRequired.toFixed(2),
      virtualRequired: virtualRequired.toFixed(2),
      capacity,
      sessionsPerSite: Math.ceil(sessionsPerSite),
      status: capacity >= sessionsPerSite ? 'Sufficient' : 'Insufficient'
    };
  };

  useEffect(() => {
    const data = generateHourlyLoad();
    setHourlyData(data);
    analyzeResources();
  }, [maxSessions]);

  return (
    // Outer container - full width and height, centered content
    <div className="min-h-screen w-full bg-gray-100 flex justify-center items-center p-8">
      {/* Content wrapper - constrain width and center */}
      <div className="container mx-auto flex justify-center">
      {/* Card with max-width */}
      <Card className="w-full max-w-4xl bg-white">
      <CardHeader>
        <CardTitle>Citrix Capacity and Failover Calculator</CardTitle>
      </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex gap-4 items-center">
                <Button 
                  onClick={() => {
                    analyzeResources();
                    const newHourlyData = generateHourlyLoad();
                    setHourlyData(newHourlyData);
                  }}
                  className="w-48"
                >
                  Analyze Resources
                </Button>
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

              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Resilience Load Factor (%)</label>
                    <Input
                      type="number"
                      value={loadFactor}
                      min="1"
                      max="100"
                      onChange={(e) => setLoadFactor(parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Max Concurrent Sessions</label>
                    <Input
                      type="number"
                      value={maxSessions}
                      onChange={(e) => setMaxSessions(parseInt(e.target.value))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Physical CPU per Session</label>
                    <Input
                      type="number"
                      value={sessionCPU.physical}
                      step="0.1"
                      onChange={(e) => {
                        const newPhysical = parseFloat(e.target.value);
                        setSessionCPU({ 
                          physical: newPhysical,
                          virtual: (newPhysical * ratio).toFixed(1)
                        });
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">vCPU/pCPU Ratio</label>
                    <Input
                      type="number"
                      value={ratio}
                      step="0.05"
                      min="1"
                      onChange={(e) => {
                        const newRatio = parseFloat(e.target.value);
                        setRatio(newRatio);
                        setSessionCPU(prev => ({
                          physical: prev.physical,
                          virtual: (prev.physical * newRatio).toFixed(1)
                        }));
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Virtual CPU per Session</label>
                    <Input
                      type="number"
                      value={sessionCPU.virtual}
                      step="0.1"
                      onChange={(e) => {
                        const newVirtual = parseFloat(e.target.value);
                        setSessionCPU({ 
                          virtual: newVirtual,
                          physical: (newVirtual / ratio).toFixed(1)
                        });
                      }}
                    />
                  </div>
                </div>
              </div>

          <Card className="p-4">
            <CardTitle className="text-lg mb-4">Resource Analysis Summary</CardTitle>
            <div className="space-y-4">
              {/* Normal Operations */}
              <Alert>
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">Normal Operations:</p>
                    <p>Total Physical CPU Available: {sites.reduce((acc, site) => acc + site.physicalCPU, 0)}<br/>
                       Peak Load Physical CPU Required: {(maxSessions * sessionCPU.physical).toFixed(2)}<br/>
                       Resource Margin: <span className={resourceAnalysis.normalOps.margin >= 0 ? 'text-green-600' : 'text-red-600 font-bold'}>{resourceAnalysis.normalOps.margin.toFixed(2)} Physical CPU</span><br/>
                       Capacity Status: <span className={resourceAnalysis.normalOps.margin >= 0 ? 'text-green-600' : 'text-red-600 font-bold'}>{resourceAnalysis.normalOps.status}</span></p>
                  </div>
                </AlertDescription>
              </Alert>
              
              {/* Failover Analysis */}
              <Alert>
                <AlertDescription>
      
                    <div className="mt-4">


                      <div className="mt-4">
                        <p className="font-medium">Site Failover Scenarios:</p>
                        {resourceAnalysis.failover.map((scenario, index) => (
                          <div key={index} className="pl-4 border-l-2 border-gray-200 mt-2">
                            <p className="font-medium">If {scenario.site} Fails:</p>
                            <p>Remaining Capacity: {scenario.capacity}<br/>
                               Capacity Gap: <span className={scenario.gap <= 0 ? 'text-green-600' : 'text-red-600 font-bold'}>{Math.abs(scenario.gap).toFixed(2)} Physical CPU {scenario.gap <= 0 ? 'surplus' : 'deficit'}</span><br/>
                               Status: <span className={scenario.status === 'Resilient' ? 'text-green-600' : 'text-red-600 font-bold'}>{scenario.status}</span></p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 border-t-2 pt-4">
                      <p className="font-medium">Overall N-1 (Biggest Site Down) Resilience Analysis:</p>
                      <p>
                        Total Resillience Max Sessions based on Target %: {Math.round(maxSessions * (loadFactor / 100))}<br/>
                        Gap of N-1 Resilience Physical CPU: <span className={resourceAnalysis.failover.every(s => s.gap <= 0) ? 'text-green-600' : 'text-red-600 font-bold'}>
                          {Math.abs(resourceAnalysis.failover.reduce((acc, s) => acc + (s.gap > 0 ? s.gap : 0), 0)).toFixed(2)} CPU {resourceAnalysis.failover.every(s => s.gap <= 0) ? 'surplus' : 'needed'}
                        </span>
                      </p>
                      <div className="mt-4">
                        <p className="font-medium">Resource Optimization:</p>
                        <p>
                          Minimum Required Physical CPU Per-Site: {((Math.round(maxSessions * (loadFactor / 100)) * sessionCPU.physical) / sites.length).toFixed(2)}<br/>
                          Minimum Required Physical CPU Per-Site for N-1: {((Math.round(maxSessions * (loadFactor / 100)) * sessionCPU.physical) / (sites.length - 1)).toFixed(2)}<br/>
                          Resource Usage Efficiency: {((Math.round(maxSessions * (loadFactor / 100)) * sessionCPU.physical) / sites.reduce((acc, site) => acc + site.physicalCPU, 0) * 100).toFixed(2)}% (Required/Available ratio)<br/>
                          Session Density: {((sites.reduce((acc, site) => acc + site.physicalCPU, 0) > 0 ? Math.round(maxSessions * (loadFactor / 100)) / sites.reduce((acc, site) => acc + site.physicalCPU, 0) : 0)).toFixed(2)} sessions per CPU<br/>
                          Session Density for N-1: {((sites.reduce((acc, site) => acc + site.physicalCPU, 0) > 0 ? (Math.round(maxSessions * (loadFactor / 100)) / (sites.length - 1)) / (sites.reduce((acc, site) => acc + site.physicalCPU, 0) / sites.length) : 0)).toFixed(2)} sessions per CPU
                        </p>
                      </div>
                      
                      <div className="mt-4">
                            <p className="font-medium">Resource Optimization Analysis:</p>
                            <div className="pl-4 border-l-2 border-gray-200 mt-2 space-y-2">
                              <p>
                                <span className="font-medium">Physical CPU Utilization:</span><br/>
                                The current resource usage efficiency of {((Math.round(maxSessions * (loadFactor / 100)) * sessionCPU.physical) / sites.reduce((acc, site) => acc + site.physicalCPU, 0) * 100).toFixed(2)}% indicates 
                                {((Math.round(maxSessions * (loadFactor / 100)) * sessionCPU.physical) / sites.reduce((acc, site) => acc + site.physicalCPU, 0) * 100) < 60 ? 
                                " there is significant spare capacity in the system, which supports good failover capability but may indicate over-provisioning." : 
                                " the system is running at high utilization, which is efficient but may limit failover capacity."}
                              </p>
                              
                              <p>
                                <span className="font-medium">N-1 Resilience Status:</span><br/>
                                {resourceAnalysis.failover.every(s => s.gap <= 0) ? 
                                  "The system is fully N-1 resilient. It can handle the failure of any single site while maintaining service levels." : 
                                  "The system is not fully N-1 resilient. Additional capacity is needed to handle site failures without service degradation."}
                              </p>
                              
                              <p>
                                <span className="font-medium">Session Distribution:</span><br/>
                                With {sites.length} sites, each site handles approximately {(maxSessions / sites.length).toFixed(0)} sessions during normal operations.
                                During a site failure, the remaining {sites.length - 1} sites would need to handle {(maxSessions / (sites.length - 1)).toFixed(0)} sessions each.
                              </p>
                              
                              <p>
                                <span className="font-medium">Capacity Planning Recommendation:</span><br/>
                                {resourceAnalysis.failover.every(s => s.gap <= 0) ?
                                  `The current configuration provides adequate N-1 resilience. Consider monitoring resource usage patterns before any capacity changes.` :
                                  `To achieve N-1 resilience, add ${Math.max(0, ...resourceAnalysis.failover.map(s => s.gap)).toFixed(0)} CPU units distributed across the remaining sites.`
                                }
                              </p>
                            </div>

                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              {/* Resource Recommendation */}
              {sites.length > 2 && (
                <Alert>
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">AMS Resource Recommendation:</p>
                      <p>
                        Physical CPU Gap Required for Full N-1 Failover: <span className="font-bold">{Math.max(0, ...resourceAnalysis.failover.map(s => s.gap))}</span> CPU<br/>
                        Minimum Gap of Physical CPU Required for EU Sessions: <span className="font-bold">{resourceAnalysis.recommendation.euGap}</span> CPU
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </Card>

          <div className="space-y-4">
            {sites.map((site, index) => (
              <Card key={index} className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Site Name</label>
                    <Input
                      value={site.name}
                      onChange={(e) => updateSite(index, 'name', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Physical CPU</label>
                    <Input
                      type="number"
                      value={site.physicalCPU}
                      onChange={(e) => updateSite(index, 'physicalCPU', parseFloat(e.target.value))}
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 mt-8">
            <Card className="p-4">
              <CardTitle className="text-lg mb-4">24-Hour Load Distribution</CardTitle>
              <div className="h-64">
                <LineChart
                  width={800}
                  height={240}
                  data={hourlyData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="load" name="Load %" stroke="#8884d8" />
                  <Line type="monotone" dataKey="sessions" name="Sessions" stroke="#82ca9d" />
                </LineChart>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4">
                <Alert>
                  <AlertDescription>
                    <div className="space-y-2">
                      <p><span className="font-medium">Load Distribution Analysis:</span></p>
                      <p>High Load ({'>'}90%): {hourlyData.filter(d => d.load > 90).length} hours/day ({Math.round((hourlyData.filter(d => d.load > 90).length / 24) * 100)}%)<br/>
                      Medium Load (50-89%): {hourlyData.filter(d => d.load >= 50 && d.load <= 89).length} hours/day ({Math.round((hourlyData.filter(d => d.load >= 50 && d.load <= 89).length / 24) * 100)}%)<br/>
                      Low Load (21-49%): {hourlyData.filter(d => d.load >= 21 && d.load <= 49).length} hours/day ({Math.round((hourlyData.filter(d => d.load >= 21 && d.load <= 49).length / 24) * 100)}%)<br/>
                      Minimal Load (≤20%): {hourlyData.filter(d => d.load <= 20).length} hours/day ({Math.round((hourlyData.filter(d => d.load <= 20).length / 24) * 100)}%)</p>
                      
                      <p><span className="font-medium">Capacity Planning Insights:</span><br/>
                      Peak Load: {Math.max(...hourlyData.map(d => d.load))}%<br/>
                      Sustained High Load ({'>'}80%): {hourlyData.filter(d => d.load > 80).length} hours<br/>
                      Average Daily Load: {Math.round(hourlyData.reduce((acc, curr) => acc + curr.load, 0) / 24)}%</p>

                      <p><span className="font-medium">Critical Hours:</span><br/>
                      US Peak (14:00-02:00 UTC): {hourlyData.filter(d => {
                        const hour = parseInt(d.hour);
                        return (hour >= 14 && hour <= 23) || (hour >= 0 && hour <= 2);
                      }).length} hours<br/>
                      EU Peak (08:00-16:00 UTC): {hourlyData.filter(d => {
                        const hour = parseInt(d.hour);
                        return hour >= 8 && hour <= 16;
                      }).length} hours<br/>
                      APAC Peak (07:00-10:00 UTC): {hourlyData.filter(d => {
                        const hour = parseInt(d.hour);
                        return hour >= 7 && hour <= 10;
                      }).length} hours</p>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            </Card>
          </div>
        </div>
      </CardContent>
      </Card>
    </div>  
  </div>
 );
};

export default CitrixCalculator;