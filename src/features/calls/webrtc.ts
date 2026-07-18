// react-native-webrtc only works in a development/production build (not Expo Go,
// where requiring it throws because the native module is missing). Guard the
// require so the rest of the app keeps working there and calls degrade gracefully.
let mod: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  mod = require('react-native-webrtc');
} catch {
  mod = null;
}

export const webrtcAvailable = !!mod?.RTCPeerConnection;

export const RTCPeerConnection: any = mod?.RTCPeerConnection;
export const RNMediaStream: any = mod?.MediaStream;
export const mediaDevices: any = mod?.mediaDevices;
export const RTCView: any = mod?.RTCView;
