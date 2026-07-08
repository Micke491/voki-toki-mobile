import { useState, useEffect, useRef, useCallback } from 'react';
import { wsClient } from '../../../api/ws-client';
import { chatApi } from '../api';

interface User {
  _id: string;
  username: string;
  avatar?: string;
}

interface ActiveCall {
  callId: string;
  type: "voice" | "video";
  token: string;
  remoteUser: {
    username: string;
    avatar?: string;
    id?: string;
  };
  isIncoming: boolean;
  chatId: string;
}

export function useCalls(currentUser: User | null) {
  const [incomingCall, setIncomingCall] = useState<any | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [pendingCallId, setPendingCallId] = useState<string | null>(null);
  
  const activeCallRef = useRef(activeCall);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    if (!currentUser || !wsClient) return;

    const userChannel = wsClient.subscribe(`user-${currentUser._id}`);
    if (!userChannel) return;

    const handleIncomingCall = (data: any) => {
      const callerId = data.caller_id?.toString();
      const myId = currentUser._id.toString();

      if (callerId && myId && callerId !== myId) {
        setIncomingCall(data);
      }
    };

    const handleCallAccepted = (data: any) => {
      if (pendingCallId === data.call_id) {
        setActiveCall((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            token: prev.token || data.token,
          };
        });
        setPendingCallId(null);
      }
    };

    const handleCallRejected = (data: any) => {
      if (pendingCallId === data.call_id || activeCallRef.current?.callId === data.call_id) {
        setActiveCall(null);
        setPendingCallId(null);
      }
    };

    const handleCallEnded = (data: any) => {
      setIncomingCall((prev: any) => (prev?.call_id === data.call_id ? null : prev));
      setActiveCall((prev: any) => (prev?.callId === data.call_id ? null : prev));
    };

    userChannel.bind("incoming_call", handleIncomingCall);
    userChannel.bind("call_accepted", handleCallAccepted);
    userChannel.bind("call_rejected", handleCallRejected);
    userChannel.bind("call_ended", handleCallEnded);

    return () => {
      userChannel.unbind("incoming_call", handleIncomingCall);
      userChannel.unbind("call_accepted", handleCallAccepted);
      userChannel.unbind("call_rejected", handleCallRejected);
      userChannel.unbind("call_ended", handleCallEnded);
      wsClient.unsubscribe(`user-${currentUser._id}`);
    };
  }, [currentUser]);

  const initiateCall = useCallback(async (chatId: string, calleeId: string, calleeName: string, calleeAvatar: string | undefined, type: "voice" | "video") => {
    if (!currentUser) return;

    const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const payload = {
      call_id: callId,
      caller_id: currentUser._id,
      callee_id: calleeId,
      call_type: type,
      caller_name: currentUser.username,
      caller_avatar: currentUser.avatar,
      chat_id: chatId,
    };

    try {
      const data = await chatApi.initiateCall(payload);
      setActiveCall({
        callId,
        type,
        token: data.token,
        remoteUser: {
          username: calleeName,
          avatar: calleeAvatar,
          id: calleeId,
        },
        isIncoming: false,
        chatId
      });
      setPendingCallId(callId);
    } catch (error) {
      console.error("Failed to initiate call:", error);
    }
  }, [currentUser]);

  const acceptCall = useCallback(async () => {
    if (!incomingCall || !currentUser) return;
    try {
      const data = await chatApi.acceptCall(incomingCall.call_id, currentUser._id);
      setActiveCall({
        callId: incomingCall.call_id,
        type: incomingCall.call_type,
        token: data.token,
        remoteUser: {
          username: incomingCall.caller_name,
          avatar: incomingCall.caller_avatar,
          id: incomingCall.caller_id,
        },
        isIncoming: true,
        chatId: incomingCall.chat_id,
      });
      setIncomingCall(null);
    } catch (error) {
      console.error("Failed to accept call:", error);
    }
  }, [incomingCall, currentUser]);

  const rejectCall = useCallback(async () => {
    if (!incomingCall || !currentUser) return;
    try {
      await chatApi.rejectCall(incomingCall.call_id, currentUser._id);
    } catch (error) {
      console.error("Failed to reject call:", error);
    } finally {
      setIncomingCall(null);
    }
  }, [incomingCall, currentUser]);

  const endCall = useCallback(async () => {
    if (!activeCall || !currentUser) return;
    try {
      await chatApi.endCall(activeCall.callId, currentUser._id);
    } catch (error) {
      console.error("Failed to end call:", error);
    } finally {
      setActiveCall(null);
    }
  }, [activeCall, currentUser]);

  return {
    incomingCall,
    activeCall,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
  };
}
