import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export const ResourceAnalysisCard = ({ resourceAnalysis, sites, maxSessions, loadFactor, sessionCPU, serverPhysicalCPU }) => (
  <Card className="p-4">
    <CardTitle className="text-lg mb-4">Resource Analysis Summary</CardTitle>
    <div className="space-y-4">
      <Alert>
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium">Normal Operations:</p>
            <p>
              Total Physical Servers: {sites.reduce((acc, site) => acc + site.physicalServers, 0)}<br/>
              Total Physical CPU Available: {sites.reduce((acc, site) => acc + site.physicalCPU, 0)}<br/>
              Peak Load Physical CPU Required: {(maxSessions * sessionCPU.physical).toFixed(2)}<br/>
              Required Servers for Peak Load: {Math.ceil((maxSessions * sessionCPU.physical) / serverPhysicalCPU)}<br/>
              Resource Margin: <span className={resourceAnalysis.normalOps.margin >= 0 ? 'text-green-600' : 'text-red-600 font-bold'}>
                {resourceAnalysis.normalOps.margin.toFixed(2)} Physical CPU ({Math.ceil(resourceAnalysis.normalOps.margin / serverPhysicalCPU)} Servers)
              </span><br/>
              Capacity Status: <span className={resourceAnalysis.normalOps.margin >= 0 ? 'text-green-600' : 'text-red-600 font-bold'}>
                {resourceAnalysis.normalOps.status}
              </span>
            </p>
          </div>
        </AlertDescription>
      </Alert>

      <Alert>
        <AlertDescription>
          <div className="space-y-2">
            <div className="mt-4">
              <p className="font-medium">Site Failover Scenarios:</p>
              {resourceAnalysis.failover.map((scenario, index) => {
                const remainingSites = sites.filter(site => site.name !== scenario.site);
                return (
                  <div key={index} className="pl-4 border-l-2 border-gray-200 mt-2">
                    <p className="font-medium">If {scenario.site} Fails:</p>
                    <p>
                      Remaining Servers: {remainingSites.reduce((acc, site) => acc + site.physicalServers, 0)}<br/>
                      Remaining Capacity: {scenario.capacity} Physical CPU<br/>
                      Capacity Gap: <span className={scenario.gap <= 0 ? 'text-green-600' : 'text-red-600 font-bold'}>
                        {Math.abs(scenario.gap).toFixed(2)} Physical CPU ({Math.ceil(Math.abs(scenario.gap) / serverPhysicalCPU)} Servers) {scenario.gap <= 0 ? 'surplus' : 'deficit'}
                      </span><br/>
                      Status: <span className={scenario.status === 'Resilient' ? 'text-green-600' : 'text-red-600 font-bold'}>
                        {scenario.status}
                      </span>
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 border-t-2 pt-4">
              <p className="font-medium">Overall N-1 (Worse Case) Resilience Analysis:</p>
              <p>
                Target Resilience Max Sessions: {Math.round(maxSessions * (loadFactor / 100))}<br/>
                Total Servers at Normal Operations: {sites.reduce((acc, site) => acc + site.physicalServers, 0)} ({sites.reduce((acc, site) => acc + site.physicalCPU, 0)} Physical CPU)<br/>
                Gap of N-1 Resilience: <span className={resourceAnalysis.failover.every(s => s.gap <= 0) ? 'text-green-600' : 'text-red-600 font-bold'}>
                  {Math.abs(resourceAnalysis.failover.reduce((acc, s) => acc + (s.gap > 0 ? s.gap : 0), 0)).toFixed(2)} CPU 
                  ({Math.ceil(Math.abs(resourceAnalysis.failover.reduce((acc, s) => acc + (s.gap > 0 ? s.gap : 0), 0)) / serverPhysicalCPU)} Servers) 
                  {resourceAnalysis.failover.every(s => s.gap <= 0) ? ' surplus' : ' needed'}
                </span>
              </p>

              <div className="mt-4">
                <p className="font-medium">Regional Optimization Analysis:</p>
                <div className="pl-4 border-l-2 border-gray-200 mt-2 space-y-2">
                  <RegionalAnalysis 
                    sites={sites} 
                    maxSessions={maxSessions} 
                    sessionCPU={sessionCPU} 
                    resourceAnalysis={resourceAnalysis}
                    serverPhysicalCPU={serverPhysicalCPU}
                  />
                </div>
              </div>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  </Card>
);

export const LoadDistributionChart = ({ hourlyData }) => (
  <Card className="p-4">
    <CardTitle className="text-lg mb-4">24-Hour Load Distribution</CardTitle>
    <div className="h-64">
      <LineChart
        width={1000}
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
    <LoadAnalysis hourlyData={hourlyData} />
  </Card>
);

const LoadAnalysis = ({ hourlyData }) => (
  <div className="mt-4 grid grid-cols-1 gap-4">
    <Alert>
      <AlertDescription>
        <div className="space-y-2">
          <p><span className="font-medium">Load Distribution Analysis:</span></p>
          <p>
            High Load ({'>'}90%): {hourlyData.filter(d => d.load > 90).length} hours/day ({Math.round((hourlyData.filter(d => d.load > 90).length / 24) * 100)}%)<br/>
            Medium Load (50-89%): {hourlyData.filter(d => d.load >= 50 && d.load <= 89).length} hours/day ({Math.round((hourlyData.filter(d => d.load >= 50 && d.load <= 89).length / 24) * 100)}%)<br/>
            Low Load (21-49%): {hourlyData.filter(d => d.load >= 21 && d.load <= 49).length} hours/day ({Math.round((hourlyData.filter(d => d.load >= 21 && d.load <= 49).length / 24) * 100)}%)<br/>
            Minimal Load (≤20%): {hourlyData.filter(d => d.load <= 20).length} hours/day ({Math.round((hourlyData.filter(d => d.load <= 20).length / 24) * 100)}%)
          </p>

          <p><span className="font-medium">Capacity Planning Insights:</span><br/>
            Peak Load: {Math.max(...hourlyData.map(d => d.load))}%<br/>
            Sustained High Load ({'>'}80%): {hourlyData.filter(d => d.load > 80).length} hours<br/>
            Average Daily Load: {Math.round(hourlyData.reduce((acc, curr) => acc + curr.load, 0) / 24)}%
          </p>

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
            }).length} hours
          </p>
        </div>
      </AlertDescription>
    </Alert>
  </div>
);

const RegionalAnalysis = ({ sites, maxSessions, sessionCPU, serverPhysicalCPU }) => {
  const isTwoSiteConfig = sites.length === 2;
  const naSites = sites.filter(s => s.name.includes('SLC') || s.name.includes('LVS'));
  const naTotalServers = naSites.reduce((acc, site) => acc + site.physicalServers, 0);
  const naTotalCPU = naSites.reduce((acc, site) => acc + site.physicalCPU, 0);
  const euSites = sites.filter(s => s.name.includes('AMS'));
  const euTotalServers = euSites.reduce((acc, site) => acc + site.physicalServers, 0);
  const euTotalCPU = euSites.reduce((acc, site) => acc + site.physicalCPU, 0);

  return (
    <>
      <p>
        <span className="font-medium">Regional Workload Analysis:</span><br/>
        • North America (66% of load):<br/>
        - Peak requirement: {(maxSessions * 0.66).toFixed(0)} sessions ({(maxSessions * 0.66 * sessionCPU.physical).toFixed(0)} pCPU / {Math.ceil((maxSessions * 0.66 * sessionCPU.physical) / serverPhysicalCPU)} Servers)<br/>
        - Current NA capacity: {naTotalServers} Servers ({naTotalCPU} pCPU)<br/>
        - NA Resilience Status: <span className={
          isTwoSiteConfig ? 
          (naTotalCPU >= (maxSessions * sessionCPU.physical) ? 
            "text-green-600 font-bold" : "text-red-600 font-bold") :
          (naTotalCPU >= (maxSessions * 0.66 * sessionCPU.physical) ? 
            "text-green-600 font-bold" : "text-red-600 font-bold")
        }>{
          isTwoSiteConfig ? 
          (naTotalCPU >= (maxSessions * sessionCPU.physical) ? 
            "Can handle full workload by NA Physical CPUs" : "NA sites cannot handle full workload") :
          (naTotalCPU >= (maxSessions * 0.66 * sessionCPU.physical) ? 
            "Sufficient NA regional capacity" : "Additional capacity needed")
        }</span>
      </p>
      
      {!isTwoSiteConfig && (
        <p>
          • Europe (34% of load):<br/>
          - Peak requirement: {(maxSessions * 0.34).toFixed(0)} sessions ({(maxSessions * 0.34 * sessionCPU.physical).toFixed(0)} pCPU / {Math.ceil((maxSessions * 0.34 * sessionCPU.physical) / serverPhysicalCPU)} Servers)<br/>
          - Current EU capacity: {euTotalServers} Servers ({euTotalCPU} pCPU)<br/>
          - EU Resilience Status: <span className={euTotalCPU >= (maxSessions * 0.34 * sessionCPU.physical) ? 
            "text-green-600 font-bold" : "text-red-600 font-bold"}>{euTotalCPU >= (maxSessions * 0.34 * sessionCPU.physical) ? 
            "Sufficient EU regional capacity" : "Additional capacity needed"}</span>
        </p>
      )}

      <p>
        <span className="font-medium">Recommendations:</span><br/>
        {isTwoSiteConfig ? (
          <>
            • <span className="text-red-600 font-bold">Current two-site configuration requires each site to maintain 100% capacity for full resilience</span><br/>
            • Consider adding AMS site to:<br/>
            - <span className="text-green-600">Reduce per-site failover capacity requirements from 100% to 50%</span><br/>
            - <span className="text-green-600">Improve EU user experience</span><br/>
            - <span className="text-green-600">Enable regional workload distribution</span><br/>
            • Short-term: Ensure each NA site can handle full workload<br/>
            • Long-term: Plan for EU expansion with AMS site
          </>
        ) : (
          <span className={euTotalCPU >= (maxSessions * 0.34 * sessionCPU.physical) ? 
            "text-green-600" : "text-red-600"}>
            {euTotalCPU >= (maxSessions * 0.34 * sessionCPU.physical) ?
              "• Current configuration provides good regional resilience. Monitor EU/NA load distribution for potential capacity adjustments." :
              "• Consider increasing AMS capacity to fully support EU regional workload and improve cross-region failover capabilities."}
          </span>
        )}
      </p>
    </>
  );
};

export default { ResourceAnalysisCard, LoadDistributionChart };