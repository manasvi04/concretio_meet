/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import DailyIframe from "@daily-co/daily-js";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, Phone, Settings } from "lucide-react";

interface VideoCallProps {
  roomUrl?: string;
  onJoinedChange?: (isJoined: boolean) => void;
  isJoined?: boolean;
  onLeaveCall?: () => void;
  onJoinError?: (error: string) => void;
  onNetworkStatsChange?: (
    networkStatus: { status: "Good" | "Bad"; packetLoss: number } | null
  ) => void;
}

export interface VideoCallRef {
  joinCall: () => void;
  leaveCall: () => void;
}

export const VideoCall = forwardRef<VideoCallRef, VideoCallProps>(
  (
    { roomUrl, onJoinedChange, isJoined, onLeaveCall, onJoinError, onNetworkStatsChange },
    ref
  ) => {
    const callFrameRef = useRef<HTMLDivElement>(null);
    const [callFrame, setCallFrame] = useState<any>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isJoining, setIsJoining] = useState(false);

    useEffect(() => {
      if (callFrameRef.current) {
        const frame = DailyIframe.createFrame(callFrameRef.current, {
          showLeaveButton: true,
          showFullscreenButton: false,
          showLocalVideo: true,
          showParticipantsBar: false,
          theme: {
            colors: {
              accent: "#22c55e",
              accentText: "#ffffff",
              background: "#0a0a0f",
              backgroundAccent: "#141419",
              baseText: "#f1f5f9",
              border: "#1e293b",
              mainAreaBg: "#0f172a",
              mainAreaBgAccent: "#1e293b",
              mainAreaText: "#f1f5f9",
              supportiveText: "#64748b",
            },
          },
        });

        frame.on("joined-meeting", () => {
          setIsJoining(false);
          onJoinedChange?.(true);
        });

        frame.on("left-meeting", () => {
          setIsJoining(false);
          onJoinedChange?.(false);
          onNetworkStatsChange?.(null); // Reset network stats when leaving
        });

        // Handle join errors
        frame.on("error", (error: any) => {
          console.error("Daily.co error:", error);
          setIsJoining(false);
          onJoinError?.(error.errorMsg || error.message || "Failed to join the room");
        });

        // Handle specific join errors
        frame.on("join-error" as any, (error: any) => {
          console.error("Daily.co join error:", error);
          setIsJoining(false);
          onJoinError?.(error.errorMsg || error.message || "Failed to join the room");
        });

        setCallFrame(frame);

        return () => {
          frame.destroy();
        };
      }
    }, []);

    // Monitor network statistics
    useEffect(() => {
      let intervalId: NodeJS.Timeout;

      if (callFrame && isJoined) {
        intervalId = setInterval(async () => {
          try {
            const stats = await callFrame.getNetworkStats();
            if (stats && stats.stats) {
              // Extract packet loss from the stats
              let packetLoss = 0;

              // Check for video receive stats
              if (stats.stats.video && stats.stats.video.recv) {
                const videoRecv = stats.stats.video.recv;
                if (
                  videoRecv.packetsLost !== undefined &&
                  videoRecv.packetsReceived !== undefined
                ) {
                  const totalPackets =
                    videoRecv.packetsLost + videoRecv.packetsReceived;
                  if (totalPackets > 0) {
                    packetLoss = Math.max(
                      packetLoss,
                      (videoRecv.packetsLost / totalPackets) * 100
                    );
                  }
                }
              }

              // Check for audio receive stats
              if (stats.stats.audio && stats.stats.audio.recv) {
                const audioRecv = stats.stats.audio.recv;
                if (
                  audioRecv.packetsLost !== undefined &&
                  audioRecv.packetsReceived !== undefined
                ) {
                  const totalPackets =
                    audioRecv.packetsLost + audioRecv.packetsReceived;
                  if (totalPackets > 0) {
                    packetLoss = Math.max(
                      packetLoss,
                      (audioRecv.packetsLost / totalPackets) * 100
                    );
                  }
                }
              }

              const status = packetLoss < 3 ? "Good" : "Bad"; // Consider < 3% as good
              onNetworkStatsChange?.({ status, packetLoss });
            }
          } catch (error) {
            console.warn("Failed to get network stats:", error);
          }
        }, 2000); // Update every 2 seconds
      }

      return () => {
        if (intervalId) {
          clearInterval(intervalId);
        }
      };
    }, [callFrame, isJoined, onNetworkStatsChange]);

    // Note: Removed auto-join - only join when user explicitly clicks "Join Room"

    useImperativeHandle(ref, () => ({
      joinCall,
      leaveCall,
    }));

    const joinCall = () => {
      if (callFrame && roomUrl && !isJoining) {
        setIsJoining(true);
        callFrame.join({ url: roomUrl });
      }
    };

    const leaveCall = () => {
      if (callFrame) {
        setIsJoining(false);
        callFrame.leave();
      }
    };

    const toggleMute = () => {
      if (callFrame) {
        callFrame.setLocalAudio(!isMuted);
        setIsMuted(!isMuted);
      }
    };

    const toggleVideo = () => {
      if (callFrame) {
        callFrame.setLocalVideo(!isVideoOff);
        setIsVideoOff(!isVideoOff);
      }
    };

    return (
      <div className="flex flex-col h-full bg-video-bg rounded-lg overflow-hidden">
        {/* Video Area */}
        <div className="flex-1 relative">
          <div
            ref={callFrameRef}
            className="w-full h-full bg-video-bg"
            style={{ minHeight: "400px" }}
          />

          {/* Welcome message until SDK starts joining */}
          {!isJoining && !isJoined && (
            <div className="absolute inset-0 flex items-center justify-center bg-video-bg">
              <div className="text-center space-y-6 px-4">
                <div
                  className="w-20 h-20 mx-auto bg-muted rounded-full flex items-center justify-center border-2"
                  style={{ borderColor: "#5bc4ea" }}
                >
                  <Video className="w-8 h-8 text-muted-foreground"/>
                </div>

                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-foreground">
                    Welcome to{" "}
                    <span style={{ color: "#ec8e00" }}>
                      Concretio's Interview Lobby
                    </span>
                  </h2>

                  <h3 className="text-base text-foreground max-w-md mx-auto leading-relaxed">
                    To begin, enter room name above and confirm your connection
                    is stable for a smooth experience.
                  </h3>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Controls */}
        <div className="p-4 bg-video-controls border-t border-border">
          <div className="flex items-center justify-center space-x-4">
            {/* Additional controls can be added here if needed */}
          </div>
        </div>
      </div>
    );
  }
);

VideoCall.displayName = "VideoCall";
