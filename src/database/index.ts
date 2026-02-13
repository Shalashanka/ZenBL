import { Platform } from 'react-native'
import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs'

import schema from './schema'
import { BlockedApp, ZenProfile, Schedule } from './models'

// Determine which adapter to use
// SQLiteAdapter requires native JSI bindings (not available in Expo Go by default)
// LokiJSAdapter is used for Web and Expo Go testing
const adapter = Platform.OS === 'web' || !Boolean((global as any).nativeCallSyncHook)
    ? new LokiJSAdapter({
        schema,
        useWebWorker: false,
        useIncrementalIndexedDB: true,
        // onIndexedDBVersionChange: () => {
        //   // reload the app when database version changes
        //   if (Platform.OS === 'web') {
        //     window.location.reload()
        //   }
        // },
    })
    : new SQLiteAdapter({
        schema,
        // (You might want to comment out migrationConfig if you don't have migrations yet)
        // migrations,
        jsi: true,
        onSetUpError: error => {
            // Database failed to load -- offer the user to reload the app or log out
            console.error('Database failed to load', error)
        }
    })

const database = new Database({
    adapter,
    modelClasses: [
        BlockedApp,
        ZenProfile,
        Schedule,
    ],
})

export default database
