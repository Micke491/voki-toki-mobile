import React, { useEffect, useRef, useState } from 'react';
import { useWebRTC } from '../hooks/useWebRTC';
import { ActiveCall } from '../CallContext';
import { CallScreen } from './CallScreen';
import { FloatingCallBubble } from './FloatingCallBubble';

interface CallSessionProps {
  call: ActiveCall;
  currentUser: { _id: string; username: string; avatar?: string };
  minimized: boolean;
  onMinimize: () => void;
  onRestore: () => void;
  onLeave: () => void;
}

// Owns the WebRTC session for the lifetime of a call. Stays mounted while the
// call is minimized so navigating around the app never drops the connection —
// only the rendered surface switches between full screen and floating bubble.
export const CallSession = ({
  call,
  currentUser,
  minimized,
  onMinimize,
  onRestore,
  onLeave,
}: CallSessionProps) => {
  const rtc = useWebRTC({
    callId: call.callId,
    currentUser,
    withVideo: call.type === 'video',
  });

  // Two different questions, previously conflated: is anyone else in the call
  // (signaling), and is media actually flowing (ICE)? Reporting the first as
  // "connected" made a call that never established a route look live.
  const peerPresent = rtc.participants.length > 0;
  const connected = rtc.mediaConnected;
  const [hasConnected, setHasConnected] = useState(false);
  const [hasPeer, setHasPeer] = useState(false);
  const [duration, setDuration] = useState(0);
  const startedAtRef = useRef<number | null>(null);

  const onLeaveRef = useRef(onLeave);
  onLeaveRef.current = onLeave;

  useEffect(() => {
    if (peerPresent && !hasPeer) setHasPeer(true);
  }, [peerPresent, hasPeer]);

  useEffect(() => {
    if (connected && !hasConnected) {
      setHasConnected(true);
      startedAtRef.current = Date.now();
    }
  }, [connected, hasConnected]);

  // Everyone else left after the call was live: hang up on this side too.
  useEffect(() => {
    if (hasPeer && !peerPresent) {
      onLeaveRef.current();
    }
  }, [hasPeer, peerPresent]);

  // Nobody answered within 30s: give up (also tells the server to end the call).
  useEffect(() => {
    if (peerPresent || hasPeer) return;
    const timer = setTimeout(() => onLeaveRef.current(), 30000);
    return () => clearTimeout(timer);
  }, [peerPresent, hasPeer]);

  // Answered, but ICE never found a route. Left alone this shows as a call that
  // is "connected" and completely silent, so say what actually happened.
  const [routeTimedOut, setRouteTimedOut] = useState(false);
  useEffect(() => {
    if (!hasPeer || hasConnected) return;
    const timer = setTimeout(() => setRouteTimedOut(true), 20000);
    return () => clearTimeout(timer);
  }, [hasPeer, hasConnected]);

  const connectionError =
    rtc.connectionFailed || routeTimedOut
      ? 'Could not connect the call. Your networks could not reach each other.'
      : null;

  useEffect(() => {
    if (!hasConnected) return;
    const interval = setInterval(() => {
      if (startedAtRef.current) {
        setDuration(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [hasConnected]);

  if (minimized) {
    return (
      <FloatingCallBubble
        rtc={rtc}
        call={call}
        connected={connected}
        duration={duration}
        onRestore={onRestore}
        onLeave={onLeave}
      />
    );
  }

  return (
    <CallScreen
      rtc={rtc}
      call={call}
      currentUser={currentUser}
      connected={connected}
      peerPresent={peerPresent}
      connectionError={connectionError}
      duration={duration}
      onMinimize={onMinimize}
      onLeave={onLeave}
    />
  );
};
