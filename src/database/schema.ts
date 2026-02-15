import { appSchema, tableSchema } from '@nozbe/watermelondb'

export default appSchema({
    version: 2,
    tables: [
        tableSchema({
            name: 'blocked_apps',
            columns: [
                { name: 'package_name', type: 'string' },
                { name: 'app_name', type: 'string' },
                { name: 'icon_url', type: 'string', isOptional: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ]
        }),
        tableSchema({
            name: 'zen_profiles',
            columns: [
                { name: 'name', type: 'string' },
                { name: 'is_active', type: 'boolean' },
                { name: 'ringer_mode', type: 'string', isOptional: true }, // e.g. 'silent', 'vibrate', 'normal'
                { name: 'ambient_sound_file', type: 'string', isOptional: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ]
        }),
        tableSchema({
            name: 'schedules',
            columns: [
                { name: 'profile_id', type: 'string', isIndexed: true },
                { name: 'day_of_week', type: 'number' }, // 0-6 (Sun-Sat)
                { name: 'start_time', type: 'string' }, // HH:mm
                { name: 'end_time', type: 'string' },   // HH:mm
                { name: 'is_enabled', type: 'boolean' },
                { name: 'name', type: 'string', isOptional: true },
                { name: 'recurrence_type', type: 'string', isOptional: true }, // 'daily', 'weekly', etc.
                { name: 'specific_blocked_apps', type: 'string', isOptional: true }, // JSON string of package names
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ]
        }),
    ]
})
