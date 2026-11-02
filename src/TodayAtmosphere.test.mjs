// Run with Node 24: node --test src/TodayAtmosphere.test.mjs
import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync, readdirSync } from 'node:fs'
import { calendarDay, sceneryIndex, selectMemory } from './TodayAtmosphere.ts'

const record = (date, insight = '保存された原文\n次の行') => ({
  date, insight, screenTimeMinutes: null, unintendedMinutes: null, loosePlans: [],
  createdAt: `${date}T12:00:00.000Z`, updatedAt: `${date}T12:00:00.000Z`,
})
function fromDay(day) {
  return new Date(day * 86_400_000).toISOString().slice(0, 10)
}

test('30-day permutations, boundaries, repeatability, and timezone-independent calendar days', () => {
  const start = Math.floor(calendarDay('2020-01-01') / 30) * 30
  let previous
  for (let cycle = 0; cycle < 200; cycle++) {
    const seen = new Set()
    for (let offset = 0; offset < 30; offset++) {
      const date = fromDay(start + cycle * 30 + offset)
      const index = sceneryIndex(date)
      assert.equal(index, sceneryIndex(date))
      assert.ok(index >= 0 && index < 30)
      assert.notEqual(index, previous)
      previous = index
      seen.add(index)
    }
    assert.equal(seen.size, 30)
  }
  assert.equal(calendarDay('2024-03-11') - calendarDay('2024-03-10'), 1)
  assert.equal(calendarDay('2024-03-01') - calendarDay('2024-02-28'), 2)
})

test('seven days inclusive, six days excluded, blank and absent candidates', () => {
  assert.equal(selectMemory([record('2026-10-26')], '2026-11-02').record.date, '2026-10-26')
  assert.equal(selectMemory([record('2026-10-27')], '2026-11-02'), null)
  assert.equal(selectMemory([record('2020-01-01', ' \n\t')], '2026-11-02'), null)
  assert.equal(selectMemory([], '2026-11-02'), null)
  assert.equal(selectMemory([record('2027-01-01')], '2026-11-02'), null)
})

test('last year today outranks season and other dates without changing originals', () => {
  const records = [record('2020-07-01'), record('2024-11-01'), record('2025-11-02')]
  const before = JSON.stringify(records)
  const memory = selectMemory(records, '2026-11-02')
  assert.equal(memory.reason, '去年の今日')
  assert.equal(memory.record, records[2])
  assert.equal(JSON.stringify(records), before)
  assert.equal(selectMemory(records.slice(0, 2), '2026-11-02').reason, '過去のこの時期')
  assert.equal(selectMemory(records.slice(0, 1), '2026-11-02').reason, '過去の記録')
})

test('season includes +/- 7 days and excludes 8, crosses year boundaries', () => {
  for (const date of ['2024-10-26', '2024-11-09']) {
    assert.equal(selectMemory([record(date)], '2026-11-02').reason, '過去のこの時期')
  }
  for (const date of ['2024-10-25', '2024-11-10']) {
    assert.equal(selectMemory([record(date)], '2026-11-02').reason, '過去の記録')
  }
  assert.equal(selectMemory([record('2025-12-31')], '2026-01-02'), null) // only 2 days old
  assert.equal(selectMemory([record('2024-12-31')], '2026-01-02').reason, '過去のこの時期')
  assert.equal(selectMemory([record('2025-01-01')], '2026-12-31').reason, '過去のこの時期')
})

test('leap day is distinct, nearby Feb 28 / Mar 1 are seasonal candidates', () => {
  assert.equal(selectMemory([record('2023-02-28')], '2024-02-29').reason, '過去のこの時期')
  assert.equal(selectMemory([record('2023-03-01')], '2024-02-29').reason, '過去のこの時期')
  assert.equal(selectMemory([record('2024-02-29')], '2025-02-28').reason, '過去のこの時期')
  assert.equal(selectMemory([record('2023-02-28')], '2024-02-28').reason, '去年の今日')
})

test('stable input ordering, edit/delete/restore reflected, original long text preserved', () => {
  const records = [record('2020-04-01'), record('2021-05-02'), record('2022-06-03')]
  const selected = selectMemory(records, '2026-11-02')
  assert.deepEqual(selectMemory([...records].reverse(), '2026-11-02'), selected)
  const longText = '長い原文\n'.repeat(500)
  const edited = records.map((item) => item.date === selected.record.date ? { ...item, insight: longText } : item)
  assert.equal(selectMemory(edited, '2026-11-02').record.insight, longText)
  assert.notEqual(selectMemory(records.filter((item) => item.date !== selected.record.date), '2026-11-02').record.date, selected.record.date)
  assert.equal(selectMemory([], '2026-11-02'), null)
  assert.equal(selectMemory([record('2019-02-03', '復元した原文')], '2026-11-02').record.insight, '復元した原文')
})

for (const spec of [
  { folder: 'scenery', height: 192, count: 30, only: null },
]) test(`WebP strips in ${spec.folder}: 1074 x ${spec.height}`, () => {
  const directory = new URL(`../public/${spec.folder}/`, import.meta.url)
  const files = readdirSync(directory).filter((name) => name.endsWith('.webp') && (!spec.only || name === spec.only))
  assert.equal(files.length, spec.count)
  for (const name of files) {
    const bytes = readFileSync(new URL(name, directory))
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF')
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP')
    const chunk = bytes.toString('ascii', 12, 16)
    let width, height
    if (chunk === 'VP8X') {
      width = bytes.readUIntLE(24, 3) + 1
      height = bytes.readUIntLE(27, 3) + 1
    } else if (chunk === 'VP8 ') {
      width = bytes.readUInt16LE(26) & 0x3fff
      height = bytes.readUInt16LE(28) & 0x3fff
    } else {
      assert.equal(chunk, 'VP8L')
      const bits = bytes.readUInt32LE(21)
      width = (bits & 0x3fff) + 1
      height = ((bits >>> 14) & 0x3fff) + 1
    }
    assert.deepEqual([width, height], [1074, spec.height], name)
  }
})
