import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface AboutUsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutUsModal = ({ isOpen, onClose }: AboutUsModalProps) => {
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
            Candidly is a focused, privacy‑first interview platform that helps teams run structured, high‑signal
            technical interviews. Spin up rooms in seconds, keep participants on time, and collaborate productively.
          </p>
          <div className="space-y-2">
            <p className="text-foreground font-medium">What you can do with Candidly:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Create interview rooms instantly or schedule them for later with a precise start time.</li>
              <li>Reschedule or delete rooms effortlessly with admin‑only controls and password protection.</li>
              <li>Run proctored interviews monitored in real time by our AI bot "Strata" for fairness and integrity.</li>
              <li>Automatically enforce policies: suspicious activity or unauthorized tools may lead to termination.</li>
              <li>Use the integrated coding workspace to evaluate real problem‑solving in real time.</li>
              <li>Share clear, scrollable interview instructions and set expectations up front.</li>
              <li>Track network health live so interviewers can respond quickly to call issues.</li>
            </ul>
          </div>
          <p>
            We value fairness and respect, and design for low friction on both sides of the interview. Our goal is to
            help interviewers capture the right signals while giving candidates a calm, predictable experience.
          </p>
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1 h-11 border-border">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
