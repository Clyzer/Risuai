// Navigation state for the Stage theme. Kept outside the database: it is view state, not saved data.

export type StageTab = 'home' | 'chats' | 'realm' | 'you'
export type StageHomeView = 'stories' | 'playthroughs'

export const stageNav = $state({
    tab: 'home' as StageTab,
    homeView: 'stories' as StageHomeView,
})
