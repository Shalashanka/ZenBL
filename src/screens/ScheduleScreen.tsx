import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Switch, Modal, Platform, TextInput, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AppScanner } from '../services/AppScanner';
import { useZenStore } from '../store/zenStore';
import { useNavigation } from '@react-navigation/native';
import { ZenoxEngine } from '../bridge/ZenoxEngine';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useZenoxStatus } from '../hooks/useZenoxStatus';
import { getThemeColors } from '../theme/Theme';
import { useAppPreferences } from '../preferences/AppPreferencesContext';

export const ScheduleScreen = ({ onClose }: { onClose?: () => void }) => {
    const navigation = useNavigation<any>();
    const status = useZenoxStatus();
    const { t, themeMode } = useAppPreferences();
    const colors = getThemeColors(status.isActive, themeMode);
    const {
        schedules,
        fetchSchedules,
        saveSchedule: storeSaveSchedule,
        deleteSchedule: storeDeleteSchedule,
        installedApps,
        setInstalledApps
    } = useZenStore();

    const [isModalVisible, setModalVisible] = useState(false);

    // New Schedule State
    const [editingId, setEditingId] = useState<number | null>(null);
    const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Default Mon-Fri
    const [scheduleName, setScheduleName] = useState('');
    const [recurrenceType, setRecurrenceType] = useState('daily');

    // Blocking Strategy State
    const [blockMode, setBlockMode] = useState<'global' | 'custom'>('global');
    const [specificApps, setSpecificApps] = useState<string[]>([]);
    const [isAppPickerVisible, setAppPickerVisible] = useState(false);
    const [appsLoading, setAppsLoading] = useState(false);

    const [startTime, setStartTime] = useState(new Date());
    const [endTime, setEndTime] = useState(new Date(new Date().getTime() + 60 * 60 * 1000)); // +1h default

    // Pickers visibility
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    useEffect(() => {
        fetchSchedules();
    }, []);

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const toggleDay = (index: number) => {
        if (selectedDays.includes(index)) {
            setSelectedDays(selectedDays.filter(d => d !== index));
        } else {
            setSelectedDays([...selectedDays, index].sort());
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const loadApps = async () => {
        if (installedApps.length > 0) return;
        setAppsLoading(true);
        try {
            const apps = await AppScanner.getInstalledApps();
            setInstalledApps(apps);
        } finally {
            setAppsLoading(false);
        }
    };

    const openAppPicker = async () => {
        await loadApps();
        setAppPickerVisible(true);
    };

    const saveSchedule = async () => {
        try {
            if (Platform.OS === 'android') {
                const hasExactAlarm = await ZenoxEngine.checkExactAlarmPermission();
                if (!hasExactAlarm) {
                    ZenoxEngine.requestExactAlarmPermission();
                    Alert.alert(
                        'Exact Alarm Permission Required',
                        'Please allow Exact Alarms in system settings, then come back and save the schedule again.',
                    );
                    return;
                }
            }

            const daysToSave = recurrenceType === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : selectedDays;

            if (daysToSave.length === 0) {
                Alert.alert('Selection Required', 'Please select at least one day.');
                return;
            }

            // Native engine uses 7=Sun, 1=Mon..6=Sat; JS uses 0=Sun, 1=Mon..6=Sat
            const daysForNative = daysToSave.map((d: number) => (d === 0 ? 7 : d));

            console.log('[ScheduleScreen] Saving Schedule...', { scheduleName, recurrenceType, daysToSave, daysForNative, blockMode });

            const specificAppsJson = blockMode === 'custom' ? JSON.stringify(specificApps) : undefined;

            const scheduleData = {
                id: editingId || 0, // 0 triggers insert
                name: scheduleName || 'Unnamed Schedule',
                startHour: startTime.getHours(),
                startMinute: startTime.getMinutes(),
                endHour: endTime.getHours(),
                endMinute: endTime.getMinutes(),
                daysOfWeek: daysForNative.join(','), // Native expects 7=Sun, 1=Mon..6=Sat
                isFortress: false, // Default for now
                isEnabled: true,
                blockedAppsJson: specificAppsJson
            };

            await storeSaveSchedule(scheduleData);

            console.log('[ScheduleScreen] Save successful');
            setModalVisible(false);
            resetForm();
        } catch (error: any) {
            console.error('[ScheduleScreen] Failed to save schedule:', error);
            Alert.alert('Save Failed', `Failed to save: ${error.message}`);
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setSelectedDays([1, 2, 3, 4, 5]);
        setScheduleName('');
        setBlockMode('global');
        setSpecificApps([]);
    };

    const deleteSchedule = async (id: number) => {
        try {
            await storeDeleteSchedule(id);
        } catch (error) {
            Alert.alert('Error', 'Failed to delete schedule');
        }
    };

    const toggleSchedule = async (item: any) => {
        // To toggle, we just update the same schedule with isEnabled flipped
        try {
            const updated = {
                id: item.id,
                name: item.name,
                startHour: item.startHour,
                startMinute: item.startMinute,
                endHour: item.endHour,
                endMinute: item.endMinute,
                daysOfWeek: item.daysOfWeek,
                isFortress: item.isFortress,
                isEnabled: !item.isEnabled,
                blockedAppsJson: item.blockedAppsJson
            };
            await storeSaveSchedule(updated);
        } catch (e) {
            console.error(e);
        }
    };

    const openEditModal = (item: any) => {
        setEditingId(item.id);
        setScheduleName(item.name || '');
        setRecurrenceType('custom'); // Always custom for now as we store specific days

        const sTime = new Date();
        sTime.setHours(item.startHour, item.startMinute, 0, 0);

        const eTime = new Date();
        eTime.setHours(item.endHour, item.endMinute, 0, 0);

        setStartTime(sTime);
        setEndTime(eTime);

        if (item.blockedAppsJson) {
            setBlockMode('custom');
            try {
                setSpecificApps(JSON.parse(item.blockedAppsJson));
            } catch (e) {
                setSpecificApps([]);
            }
        } else {
            setBlockMode('global');
            setSpecificApps([]);
        }

        // Native stores 7=Sun, 1=Mon..6=Sat; UI uses 0=Sun, 1=Mon..6=Sat
        const daysArr = item.daysOfWeek ? item.daysOfWeek.split(',').map(Number) : [];
        setSelectedDays(daysArr.map((d: number) => (d === 7 ? 0 : d)));

        setModalVisible(true);
    };

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity style={styles.card} onPress={() => openEditModal(item)}>
            <View style={styles.cardHeader}>
                <Text style={styles.dayText}>{item.name}</Text>
                <Switch
                    value={item.isEnabled}
                    onValueChange={() => toggleSchedule(item)}
                    trackColor={{ false: '#767577', true: '#81b0ff' }}
                    thumbColor={item.isEnabled ? '#007AFF' : '#f4f3f4'}
                />
            </View>
            <Text style={styles.timeText}>
                {`${item.startHour.toString().padStart(2, '0')}:${item.startMinute.toString().padStart(2, '0')} - ${item.endHour.toString().padStart(2, '0')}:${item.endMinute.toString().padStart(2, '0')}`}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
                {item.daysOfWeek.split(',').map((d: string) => {
                    const n = parseInt(d, 10);
                    return <Text key={d} style={styles.miniDayBadge}>{days[n === 7 ? 0 : n]}</Text>;
                })}
            </View>
            {item.blockedAppsJson && (
                <Text style={styles.detailText}>Custom Blocklist Active</Text>
            )}
            <TouchableOpacity onPress={() => deleteSchedule(item.id)} style={styles.deleteBtn}>
                <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>{t('schedule.title')}</Text>
                <TouchableOpacity onPress={() => (onClose ? onClose() : navigation.goBack())}>
                    <Text style={[styles.closeText, { color: colors.text }]}>{t('common.done')}</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={schedules}
                keyExtractor={item => item.id.toString()}
                renderItem={renderItem}
                contentContainerStyle={{ paddingBottom: 80 }}
            />

            <TouchableOpacity style={styles.fab} onPress={() => { resetForm(); setModalVisible(true); }}>
                <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>

            <Modal visible={isModalVisible} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView style={[styles.modalContent, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>{editingId ? t('schedule.editSchedule') : t('schedule.newZenSchedule')}</Text>

                    <Text style={[styles.label, { color: colors.text }]}>Schedule Name</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                        placeholder="e.g. Morning Focus"
                        placeholderTextColor={colors.mutedText}
                        value={scheduleName}
                        onChangeText={setScheduleName}
                    />

                    <Text style={[styles.label, { color: colors.text }]}>Recurrence</Text>
                    <View style={styles.recurrenceRow}>
                        <TouchableOpacity
                            style={[styles.recurrenceBtn, recurrenceType === 'daily' && styles.recurrenceBtnSelected]}
                            onPress={() => setRecurrenceType('daily')}>
                            <Text style={[styles.recurrenceText, { color: colors.text }, recurrenceType === 'daily' && styles.recurrenceTextSelected]}>Daily</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.recurrenceBtn, recurrenceType === 'custom' && styles.recurrenceBtnSelected]}
                            onPress={() => setRecurrenceType('custom')}>
                            <Text style={[styles.recurrenceText, { color: colors.text }, recurrenceType === 'custom' && styles.recurrenceTextSelected]}>Custom</Text>
                        </TouchableOpacity>
                    </View>

                    {recurrenceType === 'custom' && (
                        <>
                            <Text style={[styles.label, { color: colors.text }]}>Days</Text>
                            <View style={styles.daysRow}>
                                {days.map((day, index) => (
                                    <TouchableOpacity
                                        key={day}
                                        style={[styles.dayChip, selectedDays.includes(index) && styles.dayChipSelected]}
                                        onPress={() => toggleDay(index)}
                                    >
                                        <Text style={[styles.dayChipText, { color: colors.text }, selectedDays.includes(index) && styles.dayChipTextSelected]}>
                                            {day}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </>
                    )}

                    <Text style={[styles.label, { color: colors.text }]}>Blocking Strategy</Text>
                    <View style={styles.recurrenceRow}>
                        <TouchableOpacity
                            style={[styles.recurrenceBtn, blockMode === 'global' && styles.recurrenceBtnSelected]}
                            onPress={() => setBlockMode('global')}>
                            <Text style={[styles.recurrenceText, { color: colors.text }, blockMode === 'global' && styles.recurrenceTextSelected]}>Global List</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.recurrenceBtn, blockMode === 'custom' && styles.recurrenceBtnSelected]}
                            onPress={() => {
                                setBlockMode('custom');
                                if (installedApps.length === 0) loadApps();
                            }}>
                            <Text style={[styles.recurrenceText, { color: colors.text }, blockMode === 'custom' && styles.recurrenceTextSelected]}>Specific Apps</Text>
                        </TouchableOpacity>
                    </View>

                    {blockMode === 'custom' && (
                        <TouchableOpacity
                            style={[styles.selectAppsBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                            onPress={openAppPicker}
                            disabled={appsLoading}
                        >
                            <Text style={[styles.selectAppsText, { color: colors.accent }]}>
                                {appsLoading
                                    ? t('common.loading')
                                    : specificApps.length > 0
                                        ? `${specificApps.length} ${t('schedule.appsSelected')}`
                                        : t('schedule.selectApps')}
                            </Text>
                        </TouchableOpacity>
                    )}

                    <Text style={[styles.label, { color: colors.text }]}>Time Range</Text>
                    <View style={styles.timeRow}>
                        <TouchableOpacity style={[styles.timeBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowStartPicker(true)}>
                            <Text style={{ color: colors.text }}>Start: {formatTime(startTime)}</Text>
                        </TouchableOpacity>
                        <Text style={{ color: colors.text }}>to</Text>
                        <TouchableOpacity style={[styles.timeBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowEndPicker(true)}>
                            <Text style={{ color: colors.text }}>End: {formatTime(endTime)}</Text>
                        </TouchableOpacity>
                    </View>

                    {showStartPicker && (
                        <DateTimePicker
                            value={startTime}
                            mode="time"
                            is24Hour={true}
                            display="default"
                            onChange={(event, date) => {
                                setShowStartPicker(Platform.OS === 'ios');
                                if (date) {
                                    setStartTime(date);
                                    if (endTime <= date) setEndTime(new Date(date.getTime() + 60000));
                                }
                            }}
                        />
                    )}

                    {showEndPicker && (
                        <DateTimePicker
                            value={endTime}
                            mode="time"
                            is24Hour={true}
                            display="default"
                            onChange={(event, date) => {
                                setShowEndPicker(Platform.OS === 'ios');
                                if (date) setEndTime(date);
                            }}
                        />
                    )}

                    <View style={styles.actionRow}>
                        <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.cancelBtn, { borderColor: colors.border }]}>
                            <Text style={[styles.cancelText, { color: colors.text }]}>{t('common.cancel')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={saveSchedule} style={[styles.saveBtn, { backgroundColor: colors.accent }]}>
                            <Text style={styles.saveText}>{t('common.save')}</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </Modal>

            {/* App Picker Modal */}
            <Modal visible={isAppPickerVisible} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView style={[styles.modalContent, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>{t('schedule.selectAppsToBlock')}</Text>
                    {appsLoading && installedApps.length === 0 ? (
                        <Text style={[styles.loadingText, { color: colors.mutedText }]}>{t('common.loading')}</Text>
                    ) : (
                    <FlatList
                        data={installedApps}
                        keyExtractor={item => item.packageName}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[styles.appItem, { borderBottomColor: colors.border }]}
                                onPress={() => {
                                    if (specificApps.includes(item.packageName)) {
                                        setSpecificApps(specificApps.filter(p => p !== item.packageName));
                                    } else {
                                        setSpecificApps([...specificApps, item.packageName]);
                                    }
                                }}
                            >
                                <Text style={[styles.appName, { color: colors.text }]}>{item.appName}</Text>
                                {specificApps.includes(item.packageName) && <Text style={styles.checkMark}>✓</Text>}
                            </TouchableOpacity>
                        )}
                    />
                    )}
                    <TouchableOpacity onPress={() => setAppPickerVisible(false)} style={[styles.saveBtn, { marginTop: 20, backgroundColor: colors.accent }]}>
                        <Text style={styles.saveText}>{t('common.done')}</Text>
                    </TouchableOpacity>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, paddingTop: 8 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
    title: { fontSize: 26, fontFamily: 'SNPro_Bold' },
    closeText: { fontSize: 15, fontFamily: 'SNPro_Bold' },
    card: { backgroundColor: '#2D313A', borderRadius: 14, padding: 14, marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderColor: '#3A3F4A' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    dayText: { fontSize: 17, color: '#F5F7FA', fontFamily: 'SNPro_Bold' },
    timeText: { fontSize: 15, color: '#A8B0BE', marginTop: 4, fontFamily: 'SNPro_Regular' },
    detailText: { fontSize: 12, color: '#FF8A62', marginTop: 4, fontFamily: 'SNPro_Regular' },
    deleteBtn: { marginTop: 10, alignSelf: 'flex-start' },
    deleteText: { color: '#FF6B6B', fontSize: 14, fontFamily: 'SNPro_Bold' },
    fab: { position: 'absolute', bottom: 40, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#FF7043', justifyContent: 'center', alignItems: 'center', elevation: 5 },
    fabText: { color: '#fff', fontSize: 30 },
    miniDayBadge: { fontSize: 11, backgroundColor: '#3B404B', marginRight: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, overflow: 'hidden', color: '#D7DCE6' },

    // Modal
    modalContent: { flex: 1, padding: 16, paddingTop: 10 },
    modalTitle: { fontSize: 24, fontFamily: 'SNPro_Bold', marginBottom: 20 },
    label: { fontSize: 15, fontFamily: 'SNPro_Bold', marginBottom: 10, marginTop: 18 },
    daysRow: { flexDirection: 'row', justifyContent: 'space-between' },
    dayChip: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3A3F4A', justifyContent: 'center', alignItems: 'center' },
    dayChipSelected: { backgroundColor: '#FF7043' },
    dayChipText: { fontFamily: 'SNPro_Bold' },
    dayChipTextSelected: { color: '#fff' },
    timeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    timeBtn: { padding: 10, borderRadius: 10, borderWidth: 1 },
    actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 50 },
    cancelBtn: { padding: 12, borderRadius: 10, borderWidth: 1 },
    cancelText: { fontSize: 16, fontFamily: 'SNPro_Bold' },
    saveBtn: { padding: 14, borderRadius: 10, paddingHorizontal: 30 },
    saveText: { color: '#fff', fontSize: 16, fontFamily: 'SNPro_Bold' },
    input: { padding: 12, borderRadius: 10, fontSize: 15, marginBottom: 10, borderWidth: 1, fontFamily: 'SNPro_Regular' },
    recurrenceRow: { flexDirection: 'row', marginBottom: 20 },
    recurrenceBtn: { padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#4A505E', marginRight: 10, backgroundColor: '#2E333D' },
    recurrenceBtnSelected: { backgroundColor: '#FF7043', borderColor: '#FF7043' },
    recurrenceText: { fontFamily: 'SNPro_Regular' },
    recurrenceTextSelected: { color: '#fff' },

    selectAppsBtn: { padding: 14, borderRadius: 10, marginBottom: 20, alignItems: 'center', borderWidth: 1 },
    selectAppsText: { fontSize: 15, fontFamily: 'SNPro_Bold' },

    appItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, alignItems: 'center' },
    appName: { fontSize: 16, fontFamily: 'SNPro_Regular' },
    checkMark: { color: '#FF7043', fontFamily: 'SNPro_Bold', fontSize: 18 },
    loadingText: { fontSize: 15, padding: 20, textAlign: 'center' as const, fontFamily: 'SNPro_Regular' },
});
