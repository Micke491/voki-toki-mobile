const { withMainApplication } = require('expo/config-plugins');

// Android 10+ only allows screen capture (MediaProjection) while a foreground
// service of type "mediaProjection" is running. react-native-webrtc ships that
// service and declares it in its own manifest, but it stays disabled until
// WebRTCModuleOptions.enableMediaProjectionService is switched on from
// MainApplication.onCreate — which is what this plugin injects during prebuild.
const FLAG_STATEMENT =
  'com.oney.WebRTCModule.WebRTCModuleOptions.getInstance().enableMediaProjectionService = true';

function withWebRTC(config) {
  return withMainApplication(config, (config) => {
    const { modResults } = config;
    if (!modResults.contents.includes('enableMediaProjectionService')) {
      const statement =
        modResults.language === 'java' ? `${FLAG_STATEMENT};` : FLAG_STATEMENT;
      modResults.contents = modResults.contents.replace(
        /super\.onCreate\(\);?/,
        (match) => `${match}\n    ${statement}`
      );
    }
    return config;
  });
}

module.exports = withWebRTC;
