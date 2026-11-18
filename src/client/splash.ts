import {requestExpandedMode} from '@devvit/web/client'
import {formatUtcLabel, utcDateKey} from '../shared/daily.ts'
import {fetchDaily} from './fetch.ts'

const startBtn = document.getElementById('start-btn') as HTMLButtonElement
const dateLabel = document.getElementById('date-label')
const dateKey = utcDateKey()
if (dateLabel) dateLabel.textContent = formatUtcLabel(dateKey)

void fetchDaily(dateKey).then(data => {
  if (!dateLabel || !data?.me) return
  if (data.me.streak > 0) {
    dateLabel.textContent = `${formatUtcLabel(dateKey)} · streak ${data.me.streak}`
  }
})

startBtn.addEventListener('click', ev => {
  const local =
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    location.protocol === 'file:'
  if (local) {
    location.href = 'game.html'
    return
  }
  try {
    requestExpandedMode(ev, 'game')
  } catch {
    location.href = 'game.html'
  }
})
