import { Model } from '@nozbe/watermelondb'
import { field, date, children, readonly } from '@nozbe/watermelondb/decorators'
import Schedule from './Schedule'

export default class ZenProfile extends Model {
    static table = 'zen_profiles'

    static associations = {
        schedules: { type: 'has_many' as const, foreignKey: 'profile_id' },
    }

    @field('name') name!: string
    @field('is_active') isActive!: boolean
    @field('ringer_mode') ringerMode?: string
    @field('ambient_sound_file') ambientSoundFile?: string
    @readonly @date('created_at') createdAt!: number
    @readonly @date('updated_at') updatedAt!: number

    @children('schedules') schedules!: any // Query<Schedule>
}
