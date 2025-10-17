import React from 'react';
import type { DiffSeg } from '../../utils/diff/inline';
import type { ModResolution } from '../../utils/diff/stepKey';

export type LocalSeg = DiffSeg & { diffType?: 'add' | 'del'; nodes?: React.ReactNode };

const MUTED_COLOR = 'var(--diff-fg-muted, rgba(191, 204, 214, 0.85))';

export function renderLine(
    key: string,
    displayNum: number,
    marker: '+' | '-' | ' ' | '~',
    content: React.ReactNode,
    segments?: LocalSeg[],
    onClick?: () => void,
    isFocused?: boolean,
    isPersisted?: boolean,
    isResolved?: boolean,
    stepIndex?: number,
) {
    const isAdd = marker === '+';
    const isDel = marker === '-';
    const isMod = marker === '~';
    const cls = isAdd ? 'diff-line add' : isDel ? 'diff-line del' : isMod ? 'diff-line mod' : 'diff-line';
    const bg = isPersisted
        ? 'var(--diff-resolved-bg, rgba(75,139,190,0.22))'
        : isAdd
        ? 'var(--diff-add-bg)'
        : isDel
        ? 'var(--diff-del-bg)'
        : isMod
        ? 'var(--diff-mod-bg)'
        : 'transparent';
    const displayLabel = displayNum === 0 ? '' : displayNum;
    const markerLabel = isResolved ? '~' : isPersisted ? '~' : (marker !== ' ' ? marker : '');

    return (
        <div
            key={key}
            data-preview-line
            data-marker={marker}
            data-display-index={displayNum}
            data-step-index={stepIndex ?? key}
            className={cls}
            onClick={onClick}
            onKeyDown={
                onClick
                    ? (event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                onClick();
                            }
                      }
                    : undefined
            }
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            style={{
                padding: '0 6px 0 0',
                color: MUTED_COLOR,
                background: bg,
                // subtle focus ring for keyboard/arrow navigation
                border: isFocused && !isPersisted ? '1px solid rgba(161,132,255,0.35)' : (isPersisted ? '1px solid rgba(161,132,255,0.55)' : undefined),
                boxShadow: isFocused && !isPersisted ? '0 0 0 1px rgba(161,132,255,0.18)' : (isPersisted ? '0 0 0 1px rgba(161,132,255,0.28)' : undefined),
                cursor: onClick ? 'pointer' : 'default',
                outline: 'none',
            }}
        >
            <span
                style={{
                    display: 'flex',
                    justifyContent: 'flex-start',
                    alignItems: 'baseline',
                    gap: 6,
                    color: 'rgba(138,155,168,0.7)',
                    userSelect: 'none',
                    minWidth: 0,
                }}
            >
                <span style={{ width: 14, textAlign: 'center' }}>{markerLabel}</span>
                <span>{displayLabel}</span>
            </span>
            <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere', minWidth: 0 }}>
                {segments
                    ? segments.map((seg, idx) => (
                            <span
                                // eslint-disable-next-line react/no-array-index-key
                                key={idx}
                                className={
                                    seg.changed ? (seg.diffType === 'add' ? 'diff-seg diff-add' : 'diff-seg diff-del') : undefined
                                }
                                data-diff-token
                                data-type={seg.changed ? (seg.diffType === 'add' ? 'add' : 'del') : 'eq'}
                            >
                                {seg.nodes ?? seg.text ?? ' '}
                            </span>
                      ))
                    : content || ' '}
            </span>
        </div>
    );
}

export function renderChoiceLine(
    key: string,
    displayNum: number,
    leftSegments: LocalSeg[],
    rightSegments: LocalSeg[],
    resolution?: ModResolution,
    onKeepLeft?: () => void,
    onKeepRight?: () => void,
    isFocused?: boolean,
    stepIndex?: number,
) {
    const classifyChange = (segments: LocalSeg[]): 'add' | 'del' | 'both' | 'none' => {
        let hasAdd = false;
        let hasDel = false;
        for (const seg of segments) {
            if (!seg.changed) continue;
            if (seg.diffType === 'add') hasAdd = true;
            if (seg.diffType === 'del') hasDel = true;
        }
        if (hasAdd && !hasDel) return 'add';
        if (hasDel && !hasAdd) return 'del';
        if (hasAdd && hasDel) return 'both';
        return 'none';
    };

    const renderOption = (
        segments: LocalSeg[],
        isSelected: boolean,
        onSelect?: () => void,
    ) => {
        const change = classifyChange(segments);
        const changeBorder =
            change === 'add'
                ? 'rgba(46,160,67,0.4)'
                : change === 'del'
                ? 'rgba(248,81,73,0.42)'
                : 'rgba(100,148,237,0.3)';
        const changeBackground =
            change === 'add'
                ? 'rgba(46,160,67,0.12)'
                : change === 'del'
                ? 'rgba(248,81,73,0.12)'
                : 'var(--diff-mod-bg)';
        const selectedBorder = 'rgba(161,132,255,0.55)';
        const selectedGlow = 'rgba(161,132,255,0.28)';
        const selectedBackground = 'rgba(116,86,190,0.22)';
        const cursor = onSelect ? 'pointer' : 'default';

        return (
            <button
                type="button"
                onClick={onSelect}
                onKeyDown={(event) => {
                    if (!onSelect) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelect();
                    }
                }}
                aria-pressed={isSelected}
                disabled={!onSelect}
                style={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '2px 6px',
                    borderRadius: 4,
                    border: `1px solid ${isSelected ? selectedBorder : changeBorder}`,
                    background: isSelected ? selectedBackground : changeBackground,
                    color: MUTED_COLOR,
                    cursor,
                    transition: 'border 120ms ease, background 120ms ease, box-shadow 120ms ease',
                    boxShadow: isSelected ? `0 0 0 1px ${selectedGlow}` : undefined,
                    opacity: onSelect ? 1 : 0.85,
                    outline: 'none',
                    lineHeight: 1.4,
                }}
            >
                <span
                    style={{
                        alignItems: 'center',
                        gap: 4,
                        width: '100%',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        overflowWrap: 'anywhere',
                        minWidth: 0,
                    }}
                    data-change={change}
                >
                        {segments.length > 0
                            ? segments.map((seg, idx) => (
                                    <span
                                        // eslint-disable-next-line react/no-array-index-key
                                        key={idx}
                                        className={
                                            seg.changed
                                                ? seg.diffType === 'add'
                                                    ? 'diff-seg diff-add'
                                                    : 'diff-seg diff-del'
                                                : undefined
                                        }
                                        data-diff-token
                                        data-type={seg.changed ? (seg.diffType === 'add' ? 'add' : 'del') : 'eq'}
                                    >
                                        {seg.text || ' '}
                                    </span>
                                  ))
                            : '∅'}
                    </span>
            </button>
        );
    };

    return (
        <div
            key={key}
            data-preview-line
            data-marker="?"
            data-display-index={displayNum}
            data-step-index={stepIndex ?? key}
            className="diff-line mod"
            style={{
                padding: '0 6px 0 0',
                color: MUTED_COLOR,
                background: 'var(--diff-mod-bg)',
                border: isFocused ? '1px solid rgba(161,132,255,0.35)' : undefined,
                boxShadow: isFocused ? '0 0 0 1px rgba(161,132,255,0.18)' : undefined,
            }}
        >
            <span
                style={{
                    display: 'flex',
                    justifyContent: 'flex-start',
                    alignItems: 'baseline',
                    gap: 6,
                    color: 'rgba(138,155,168,0.7)',
                    userSelect: 'none',
                }}
            >
                <span style={{ width: 14, textAlign: 'center' }}>?</span>
                <span>{displayNum}</span>
            </span>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(0, 1fr))',
                    gap: 8,
                    minWidth: 0,
                }}
            >
                {renderOption(leftSegments, resolution === 'keep-original', onKeepLeft)}
                {renderOption(rightSegments, resolution === 'keep-altered', onKeepRight)}
            </div>
        </div>
    );
}
