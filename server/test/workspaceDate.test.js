import assert from 'node:assert/strict'
import test from 'node:test'
import { getMeetingSchedule } from '../src/services/workspaceService.js'

const now = new Date('2026-03-20T01:00:00.000Z')

test('meeting date comparisons use the explicit timezone and fixed reference time', () => {
  const utcFuture = getMeetingSchedule({
    title: 'Review',
    date: '2026-03-20',
    time: '02:00',
    timezone: 'UTC',
  }, now)
  assert.equal(utcFuture.temporalStatus, 'UPCOMING')
  assert.equal(utcFuture.needsAttention, false)

  const losAngelesToday = getMeetingSchedule({
    title: 'Review',
    date: '2026-03-19',
    time: '17:00',
    timezone: 'America/Los_Angeles',
  }, now)
  assert.equal(losAngelesToday.temporalStatus, 'PAST')
})

test('date-only meetings retain their calendar status but need time review', () => {
  const schedule = getMeetingSchedule({
    title: 'Planning',
    date: '2026-03-20',
    timezone: 'UTC',
  }, now)
  assert.equal(schedule.temporalStatus, 'TODAY')
  assert.equal(schedule.dateTime, null)
  assert.equal(schedule.needsAttention, true)
})

test('ambiguous and malformed dates are excluded from temporal comparisons', () => {
  for (const meeting of [
    { title: 'Unspecified zone', date: '2026-03-20', time: '12:00' },
    { title: 'Ambiguous abbreviation', date: '2026-03-20', time: '12:00', timezone: 'CST' },
    { title: 'Natural language date', date: 'next Tuesday', time: '12:00', timezone: 'UTC' },
    { title: 'Invalid date', date: '2026-02-30', time: '12:00', timezone: 'UTC' },
    { title: 'DST gap', date: '2026-03-08', time: '02:30', timezone: 'America/New_York' },
    { title: 'DST overlap', date: '2026-11-01', time: '01:30', timezone: 'America/New_York' },
  ]) {
    const schedule = getMeetingSchedule(meeting, now)
    assert.equal(schedule.temporalStatus, null, meeting.title)
    assert.equal(schedule.dateTime, null, meeting.title)
    assert.equal(schedule.needsAttention, true, meeting.title)
  }
})
