import { useCallback, useEffect, useRef, useState } from "react";
import { LocalAudioTrack, RemoteAudioTrack } from "livekit-client";

const SELECTED_AUDIO_INPUT_STORAGE_KEY = "realtime-console:selected-audio-input-id";

function getStoredAudioInputId() {
  try {
    return localStorage.getItem(SELECTED_AUDIO_INPUT_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function storeAudioInputId(deviceId) {
  try {
    if (deviceId) {
      localStorage.setItem(SELECTED_AUDIO_INPUT_STORAGE_KEY, deviceId);
    } else {
      localStorage.removeItem(SELECTED_AUDIO_INPUT_STORAGE_KEY);
    }
  } catch {
    // Ignore storage failures; device selection still works for the current session.
  }
}

export function useAudioDevices() {
  const [audioInputs, setAudioInputs] = useState([]);
  const [selectedAudioInputId, setSelectedAudioInputId] = useState(getStoredAudioInputId);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [agentAudioTrack, setAgentAudioTrack] = useState(null);
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
  const [remoteAudioStream, setRemoteAudioStream] = useState(null);

  const localMediaStream = useRef(null);
  const localAudioSender = useRef(null);
  const liveKitAudioTrack = useRef(null);
  const isMicEnabledRef = useRef(isMicEnabled);
  const selectedAudioInputIdRef = useRef(selectedAudioInputId);

  useEffect(() => {
    isMicEnabledRef.current = isMicEnabled;
  }, [isMicEnabled]);

  useEffect(() => {
    selectedAudioInputIdRef.current = selectedAudioInputId;
  }, [selectedAudioInputId]);

  const refreshAudioInputs = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;

    const devices = await navigator.mediaDevices.enumerateDevices();
    setAudioInputs(devices.filter((device) => device.kind === "audioinput"));
  }, []);

  const createMicrophoneStream = useCallback(async (deviceId = selectedAudioInputIdRef.current) => {
    const audio = deviceId ? { deviceId: { exact: deviceId } } : true;
    const stream = await navigator.mediaDevices.getUserMedia({ audio });
    const [track] = stream.getAudioTracks();

    if (track) {
      track.enabled = isMicEnabledRef.current;
    }

    return stream;
  }, []);

  const attachMicrophoneToPeerConnection = useCallback(
    async (peerConnection) => {
      const stream = await createMicrophoneStream();
      const [localTrack] = stream.getAudioTracks();

      localMediaStream.current = stream;
      localAudioSender.current = peerConnection.addTrack(localTrack, stream);
      setLocalAudioTrack(new LocalAudioTrack(localTrack));
      await refreshAudioInputs();

      return stream;
    },
    [createMicrophoneStream, refreshAudioInputs],
  );

  const registerRemoteAudioTrack = useCallback((trackEvent) => {
    const stream = trackEvent.streams[0] || new MediaStream([trackEvent.track]);

    if (trackEvent.track?.kind === "audio") {
      const track = new RemoteAudioTrack(trackEvent.track, trackEvent.track.id, trackEvent.receiver);
      track.setMediaStream(stream);
      liveKitAudioTrack.current = track;
      setAgentAudioTrack(track);
      setRemoteAudioStream(stream);
    }

    return stream;
  }, []);

  const cleanupAudio = useCallback(() => {
    if (localMediaStream.current) {
      localMediaStream.current.getTracks().forEach((track) => track.stop());
    }

    liveKitAudioTrack.current = null;
    localAudioSender.current = null;
    localMediaStream.current = null;
    setAgentAudioTrack(null);
    setLocalAudioTrack(null);
    setRemoteAudioStream(null);
  }, []);

  const changeAudioInput = useCallback(
    async (deviceId) => {
      setSelectedAudioInputId(deviceId);
      storeAudioInputId(deviceId);

      if (!localAudioSender.current) return;

      try {
        const nextStream = await createMicrophoneStream(deviceId);
        const [nextTrack] = nextStream.getAudioTracks();

        if (!nextTrack) return;

        await localAudioSender.current.replaceTrack(nextTrack);
        setLocalAudioTrack(new LocalAudioTrack(nextTrack));

        if (localMediaStream.current) {
          localMediaStream.current.getTracks().forEach((track) => track.stop());
        }

        localMediaStream.current = nextStream;
        await refreshAudioInputs();
      } catch (error) {
        console.error(error);
      }
    },
    [createMicrophoneStream, refreshAudioInputs],
  );

  const toggleMicrophone = useCallback(() => {
    setIsMicEnabled((current) => {
      const nextEnabled = !current;
      localMediaStream.current?.getAudioTracks().forEach((track) => {
        track.enabled = nextEnabled;
      });
      return nextEnabled;
    });
  }, []);

  useEffect(() => {
    refreshAudioInputs().catch(console.error);

    navigator.mediaDevices?.addEventListener?.("devicechange", refreshAudioInputs);

    return () => {
      navigator.mediaDevices?.removeEventListener?.("devicechange", refreshAudioInputs);
    };
  }, [refreshAudioInputs]);

  return {
    audioInputs,
    selectedAudioInputId,
    isMicEnabled,
    agentAudioTrack,
    localAudioTrack,
    remoteAudioStream,
    attachMicrophoneToPeerConnection,
    registerRemoteAudioTrack,
    cleanupAudio,
    changeAudioInput,
    toggleMicrophone,
  };
}
