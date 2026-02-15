import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations'

export default schemaMigrations({
    migrations: [
        {
            toVersion: 2,
            steps: [
                addColumns({
                    table: 'schedules',
                    columns: [
                        { name: 'name', type: 'string', isOptional: true },
                        { name: 'recurrence_type', type: 'string', isOptional: true },
                        { name: 'specific_blocked_apps', type: 'string', isOptional: true },
                    ],
                }),
            ],
        },
    ],
})
