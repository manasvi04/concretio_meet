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
    // Track last computed packet loss and apply simple hysteresis to reduce flicker
    const lastPacketLossRef = useRef<number>(0);
    const goodCountRef = useRef<number>(0);
    const badCountRef = useRef<number>(0);

    useEffect(() => {
      if (callFrameRef.current) {
        const frame = DailyIframe.createFrame(callFrameRef.current, {
          showLeaveButton: true,
          showFullscreenButton: false,
          showLocalVideo: true,
          // Enable the sidebar (People/Chat/Network tabs) so Network UI can appear when enabled via room properties
          showParticipantsBar: true,
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

        // Listen to Daily's network quality signal (0-5). Prefer this when available.
        // Treat 0-2 as Bad, 3 as borderline (use packet loss to decide), 4-5 as Good.
        frame.on("network-quality-change" as any, (ev: any) => {
          try {
            const score = ev?.threshold?.quality ?? ev?.quality ?? ev?.qualityScore;
            if (typeof score === "number") {
              let status: "Good" | "Bad" = score >= 4 ? "Good" : score <= 2 ? "Bad" : "Good";
              // If borderline (score === 3), use last packet loss reading to decide
              if (score === 3) {
                status = (lastPacketLossRef.current ?? 0) > 3 ? "Bad" : "Good";
              }
              onNetworkStatsChange?.({ status, packetLoss: lastPacketLossRef.current ?? 0 });
            }
          } catch (e) {
            // no-op
          }
        });

        setCallFrame(frame);

        return () => {
          frame.destroy();
        };
      }
    }, []);

    // Monitor network statistics (fallback and to compute packet loss). Includes simple hysteresis.
    useEffect(() => {
      let intervalId: NodeJS.Timeout;

      if (callFrame && isJoined) {
        intervalId = setInterval(async () => {
          try {
            const stats = await callFrame.getNetworkStats();
            if (stats && stats.stats) {
              // Extract packet loss from audio/video recv stats (more reliable for QoE)
              const s = stats.stats as any;
              const calcLoss = (recv: any) => {
                if (
                  recv &&
                  typeof recv.packetsLost === "number" &&
                  typeof recv.packetsReceived === "number"
                ) {
                  const total = recv.packetsLost + recv.packetsReceived;
                  return total > 0 ? (recv.packetsLost / total) * 100 : 0;
                }
                return 0;
              };

              const videoLoss = s.video ? calcLoss(s.video.recv) : 0;
              const audioLoss = s.audio ? calcLoss(s.audio.recv) : 0;
              // Use the worse of audio/video as a simple proxy for user experience
              const packetLoss = Math.max(videoLoss, audioLoss);

              // Save the latest reading
              lastPacketLossRef.current = packetLoss;

              // Apply hysteresis: require 2 consecutive intervals to flip state
              let status: "Good" | "Bad" = "Good";
              const currentIsGood = packetLoss < 3; // threshold similar to original
              if (currentIsGood) {
                goodCountRef.current += 1;
                badCountRef.current = 0;
              } else {
                badCountRef.current += 1;
                goodCountRef.current = 0;
              }

              // Only report Bad after 2 consecutive bad reads; Good after 2 consecutive good reads
              if (badCountRef.current >= 2) status = "Bad";
              if (goodCountRef.current >= 2) status = "Good";

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
