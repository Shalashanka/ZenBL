import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import Animated, {
    useAnimatedStyle,
    withSpring,
    useSharedValue,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
    style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({ title, onPress, variant = 'primary', style }) => {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }],
        };
    });

    const handlePressIn = () => {
        scale.value = withSpring(0.95, { stiffness: 300, damping: 20 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { stiffness: 300, damping: 20 });
    };

    const getVariantStyles = (): ViewStyle => {
        switch (variant) {
            case 'danger':
                return { backgroundColor: '#FF3B30' };
            case 'secondary':
                return { backgroundColor: '#8E8E93' };
            case 'primary':
            default:
                return { backgroundColor: '#007AFF' };
        }
    };

    return (
        <AnimatedPressable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={[styles.button, getVariantStyles(), animatedStyle, style]}
        >
            <Text style={styles.text}>{title}</Text>
        </AnimatedPressable>
    );
};

const styles = StyleSheet.create({
    button: {
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    text: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
