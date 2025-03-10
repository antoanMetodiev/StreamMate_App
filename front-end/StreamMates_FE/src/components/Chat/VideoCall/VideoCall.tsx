import { useEffect, useState, useRef } from 'react';
import AgoraRTC, {
    IAgoraRTCClient,
    ICameraVideoTrack,
    IMicrophoneAudioTrack,
    IAgoraRTCRemoteUser,
} from 'agora-rtc-sdk-ng';
import { CallNotification } from '../../../types/CallNotification';

interface VideoCallProps {
    incomingCall: CallNotification | null;
};

export const VideoCall = ({
    incomingCall,
}: VideoCallProps) => {
    const [joined, setJoined] = useState(false);
    const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
    const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
    const [cameraMuted, setCameraMuted] = useState(false);
    const [audioMuted, setAudioMuted] = useState(false);
    const [permissionDenied, setPermissionDenied] = useState(false);
    console.log(permissionDenied);

    // Рефове за визуализацията на локалното и отдалеченото видео
    const localVideoRef = useRef<HTMLDivElement>(null);
    const remoteVideoRef = useRef<HTMLDivElement>(null);

    const APP_ID = "e873d718c560455c95c08e76ac598d28"; // Твоето Agora App ID
    const CHANNEL = incomingCall ? incomingCall.channelName : 'default-channel';
    const TOKEN = null; // Ако използваш токен, можеш да го зададеш тук

    const client: IAgoraRTCClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

    // Обработваме публикуването на отдалечени потребители
    useEffect(() => {
        client.on('user-published', async (user: IAgoraRTCRemoteUser, mediaType) => {
            await client.subscribe(user, mediaType);
            console.log('Subscribed to user:', user.uid, mediaType);
            if (mediaType === 'video' && user.videoTrack && remoteVideoRef.current) {
                user.videoTrack.play(remoteVideoRef.current);
            }
            if (mediaType === 'audio' && user.audioTrack) {
                user.audioTrack.play();
            }
        });
    }, [client]);

    const joinChannel = async () => {
        debugger;
        try {
            // Присъединяваме се към зададения канал
            await client.join(APP_ID, CHANNEL, TOKEN, null);

            let audioTrack, videoTrack;

            // Проверяваме дали вече имаме локални тракове
            if (!localAudioTrack || !localVideoTrack) {
                // Получаваме разрешение за достъп до камерата и микрофона
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                console.log('Permissions granted');

                // Вземаме аудио и видео траковете от MediaStream
                const audio = stream.getAudioTracks()[0];
                const video = stream.getVideoTracks()[0];

                // Създаваме Agora custom тракове, като подаваме MediaStreamTrack
                audioTrack = AgoraRTC.createCustomAudioTrack({ mediaStreamTrack: audio }) as unknown as IMicrophoneAudioTrack;
                videoTrack = AgoraRTC.createCustomVideoTrack({ mediaStreamTrack: video }) as unknown as ICameraVideoTrack;

                // Записваме локалните тракове в състоянието
                setLocalAudioTrack(audioTrack);
                setLocalVideoTrack(videoTrack);

                // Пускаме локалното видео в контейнера
                if (localVideoRef.current) {
                    videoTrack.play(localVideoRef.current);
                }
            } else {
                // Ако вече има създадени тракове, ги използваме
                audioTrack = localAudioTrack;
                videoTrack = localVideoTrack;
            }

            // Публикуваме траковете в канала
            await client.publish([audioTrack, videoTrack]);
            setJoined(true);
            console.log('Successfully joined and published local tracks.');
        } catch (error) {
            console.error('Error while joining the channel or accessing media:', error);
            setPermissionDenied(true);
        }
    };


    // Автоматично присъединяване при монтирaне на компонента
    useEffect(() => {
        joinChannel();
    }, []);

    const leaveChannel = async () => {
        await client.leave();
        localVideoTrack?.stop();
        localVideoTrack?.close();
        localAudioTrack?.stop();
        localAudioTrack?.close();
        setJoined(false);
        console.log('Left the channel.');
    };

    const toggleCamera = () => {
        if (localVideoTrack) {
            localVideoTrack.setEnabled(cameraMuted ? true : false);
            setCameraMuted(!cameraMuted);
        }
    };

    const toggleAudio = () => {
        if (localAudioTrack) {
            localAudioTrack.setEnabled(audioMuted ? true : false);
            setAudioMuted(!audioMuted);
        }
    };



    return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
            <h1>Agora Video Call</h1>
            {/* Контейнер за локално видео */}
            <div
                id="local-video"
                ref={localVideoRef}
                style={{
                    width: '45%',
                    height: '300px',
                    border: '2px solid #4CAF50',
                    display: 'inline-block',
                    marginRight: '10px',
                }}
            ></div>
            {/* Контейнер за отдалечено видео */}
            <div
                id="remote-video"
                ref={remoteVideoRef}
                style={{
                    width: '45%',
                    height: '300px',
                    border: '2px solid #4CAF50',
                    display: 'inline-block',
                }}
            ></div>
            <div style={{ marginTop: '20px' }}>
                {!joined ? (
                    <button
                        onClick={joinChannel}
                        style={{
                            padding: '10px 20px',
                            fontSize: '16px',
                            backgroundColor: '#4CAF50',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                        }}
                    >
                        Start Video Call
                    </button>
                ) : (
                    <>
                        <button
                            onClick={leaveChannel}
                            style={{
                                padding: '10px 20px',
                                fontSize: '16px',
                                backgroundColor: '#f44336',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                marginRight: '10px',
                            }}
                        >
                            Leave Channel
                        </button>
                        <button
                            onClick={toggleCamera}
                            style={{
                                padding: '10px 20px',
                                fontSize: '16px',
                                backgroundColor: cameraMuted ? '#f44336' : '#4CAF50',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                marginRight: '10px',
                            }}
                        >
                            {cameraMuted ? 'Turn Camera On' : 'Turn Camera Off'}
                        </button>
                        <button
                            onClick={toggleAudio}
                            style={{
                                padding: '10px 20px',
                                fontSize: '16px',
                                backgroundColor: audioMuted ? '#f44336' : '#4CAF50',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer',
                            }}
                        >
                            {audioMuted ? 'Unmute Audio' : 'Mute Audio'}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};