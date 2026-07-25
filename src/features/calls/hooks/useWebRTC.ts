import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import InCallManager from 'react-native-incall-manager';
import { wsClient } from '../../../api/ws-client';
import { chatApi } from '../../chat/api';
import { RTCPeerConnection, RNMediaStream, mediaDevices, webrtcAvailable } from '../webrtc';


export interface CallParticipant {
  sid: string;
  userId: string;
  username: string;
  avatar?: string;
  stream: any | null;
  screenStream: any | null;
  micEnabled: boolean;
  camEnabled: boolean;
}

interface PeerRecord {
  sid: string;
  userId: string;
  username: string;
  avatar?: string;
  pc: any;
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  isSettingRemoteAnswerPending: boolean;
  pendingCandidates: any[];
  remoteStreams: Map<string, any>;
  cameraStreamId: string | null;
  screenStreamId: string | null;
  micEnabled: boolean;
  camEnabled: boolean;
  /** True once ICE has actually established a path and media can flow. */
  mediaConnected: boolean;
  /** True when ICE gave up — usually no reachable route without a TURN relay. */
  mediaFailed: boolean;
  audioSender: any | null;
  camSender: any | null;
  screenSender: any | null;
}

interface SignalMessage {
  kind: 'join' | 'welcome' | 'offer' | 'answer' | 'candidate' | 'state' | 'leave';
  sid: string;
  to?: string;
  from?: string;
  username?: string;
  avatar?: string;
  micEnabled?: boolean;
  camEnabled?: boolean;
  cameraStreamId?: string | null;
  screenStreamId?: string | null;
  description?: { type: string; sdp: string };
  candidate?: any;
}

const FALLBACK_ICE = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
];

function makeSid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function startAudioSession(withVideo: boolean, speakerOn: boolean) {
  try {
    InCallManager.start({ media: withVideo ? 'video' : 'audio' });
    InCallManager.setForceSpeakerphoneOn(speakerOn);
  } catch {}
}

function applyAudioRoute(speakerOn: boolean) {
  try {
    InCallManager.setForceSpeakerphoneOn(speakerOn);
  } catch {}
}

function stopAudioSession() {
  try {
    InCallManager.setForceSpeakerphoneOn(false);
    InCallManager.stop();
  } catch {}
}

interface UseWebRTCOptions {
  callId: string;
  currentUser: { _id: string; username: string; avatar?: string };
  withVideo: boolean;
}

export function useWebRTC({ callId, currentUser, withVideo }: UseWebRTCOptions) {
  const sidRef = useRef<string>(makeSid());
  const peersRef = useRef<Map<string, PeerRecord>>(new Map());
  const iceServersRef = useRef<any[]>(FALLBACK_ICE);

  const localStreamRef = useRef<any | null>(null);
  const screenStreamRef = useRef<any | null>(null);
  const screenTrackRef = useRef<any | null>(null);

  const micEnabledRef = useRef(false);
  const camEnabledRef = useRef(false);
  const screenSharingRef = useRef(false);
  const frontCameraRef = useRef(true);

  const [participants, setParticipants] = useState<CallParticipant[]>([]);
  const [localStream, setLocalStream] = useState<any | null>(null);
  const [localScreenStream, setLocalScreenStream] = useState<any | null>(null);
  const [micEnabled, setMicEnabled] = useState(false);
  const [camEnabled, setCamEnabled] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [frontCamera, setFrontCamera] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(withVideo);
  const [ready, setReady] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaConnected, setMediaConnected] = useState(false);
  const [connectionFailed, setConnectionFailed] = useState(false);

  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showTransientError = useCallback((msg: string) => {
    setMediaError(msg);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setMediaError(null), 4000);
  }, []);

  const channelName = `call-${callId}`;

  const sendSignal = useCallback(
    (msg: Omit<SignalMessage, 'sid'>) => {
      wsClient.send({
        action: 'signal',
        channel: channelName,
        data: { ...msg, sid: sidRef.current },
      });
    },
    [channelName]
  );

  const identityPayload = useCallback(
    () => ({
      username: currentUser.username,
      avatar: currentUser.avatar,
      micEnabled: micEnabledRef.current,
      camEnabled: camEnabledRef.current,
      cameraStreamId: localStreamRef.current ? localStreamRef.current.id : null,
      screenStreamId:
        screenSharingRef.current && screenStreamRef.current ? screenStreamRef.current.id : null,
    }),
    [currentUser.username, currentUser.avatar]
  );

  const syncPeers = useCallback(() => {
    const list: CallParticipant[] = [];
    peersRef.current.forEach((peer) => {
      let stream: any | null = null;
      let screenStream: any | null = null;

      if (peer.cameraStreamId) {
        stream = peer.remoteStreams.get(peer.cameraStreamId) || null;
      }
      if (peer.screenStreamId) {
        screenStream = peer.remoteStreams.get(peer.screenStreamId) || null;
      }
      if (!stream) {
        for (const s of peer.remoteStreams.values()) {
          if (s.id !== peer.screenStreamId) {
            stream = s;
            break;
          }
        }
      }

      list.push({
        sid: peer.sid,
        userId: peer.userId,
        username: peer.username,
        avatar: peer.avatar,
        stream,
        screenStream,
        micEnabled: peer.micEnabled,
        camEnabled: peer.camEnabled,
      });
    });
    setParticipants(list);
  }, []);

  // Whether media can actually flow, as opposed to whether signaling produced a
  // peer record. Without this the call screen reports "connected" the instant
  // the other side is discovered, even if ICE never finds a route.
  const syncConnection = useCallback(() => {
    let anyConnected = false;
    let anyPeer = false;
    let allFailed = true;
    peersRef.current.forEach((peer) => {
      anyPeer = true;
      if (peer.mediaConnected) anyConnected = true;
      if (!peer.mediaFailed) allFailed = false;
    });
    setMediaConnected(anyConnected);
    setConnectionFailed(anyPeer && allFailed && !anyConnected);
  }, []);

  const broadcastState = useCallback(() => {
    sendSignal({ kind: 'state', ...identityPayload() });
  }, [sendSignal, identityPayload]);


  const applyPeerInfo = useCallback((peer: PeerRecord, msg: SignalMessage) => {
    if (msg.username) peer.username = msg.username;
    if (msg.avatar !== undefined) peer.avatar = msg.avatar;
    if (msg.micEnabled !== undefined) peer.micEnabled = msg.micEnabled;
    if (msg.camEnabled !== undefined) peer.camEnabled = msg.camEnabled;
    if (msg.cameraStreamId !== undefined) peer.cameraStreamId = msg.cameraStreamId;
    if (msg.screenStreamId !== undefined) peer.screenStreamId = msg.screenStreamId;
  }, []);

  const destroyPeer = useCallback(
    (sid: string) => {
      const peer = peersRef.current.get(sid);
      if (!peer) return;
      try {
        peer.pc.onnegotiationneeded = null;
        peer.pc.onicecandidate = null;
        peer.pc.ontrack = null;
        peer.pc.oniceconnectionstatechange = null;
        peer.pc.close();
      } catch {}
      peersRef.current.delete(sid);
      syncPeers();
      syncConnection();
    },
    [syncPeers, syncConnection]
  );

  const createPeer = useCallback(
    (msg: SignalMessage): PeerRecord => {
      const theirSid = msg.sid;
      if (peersRef.current.has(theirSid)) {
        destroyPeer(theirSid);
      }

      const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });

      const peer: PeerRecord = {
        sid: theirSid,
        userId: msg.from || '',
        username: msg.username || 'User',
        avatar: msg.avatar,
        pc,
        polite: sidRef.current < theirSid,
        makingOffer: false,
        ignoreOffer: false,
        isSettingRemoteAnswerPending: false,
        pendingCandidates: [],
        remoteStreams: new Map(),
        cameraStreamId: msg.cameraStreamId ?? null,
        screenStreamId: msg.screenStreamId ?? null,
        micEnabled: msg.micEnabled ?? true,
        camEnabled: msg.camEnabled ?? false,
        mediaConnected: false,
        mediaFailed: false,
        audioSender: null,
        camSender: null,
        screenSender: null,
      };

      pc.onnegotiationneeded = async () => {
        if (pc.signalingState !== 'stable') return;
        try {
          peer.makingOffer = true;
          await pc.setLocalDescription();
          if (pc.localDescription) {
            sendSignal({
              kind: pc.localDescription.type === 'answer' ? 'answer' : 'offer',
              to: theirSid,
              description: { type: pc.localDescription.type, sdp: pc.localDescription.sdp },
              ...identityPayload(),
            });
          }
        } catch (err) {
          console.error('Negotiation failed:', err);
        } finally {
          peer.makingOffer = false;
        }
      };

      pc.onicecandidate = (e: any) => {
        if (e.candidate) {
          sendSignal({
            kind: 'candidate',
            to: theirSid,
            candidate: {
              candidate: e.candidate.candidate,
              sdpMid: e.candidate.sdpMid,
              sdpMLineIndex: e.candidate.sdpMLineIndex,
            },
          });
        }
      };

      const trackConnection = () => {
        // connectionState is the aggregate signal; fall back to the ICE state
        // on engines that do not surface it.
        const state = pc.connectionState || pc.iceConnectionState;
        peer.mediaConnected = state === 'connected' || state === 'completed';
        peer.mediaFailed = state === 'failed';
        syncConnection();
      };

      pc.onconnectionstatechange = trackConnection;

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'failed') {
          try {
            pc.restartIce();
          } catch {}
        }
        trackConnection();
      };

      pc.ontrack = (e: any) => {
        (e.streams || []).forEach((stream: any) => {
          if (!peer.remoteStreams.has(stream.id)) {
            peer.remoteStreams.set(stream.id, stream);
            try {
              stream.onremovetrack = () => {
                if (stream.getTracks().length === 0) {
                  peer.remoteStreams.delete(stream.id);
                }
                syncPeers();
              };
            } catch {}
          }
        });
        syncPeers();
      };

      const local = localStreamRef.current;
      if (local) {
        const audio = local.getAudioTracks()[0];
        const video = local.getVideoTracks()[0];
        if (audio) peer.audioSender = pc.addTrack(audio, local);
        if (video) peer.camSender = pc.addTrack(video, local);
      }
      if (screenSharingRef.current && screenTrackRef.current && screenStreamRef.current) {
        peer.screenSender = pc.addTrack(screenTrackRef.current, screenStreamRef.current);
      }

      peersRef.current.set(theirSid, peer);
      syncPeers();
      syncConnection();
      return peer;
    },
    [destroyPeer, sendSignal, syncPeers, syncConnection, identityPayload]
  );

  const handleSignal = useCallback(
    async (raw: any) => {
      const msg = raw as SignalMessage;
      if (!msg || !msg.sid || msg.sid === sidRef.current) return;
      if (msg.to && msg.to !== sidRef.current) return;

      let peer = peersRef.current.get(msg.sid);

      switch (msg.kind) {
        case 'join': {
          peer = createPeer(msg);
          sendSignal({ kind: 'welcome', to: msg.sid, ...identityPayload() });
          break;
        }
        case 'welcome':
        case 'state': {
          if (!peer) {
            peer = createPeer(msg);
          } else {
            applyPeerInfo(peer, msg);
          }
          syncPeers();
          break;
        }
        case 'offer':
        case 'answer': {
          if (!msg.description) return;
          if (!peer) {
            if (msg.kind === 'answer') return;
            peer = createPeer(msg);
            sendSignal({ kind: 'welcome', to: msg.sid, ...identityPayload() });
          } else if (msg.username) {
            applyPeerInfo(peer, msg);
          }

          const pc = peer.pc;
          const readyForOffer =
            !peer.makingOffer &&
            (pc.signalingState === 'stable' || peer.isSettingRemoteAnswerPending);
          const offerCollision = msg.description.type === 'offer' && !readyForOffer;

          peer.ignoreOffer = !peer.polite && offerCollision;
          if (peer.ignoreOffer) return;

          try {
            peer.isSettingRemoteAnswerPending = msg.description.type === 'answer';
            await pc.setRemoteDescription(msg.description);
            peer.isSettingRemoteAnswerPending = false;

            const pending = peer.pendingCandidates;
            peer.pendingCandidates = [];
            for (const cand of pending) {
              try {
                await pc.addIceCandidate(cand);
              } catch {}
            }

            if (msg.description.type === 'offer') {
              await pc.setLocalDescription();
              if (pc.localDescription) {
                sendSignal({
                  kind: 'answer',
                  to: msg.sid,
                  description: { type: pc.localDescription.type, sdp: pc.localDescription.sdp },
                  ...identityPayload(),
                });
              }
            }
          } catch (err) {
            peer.isSettingRemoteAnswerPending = false;
            console.error('Failed to apply remote description:', err);
          }
          syncPeers();
          break;
        }
        case 'candidate': {
          if (!peer || !msg.candidate) return;
          if (!peer.pc.remoteDescription) {
            peer.pendingCandidates.push(msg.candidate);
            return;
          }
          try {
            await peer.pc.addIceCandidate(msg.candidate);
          } catch (err) {
            if (!peer.ignoreOffer) {
              console.warn('Failed to add ICE candidate:', err);
            }
          }
          break;
        }
        case 'leave': {
          destroyPeer(msg.sid);
          break;
        }
      }
    },
    [createPeer, destroyPeer, applyPeerInfo, sendSignal, syncPeers, identityPayload]
  );

  const toggleMic = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    let track = stream.getAudioTracks()[0];

    if (!track) {
      try {
        const media = await mediaDevices.getUserMedia({ audio: true });
        track = media.getAudioTracks()[0];
        stream.addTrack(track);
        peersRef.current.forEach((peer) => {
          if (peer.audioSender) peer.audioSender.replaceTrack(track);
          else peer.audioSender = peer.pc.addTrack(track, stream);
        });
      } catch (err) {
        console.error('Microphone switch failed:', err);
        showTransientError('Could not access the microphone.');
        return;
      }
    } else {
      track.enabled = !track.enabled;
    }

    micEnabledRef.current = track.enabled;
    setMicEnabled(track.enabled);
    broadcastState();
  }, [broadcastState, showTransientError]);

  const toggleCamera = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    if (camEnabledRef.current) {
      const track = stream.getVideoTracks()[0];
      if (track) {
        stream.removeTrack(track);
        try {
          track.stop();
        } catch {}
      }
      peersRef.current.forEach((peer) => {
        peer.camSender?.replaceTrack(null);
      });
      camEnabledRef.current = false;
      setCamEnabled(false);
      broadcastState();
      return;
    }

    try {
      const media = await mediaDevices.getUserMedia({
        video: { facingMode: frontCameraRef.current ? 'user' : 'environment' },
      });
      const track = media.getVideoTracks()[0];
      stream.addTrack(track);
      peersRef.current.forEach((peer) => {
        if (peer.camSender) peer.camSender.replaceTrack(track);
        else peer.camSender = peer.pc.addTrack(track, stream);
      });
      camEnabledRef.current = true;
      setCamEnabled(true);
      broadcastState();
    } catch (err) {
      console.error('Camera switch failed:', err);
      showTransientError('Could not access the camera.');
    }
  }, [broadcastState, showTransientError]);

  const flipCamera = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      track._switchCamera();
      frontCameraRef.current = !frontCameraRef.current;
      setFrontCamera(frontCameraRef.current);
    } catch (err) {
      console.error('Camera flip failed:', err);
    }
  }, []);

  const toggleSpeaker = useCallback(() => {
    setSpeakerOn((prev) => {
      const next = !prev;
      applyAudioRoute(next);
      return next;
    });
  }, []);

  const stopScreenShare = useCallback(() => {
    try {
      screenTrackRef.current?.stop();
    } catch {}
    screenTrackRef.current = null;
    peersRef.current.forEach((peer) => {
      peer.screenSender?.replaceTrack(null);
    });
    screenSharingRef.current = false;
    setScreenSharing(false);
    setLocalScreenStream(null);
    broadcastState();
  }, [broadcastState]);

  const toggleScreenShare = useCallback(async () => {
    if (screenSharingRef.current) {
      stopScreenShare();
      return;
    }
    try {
      const display = await mediaDevices.getDisplayMedia();
      const track = display.getVideoTracks()[0];
      if (!track) throw new Error('No screen track');

      if (!screenStreamRef.current) {
        screenStreamRef.current = new RNMediaStream();
      }
      screenStreamRef.current
        .getTracks()
        .forEach((t: any) => screenStreamRef.current?.removeTrack(t));
      screenStreamRef.current.addTrack(track);
      screenTrackRef.current = track;

      try {
        track.onended = () => {
          stopScreenShare();
        };
      } catch {}

      peersRef.current.forEach((peer) => {
        if (peer.screenSender) peer.screenSender.replaceTrack(track);
        else if (screenStreamRef.current) {
          peer.screenSender = peer.pc.addTrack(track, screenStreamRef.current);
        }
      });

      screenSharingRef.current = true;
      setScreenSharing(true);
      setLocalScreenStream(screenStreamRef.current);
      broadcastState();
    } catch (err) {
      console.error('Screen share action failed:', err);
      showTransientError(
        Platform.OS === 'ios'
          ? 'Screen sharing is not available on this device.'
          : 'Could not start screen sharing.'
      );
    }
  }, [broadcastState, stopScreenShare, showTransientError]);

  useEffect(() => {
    if (!webrtcAvailable) {
      setMediaError('Calls require a development build of the app.');
      return;
    }

    startAudioSession(withVideo, withVideo);

    let cancelled = false;
    const channel = wsClient.subscribe(channelName);

    const onSignal = (data: any) => {
      handleSignal(data);
    };

    const init = async () => {
      try {
        const data = await chatApi.getIceServers();
        if (Array.isArray(data.iceServers) && data.iceServers.length > 0) {
          iceServersRef.current = data.iceServers;
        }
      } catch {
        // Keep the fallback STUN config.
      }

      const container = new RNMediaStream();
      localStreamRef.current = container;

      let audioTrack: any | null = null;
      let videoTrack: any | null = null;

      try {
        const media = await mediaDevices.getUserMedia(
          withVideo ? { audio: true, video: { facingMode: 'user' } } : { audio: true }
        );
        audioTrack = media.getAudioTracks()[0] || null;
        videoTrack = media.getVideoTracks()[0] || null;
      } catch {
        if (withVideo) {
          try {
            const media = await mediaDevices.getUserMedia({ audio: true });
            audioTrack = media.getAudioTracks()[0] || null;
            setMediaError('Could not access the camera.');
          } catch {
            setMediaError('Could not access the microphone.');
          }
        } else {
          setMediaError('Could not access the microphone.');
        }
      }

      if (cancelled) {
        try {
          audioTrack?.stop();
          videoTrack?.stop();
        } catch {}
        return;
      }

      if (audioTrack) {
        container.addTrack(audioTrack);
        micEnabledRef.current = true;
        setMicEnabled(true);
      }
      if (videoTrack) {
        container.addTrack(videoTrack);
        camEnabledRef.current = true;
        setCamEnabled(true);
      }

      setLocalStream(container);

      channel.bind('webrtc_signal', onSignal);
      sendSignal({ kind: 'join', ...identityPayload() });
      setReady(true);
    };

    init();

    return () => {
      cancelled = true;

      sendSignal({ kind: 'leave' });
      channel.unbind('webrtc_signal', onSignal);
      wsClient.unsubscribe(channelName);

      peersRef.current.forEach((peer) => {
        try {
          peer.pc.close();
        } catch {}
      });
      peersRef.current.clear();

      try {
        localStreamRef.current?.getTracks().forEach((t: any) => t.stop());
        localStreamRef.current?.release?.(true);
      } catch {}
      localStreamRef.current = null;
      try {
        screenTrackRef.current?.stop();
        screenStreamRef.current?.release?.(true);
      } catch {}
      screenTrackRef.current = null;
      screenStreamRef.current = null;

      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      stopAudioSession();
    };
  }, [callId]);

  return {
    participants,
    localStream,
    localScreenStream,
    micEnabled,
    camEnabled,
    screenSharing,
    frontCamera,
    speakerOn,
    ready,
    mediaError,
    mediaConnected,
    connectionFailed,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    flipCamera,
    toggleSpeaker,
  };
}
