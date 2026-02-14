import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Switch, Modal, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import database from '../database';
import Schedule from '../database/models/Schedule';
import { Q } from '@nozbe/watermelondb';

export const ScheduleScreen = ({ onClose }: { onClose: () => void }) => {
    console.log('📅 ScheduleScreen Component Rendered');
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [isModalVisible, setModalVisible] = useState(false);

    // New Schedule State
    const [selectedDays, setSelectedDays] = useState<number[]>([]);
    const [startTime, setStartTime] = useState(new Date());
    const [endTime, setEndTime] = useState(new Date());

    // Pickers visibility
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    useEffect(() => {
        loadSchedules();
    }, []);

    const loadSchedules = async () => {
        const list = await database.get<Schedule>('schedules').query().fetch();
        setSchedules(list);
    };

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

    const saveSchedule = async () => {
        if (selectedDays.length === 0) return;

        await database.write(async () => {
            const collection = database.get<Schedule>('schedules');
            for (const day of selectedDays) {
                await collection.create(schedule => {
                    schedule.dayOfWeek = day;
                    schedule.startTime = formatTime(startTime);
                    schedule.endTime = formatTime(endTime);
                    schedule.isEnabled = true;
                    // TODO: Link to a profile if needed
                    schedule.profile.id = 'default';
                });
            }
        });

        setModalVisible(false);
        setSelectedDays([]);
        loadSchedules();
    };

    const deleteSchedule = async (schedule: Schedule) => {
        await database.write(async () => {
            await schedule.destroyPermanently();
        });
        loadSchedules();
    };

    const toggleSchedule = async (schedule: Schedule) => {
        await database.write(async () => {
            await schedule.update(s => {
                s.isEnabled = !s.isEnabled;
            });
        });
        loadSchedules(); // Force refresh to show UI update if observer not set up
    };

    const renderItem = ({ item }: { item: Schedule }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.dayText}>{days[item.dayOfWeek]}</Text>
                <Switch
                    value={item.isEnabled}
                    onValueChange={() => toggleSchedule(item)}
                    trackColor={{ false: '#767577', true: '#81b0ff' }}
                    thumbColor={item.isEnabled ? '#007AFF' : '#f4f3f4'}
                />
            </View>
            <Text style={styles.timeText}>
                {item.startTime} - {item.endTime}
            </Text>
            <TouchableOpacity onPress={() => deleteSchedule(item)} style={styles.deleteBtn}>
                <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
        </View>
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
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={{ paddingBottom: 80 }}
            />

            <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
                <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>

            <Modal visible={isModalVisible} animationType="slide" presentationStyle="pageSheet">
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>New Zen Schedule</Text>

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
                                if (date) setStartTime(date);
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
    deleteBtn: { marginTop: 10, alignSelf: 'flex-start' },
    deleteText: { color: 'red', fontSize: 14 },
    fab: { position: 'absolute', bottom: 40, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', elevation: 5 },
    fabText: { color: '#fff', fontSize: 30 },

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
});
