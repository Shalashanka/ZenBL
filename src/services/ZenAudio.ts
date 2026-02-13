import { Audio } from 'expo-av';

export const ZenAudio = {
    playFlute: async () => {
        try {
            // Configure audio session
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
                staysActiveInBackground: true,
            });

            const { sound } = await Audio.Sound.createAsync(
                require('../../assets/audio/flute.mp3'),
                { shouldPlay: true, volume: 0.4 } // Set volume to 0.4
            );

            // Allow playing even if another app is playing (ducking)
            // or just take focus.
            // The Sound.createAsync options handles basic playback.
            // The setAudioModeAsync handles the session.

            // Ensure sound is unloaded when done to free resources
            sound.setOnPlaybackStatusUpdate(status => {
                if (status.isLoaded && status.didJustFinish) {
                    sound.unloadAsync();
                }
            });

        } catch (error) {
            console.warn('Failed to play flute', error);
        }
    },
};
