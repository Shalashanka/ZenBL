import React, { useEffect } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    interpolateColor,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type TabKey = 'dashboard' | 'appList' | 'schedules';

interface BottomNavProps {
    activeTab: TabKey;
    onTabChange: (tab: TabKey) => void;
}

const TABS: { key: TabKey; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
    { key: 'dashboard', icon: 'home', label: 'Home' },
    { key: 'appList', icon: 'apps', label: 'Apps' },
    { key: 'schedules', icon: 'time', label: 'Schedules' },
];

const TabIcon = ({
    icon,
    isActive,
    onPress,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    isActive: boolean;
    onPress: () => void;
}) => {
    const scale = useSharedValue(isActive ? 1.2 : 1);
    const activeProgress = useSharedValue(isActive ? 1 : 0);

    useEffect(() => {
        scale.value = withSpring(isActive ? 1.2 : 1, { damping: 12, stiffness: 200 });
        activeProgress.value = withTiming(isActive ? 1 : 0, { duration: 300 });
    }, [isActive, scale, activeProgress]);

    const animatedIconStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }],
        };
    });

    const animatedIndicatorStyle = useAnimatedStyle(() => {
        return {
            opacity: activeProgress.value,
            transform: [{ translateY: withSpring(isActive ? 0 : 10) }],
        };
    });

    return (
        <Pressable
            onPress={onPress}
            style={styles.tabItem}
        >
            <Animated.View style={animatedIconStyle}>
                <Ionicons name={icon} size={28} color={isActive ? '#007AFF' : '#8E8E93'} />
            </Animated.View>
            <Animated.View style={[styles.indicator, animatedIndicatorStyle]} />
        </Pressable>
    );
};

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
    const insets = useSafeAreaInsets();
    const entranceY = useSharedValue(100);

    useEffect(() => {
        entranceY.value = withSpring(0, { damping: 15, stiffness: 150 });
    }, [entranceY]);

    const animatedContainerStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateY: entranceY.value }],
            paddingBottom: insets.bottom > 0 ? insets.bottom : 20,
        };
    });

    return (
        <Animated.View style={[styles.container, animatedContainerStyle]}>
            {TABS.map((tab) => (
                <TabIcon
                    key={tab.key}
                    icon={tab.icon}
                    isActive={activeTab === tab.key}
                    onPress={() => onTabChange(tab.key)}
                />
            ))}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        paddingTop: 16,
        justifyContent: 'space-around',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 10,
        position: 'absolute',
        bottom: 0,
        width: '100%',
    },
    tabItem: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
    },
    indicator: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#007AFF',
        marginTop: 6,
        position: 'absolute',
        bottom: -6,
    },
});
