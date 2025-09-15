import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft } from "lucide-react";

interface AboutUsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoHome: () => void;
}

export const AboutUsModal = ({ isOpen, onClose, onGoHome }: AboutUsModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border shadow-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">About Candidly</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Learn more about our mission and how we help teams run fair, high-signal technical interviews.
          </DialogDescription>
        </DialogHeader>
        <div className="px-1 pb-2 space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            Candidly is a lightweight, secure interview platform focused on signal quality and candidate experience.
            Create rooms in seconds, collaborate with a built-in coding workspace, and keep discussions human and focused.
          </p>
          <p>
            We prioritize privacy, fairness, and reliability. With intuitive tooling and minimal friction, interviewers
            can spend time on what matters most: evaluating problem-solving and communication.
          </p>
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1 h-11 border-border">
            Close
          </Button>
          <Button onClick={() => { onClose(); onGoHome(); }} className="flex-1 h-11 bg-gradient-primary text-white">
            <ArrowLeft className="w-4 h-4 mr-2" /> Home
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
