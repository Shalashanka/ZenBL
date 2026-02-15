declare module 'react-native-background-timer' {
    const BackgroundTimer: {
        runBackgroundTimer(callback: () => void, period: number): void;
        stopBackgroundTimer(): void;
        start(delay?: number): number;
        stop(): void;
        setTimeout(callback: () => void, timeout: number): number;
        clearTimeout(timeoutId: number): void;
        setInterval(callback: () => void, timeout: number): number;
        clearInterval(intervalId: number): void;
    };
    export default BackgroundTimer;
}
