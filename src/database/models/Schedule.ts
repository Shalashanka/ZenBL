import { Model } from '@nozbe/watermelondb'
import { field, date, relation, readonly } from '@nozbe/watermelondb/decorators'
import ZenProfile from './ZenProfile'

export default class Schedule extends Model {
    static table = 'schedules'

    static associations = {
        zen_profiles: { type: 'belongs_to' as const, key: 'profile_id' },
    }

    @field('day_of_week') dayOfWeek!: number
    @field('start_time') startTime!: string
    @field('end_time') endTime!: string
    @readonly @date('created_at') createdAt!: number
    @readonly @date('updated_at') updatedAt!: number

    @relation('zen_profiles', 'profile_id') profile!: any // Relation<ZenProfile>
}
