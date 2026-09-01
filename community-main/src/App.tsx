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
  const { activeTab, currentUser, setIsAuthModalOpen } = useCommunity();

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
          {!currentUser ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="max-w-md w-full text-center space-y-6">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-amber-400 via-rose-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                  <span className="text-4xl">✨</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">
                    欢迎来到晨暮社区
                  </h2>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    请先登录或注册专属账号，即可体验：
                    <br />
                    大社区实时聊天 · 早晚双打卡 · 自建自律群 · 互相关注私聊
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="col-span-2 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.99]"
                  >
                    立即登录 / 免费注册
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-6">
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
                    <div className="text-2xl mb-1">🌅</div>
                    <div className="text-[11px] font-bold text-amber-800">早起打卡</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
                    <div className="text-2xl mb-1">🌙</div>
                    <div className="text-[11px] font-bold text-indigo-800">晚安复盘</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                    <div className="text-2xl mb-1">💬</div>
                    <div className="text-[11px] font-bold text-emerald-800">社区群聊</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'chat' && <CommunityChat />}
              {activeTab === 'checkin' && <CheckInBoard />}
              {activeTab === 'groups' && <GroupsView />}
              {activeTab === 'dm' && <PrivateChatView />}
              {activeTab === 'members' && <MembersDirectory />}
            </>
          )}
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

