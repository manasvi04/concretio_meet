import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { verifyRoomExists, isValidRoomName } from "@/utils/dailyApi";
import { Loader2, Users, ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinRoom: (roomUrl: string) => void;
}

export const JoinRoomModal = ({ isOpen, onClose, onJoinRoom }: JoinRoomModalProps) => {
  const [step, setStep] = useState<"roomInput" | "instructions">("roomInput");
  const [roomUrl, setRoomUrl] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedRoomUrl, setVerifiedRoomUrl] = useState("");
  const [instructionsAccepted, setInstructionsAccepted] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handleClose = () => {
    setStep("roomInput");
    setRoomUrl("");
    setVerifiedRoomUrl("");
    setInstructionsAccepted(false);
    setIsVerifying(false);
    onClose();
  };

  const handleBack = () => {
    if (step === "instructions") {
      setStep("roomInput");
      setInstructionsAccepted(false);
    }
  };

  const validateAndProceed = async () => {
    if (isMobile) {
      toast({
        variant: "destructive",
        title: "Unsupported Device",
        description: "Please join from a laptop or desktop only.",
      });
      return;
    }
    if (!roomUrl.trim()) {
      toast({
        variant: "destructive",
        title: "Room Name Required",
        description: "Please enter a room name or URL.",
      });
      return;
    }

    if (!isValidRoomName(roomUrl)) {
      toast({
        variant: "destructive",
        title: "Invalid Room Name",
        description: "Room names can only contain letters, numbers, hyphens, and underscores.",
      });
      return;
    }

    setIsVerifying(true);

    try {
      const verification = await verifyRoomExists(roomUrl);

      if (!verification.exists) {
        setIsVerifying(false);
        toast({
          variant: "destructive",
          title: "Room Not Found ❌",
          description: `The room "${roomUrl}" doesn't exist. Please check the room name and try again.`,
        });
        return;
      }

      const fullRoomUrl = verification.roomInfo?.url || `https://concretio.daily.co/${roomUrl}`;
      setVerifiedRoomUrl(fullRoomUrl);

      toast({
        title: "Room Verified ✅",
        description: `Room "${verification.roomInfo?.name}" found! Proceeding to instructions...`,
      });

      setStep("instructions");
    } catch (error) {
      console.error("Room verification failed:", error);
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: "Unable to verify room. Please check your connection and try again.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleJoinCall = () => {
    if (!instructionsAccepted) {
      toast({
        variant: "destructive",
        title: "Instructions Required",
        description: "Please read and accept the instructions before joining.",
      });
      return;
    }

    onJoinRoom(verifiedRoomUrl);
    handleClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isVerifying) {
      if (step === "roomInput") {
        validateAndProceed();
      } else if (step === "instructions" && instructionsAccepted) {
        handleJoinCall();
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border shadow-2xl rounded-2xl">
        <DialogHeader className="text-center pb-6">
          <DialogTitle className="flex gap-2 text-2xl font-bold text-foreground">
            <div className="p-2 bg-gradient-primary rounded-full">
              <Users className="h-6 w-6 text-white" />
            </div>
            Join Room
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-base mt-2 pl-12">
            {step === "roomInput"
              ? "Enter the room name or URL to join the meeting."
              : "Please review the instructions before joining the call."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6">
          {step === "roomInput" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                {/* <Label htmlFor="roomUrl" className="text-sm font-medium text-foreground">
                  Room Name or URL
                </Label> */}
                <Input
                  id="roomUrl"
                  placeholder="Enter room name or URL..."
                  value={roomUrl}
                  onChange={(e) => setRoomUrl(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isVerifying}
                  className="h-12 text-base rounded-xl bg-input border-2 border-border focus-visible:ring-0 focus-visible:ring-primary focus-visible:border-primary transition-all duration-200"
                />
                {roomUrl && !isValidRoomName(roomUrl) && (
                  <p className="text-xs text-destructive">
                    Invalid format. Use letters, numbers, hyphens, and underscores only.
                  </p>
                )}
              </div>

              <Button
                id="validate-room-button"
                onClick={validateAndProceed}
                disabled={!roomUrl || isVerifying || !isValidRoomName(roomUrl)}
                className="w-full h-12 bg-gradient-primary hover:opacity-90 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:transform-none"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                    Verifying Room...
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-5 h-5 ml-3" />
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Instructions */}
              <div className="bg-muted/50 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-semibold text-foreground mb-4">Interview Instructions</h3>

                {/* Scrollable instructions list */}
                <div className="space-y-3 text-sm text-muted-foreground max-h-56 overflow-y-auto pr-1">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <p>This interview is proctored in real time by the AI bot "Strata".</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <p>Any suspicious activity or use of unauthorized tools will lead to immediate termination.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <p>Ensure your microphone and camera permissions are enabled for the best experience.</p>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <p>Use headphones to prevent echo and improve audio quality for all participants.</p>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <p>Find a quiet, well-lit environment for optimal video and audio quality.</p>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <p>Only use integrated code editor for real-time collaboration during the interview.</p>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <p>Be respectful and professional during the interview. Mute when not speaking.</p>
                  </div>

                  {/* New instruction points */}

                </div>
              </div>

              {/* Checkbox */}
              <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-xl border border-primary/20">
                <input
                  type="checkbox"
                  id="instructions-checkbox"
                  checked={instructionsAccepted}
                  onChange={(e) => setInstructionsAccepted(e.target.checked)}
                  className="w-5 h-5 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2 mt-0.5"
                />
                <label htmlFor="instructions-checkbox" className="text-sm text-foreground cursor-pointer">
                  I have read and understood the meeting instructions and agree to follow them during the call.
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  id="instructions-back-button"
                  onClick={handleBack}
                  variant="outline"
                  className="flex-1 h-12 border-border text-foreground hover:bg-muted rounded-xl transition-all duration-200"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back
                </Button>

                <Button
                  id="join-room-confirm-button"
                  onClick={handleJoinCall}
                  disabled={!instructionsAccepted}
                  className="flex-1 h-12 bg-gradient-primary hover:opacity-90 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:transform-none"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Join Room
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
