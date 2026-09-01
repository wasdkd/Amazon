import React from 'react';
import { CommunityProvider, useCommunity } from './context/CommunityContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { CommunityChat } from './components/CommunityChat';
import { CheckInBoard } from './components/CheckInBoard';
import { GroupsView } from './components/GroupsView';
import { PrivateChatView } from './components/PrivateChatView';
import { MembersDirectory } from './components/MembersDirectory';
import { CheckInModal } from './components/CheckInModal';
import { ProfileModal } from './components/ProfileModal';
import { NudgeModal } from './components/NudgeModal';
import { ToastNotification } from './components/ToastNotification';
import { AuthModal } from './components/AuthModal';

const AppContent: React.FC = () => {
  const { activeTab } = useCommunity();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col antialiased text-slate-900 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Bento Layout Area */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto p-2 sm:p-4 lg:p-6 gap-4 overflow-hidden">
        {/* Navigation Bento Sidebar */}
        <Sidebar />

        {/* Dynamic Main View Bento Panel */}
        <main className="flex-1 flex flex-col min-w-0 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden transition-all">
          {activeTab === 'chat' && <CommunityChat />}
          {activeTab === 'checkin' && <CheckInBoard />}
          {activeTab === 'groups' && <GroupsView />}
          {activeTab === 'dm' && <PrivateChatView />}
          {activeTab === 'members' && <MembersDirectory />}
        </main>
      </div>

      {/* Global Modals & Notifications */}
      <CheckInModal />
      <ProfileModal />
      <NudgeModal />
      <AuthModal />
      <ToastNotification />
    </div>
  );
};

export default function App() {
  return (
    <CommunityProvider>
      <AppContent />
    </CommunityProvider>
  );
}

