import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VideoCall } from "@/components/VideoCall";
import { Notepad } from "@/components/Notepad";
import { useToast } from "@/hooks/use-toast";
import { verifyRoomExists, createRoomUrl, isValidRoomName } from "@/utils/dailyApi";
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
import { Phone, AlertTriangle, Loader2 } from "lucide-react";
import concretioLogo from "@/assets/concretio-logo.png";
import { MdCode } from "react-icons/md";

const Index = () => {
  const [isNotepadOpen, setIsNotepadOpen] = useState(false);
  const [roomUrl, setRoomUrl] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<{
    status: "Good" | "Bad";
    packetLoss: number;
    uploadRate?: number; // in kbps
    downloadRate?: number; // in kbps
  } | null>(null);
  
  // New state for API verification
  const [isVerifyingRoom, setIsVerifyingRoom] = useState(false);
  const [verifiedRoomUrl, setVerifiedRoomUrl] = useState<string>("");
  
  const { toast } = useToast();

  const videoCallRef = useRef<{
    joinCall: () => void;
    leaveCall: () => void;
  }>(null);

  const handleJoinCall = async () => {
    // Step 1: Basic validation (0ms)
    if (!roomUrl.trim()) {
      toast({
        variant: "destructive",
        title: "Invalid Room Name",
        description: "Please enter a room name or URL.",
      });
      return;
    }

    // Step 2: Format validation (immediate)
    if (!isValidRoomName(roomUrl)) {
      toast({
        variant: "destructive",
        title: "Invalid Room Name",
        description: "Room names can only contain letters, numbers, hyphens, and underscores.",
      });
      return;
    }

    // Step 3: API verification (200-500ms)
    setIsVerifyingRoom(true);

    try {
      const verification = await verifyRoomExists(roomUrl);
      
      if (!verification.exists) {
        // Room doesn't exist - show meaningful error message
        setIsVerifyingRoom(false);
        
        toast({
          variant: "destructive",
          title: "Room Not Found ❌",
          description: `The room "${roomUrl}" doesn't exist. Please check the room name and try again, or contact the meeting organizer for the correct room name.`,
        });
        return;
      }

      // Step 4: Room exists - prepare for join (immediate feedback)
      const fullRoomUrl = verification.roomInfo?.url || createRoomUrl(roomUrl);
      setVerifiedRoomUrl(fullRoomUrl);
      
      toast({
        title: "Room Verified ✅",
        description: `Room "${verification.roomInfo?.name}" found! Joining now...`,
      });

      // Step 5: Join the verified room after user clicked "Join Room"
      setTimeout(() => {
        videoCallRef.current?.joinCall();
        setIsVerifyingRoom(false);
      }, 500);

    } catch (error) {
      console.error("Room verification failed:", error);
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: "Unable to verify room. Please check your connection and try again.",
      });
      setIsVerifyingRoom(false);
    }
  };



  const handleLeaveCall = () => {
    videoCallRef.current?.leaveCall();
  };

  const handleJoinError = (error: string) => {
    setIsVerifyingRoom(false);
    toast({
      variant: "destructive",
      title: "Failed to Join Room",
      description: error,
    });
  };

  const handleForceRefresh = () => {
    // Remove event listeners to allow refresh
    window.removeEventListener("beforeunload", () => {});
    // Clear any data if needed
    localStorage.removeItem("notepad-content");
    localStorage.removeItem("notepad-mode");
    // Force refresh
    window.location.reload();
  };

  // Add beforeunload event listener and keyboard shortcuts to warn users about data loss
  useEffect(() => {
    const hasImportantData = () => {
      // Check if there's any data that would be lost
      const hasRoomData = isJoined || roomUrl.trim() !== "";
      const hasNotepadData = isNotepadOpen;
      // Check if there's saved content in localStorage
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
        event.returnValue = message; // For older browsers
        return message;
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl+R (refresh) or F5 (refresh)
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

  return (
    <div className="min-h-screen flex flex-col bg-gradient-dark">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src={concretioLogo} alt="Concret.io" className="h-8" />
            <h1 className="text-xl font-bold text-foreground">
              Concretio Meet
            </h1>
          </div>

          {!isJoined && (
            <div className="flex items-center justify-center flex-1 px-8">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Input
                    placeholder="Enter room name here..."
                    value={roomUrl}
                    onChange={(e) => {
                      setRoomUrl(e.target.value);
                      // Clear verified room URL when user changes input
                      if (verifiedRoomUrl) {
                        setVerifiedRoomUrl("");
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && roomUrl.trim() && !isVerifyingRoom) {
                        handleJoinCall();
                      }
                    }}
                    className="w-80 max-w-md border-primary focus:border-primary focus:ring-primary placeholder:text-white pr-4"
                    disabled={isVerifyingRoom}
                  />
                  {roomUrl && !isValidRoomName(roomUrl) && (
                    <div className="absolute top-full left-0 mt-1 text-xs text-red-400">
                      Invalid format. Use letters, numbers, hyphens, and underscores only.
                    </div>
                  )}
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleJoinCall}
                  disabled={!roomUrl || isVerifyingRoom || !isValidRoomName(roomUrl)}
                  className="bg-gradient-primary hover:opacity-90"
                >
                  {isVerifyingRoom ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Phone className="w-4 h-4 mr-2"/>
                      Join Call
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            {isJoined && networkStatus && (
              <div className="flex items-center space-x-2 px-3 py-1 bg-muted rounded-md">
                <div
                  className={`w-2 h-2 rounded-full ${
                    networkStatus.status === "Good"
                      ? "bg-green-500"
                      : "bg-red-500"
                  }`}
                />
                <span className="text-sm text-muted-foreground font-medium">
                  Network: {networkStatus.status}
                </span>
                {/* <span className="text-xs text-muted-foreground">
                  | <strong>Packet Loss:</strong>{" "}
                  {networkStatus.packetLoss ?? "-"}%
                  {typeof networkStatus.uploadRate === "number" && (
                    <>
                      {" "}
                      | <strong>Up:</strong> {networkStatus.uploadRate} kbps
                    </>
                  )}
                  {typeof networkStatus.downloadRate === "number" && (
                    <>
                      {" "}
                      | <strong>Down:</strong> {networkStatus.downloadRate} kbps
                    </>
                  )}
                </span> */}
              </div>
            )}
            <Button
              variant={isNotepadOpen ? "default" : "secondary"}
              size="sm"
              onClick={() => setIsNotepadOpen(!isNotepadOpen)}
            >
              <MdCode size={20} color="#fbfbfeff" />
              Code
            </Button>
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
                roomUrl={verifiedRoomUrl || (roomUrl ? createRoomUrl(roomUrl) : "")}
                onJoinedChange={setIsJoined}
                isJoined={isJoined}
                onLeaveCall={handleLeaveCall}
                onJoinError={handleJoinError}
                onNetworkStatsChange={setNetworkStatus}
              />
            </div>
          </ResizablePanel>

          {/* Handle */}
          {isNotepadOpen && <ResizableHandle withHandle />}

          {/* Notepad Panel */}
          {isNotepadOpen && (
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

      {/* Leave Warning Dialog */}
      <AlertDialog open={showLeaveWarning} onOpenChange={setShowLeaveWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Are you sure you want to leave?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Refreshing or leaving this page will result in the loss of all
              your data including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                {isJoined && <li>Current video call session</li>}
                {roomUrl && <li>Room URL information</li>}
                {(isNotepadOpen || localStorage.getItem("notepad-content")) && (
                  <li>All code notes and content</li>
                )}
                <li>Any unsaved work</li>
              </ul>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay on Page</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleForceRefresh}
            >
              Leave Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


    </div>
  );
};

export default Index;
