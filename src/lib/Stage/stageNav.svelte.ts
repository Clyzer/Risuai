// Navigation state for the Stage theme. Kept outside the database: it is view state, not saved data.

import type { ImportPreview } from './stageImportPreview'

export type StageTab = 'home' | 'chats' | 'realm' | 'you'
export type StageHomeView = 'stories' | 'playthroughs'
/** Stage's own pages of the play screen (the play menu opens them). */
export type StagePlayPage = 'persona' | 'playthroughs' | 'modules' | 'lorebook' | 'indicators' | 'variables' | 'model' | 'character'

export const stageNav = $state({
    tab: 'home' as StageTab,
    homeView: 'stories' as StageHomeView,
    // Index of the character whose story page is open, or null for the tab pages.
    detail: null as number | null,
    // Index of the character whose opening picker is open (shown over its story page).
    startPicker: null as number | null,
    // A card read before importing it (Stage "+"), shown on the review page.
    importReview: null as { file: File; preview: ImportPreview } | null,
})
