// Risu dialogs Stage shows as its own sheets (StageAlerts.svelte). Each keeps Risu's answer protocol
// (alert.ts): OK answers '', confirm answers 'yes'/'no', select the option index, input the text,
// the add menu and chat options their keys. The rest (character or module pickers, card export,
// login, request logs...) stay Risu's.
import { DBState } from 'src/ts/stores.svelte'

export const STAGE_ALERTS = new Set(['normal', 'error', 'ask', 'pluginconfirm', 'select', 'input', 'wait', 'wait2', 'progress', 'addchar', 'chatOptions', 'toast'])

export function stageHandlesAlert(type: string): boolean {
    return DBState.db?.theme === 'stage' && STAGE_ALERTS.has(type)
}
