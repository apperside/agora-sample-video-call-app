import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Platform,

  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import RtcEngine, {
  RtcLocalView,
  RtcRemoteView,
  VideoRenderMode
} from 'react-native-agora';
import requestCameraAndAudioPermission from './components/Permission';
import styles from './components/Style';
import { usePrevious } from './usePrevious';


const appId = "<app-id>";
const defaultChannelName = "channel-xyz"
const App: React.FC = () => {

  const [channelName, setChannelName] = useState<string>(defaultChannelName)
  // not used in this demo, read more here https://docs.agora.io/en/cloud-recording/token_server?platform=All%20Platforms
  const [token, setToken] = useState<string>()
  const [peerIds, setPeerIds] = useState<number[]>([])
  const previousPeersCount = usePrevious(peerIds.length)
  const [joined, setJoined] = useState(false)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const engineRef = useRef<RtcEngine>()

  const startCall = useCallback(async () => {
    if (channelName && engineRef.current) {
      await engineRef.current.joinChannel(token, channelName, null, 0);
    }
    else {
      Alert.alert("Error", "Channel name must not be empty")
    }
  }, [channelName])

  const endCall = useCallback(async () => {
    await engineRef.current?.leaveChannel();
    setJoined(false)
    setPeerIds([])
  }, []);

  useEffect(() => {
    if (previousPeersCount || 0 > 1 && peerIds.length <= 1) {
      endCall()
    }
  }, [peerIds?.length])

  const toggleAudio = useCallback(() => {
    engineRef.current?.enableLocalAudio(!isAudioEnabled)
  }, [isAudioEnabled])

  const toggleVideo = useCallback(() => {
    engineRef.current?.enableLocalVideo(!isVideoEnabled)
  }, [isVideoEnabled])


  const init = async () => {
    engineRef.current = await RtcEngine.create(appId);
    console.log("going to init")
    if (engineRef.current) {
      console.log("has engine")
      let engine = engineRef.current
      await engine.enableVideo();
      engine.enableLocalAudio(!!isAudioEnabled)
      engine.addListener('Warning', (warn) => {
        console.log('Warning', warn);
      });

      engine.addListener('Error', (err) => {
        console.log('Error', err);
      });

      engine.addListener('UserJoined', (uid, elapsed) => {
        console.log('UserJoined', uid, elapsed);
        // Get current peer IDs
        // If new user
        if (peerIds?.indexOf(uid) === -1) {
          setPeerIds((prev) => [...prev, uid])
        }
      });

      engine.addListener('UserOffline', (uid, reason) => {
        console.log('UserOffline', uid, reason);
        setPeerIds(prev => prev.filter((id) => id !== uid),)
      });

      // If Local user joins RTC channel
      engine.addListener('JoinChannelSuccess', (channel, uid, elapsed) => {
        console.log('JoinChannelSuccess', channel, uid, elapsed);
        setJoined(true)
      });

      engine.addListener('LocalAudioStateChanged', (state, error) => {
        console.log('LocalAudioStateChanged', state, error);
        // https://docs.agora.io/en/Video/API%20Reference/react_native/enums/audiolocalstate.html
        setIsAudioEnabled(state > 0)
        // TODO: handle error state
      });

      engine.addListener('LocalVideoStateChanged', (state, error) => {
        console.log('LocalAudioStateChanged', state, error);
        // https://docs.agora.io/en/Video/API%20Reference/react_native/enums/localvideostreamstate.html
        setIsVideoEnabled(state > 0 && state < 3)
        // TODO: handle error state
      });
    }
    else {
      console.log("has NOT engine")
    }
  }

  useEffect(() => {

    async function initFunction() {
      await init()
    }
    if (Platform.OS === 'android') {
      // Request required permissions from Android
      requestCameraAndAudioPermission().then(() => {
        console.log('requested!');
        initFunction()
      });
    }
    else {
      initFunction()
    }
  }, [])

  const partecipants = useMemo(() => {
    if (joined) {
      return <View style={styles.fullView}>
        <RtcLocalView.SurfaceView
          style={{ flex: 1 }}
          channelId={channelName}
          renderMode={VideoRenderMode.Hidden}
        />
        {peerIds?.[0] &&
          <RtcRemoteView.SurfaceView
            style={{ flex: 1 }}
            uid={peerIds?.[0]}
            channelId={channelName}
            renderMode={VideoRenderMode.Hidden}
            zOrderMediaOverlay={true}
          />
        }
        {/* {this._renderRemoteVideos()} */}
      </View>
    }
    return null

  }, [channelName, joined, peerIds.length])

  return (
    <View style={styles.max}>
      <View style={[styles.max, { justifyContent: "center" }]}>
        {!joined &&
          <TextInput
            style={styles.channelTextInput}
            placeholder="Channel name"
            onChangeText={setChannelName}
            value={channelName}></TextInput>
        }
        <View style={styles.buttonHolder}>
          {!joined &&
            <TouchableOpacity onPress={startCall} style={styles.button}>
              <Text style={styles.buttonText}> Start Call </Text>
            </TouchableOpacity>
          }
          {joined &&
            <>
              <TouchableOpacity onPress={endCall} style={styles.button}>
                <Text style={styles.buttonText}> End Call </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleAudio} style={styles.button}>
                <Text style={styles.buttonText}> Set audio {isAudioEnabled ? "OFF" : "ON"} </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleVideo} style={styles.button}>
                <Text style={styles.buttonText}> Set video {isAudioEnabled ? "OFF" : "ON"} </Text>
              </TouchableOpacity>
            </>
          }
        </View>
        {partecipants}
      </View>
    </View>
  );
}

export default App;