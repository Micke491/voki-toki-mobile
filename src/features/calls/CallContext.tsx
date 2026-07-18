import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  PropsWithChildren,
} from 'react';
import { Alert } from 'react-native';
import { wsClient } from '../../api/ws-client';
import { chatApi } from '../chat/api';
import { useAuthContext } from '../auth/context/AuthContext';
import { webrtcAvailable } from './webrtc';
import { IncomingCallOverlay } from './components/IncomingCallOverlay';
import { CallSession } from './components/CallSession';

export interface ActiveCall {
  callId: string;
  type: 'voice' | 'video';
  remoteUser: {
    username: string;
    avatar?: string;
    id?: string;
  };
  isIncoming: boolean;
  chatId: string;
}

export interface StartCallParams {
  chatId: string;
  calleeId: string;
  calleeName: string;
  calleeAvatar?: string;
  type: 'voice' | 'video';
}

interface CallContextData {
  incomingCall: any | null;
  activeCall: ActiveCall | null;
  minimized: boolean;
  startCall: (params: StartCallParams) => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => void;
  leaveCall: () => void;
  minimizeCall: () => void;
  restoreCall: () => void;
}

const CallContext = createContext<CallContextData>({} as CallContextData);

function makeCallId() {
  return [...Array(24)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
}

export const CallProvider = ({ children }: PropsWithChildren) => {
  const { user } = useAuthContext();
  const [incomingCall, setIncomingCall] = useState<any | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [minimized, setMinimized] = useState(false);

  const activeCallRef = useRef(activeCall);
  activeCallRef.current = activeCall;
  const incomingCallRef = useRef(incomingCall);
  incomingCallRef.current = incomingCall;

  useEffect(() => {
    if (!user) return;

    // The user channel is shared with chat/story listeners elsewhere in the
    // app, so only unbind our handlers on cleanup — never unsubscribe it.
    const userChannel = wsClient.subscribe(`user-${user._id}`);

    const handleIncomingCall = (data: any) => {
      const callerId = data?.caller_id?.toString();
      if (!callerId || callerId === user._id.toString()) return;

      // Already in a call: decline so the caller isn't left ringing.
      if (activeCallRef.current) {
        chatApi.rejectCall(data.call_id, user._id).catch(() => {});
        return;
      }
      setIncomingCall(data);
    };

    const handleCallRejected = (data: any) => {
      if (activeCallRef.current?.callId === data?.call_id) {
        setActiveCall(null);
        setMinimized(false);
      }
    };

    const handleCallEnded = (data: any) => {
      if (incomingCallRef.current?.call_id === data?.call_id) {
        setIncomingCall(null);
      }
      if (activeCallRef.current?.callId === data?.call_id) {
        setActiveCall(null);
        setMinimized(false);
      }
    };

    userChannel.bind('incoming_call', handleIncomingCall);
    userChannel.bind('call_rejected', handleCallRejected);
    userChannel.bind('call_ended', handleCallEnded);

    return () => {
      userChannel.unbind('incoming_call', handleIncomingCall);
      userChannel.unbind('call_rejected', handleCallRejected);
      userChannel.unbind('call_ended', handleCallEnded);
    };
  }, [user?._id]);

  const startCall = useCallback(
    async ({ chatId, calleeId, calleeName, calleeAvatar, type }: StartCallParams) => {
      if (!user || activeCallRef.current) return;
      if (!webrtcAvailable) {
        Alert.alert(
          'Calls unavailable',
          'Calls need a development build of the app — they do not work in Expo Go.'
        );
        return;
      }
      if (!calleeId && !chatId) {
        Alert.alert('Call failed', 'Cannot determine who to call.');
        return;
      }

      const callId = makeCallId();
      setMinimized(false);
      setActiveCall({
        callId,
        type,
        remoteUser: { username: calleeName || 'User', avatar: calleeAvatar, id: calleeId || undefined },
        isIncoming: false,
        chatId,
      });

      try {
        await chatApi.initiateCall({
          call_id: callId,
          caller_id: user._id,
          callee_id: calleeId || '',
          call_type: type,
          caller_name: user.username,
          caller_avatar: user.avatar,
          chat_id: chatId,
        });
      } catch (err: any) {
        setActiveCall(null);
        Alert.alert('Call failed', err?.response?.data?.error || 'Could not start the call.');
      }
    },
    [user]
  );

  const acceptCall = useCallback(async () => {
    const call = incomingCallRef.current;
    if (!call || !user) return;
    if (!webrtcAvailable) {
      Alert.alert(
        'Calls unavailable',
        'Calls need a development build of the app — they do not work in Expo Go.'
      );
      return;
    }

    setMinimized(false);
    setActiveCall({
      callId: call.call_id,
      type: call.call_type === 'video' ? 'video' : 'voice',
      remoteUser: {
        username: call.caller_name || 'User',
        avatar: call.caller_avatar,
        id: call.caller_id,
      },
      isIncoming: true,
      chatId: call.chat_id,
    });
    setIncomingCall(null);

    try {
      await chatApi.acceptCall(call.call_id, user._id);
    } catch (err: any) {
      setActiveCall(null);
      Alert.alert('Call failed', err?.response?.data?.error || 'Could not join the call.');
    }
  }, [user]);

  const declineCall = useCallback(() => {
    const call = incomingCallRef.current;
    if (!call || !user) return;
    chatApi.rejectCall(call.call_id, user._id).catch(() => {});
    setIncomingCall(null);
  }, [user]);

  const leaveCall = useCallback(() => {
    const call = activeCallRef.current;
    if (call && user) {
      chatApi.endCall(call.callId, user._id).catch(() => {});
    }
    setActiveCall(null);
    setMinimized(false);
  }, [user]);

  const minimizeCall = useCallback(() => setMinimized(true), []);
  const restoreCall = useCallback(() => setMinimized(false), []);

  return (
    <CallContext.Provider
      value={{
        incomingCall,
        activeCall,
        minimized,
        startCall,
        acceptCall,
        declineCall,
        leaveCall,
        minimizeCall,
        restoreCall,
      }}
    >
      {children}

      {incomingCall && !activeCall && (
        <IncomingCallOverlay callData={incomingCall} onAccept={acceptCall} onDecline={declineCall} />
      )}

      {activeCall && user && (
        <CallSession
          call={activeCall}
          currentUser={user}
          minimized={minimized}
          onMinimize={minimizeCall}
          onRestore={restoreCall}
          onLeave={leaveCall}
        />
      )}
    </CallContext.Provider>
  );
};

export const useCallContext = () => useContext(CallContext);
