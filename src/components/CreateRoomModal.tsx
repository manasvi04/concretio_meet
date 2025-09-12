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
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleClose = () => {
    setStep("password");
    setPassword("");
    setRoomName("");
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
      // Get the password from environment variable (Vite)
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

      // Validate password
      if (password === correctPassword) {
        setStep("roomName");
        toast({
          title: "Password Validated ✅",
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
    if (!roomName.trim()) {
      toast({
        variant: "destructive",
        title: "Room Name Required",
        description: "Please enter a room name.",
      });
      return;
    }

    // Validate room name format
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
      // Check if room already exists
      const verification = await verifyRoomExists(roomName);
      
      if (verification.exists) {
        toast({
          variant: "destructive",
          title: "Room Already Exists ⚠️",
          description: `Room name "${roomName}" already exists. Please use a different room name.`,
        });
        setIsLoading(false);
        return;
      }

      // Create the room
      const result = await createRoom(roomName, {
        privacy: 'public',
        properties: {
          max_participants: 50,
          enable_chat: true,
          enable_knocking: false,
          enable_screenshare: true,
          enable_recording: false,
        }
      });

      if (result.success && result.roomInfo) {
        toast({
          title: "Room Created Successfully! 🎉",
          description: `Room "${result.roomInfo.name}" has been created. You can now use it for meetings.`,
        });
        
        // Copy room URL to clipboard
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
      <DialogContent className="sm:max-w-md bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 border border-border shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Room
          </DialogTitle>
          <DialogDescription className="text-neutral-700 dark:text-neutral-300">
            {step === "password" 
              ? "Enter the admin password to create a new room."
              : "Enter a unique name for your new room."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {step === "password" ? (
            <div className="space-y-2">
              <Label htmlFor="password" className="text-neutral-800 dark:text-neutral-200">Admin Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="w-full rounded-xl bg-neutral-900 text-white placeholder:text-neutral-400 dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-500 border-neutral-700 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-emerald-500"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="roomName" className="text-neutral-800 dark:text-neutral-200">Room Name</Label>
              <Input
                id="roomName"
                type="text"
                placeholder="e.g., my-meeting-room"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="w-full rounded-xl bg-neutral-900 text-white placeholder:text-neutral-400 dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-500 border-neutral-700 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-emerald-500"
              />
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Only letters, numbers, hyphens, and underscores are allowed.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-end">
          <Button
            onClick={step === "password" ? validatePassword : createNewRoom}
            disabled={isLoading}
            className="bg-gradient-primary hover:opacity-90 px-6 py-2 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {step === "password" ? "Validating..." : "Creating..."}
              </>
            ) : (
              <>
                {step === "password" ? "Validate" : "Create Room"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
;
