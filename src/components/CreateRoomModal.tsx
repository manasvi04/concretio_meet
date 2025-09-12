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
          title: "Password Validated ",
          description: "Now enter the room name you want to create.",
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
          title: "Room Created Successfully! ",
          description: `Room "${result.roomInfo.name}" has been created.`,
        });
        if (navigator.clipboard) {
          try {
            await navigator.clipboard.writeText(result.roomInfo.url);
            toast({
              title: "Room URL Copied",
              description: "The room URL has been copied to your clipboard.",
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
      <DialogContent className="sm:max-w-md bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 border-border shadow-xl">
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Plus className="h-5 w-5" />
            Create New Room
          </DialogTitle>
          <DialogDescription className="text-neutral-600 dark:text-neutral-400">
            {step === "password"
              ? "Enter the admin password to create a new room."
              : "Enter details for your new room."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {step === "password" ? (
            <div className="space-y-2 px-1">
              <Label htmlFor="password">Admin Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="w-full rounded-md bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 focus-visible:ring-2 focus-visible:ring-emerald-500"
              />
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="roomName" className="text-right">Name</Label>
                <Input
                  id="roomName"
                  placeholder="e.g., my-meeting-room"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  className="col-span-3 w-full rounded-md bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 focus-visible:ring-2 focus-visible:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="date" className="text-right">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  className="col-span-3 w-full rounded-md bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 focus-visible:ring-2 focus-visible:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="time" className="text-right">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  className="col-span-3 w-full rounded-md bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 focus-visible:ring-2 focus-visible:ring-emerald-500"
                />
              </div>
              <p className="col-span-4 text-xs text-center text-neutral-500 dark:text-neutral-400 pt-2">
                Schedule a room for a future time (optional, in IST).
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={step === "password" ? validatePassword : createNewRoom}
            disabled={isLoading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 px-6 py-2 text-white font-semibold rounded-lg shadow-md transition-all duration-200 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {step === "password" ? "Validating..." : "Creating Room..."}
              </>
            ) : (
              <>
                {step === "password" ? "Validate Password" : "Create Room"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
