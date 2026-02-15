import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Switch, Modal, Platform, TextInput, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AppScanner } from '../services/AppScanner';
import { useZenStore } from '../store/zenStore';

export const ScheduleScreen = ({ onClose }: { onClose: () => void }) => {
    console.log('📅 ScheduleScreen Component Rendered');
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
        if (installedApps.length === 0) {
            const apps = await AppScanner.getInstalledApps();
            setInstalledApps(apps);
        }
    };

    const saveSchedule = async () => {
        try {
            const daysToSave = recurrenceType === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : selectedDays;

            if (daysToSave.length === 0) {
                Alert.alert('Selection Required', 'Please select at least one day.');
                return;
            }

            console.log('[ScheduleScreen] Saving Schedule...', { scheduleName, recurrenceType, daysToSave, blockMode });

            const specificAppsJson = blockMode === 'custom' ? JSON.stringify(specificApps) : undefined;

            const scheduleData = {
                id: editingId || 0, // 0 triggers insert
                name: scheduleName || 'Unnamed Schedule',
                startHour: startTime.getHours(),
                startMinute: startTime.getMinutes(),
                endHour: endTime.getHours(),
                endMinute: endTime.getMinutes(),
                daysOfWeek: daysToSave.join(','), // Native expects comma-separated string
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

        const daysArr = item.daysOfWeek ? item.daysOfWeek.split(',').map(Number) : [];
        setSelectedDays(daysArr);

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
                {item.daysOfWeek.split(',').map((d: string) => (
                    <Text key={d} style={styles.miniDayBadge}>{days[parseInt(d)]}</Text>
                ))}
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
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Schedules</Text>
                <TouchableOpacity onPress={onClose}>
                    <Text style={styles.closeText}>Done</Text>
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
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>{editingId ? 'Edit Schedule' : 'New Zen Schedule'}</Text>

                    <Text style={styles.label}>Schedule Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Morning Focus"
                        value={scheduleName}
                        onChangeText={setScheduleName}
                    />

                    <Text style={styles.label}>Recurrence</Text>
                    <View style={styles.recurrenceRow}>
                        <TouchableOpacity
                            style={[styles.recurrenceBtn, recurrenceType === 'daily' && styles.recurrenceBtnSelected]}
                            onPress={() => setRecurrenceType('daily')}>
                            <Text style={[styles.recurrenceText, recurrenceType === 'daily' && styles.recurrenceTextSelected]}>Daily</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.recurrenceBtn, recurrenceType === 'custom' && styles.recurrenceBtnSelected]}
                            onPress={() => setRecurrenceType('custom')}>
                            <Text style={[styles.recurrenceText, recurrenceType === 'custom' && styles.recurrenceTextSelected]}>Custom</Text>
                        </TouchableOpacity>
                    </View>

                    {recurrenceType === 'custom' && (
                        <>
                            <Text style={styles.label}>Days</Text>
                            <View style={styles.daysRow}>
                                {days.map((day, index) => (
                                    <TouchableOpacity
                                        key={day}
                                        style={[styles.dayChip, selectedDays.includes(index) && styles.dayChipSelected]}
                                        onPress={() => toggleDay(index)}
                                    >
                                        <Text style={[styles.dayChipText, selectedDays.includes(index) && styles.dayChipTextSelected]}>
                                            {day}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </>
                    )}

                    <Text style={styles.label}>Blocking Strategy</Text>
                    <View style={styles.recurrenceRow}>
                        <TouchableOpacity
                            style={[styles.recurrenceBtn, blockMode === 'global' && styles.recurrenceBtnSelected]}
                            onPress={() => setBlockMode('global')}>
                            <Text style={[styles.recurrenceText, blockMode === 'global' && styles.recurrenceTextSelected]}>Global List</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.recurrenceBtn, blockMode === 'custom' && styles.recurrenceBtnSelected]}
                            onPress={() => {
                                setBlockMode('custom');
                                if (installedApps.length === 0) loadApps();
                            }}>
                            <Text style={[styles.recurrenceText, blockMode === 'custom' && styles.recurrenceTextSelected]}>Specific Apps</Text>
                        </TouchableOpacity>
                    </View>

                    {blockMode === 'custom' && (
                        <TouchableOpacity style={styles.selectAppsBtn} onPress={() => setAppPickerVisible(true)}>
                            <Text style={styles.selectAppsText}>
                                {specificApps.length > 0 ? `${specificApps.length} Apps Selected` : 'Select Apps'}
                            </Text>
                        </TouchableOpacity>
                    )}

                    <Text style={styles.label}>Time Range</Text>
                    <View style={styles.timeRow}>
                        <TouchableOpacity style={styles.timeBtn} onPress={() => setShowStartPicker(true)}>
                            <Text>Start: {formatTime(startTime)}</Text>
                        </TouchableOpacity>
                        <Text>to</Text>
                        <TouchableOpacity style={styles.timeBtn} onPress={() => setShowEndPicker(true)}>
                            <Text>End: {formatTime(endTime)}</Text>
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
                        <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={saveSchedule} style={styles.saveBtn}>
                            <Text style={styles.saveText}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* App Picker Modal */}
            <Modal visible={isAppPickerVisible} animationType="slide" presentationStyle="pageSheet">
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Select Apps to Block</Text>
                    <FlatList
                        data={installedApps}
                        keyExtractor={item => item.packageName}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.appItem}
                                onPress={() => {
                                    if (specificApps.includes(item.packageName)) {
                                        setSpecificApps(specificApps.filter(p => p !== item.packageName));
                                    } else {
                                        setSpecificApps([...specificApps, item.packageName]);
                                    }
                                }}
                            >
                                <Text style={styles.appName}>{item.appName}</Text>
                                {specificApps.includes(item.packageName) && <Text style={styles.checkMark}>✓</Text>}
                            </TouchableOpacity>
                        )}
                    />
                    <TouchableOpacity onPress={() => setAppPickerVisible(false)} style={[styles.saveBtn, { marginTop: 20 }]}>
                        <Text style={styles.saveText}>Done</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f2f2f7', paddingTop: 50 },
    header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 20 },
    title: { fontSize: 28, fontWeight: 'bold' },
    closeText: { fontSize: 17, color: '#007AFF', fontWeight: '600' },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginHorizontal: 20, marginBottom: 12 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    dayText: { fontSize: 18, fontWeight: '600' },
    timeText: { fontSize: 16, color: '#666', marginTop: 4 },
    detailText: { fontSize: 12, color: '#007AFF', marginTop: 2, fontStyle: 'italic' },
    deleteBtn: { marginTop: 10, alignSelf: 'flex-start' },
    deleteText: { color: 'red', fontSize: 14 },
    fab: { position: 'absolute', bottom: 40, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', elevation: 5 },
    fabText: { color: '#fff', fontSize: 30 },
    miniDayBadge: { fontSize: 12, backgroundColor: '#eee', marginRight: 4, paddingHorizontal: 4, borderRadius: 4, overflow: 'hidden', color: '#555' },

    // Modal
    modalContent: { flex: 1, padding: 20, paddingTop: 50, backgroundColor: '#fff' },
    modalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 30 },
    label: { fontSize: 16, fontWeight: '600', marginBottom: 10, marginTop: 20 },
    daysRow: { flexDirection: 'row', justifyContent: 'space-between' },
    dayChip: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' },
    dayChipSelected: { backgroundColor: '#007AFF' },
    dayChipText: { color: '#333' },
    dayChipTextSelected: { color: '#fff' },
    timeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    timeBtn: { padding: 10, backgroundColor: '#eee', borderRadius: 8 },
    actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 50 },
    cancelBtn: { padding: 15 },
    cancelText: { color: 'red', fontSize: 18 },
    saveBtn: { padding: 15, backgroundColor: '#007AFF', borderRadius: 8, paddingHorizontal: 30 },
    saveText: { color: '#fff', fontSize: 18, fontWeight: '600' },
    input: { backgroundColor: '#eee', padding: 12, borderRadius: 8, fontSize: 16, marginBottom: 10 },
    recurrenceRow: { flexDirection: 'row', marginBottom: 20 },
    recurrenceBtn: { padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ccc', marginRight: 10 },
    recurrenceBtnSelected: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
    recurrenceText: { color: '#333' },
    recurrenceTextSelected: { color: '#fff' },

    selectAppsBtn: { padding: 15, backgroundColor: '#f0f0f5', borderRadius: 8, marginBottom: 20, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
    selectAppsText: { fontSize: 16, color: '#007AFF', fontWeight: '500' },

    appItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
    appName: { fontSize: 16 },
    checkMark: { color: '#007AFF', fontWeight: 'bold', fontSize: 18 },
});
