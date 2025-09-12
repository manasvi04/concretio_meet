import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { verifyRoomExists, createRoom } from "@/utils/dailyApi";
import { Loader2, Plus } from "lucide-react";

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateRoomModal = ({ isOpen, onClose }: CreateRoomModalProps) => {
  const [step, setStep] = useState<"password" | "roomName">("password");
  const [password, setPassword] = useState("");
  const [roomName, setRoomName] = useState("");
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleClose = () => {
    setStep("password");
    setPassword("");
    setRoomName("");
    setDate('');
    setTime('');
    setIsLoading(false);
    onClose();
  };

  const validatePassword = async () => {
    if (!password.trim()) {
      toast({
        variant: "destructive",
        title: "Password Required",
        description: "Please enter the password to create a room.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const correctPassword = import.meta.env.VITE_CREATE_ROOM_PASSWORD;

      if (!correctPassword) {
        toast({
          variant: "destructive",
          title: "Configuration Error",
          description: "CREATE_ROOM_PASSWORD environment variable is not set.",
        });
        setIsLoading(false);
        return;
      }

      if (password === correctPassword) {
        setStep("roomName");
        toast({
          title: "🎉 Access Granted!",
          description: "Password validated successfully. Now create your room.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Invalid Password",
          description: "The password you entered is incorrect. Please try again.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Failed to validate password. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createNewRoom = async () => {
    const istToUnixTimestamp = (dateStr: string, timeStr: string): number | null => {
      if (!dateStr || !timeStr) return null;
      const dateTimeString = `${dateStr}T${timeStr}:00`;
      const dateInIST = new Date(`${dateTimeString}+05:30`);
      if (isNaN(dateInIST.getTime())) {
        toast({
          variant: "destructive",
          title: "Invalid Date/Time",
          description: "Please enter a valid date and time.",
        });
        return null;
      }
      return Math.floor(dateInIST.getTime() / 1000);
    };

    if (!roomName.trim()) {
      toast({
        variant: "destructive",
        title: "Room Name Required",
        description: "Please enter a room name.",
      });
      return;
    }

    const roomNameRegex = /^[a-zA-Z0-9-_]+$/;
    if (!roomNameRegex.test(roomName)) {
      toast({
        variant: "destructive",
        title: "Invalid Room Name",
        description: "Room names can only contain letters, numbers, hyphens, and underscores.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const verification = await verifyRoomExists(roomName);
      if (verification.exists) {
        toast({
          variant: "destructive",
          title: "Room Already Exists ",
          description: `Room name "${roomName}" already exists. Please use a different room name.`,
        });
        setIsLoading(false);
        return;
      }

      const nbfTimestamp = istToUnixTimestamp(date, time);
      if (date && time && nbfTimestamp === null) {
        setIsLoading(false);
        return;
      }

      const result = await createRoom(roomName, {
        privacy: 'public',
        properties: {
          max_participants: 4,
          enable_chat: true,
          enable_knocking: false,
          enable_screenshare: true,
          enable_recording: 'cloud',
          enable_advanced_chat: false,
          enable_video_processing_ui: false,
          enable_live_captions_ui: false,
          enable_network_ui: true,
          ...(nbfTimestamp && { nbf: nbfTimestamp }),
        }
      });

      if (result.success && result.roomInfo) {
        toast({
          title: "🎉 Room Created Successfully!",
          description: `Room "${result.roomInfo.name}" is ready for your meetings.`,
        });
        if (navigator.clipboard) {
          try {
            await navigator.clipboard.writeText(result.roomInfo.url);
            toast({
              title: "📋 Room URL Copied!",
              description: "The room URL has been copied to your clipboard. Share it with participants!",
            });
          } catch (clipboardError) {
            console.warn("Failed to copy to clipboard:", clipboardError);
          }
        }
        handleClose();
      } else {
        toast({
          variant: "destructive",
          title: "Room Creation Failed",
          description: result.error || "Failed to create room. Please try again.",
        });
      }
    } catch (error) {
      console.error("Room creation error:", error);
      toast({
        variant: "destructive",
        title: "Creation Error",
        description: "An error occurred while creating the room. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      if (step === "password") {
        validatePassword();
      } else {
        createNewRoom();
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border shadow-2xl rounded-2xl">
        <DialogHeader className="text-center pb-6">
          <DialogTitle className="flex items-center justify-center gap-3 text-2xl font-bold text-foreground">
            <div className="p-2 bg-gradient-primary rounded-full">
              <Plus className="h-6 w-6 text-white" />
            </div>
            Create New Room
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-base mt-2">
            {step === "password"
              ? "Enter the admin password to create a new room."
              : "Enter details for your new room."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6">
          {step === "password" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Admin Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  className="h-12 text-base rounded-xl bg-input border-2 border-border focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all duration-200"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Room Name Row */}
              <div className="space-y-2">
                <Label htmlFor="roomName" className="text-sm font-medium text-foreground">
                  Room Name
                </Label>
                <Input
                  id="roomName"
                  placeholder="e.g., my-meeting-room"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  className="h-12 text-base rounded-xl bg-input border-2 border-border focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all duration-200"
                />
                <p className="text-xs text-muted-foreground">
                  Only letters, numbers, hyphens, and underscores are allowed.
                </p>
              </div>

              {/* Date and Time Row */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">
                  Schedule (Optional)
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date" className="text-xs text-muted-foreground">
                      Date (IST)
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={isLoading}
                      className="h-12 text-base rounded-xl bg-input border-2 border-border focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all duration-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time" className="text-xs text-muted-foreground">
                      Time (IST)
                    </Label>
                    <Input
                      id="time"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={isLoading}
                      className="h-12 text-base rounded-xl bg-input border-2 border-border focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all duration-200"
                    />
                  </div>
                </div>
                <p className="text-xs text-center text-muted-foreground bg-muted/50 rounded-lg p-3">
                  💡 Leave empty to create an immediate room, or set a future date/time for scheduled access.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 pb-6">
          <Button
            onClick={step === "password" ? validatePassword : createNewRoom}
            disabled={isLoading}
            className="w-full h-12 bg-gradient-primary hover:opacity-90 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:transform-none"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                {step === "password" ? "Validating..." : "Creating Room..."}
              </>
            ) : (
              <>
                {step === "password" ? "🔐 Validate Password" : "🚀 Create Room"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
