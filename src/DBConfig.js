export const DBConfig = {
    name: 'TakeoutDB',
    version: 1,
    objectStoresMeta: [
        {
            store: 'logins',
            storeConfig: { keyPath: 'id', autoIncrement: true },
            storeSchema: [
                { name: 'Timestamp', keypath: 'timestamp', options: { unique: false } },
                { name: 'IPAddress', keypath: 'ip', options: { unique: false } },
                { name: 'ActivityType', keypath: 'type', options: { unique: false } },
                { name: 'UserAgents', keypath: 'agents', options: { unique: false } },
            ]
        },
        {
            store: 'view_history',
            storeConfig: { keyPath: 'id', autoIncrement: true },
            storeSchema: [
                { name: 'Timestamp', keypath: 'timestamp', options: { unique: false } },
                { name: 'Title', keypath: 'title', options: { unique: false } },
                { name: 'Url', keypath: 'url', options: { unique: false } },
                { name: 'IsAdvert', keypath: 'adv', options: { unique: false } },
            ]
        },
    ]
};