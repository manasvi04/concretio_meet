import { useEffect, useMemo, useState } from "react";
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
import { verifyRoomExists, extractRoomName, updateRoom } from "@/utils/dailyApi";
import { CalendarClock, Loader2, RotateCw, ArrowRight, ArrowLeft, CheckCircle } from "lucide-react";

interface RescheduleRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RescheduleRoomModal = ({ isOpen, onClose }: RescheduleRoomModalProps) => {
  const [step, setStep] = useState<"roomInput" | "selectTime" | "confirm">("roomInput");
  const [roomInput, setRoomInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [verifiedRoomName, setVerifiedRoomName] = useState<string>("");
  const [currentNbf, setCurrentNbf] = useState<number | null>(null); // seconds
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const { toast } = useToast();

  const handleClose = () => {
    setStep("roomInput");
    setRoomInput("");
    setIsLoading(false);
    setVerifiedRoomName("");
    setCurrentNbf(null);
    setNewDate("");
    setNewTime("");
    onClose();
  };

  const isFuture = (unixSeconds: number) => unixSeconds * 1000 > Date.now();

  // Convert IST date/time to unix seconds
  const istToUnix = (dateStr: string, timeStr: string): number | null => {
    if (!dateStr || !timeStr) return null;
    const dateTimeString = `${dateStr}T${timeStr}:00`;
    const dateInIST = new Date(`${dateTimeString}+05:30`);
    if (isNaN(dateInIST.getTime())) return null;
    return Math.floor(dateInIST.getTime() / 1000);
  };

  // Pre-fill new date/time from currentNbf
  useEffect(() => {
    if (currentNbf && isFuture(currentNbf)) {
      const ms = currentNbf * 1000;
      const d = new Date(ms);
      // Adjust from UTC to IST display by adding 5:30 offset when formatting
      // Since currentNbf is absolute, to show IST fields, compute IST date components
      const offsetMinutes = 330; // 5*60 + 30
      const istDate = new Date(d.getTime() + offsetMinutes * 60 * 1000);
      const yyyy = istDate.getUTCFullYear();
      const mm = String(istDate.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(istDate.getUTCDate()).padStart(2, '0');
      const HH = String(istDate.getUTCHours()).padStart(2, '0');
      const MM = String(istDate.getUTCMinutes()).padStart(2, '0');
      setNewDate(`${yyyy}-${mm}-${dd}`);
      setNewTime(`${HH}:${MM}`);
    }
  }, [currentNbf]);

  const handleBack = () => {
    if (step === "selectTime") {
      setStep("roomInput");
    } else if (step === "confirm") {
      setStep("selectTime");
    }
  };

  const handleVerify = async () => {
    if (!roomInput.trim()) {
      toast({ variant: "destructive", title: "Room Required", description: "Enter a room name or URL." });
      return;
    }
    setIsLoading(true);
    try {
      const verification = await verifyRoomExists(roomInput);
      if (!verification.exists || !verification.roomInfo) {
        toast({ variant: "destructive", title: "Room Not Found", description: verification.error || "Please check the room and try again." });
        return;
      }
      const name = extractRoomName(verification.roomInfo.name || roomInput);
      const nbf = (verification.roomInfo.config && (verification.roomInfo.config as any).nbf) as number | undefined;

      setVerifiedRoomName(name);
      setCurrentNbf(nbf ?? null);
      toast({ title: "Room Verified ✅", description: "You can set a new start time for this room." });
      setStep("selectTime");
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Verification Failed", description: "Unable to verify room. Try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const canProceedSelect = useMemo(() => Boolean(newDate && newTime), [newDate, newTime]);

  const handleProceedConfirm = () => {
    if (!canProceedSelect) return;
    const ts = istToUnix(newDate, newTime);
    if (!ts) {
      toast({ variant: "destructive", title: "Invalid Date/Time", description: "Please enter a valid date and time." });
      return;
    }
    if (!isFuture(ts)) {
      toast({ variant: "destructive", title: "Must Be Future", description: "Pick a future time for the meeting." });
      return;
    }
    setStep("confirm");
  };

  const handleReschedule = async () => {
    if (!verifiedRoomName) return;
    const ts = istToUnix(newDate, newTime);
    if (!ts) return;
    setIsLoading(true);
    try {
      const res = await updateRoom(verifiedRoomName, {
        properties: { nbf: ts }
      });
      if (!res.success) {
        toast({ variant: "destructive", title: "Reschedule Failed", description: res.error || "Unable to reschedule room." });
        return;
      }
      toast({ title: "Rescheduled 🎉", description: `New start: ${new Date(ts * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}` });
      handleClose();
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Reschedule Error", description: "Unexpected error while rescheduling." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border shadow-2xl rounded-2xl">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <div className="p-2 bg-gradient-primary rounded-full">
              <CalendarClock className="h-6 w-6 text-white" />
            </div>
            Reschedule Room
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-base mt-2 text-left pl-12">
            {step === "roomInput" && "Enter the room to reschedule. Only rooms scheduled for the future are eligible."}
            {step === "selectTime" && "Pick a new date/time in IST for the meeting start."}
            {step === "confirm" && "Confirm the new schedule details."}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6">
          {step === "roomInput" && (
            <div className="space-y-4">
              <div className="space-y-2">
                {/* <Label htmlFor="roomInput" className="text-sm font-medium text-foreground">Room Name or URL</Label> */}
                <Input
                  id="roomInput"
                  placeholder="Enter room name or URL..."
                  value={roomInput}
                  onChange={(e) => setRoomInput(e.target.value)}
                  disabled={isLoading}
                  className="h-12 text-base rounded-xl bg-input border-2 border-border focus-visible:ring-0 focus-visible:ring-primary focus-visible:border-primary transition-all duration-200"
                />
              </div>
              <Button
                onClick={handleVerify}
                disabled={!roomInput || isLoading}
                className="w-full h-12 bg-gradient-primary hover:opacity-90 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:transform-none"
              >
                {isLoading ? (<><Loader2 className="w-5 h-5 mr-3 animate-spin" />Verifying...</>) : (<>Next<ArrowRight className="w-5 h-5 ml-3" /></>)}
              </Button>
            </div>
          )}

          {step === "selectTime" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-xs text-muted-foreground">Date (IST)</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    disabled={isLoading}
                    className="h-12 text-base rounded-xl bg-input border-2 border-border hover:border-primary/40 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary transition-all duration-200 text-foreground [color-scheme:dark]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time" className="text-xs text-muted-foreground">Time (IST)</Label>
                  <Input
                    id="time"
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    disabled={isLoading}
                    className="h-12 text-base rounded-xl bg-input border-2 border-border hover:border-primary/40 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary transition-all duration-200 pl-4 pr-4 text-foreground [color-scheme:dark]"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button onClick={handleBack} variant="outline" className="flex-1 h-12 border-border text-foreground hover:bg-muted rounded-xl transition-all duration-200">
                  <ArrowLeft className="w-5 h-5 mr-2" />Back
                </Button>
                <Button onClick={handleProceedConfirm} disabled={!canProceedSelect} className="flex-1 h-12 bg-gradient-primary hover:opacity-90 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:transform-none">
                  Continue<ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {step === "confirm" && (
            <div className="space-y-6">
              <div className="bg-muted/50 rounded-xl p-6 space-y-2">
                <p className="text-sm text-muted-foreground">Room</p>
                <p className="text-foreground font-semibold">{verifiedRoomName}</p>
                <p className="text-sm text-muted-foreground mt-4">New start (IST)</p>
                <p className="text-foreground font-semibold">{new Date((istToUnix(newDate, newTime) || 0) * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
              </div>
              <div className="flex gap-3">
                <Button onClick={handleBack} variant="outline" className="flex-1 h-12 border-border text-foreground hover:bg-muted rounded-xl transition-all duration-200">
                  <ArrowLeft className="w-5 h-5 mr-2" />Back
                </Button>
                <Button onClick={handleReschedule} disabled={isLoading} className="flex-1 h-12 bg-gradient-primary hover:opacity-90 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:transform-none">
                  {isLoading ? (<><Loader2 className="w-5 h-5 mr-3 animate-spin" />Rescheduling...</>) : (<><CheckCircle className="w-5 h-5 mr-2" />Confirm</>)}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
