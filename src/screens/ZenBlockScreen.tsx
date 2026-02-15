import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, BackHandler } from 'react-native';

export const ZenBlockScreen = ({ onExit }: { onExit: () => void }) => {
    const [quote, setQuote] = useState("Time to find your Zen.");

    useEffect(() => {
        // Prevent hardware back button from returning to the blocked app immediately
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            // We can either do nothing (forcing them to use home) or minimize app
            // For now, let's allow it to just do default (which exits Zenox)
            // But typically a blocker wants to be persistent. 

            // Better UX: minimize the app when they try to leave, 
            // effectively returning them to the blocked app? No, that defeats the purpose.
            // Returning them to Home is best.

            // Since we don't have a native "Go Home" exposed yet, we will rely on the "Leave Zen Mode" button.
            return true;
        });
        return () => backHandler.remove();
    }, []);

    const handleLeave = () => {
        // In a real blocker, this would minimize Zenox. 
        // Since we don't have a specific native module for "minimize" yet, 
        // we will just call the onExit prop which presumably navigate back or does nothing.
        onExit();
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>🧘</Text>
            <Text style={styles.message}>{quote}</Text>

            <TouchableOpacity style={styles.button} onPress={handleLeave}>
                <Text style={styles.buttonText}>Leave Zen Mode</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F2027', // Deep Zen Blue/Black
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    title: {
        fontSize: 80,
        marginBottom: 40,
    },
    message: {
        fontSize: 28,
        color: '#FFF',
        fontWeight: '300',
        textAlign: 'center',
        marginBottom: 60,
        lineHeight: 40,
    },
    button: {
        borderColor: '#FFF',
        borderWidth: 1,
        paddingVertical: 15,
        paddingHorizontal: 40,
        borderRadius: 30,
    },
    buttonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 1,
    }
});
