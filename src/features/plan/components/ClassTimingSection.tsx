import {StyleSheet, View} from 'react-native';

import {radius, size, space, useTheme} from '@/src/design';
import {Skeleton, Text} from '@/src/ui';

import {
  type ClassRow,
  type ClassTiming,
  NO_FIELD_TEXT,
  type ReadyClassTiming,
} from '../classTiming';

import {type StopWindow} from '../planCards';

import {PlanCard} from './PlanCard';
import {RaceTimelineView} from './RaceTimelineView';

const COLUMNS = ['Class', 'Lap', 'Gain', 'First', 'Every'];

/**
 * Class pace on the Plan (round 6, section 2; D55), on both widths and in
 * every plan state: the Race timeline when a class reaches him inside the race,
 * then the Class pace table. `timing` is null while the sessions load. Every
 * sentence and number is finished in the model.
 */
export function ClassTimingSection({
  timing,
  windows,
  windowNote,
  width,
  onStop,
}: {
  timing: ClassTiming | null;
  /** The pit window of each planned stop (the Stops card reads the same ones); empty without a plan. */
  windows: StopWindow[];
  windowNote: string | null;
  /** The width a card's content may use. */
  width: number;
  /** Dragging a stop on the timeline; absent, the timeline is a picture. */
  onStop?: (stop: number, lap: number) => void;
}) {
  if (timing == null) return <Skeleton height={size.sessionRow} />;
  if (timing.kind !== 'ready')
    return (
      <PlanCard title='Class pace'>
        <Text variant='dataSmall' tone='textMuted'>
          {NO_FIELD_TEXT}
        </Text>
      </PlanCard>
    );
  return (
    <>
      {timing.raceLaps != null && timing.rows.some(r => r.reaches) ? (
        <RaceTimelineCard
          timing={timing}
          windows={windows}
          windowNote={windowNote}
          width={width}
          onStop={onStop}
        />
      ) : null}
      <ClassPaceCard timing={timing} />
    </>
  );
}

function RaceTimelineCard({
  timing,
  windows,
  windowNote,
  width,
  onStop,
}: {
  timing: ReadyClassTiming;
  windows: StopWindow[];
  windowNote: string | null;
  width: number;
  onStop?: (stop: number, lap: number) => void;
}) {
  return (
    <PlanCard title='Race timeline'>
      <View style={styles.head}>
        <EstimateBadge />
      </View>
      <RaceTimelineView
        timing={timing}
        windows={windows}
        width={width}
        onStop={onStop}
      />
      {windows.map(w => (
        <Text key={w.stop} variant='dataSmall' tone='textSecondary'>
          {w.text}
        </Text>
      ))}
      {windowNote ? (
        <Text variant='dataSmall' tone='textMuted'>
          {windowNote}
        </Text>
      ) : null}
    </PlanCard>
  );
}

function EstimateBadge() {
  const {color} = useTheme();
  return (
    <View style={[styles.badge, {borderColor: color.lineStrong}]}>
      <Text variant='tableHeader' tone='textMuted'>
        ESTIMATE
      </Text>
    </View>
  );
}

function ClassPaceCard({timing}: {timing: ReadyClassTiming}) {
  return (
    <PlanCard title='Class pace'>
      <View style={styles.row}>
        {COLUMNS.map(h => (
          <Text
            key={h}
            variant='tableHeader'
            tone='textMuted'
            style={h === 'Class' ? styles.name : styles.cell}>
            {h}
          </Text>
        ))}
      </View>
      {timing.rows.map(r => (
        <View key={r.key}>
          <ClassLine row={r} />
          {r.mine && timing.you ? <YouLine you={timing.you} /> : null}
        </View>
      ))}
      {/* His class not seen in any field here: he still gets his line. */}
      {timing.you && !timing.rows.some(r => r.mine) ? (
        <YouLine you={timing.you} />
      ) : null}
    </PlanCard>
  );
}

function ClassLine({row}: {row: ClassRow}) {
  const {color} = useTheme();
  return (
    <View style={[styles.box, {borderColor: color.line}]}>
      <View style={styles.row}>
        <Text variant='bodyStrong' style={styles.name}>
          {row.label}
        </Text>
        {[row.lapText, row.gainText, row.firstText, row.everyText].map(
          (v, i) => (
            <Text key={i} variant='dataStrong' style={styles.cell}>
              {v}
            </Text>
          ),
        )}
      </View>
      <Text variant='dataSmall' tone='textMuted'>
        {row.srcText}
      </Text>
    </View>
  );
}

function YouLine({you}: {you: NonNullable<ReadyClassTiming['you']>}) {
  return (
    <View style={styles.you}>
      <View style={styles.row}>
        <Text variant='bodyStrong' style={styles.name}>
          You
        </Text>
        <Text variant='dataStrong' style={styles.cell}>
          {you.lapText}
        </Text>
        <View style={styles.rest} />
      </View>
      <Text variant='dataSmall' tone='textMuted'>
        {you.srcText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: space.xxs,
  },
  head: {flexDirection: 'row', alignItems: 'center', gap: space.sm},
  row: {flexDirection: 'row', alignItems: 'center', gap: space.sm},
  name: {flex: 1.2},
  cell: {flex: 1},
  // The You line fills only the Lap column; the rest stays empty.
  rest: {flex: 3, minWidth: 0},
  box: {gap: space.xs, paddingVertical: space.md, borderTopWidth: 1},
  you: {gap: space.xs, paddingBottom: space.md},
});
