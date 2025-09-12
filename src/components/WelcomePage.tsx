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
            <h1 className="text-xl font-bold text-foreground">CANDIDLY</h1>
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
              Experience seamless video conferencing with integrated code collaboration. 
              Connect, communicate, and code together in real-time.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <Video className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">HD Video Calls</h3>
              <p className="text-muted-foreground text-sm">Crystal clear video and audio quality for professional meetings</p>
            </div>
            
            <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Secure & Private</h3>
              <p className="text-muted-foreground text-sm">End-to-end encryption ensures your conversations stay private</p>
            </div>
            
            <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Code Together</h3>
              <p className="text-muted-foreground text-sm">Built-in code editor for real-time collaboration and pair programming</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto">
            <Button
              onClick={onJoinRoom}
              size="lg"
              className="w-full sm:w-auto bg-gradient-primary hover:opacity-90 text-white font-semibold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
            >
              <Users className="w-5 h-5 mr-3" />
              Join Room
            </Button>
            
            <Button
              onClick={onCreateRoom}
              variant="outline"
              size="lg"
              className="w-full sm:w-auto border-primary/30 text-primary hover:bg-primary/10 font-semibold px-8 py-4 rounded-xl transition-all duration-300 transform hover:scale-[1.02]"
            >
              <Plus className="w-5 h-5 mr-3" />
              Create Room
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-1">99.9%</div>
              <div className="text-sm text-muted-foreground">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-1">&lt;100ms</div>
              <div className="text-sm text-muted-foreground">Latency</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-1">4K</div>
              <div className="text-sm text-muted-foreground">Video Quality</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-1">24/7</div>
              <div className="text-sm text-muted-foreground">Support</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-card/30 backdrop-blur-sm border-t border-border px-6 py-4">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">
            <span className="font-semibold text-foreground">CANDIDLY</span> is powered by{" "}
            <span className="text-primary font-semibold">Concret.io</span>
          </p>
        </div>
      </footer>
    </div>
  );
};
