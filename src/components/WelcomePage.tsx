import { Button } from "@/components/ui/button";
import { Users, Plus, Video, Shield, Clock, Zap } from "lucide-react";
import concretioLogo from "@/assets/concretio-logo.png";

interface WelcomePageProps {
  onJoinRoom: () => void;
  onCreateRoom: () => void;
}

export const WelcomePage = ({ onJoinRoom, onCreateRoom }: WelcomePageProps) => {
  return (
    <div className="min-h-screen bg-gradient-dark flex flex-col">
      {/* Header */}
      <header className="bg-card/50 backdrop-blur-sm border-b border-border px-6 py-4">
        <div className="container mx-auto">
          <div className="flex items-center gap-3">
            <img src={concretioLogo} alt="Concret.io" className="h-8" />
            <h1 className="text-xl font-bold text-foreground" style={{ color: "#EC8E00" }}>CANDIDLY</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-4xl mx-auto text-center">
          {/* Welcome Section */}
          <div className="mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Welcome to{" "}
              <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                CANDIDLY
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Run structured, high‑signal interviews. Create interview rooms in seconds, 
              invite candidates and interviewers, and collaborate live with integrated coding.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3 mx-auto">
                <Video className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Interview‑Ready Rooms</h3>
              <p className="text-muted-foreground text-sm">Share secure links and start on time with reliable audio/video</p>
            </div>
            
            <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3 mx-auto">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Fair & Secure</h3>
              <p className="text-muted-foreground text-sm">Privacy‑first experience that keeps candidates comfortable</p>
            </div>
            
            <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3 mx-auto">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Live Coding</h3>
              <p className="text-muted-foreground text-sm">Evaluate problem‑solving with a built‑in coding workspace</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto">
            <Button
              onClick={onJoinRoom}
              size="lg"
              className="w-full sm:w-auto bg-gradient-primary hover:opacity-90 text-white font-semibold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
            >
              <Users className="w-5 h-5" />
              Join Room
            </Button>
            
            <Button
              onClick={onCreateRoom}
              variant="outline"
              size="lg"
              className="w-full sm:w-auto border-primary/30 text-primary hover:bg-primary/10 font-semibold px-8 py-4 rounded-xl transition-all duration-300 transform hover:scale-[1.02]"
            >
              <Plus className="w-5 h-5" />
              Create Room
            </Button>
          </div>
          {/* Removed Quick Stats to keep the hero focused on interviews */}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-card/30 backdrop-blur-sm border-t border-border px-6 py-4">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">
            <span className="text-primary font-semibold"> powered by Concret.io</span>
          </p>
        </div>
      </footer>
    </div>
  );
};
