import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider }       from './context/AuthContext.jsx';
import { CommitmentProvider } from './context/CommitmentContext.jsx';
import { ChronosProvider }    from './context/ChronosContext.jsx';
import { ToastProvider }      from './context/ToastContext.jsx';
import { DemoProvider }       from './context/DemoContext.jsx';
import { CalendarProvider }   from './context/CalendarContext.jsx';
import { AgentProvider }      from './context/AgentContext.jsx';
import { CompanionProvider }  from './components/companion/CompanionShared.jsx';
import Layout                 from './components/layout/Layout.jsx';
import ParticleCanvas         from './components/ui/ParticleCanvas.jsx';
import LoadingOverlay         from './components/ui/LoadingOverlay.jsx';
import ToastContainer         from './components/ui/ToastContainer.jsx';
import CompanionDashboard     from './screens/CompanionDashboard.jsx';
import Rescue                  from './screens/Rescue.jsx';
import Converse               from './screens/Converse.jsx';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <DemoProvider>
          <CommitmentProvider>
            <CalendarProvider>
              <AgentProvider>
                <CompanionProvider>
                <ChronosProvider>
                  <ParticleCanvas />
                  <LoadingOverlay />
                  <ToastContainer />
                  <Layout>
                    <Routes>
                      <Route path="/"                element={<Navigate to="/dashboard" replace />} />
                      <Route path="/dashboard"       element={<CompanionDashboard />} />
                      <Route path="/rescue"          element={<Rescue />} />
                      <Route path="/converse"        element={<Converse />} />
                      {/* Tasks/Plan/Review/Reflect/Firefighter/Consequence/Intelligence
                          no longer have dedicated screens — those engines still run
                          via AgentContext and surface through Home's moments feed
                          and through chat. Any stray link to them lands on Home. */}
                      <Route path="*"                element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                  </Layout>
                </ChronosProvider>
                </CompanionProvider>
              </AgentProvider>
            </CalendarProvider>
          </CommitmentProvider>
        </DemoProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
