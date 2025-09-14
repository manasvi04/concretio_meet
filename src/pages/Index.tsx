import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { VideoCall } from "@/components/VideoCall";
import { Notepad } from "@/components/Notepad";
import { CreateRoomModal } from "@/components/CreateRoomModal";
import { WelcomePage } from "@/components/WelcomePage";
import { JoinRoomModal } from "@/components/JoinRoomModal";
import { useToast } from "@/hooks/use-toast";
import { createRoomUrl } from "@/utils/dailyApi";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import concretioLogo from "@/assets/concretio-logo.png";
import { MdCode } from "react-icons/md";

type AppState = "welcome" | "meeting";

const Index = () => {
  const [appState, setAppState] = useState<AppState>("welcome");
  const [isNotepadOpen, setIsNotepadOpen] = useState(false);
  const [roomUrl, setRoomUrl] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<{
    status: "Good" | "Bad";
    packetLoss: number;
    uploadRate?: number;
    downloadRate?: number;
  } | null>(null);
  
  // Modal states
  const [isCreateRoomModalOpen, setIsCreateRoomModalOpen] = useState(false);
  const [isJoinRoomModalOpen, setIsJoinRoomModalOpen] = useState(false);
  
  const { toast } = useToast();

  const videoCallRef = useRef<{
    joinCall: () => void;
    leaveCall: () => void;
  }>(null);

  const handleJoinRoom = () => {
    setIsJoinRoomModalOpen(true);
  };

  const handleCreateRoom = () => {
    setIsCreateRoomModalOpen(true);
  };

  const handleJoinRoomSuccess = (verifiedRoomUrl: string) => {
    setRoomUrl(verifiedRoomUrl);
    setAppState("meeting");
    setIsJoinRoomModalOpen(false);
    
    // Join the call after a brief delay
    setTimeout(() => {
      videoCallRef.current?.joinCall();
    }, 500);
  };

  const handleLeaveCall = () => {
    // Trigger Daily to leave; when "left-meeting" fires, onJoinedChange(false) will navigate to Welcome
    videoCallRef.current?.leaveCall();
  };

  const handleJoinedChange = (joined: boolean) => {
    setIsJoined(joined);
    if (!joined) {
      // Reset state and navigate to Welcome screen
      setAppState("welcome");
      setRoomUrl("");
    }
  };

  const handleBackToWelcome = () => {
    if (isJoined) {
      setShowLeaveWarning(true);
    } else {
      setAppState("welcome");
      setRoomUrl("");
    }
  };

  const handleJoinError = (error: string) => {
    toast({
      variant: "destructive",
      title: "Failed to Join Room",
      description: error,
    });
  };

  const handleForceRefresh = () => {
    window.removeEventListener("beforeunload", () => {});
    localStorage.removeItem("notepad-content");
    localStorage.removeItem("notepad-mode");
    window.location.reload();
  };

  const handleLeaveToWelcome = () => {
    handleLeaveCall();
    setAppState("welcome");
    setRoomUrl("");
    setIsJoined(false);
    setShowLeaveWarning(false);
  };

  // Add beforeunload event listener
  useEffect(() => {
    const hasImportantData = () => {
      const hasRoomData = isJoined || roomUrl.trim() !== "";
      const hasNotepadData = isNotepadOpen;
      const savedContent = localStorage.getItem("notepad-content");
      const hasNotepadContent =
        savedContent &&
        savedContent !== "// You can write code or take notes here" &&
        savedContent.trim() !== "";

      return hasRoomData || hasNotepadData || hasNotepadContent;
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasImportantData()) {
        const message =
          "Are you sure you want to leave? All your data (call session, room URL, and code notes) will be lost.";
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey && event.key === "r") || event.key === "F5") {
        if (hasImportantData()) {
          event.preventDefault();
          setShowLeaveWarning(true);
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isJoined, roomUrl, isNotepadOpen]);

  // Close modals when call is joined
  useEffect(() => {
    if (isJoined) {
      setIsCreateRoomModalOpen(false);
      setIsJoinRoomModalOpen(false);
    }
  }, [isJoined]);

  // Ensure notepad is only available when actually in a joined call
  useEffect(() => {
    if (!isJoined && isNotepadOpen) {
      setIsNotepadOpen(false);
    }
  }, [isJoined, isNotepadOpen]);

  if (appState === "welcome") {
    return (
      <>
        <WelcomePage 
          onJoinRoom={handleJoinRoom}
          onCreateRoom={handleCreateRoom}
        />
        
        <JoinRoomModal
          isOpen={isJoinRoomModalOpen}
          onClose={() => setIsJoinRoomModalOpen(false)}
          onJoinRoom={handleJoinRoomSuccess}
        />
        
        <CreateRoomModal
          isOpen={isCreateRoomModalOpen}
          onClose={() => setIsCreateRoomModalOpen(false)}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-dark">
      {/* Header */}
      <header className="bg-card/50 backdrop-blur-sm border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              id="back-to-welcome-button"
              onClick={handleBackToWelcome}
              className="mr-2 hover:bg-muted"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <img src={concretioLogo} alt="Concret.io" className="h-8" />
            <h1 className="text-xl font-bold text-foreground">
              CANDIDLY
            </h1>
          </div>

          <div className="flex items-center space-x-2">
            {isJoined && networkStatus && (
              <div className="flex items-center space-x-2 px-3 py-1 bg-muted rounded-md">
                <div
                  className={`w-2 h-2 rounded-full ${
                    networkStatus.status === "Good"
                      ? "bg-primary"
                      : "bg-red-500"
                  }`}
                />
                <span className="text-sm text-muted-foreground font-medium">
                  Network: {networkStatus.status}
                </span>
              </div>
            )}
            {isJoined && (
              <Button
                variant={isNotepadOpen ? "default" : "secondary"}
                size="sm"
                id="toggle-notepad-button"
                onClick={() => setIsNotepadOpen(!isNotepadOpen)}
              >
                <MdCode size={20} color="#fbfbfeff" />
                Code
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="flex-1 h-full">
          {/* Video Call Panel */}
          <ResizablePanel defaultSize={isNotepadOpen ? 70 : 100} minSize={30}>
            <div className="h-full w-full p-6">
              <VideoCall
                ref={videoCallRef}
                roomUrl={roomUrl}
                onJoinedChange={handleJoinedChange}
                isJoined={isJoined}
                onLeaveCall={handleLeaveCall}
                onJoinError={handleJoinError}
                onNetworkStatsChange={setNetworkStatus}
              />
            </div>
          </ResizablePanel>

          {/* Handle */}
          {isJoined && isNotepadOpen && <ResizableHandle withHandle />}

          {/* Notepad Panel */}
          {isJoined && isNotepadOpen && (
            <ResizablePanel defaultSize={30} minSize={20} maxSize={60}>
              <div className="h-full w-full">
                <Notepad
                  isOpen={isNotepadOpen}
                  onClose={() => setIsNotepadOpen(false)}
                />
              </div>
            </ResizablePanel>
          )}
        </ResizablePanelGroup>
      </div>

      {/* Footer */}
      <footer className="bg-card/30 backdrop-blur-sm border-t border-border px-6 py-3">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">
            <span className="text-primary font-semibold"> powered by Concret.io</span>
          </p>
        </div>
      </footer>

      {/* Leave Warning Dialog */}
      <AlertDialog open={showLeaveWarning} onOpenChange={setShowLeaveWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Are you sure you want to leave?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Leaving will end your current session and result in the loss of:
              <ul className="list-disc list-inside mt-2 space-y-1">
                {isJoined && <li>Current video call session</li>}
                {roomUrl && <li>Room connection</li>}
                {(isNotepadOpen || localStorage.getItem("notepad-content")) && (
                  <li>All code notes and content</li>
                )}
                <li>Any unsaved work</li>
              </ul>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel id="leave-dialog-stay-button">Stay in Meeting</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleLeaveToWelcome}
              id="leave-dialog-confirm-button"
            >
              Leave Meeting
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
