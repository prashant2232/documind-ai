import { MessageSquare, LayoutDashboard, Plus, Brain, PanelLeftClose, PanelLeft, Trash2, LogOut } from "lucide-react";
import { useAppState } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { FileList } from "@/components/FileList";
import { FileUpload } from "@/components/FileUpload";
import { ChatPanel } from "@/components/ChatPanel";
import { Dashboard } from "@/components/Dashboard";
import { motion, AnimatePresence } from "framer-motion";

const Index = () => {
  const { activeView, setActiveView, sidebarOpen, setSidebarOpen, files, sessions, activeSessionId, switchSession, deleteSession, createSession } = useAppState();
  const { user, signOut } = useAuth();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 flex flex-col h-full bg-sidebar border-r border-sidebar-border overflow-hidden"
          >
            {/* Logo */}
            <div className="flex items-center gap-2.5 px-4 py-4 border-b border-sidebar-border">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/15">
                <Brain className="h-4.5 w-4.5 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-semibold text-foreground truncate">InsightAI</h1>
                <p className="text-xs text-muted-foreground">Document Assistant</p>
              </div>
            </div>

            {/* Nav */}
            <div className="px-2 py-2 space-y-0.5">
              <button
                onClick={() => setActiveView("chat")}
                className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                  activeView === "chat"
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                Chat
              </button>
              <button
                onClick={() => setActiveView("dashboard")}
                className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                  activeView === "dashboard"
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
                {files.length > 0 && (
                  <span className="ml-auto text-xs bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">
                    {files.length}
                  </span>
                )}
              </button>
            </div>

            {/* New Chat Button */}
            <div className="px-3 py-2">
              <button
                onClick={() => createSession()}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Chat
              </button>
            </div>

            {/* Chat History */}
            <div className="px-4 py-1">
              <p className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">History</p>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin px-2 space-y-0.5">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => { switchSession(session.id); setActiveView("chat"); }}
                  className={`group flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
                    activeSessionId === session.id
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5 flex-shrink-0 opacity-50" />
                  <span className="truncate flex-1">{session.title}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/20 hover:text-destructive transition-all"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {sessions.length === 0 && (
                <p className="text-xs text-muted-foreground/40 px-3 py-2">No chat history yet</p>
              )}
            </div>

            {/* Divider */}
            <div className="px-4 py-2 border-t border-sidebar-border">
              <p className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">Files</p>
            </div>

            {/* File list */}
            <div className="max-h-40 overflow-y-auto scrollbar-thin">
              <FileList />
            </div>

            {/* Upload */}
            <FileUpload />

            {/* User / Sign Out */}
            <div className="px-3 pb-3 pt-1 border-t border-sidebar-border">
              <div className="flex items-center gap-2 px-2 py-2">
                <span className="text-xs text-muted-foreground truncate flex-1">{user?.email}</span>
                <button
                  onClick={signOut}
                  className="p-1.5 rounded-lg hover:bg-destructive/20 hover:text-destructive text-muted-foreground transition-colors"
                  title="Sign out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center gap-3 h-12 px-4 border-b border-border/50 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
          >
            {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          </button>
          <span className="text-sm font-medium text-foreground/70">
            {activeView === "chat" ? "Chat" : "Dashboard"}
          </span>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-hidden">
          {activeView === "chat" ? <ChatPanel /> : <Dashboard />}
        </main>
      </div>
    </div>
  );
};

export default Index;
