import { useState, useEffect, useMemo } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  verifyRoomExists, 
  createRoom, 
  listRooms, 
  updateRoom, 
  deleteRoom, 
  RoomListItem,
  extractRoomName 
} from "@/utils/dailyApi";
import { Loader2, Settings, Trash2, CalendarClock, Plus, ArrowLeft, Eye, EyeOff } from "lucide-react";

interface ManageRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ManageAction = "create" | "reschedule" | "delete";

export const ManageRoomModal = ({ isOpen, onClose }: ManageRoomModalProps) => {
  const [step, setStep] = useState<"password" | "action" | "details">("password");
  const [password, setPassword] = useState("");
  const [selectedAction, setSelectedAction] = useState<ManageAction>("create");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingRooms, setIsFetchingRooms] = useState(false);
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [deleteSearch, setDeleteSearch] = useState("");
  
  // Create room fields
  const [roomName, setRoomName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  
  // Reschedule fields
  const [selectedRescheduleRoom, setSelectedRescheduleRoom] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  
  // Delete fields
  const [selectedDeleteRoom, setSelectedDeleteRoom] = useState("");
  const [confirmDeleteName, setConfirmDeleteName] = useState("");
  
  const { toast } = useToast();

  const handleClose = () => {
    setStep("password");
    setPassword("");
    setSelectedAction("create");
    setIsLoading(false);
    setIsFetchingRooms(false);
    setRooms([]);
    setRoomName("");
    setDate("");
    setTime("");
    setSelectedRescheduleRoom("");
    setRescheduleDate("");
    setRescheduleTime("");
    setSelectedDeleteRoom("");
    setConfirmDeleteName("");
    setShowPassword(false);
    setDeleteSearch("");
    onClose();
  };

  const validatePassword = async () => {
    if (!password.trim()) {
      toast({
        variant: "destructive",
        title: "Password Required",
        description: "Please enter the password to manage rooms.",
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
        setStep("action");
        toast({
          title: "🎉 Access Granted!",
          description: "Password validated successfully. Choose your action.",
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

  const handleActionSelect = () => {
    setStep("details");
    if (selectedAction === "reschedule" || selectedAction === "delete") {
      fetchRooms();
    }
  };

  const fetchRooms = async () => {
    setIsFetchingRooms(true);
    try {
      const res = await listRooms();
      if (!res.success || !res.rooms) {
        toast({ 
          variant: "destructive", 
          title: "Failed to Load Rooms", 
          description: res.error || "Please try again." 
        });
        return;
      }
      setRooms(res.rooms);
    } catch (e) {
      console.error(e);
      toast({ 
        variant: "destructive", 
        title: "Failed to Load Rooms", 
        description: "Unexpected error while fetching rooms." 
      });
    } finally {
      setIsFetchingRooms(false);
    }
  };

  const futureRooms = useMemo(() => {
    const now = Date.now();
    return rooms.filter(r => {
      const nbf = (r.config as any)?.nbf as number | undefined;
      return nbf && nbf * 1000 > now;
    });
  }, [rooms]);

  const allRooms = useMemo(() => {
    return rooms.map(r => ({ name: r.name, id: r.id }));
  }, [rooms]);

  const filteredDeleteRooms = useMemo(() => {
    const q = deleteSearch.trim().toLowerCase();
    if (!q) return allRooms;
    return allRooms.filter(r => r.name.toLowerCase().includes(q));
  }, [allRooms, deleteSearch]);

  // Prefill reschedule date/time from selected room
  useEffect(() => {
    if (!selectedRescheduleRoom) return;
    const room = rooms.find(r => r.name === selectedRescheduleRoom);
    const nbf = room && (room.config as any)?.nbf as number | undefined;
    if (!nbf) return;
    const ms = nbf * 1000;
    const offsetMin = 330; // IST
    const ist = new Date(ms + offsetMin * 60 * 1000);
    const yyyy = ist.getUTCFullYear();
    const mm = String(ist.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(ist.getUTCDate()).padStart(2, '0');
    const HH = String(ist.getUTCHours()).padStart(2, '0');
    const MM = String(ist.getUTCMinutes()).padStart(2, '0');
    setRescheduleDate(`${yyyy}-${mm}-${dd}`);
    setRescheduleTime(`${HH}:${MM}`);
  }, [selectedRescheduleRoom, rooms]);

  const handleSubmit = async () => {
    if (selectedAction === "create") {
      await handleCreateRoom();
    } else if (selectedAction === "reschedule") {
      await handleRescheduleRoom();
    } else if (selectedAction === "delete") {
      await handleDeleteRoom();
    }
  };

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

  const handleCreateRoom = async () => {
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
          title: "Room Already Exists",
          description: `Room name "${roomName}" already exists. Please use a different room name.`,
        });
        setIsLoading(false);
        return;
      }

      const nowSec = Math.floor(Date.now() / 1000);
      const nbfTimestamp = istToUnixTimestamp(date, time);
      if (date && time && nbfTimestamp === null) {
        setIsLoading(false);
        return;
      }
      if (nbfTimestamp && nbfTimestamp <= nowSec) {
        toast({ 
          variant: "destructive", 
          title: "Must Be Future", 
          description: "Pick a future time for the meeting." 
        });
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

  const handleRescheduleRoom = async () => {
    if (!selectedRescheduleRoom) {
      toast({ 
        variant: "destructive", 
        title: "Select Room", 
        description: "Please select a room to reschedule." 
      });
      return;
    }
    
    const ts = istToUnixTimestamp(rescheduleDate, rescheduleTime);
    if (!ts) return;
    
    const nowSec = Math.floor(Date.now() / 1000);
    if (ts <= nowSec) {
      toast({ 
        variant: "destructive", 
        title: "Must Be Future", 
        description: "Pick a future time for the meeting." 
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await updateRoom(selectedRescheduleRoom, { properties: { nbf: ts } });
      if (!res.success) {
        toast({ 
          variant: "destructive", 
          title: "Reschedule Failed", 
          description: res.error || "Unable to reschedule room." 
        });
        return;
      }
      toast({ 
        title: "Rescheduled 🎉", 
        description: `New start: ${new Date(ts * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}` 
      });
      handleClose();
    } catch (e) {
      console.error(e);
      toast({ 
        variant: "destructive", 
        title: "Reschedule Error", 
        description: "Unexpected error while rescheduling." 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!selectedDeleteRoom) {
      toast({ 
        variant: "destructive", 
        title: "Select Room", 
        description: "Please select a room to delete." 
      });
      return;
    }
    
    if (confirmDeleteName !== selectedDeleteRoom) {
      toast({ 
        variant: "destructive", 
        title: "Confirmation Required", 
        description: "Please enter the exact room name to confirm deletion." 
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await deleteRoom(selectedDeleteRoom);
      if (!res.success) {
        toast({ 
          variant: "destructive", 
          title: "Delete Failed", 
          description: res.error || "Unable to delete room." 
        });
        return;
      }
      toast({ 
        title: "Room Deleted 🗑️", 
        description: `Room "${selectedDeleteRoom}" has been permanently deleted.` 
      });
      handleClose();
    } catch (e) {
      console.error(e);
      toast({ 
        variant: "destructive", 
        title: "Delete Error", 
        description: "Unexpected error while deleting room." 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getActionIcon = (action: ManageAction) => {
    switch (action) {
      case "create": return <Plus className="w-4 h-4" />;
      case "reschedule": return <CalendarClock className="w-4 h-4" />;
      case "delete": return <Trash2 className="w-4 h-4" />;
    }
  };

  const getActionTitle = () => {
    switch (selectedAction) {
      case "create": return "Create Room";
      case "reschedule": return "Reschedule Room";
      case "delete": return "Delete Room";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      if (step === "password") {
        validatePassword();
      } else if (step === "action") {
        handleActionSelect();
      } else {
        handleSubmit();
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border shadow-2xl rounded-2xl">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <div className="p-2 bg-gradient-primary rounded-full">
              <Settings className="h-6 w-6 text-white" />
            </div>
            Manage Rooms
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-base mt-2 text-left pl-12">
            {step === "password" && "Enter the admin password to manage rooms."}
            {step === "action" && "Choose what you'd like to do with your rooms."}
            {step === "details" && `Configure your ${getActionTitle().toLowerCase()} settings.`}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6">
          {step === "password" && (
            <div className="space-y-4">
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  className="h-12 pr-12 text-base rounded-xl bg-input border-2 border-border focus-visible:ring-0 focus-visible:ring-primary focus-visible:border-primary transition-all duration-200"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-3 my-auto h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          )}

          {step === "action" && (
            <div className="space-y-6">
              <RadioGroup value={selectedAction} onValueChange={(value) => setSelectedAction(value as ManageAction)}>
                <div className="flex items-center space-x-3 p-4 border border-border rounded-xl hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="create" id="create" />
                  <Label htmlFor="create" className="flex items-center gap-2 cursor-pointer flex-1">
                    {getActionIcon("create")}
                    <div>
                      <div className="font-medium">Create Room</div>
                      <div className="text-sm text-muted-foreground">Create a new interview room</div>
                    </div>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-3 p-4 border border-border rounded-xl hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="reschedule" id="reschedule" />
                  <Label htmlFor="reschedule" className="flex items-center gap-2 cursor-pointer flex-1">
                    {getActionIcon("reschedule")}
                    <div>
                      <div className="font-medium">Reschedule Room</div>
                      <div className="text-sm text-muted-foreground">Change the date/time of a scheduled room</div>
                    </div>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-3 p-4 border border-border rounded-xl hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="delete" id="delete" />
                  <Label htmlFor="delete" className="flex items-center gap-2 cursor-pointer flex-1">
                    {getActionIcon("delete")}
                    <div>
                      <div className="font-medium">Delete Room</div>
                      <div className="text-sm text-muted-foreground">Permanently remove a room</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {step === "details" && selectedAction === "create" && (
            <div className="space-y-6">
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
                  className="h-12 text-base rounded-xl bg-input border-2 border-border hover:border-primary/40 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary transition-all duration-200"
                />
                <p className="text-xs text-muted-foreground">
                  Only letters, numbers, hyphens, and underscores are allowed.
                </p>
              </div>

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
                      className="h-12 text-base rounded-xl bg-input border-2 border-border hover:border-primary/40 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary transition-all duration-200 text-foreground [color-scheme:dark]"
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
                      className="h-12 text-base rounded-xl bg-input border-2 border-border hover:border-primary/40 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary transition-all duration-200 text-foreground [color-scheme:dark]"
                    />
                  </div>
                </div>
                <p className="text-xs text-center text-muted-foreground bg-muted/50 rounded-lg p-3">
                  💡 Leave empty to create an immediate room, or set a future date/time for scheduled access.
                </p>
              </div>
            </div>
          )}

          {step === "details" && selectedAction === "reschedule" && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Select Room to Reschedule</Label>
                <Select 
                  onValueChange={setSelectedRescheduleRoom} 
                  value={selectedRescheduleRoom} 
                  disabled={isFetchingRooms || isLoading}
                >
                  <SelectTrigger className="w-full h-12">
                    <SelectValue placeholder={
                      isFetchingRooms ? "Loading rooms..." : 
                      (futureRooms.length ? "Choose a room" : "No eligible rooms found")
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {futureRooms.map((r) => (
                      <SelectItem key={r.id} value={r.name}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Only rooms with a future scheduled time are listed.</p>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">New Schedule</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rescheduleDate" className="text-xs text-muted-foreground">
                      Date (IST)
                    </Label>
                    <Input
                      id="rescheduleDate"
                      type="date"
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={isLoading}
                      className="h-12 text-base rounded-xl bg-input border-2 border-border hover:border-primary/40 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary transition-all duration-200 text-foreground [color-scheme:dark]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rescheduleTime" className="text-xs text-muted-foreground">
                      Time (IST)
                    </Label>
                    <Input
                      id="rescheduleTime"
                      type="time"
                      value={rescheduleTime}
                      onChange={(e) => setRescheduleTime(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={isLoading}
                      className="h-12 text-base rounded-xl bg-input border-2 border-border hover:border-primary/40 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary transition-all duration-200 text-foreground [color-scheme:dark]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === "details" && selectedAction === "delete" && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Select Room to Delete</Label>
                <Input
                  placeholder="Search rooms..."
                  value={deleteSearch}
                  onChange={(e) => setDeleteSearch(e.target.value)}
                  disabled={isFetchingRooms || isLoading}
                  className="h-10"
                />
                <Select 
                  onValueChange={setSelectedDeleteRoom} 
                  value={selectedDeleteRoom} 
                  disabled={isFetchingRooms || isLoading}
                >
                  <SelectTrigger className="w-full h-12">
                    <SelectValue placeholder={
                      isFetchingRooms ? "Loading rooms..." : 
                      (filteredDeleteRooms.length ? "Choose a room" : "No rooms found")
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredDeleteRooms.map((r) => (
                      <SelectItem key={r.id} value={r.name}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedDeleteRoom && (
                <div className="space-y-2">
                  <Label htmlFor="confirmDelete" className="text-sm font-medium text-foreground">
                    Confirm Deletion
                  </Label>
                  <Input
                    id="confirmDelete"
                    placeholder={`Type "${selectedDeleteRoom}" to confirm`}
                    value={confirmDeleteName}
                    onChange={(e) => setConfirmDeleteName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    className="h-12 text-base rounded-xl bg-input border-2 border-border hover:border-primary/40 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary transition-all duration-200"
                  />
                  <p className="text-xs text-red-400">
                    ⚠️ This action cannot be undone. The room will be permanently deleted.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="px-6 pb-6">
          <div className="flex w-full gap-3">
            {step === "details" && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("action")}
                className="h-12 flex-1 border-border text-foreground hover:bg-muted rounded-xl"
              >
                <ArrowLeft className="w-5 h-5 mr-2" /> Back
              </Button>
            )}
            <Button
              onClick={
                step === "password" ? validatePassword : 
                step === "action" ? handleActionSelect : 
                handleSubmit
              }
              disabled={isLoading}
              className="h-12 flex-1 bg-gradient-primary hover:opacity-90 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:transform-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  {step === "password" ? "Validating..." : 
                   step === "action" ? "Loading..." :
                   selectedAction === "create" ? "Creating..." :
                   selectedAction === "reschedule" ? "Rescheduling..." :
                   "Deleting..."}
                </>
              ) : (
                <>
                  {step === "password" ? "Validate Password" : 
                   step === "action" ? "Continue" :
                   selectedAction === "create" ? "Create Room" :
                   selectedAction === "reschedule" ? "Reschedule Room" :
                   "Delete Room"}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
