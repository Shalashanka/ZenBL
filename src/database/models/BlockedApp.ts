import { Model } from '@nozbe/watermelondb'
import { field, date, readonly } from '@nozbe/watermelondb/decorators'

export default class BlockedApp extends Model {
    static table = 'blocked_apps'

    @field('package_name') packageName!: string
    @field('app_name') appName!: string
    @field('icon_url') iconUrl?: string
    @readonly @date('created_at') createdAt!: number
    @readonly @date('updated_at') updatedAt!: number
}
