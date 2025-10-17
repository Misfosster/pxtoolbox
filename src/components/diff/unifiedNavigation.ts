import { useCallback, useEffect } from 'react';
import type { Step } from '../../utils/diff/line';

type Record<K extends string | number | symbol, T> = { [P in K]: T; };

export function useUnifiedNavigation(
    _steps: Step[],
    _resolutions: Record<string, any>,
    focusedStepIndex: number | null,
    setFocusedStepIndex: (index: number | null) => void,
    containerId: string,
) {

    const scrollToFocused = useCallback((idx: number | null) => {
        if (idx == null) return;
        const container = document.getElementById(containerId);
        if (!container) return;

        // Use double requestAnimationFrame to ensure DOM is fully updated
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                // Try to find the element by step index
                let el = container.querySelector(`[data-step-index=\"${idx}\"]`) as HTMLElement | null;

                // If not found, it might be filtered out, try to find a suitable fallback element
                if (!el) {
                    console.warn(`Could not find element with data-step-index="${idx}", trying fallback`);

                    // Look for any element with a data-step-index attribute
                    const allElements = container.querySelectorAll('[data-step-index]');
                    if (allElements.length > 0) {
                        // Find the closest element by index
                        const availableIndices = Array.from(allElements).map(el =>
                            parseInt(el.getAttribute('data-step-index') || '0')
                        );

                        let bestEl = allElements[0] as HTMLElement;
                        let bestIdx = availableIndices[0];
                        let bestDiff = Math.abs(bestIdx - idx);

                        for (let i = 1; i < allElements.length; i++) {
                            const currentIdx = availableIndices[i];
                            const currentDiff = Math.abs(currentIdx - idx);

                            if (currentDiff < bestDiff) {
                                bestEl = allElements[i] as HTMLElement;
                                bestIdx = currentIdx;
                                bestDiff = currentDiff;
                            }
                        }

                        el = bestEl;
                    }
                }

                if (!el) {
                    console.warn(`Could not find any element to scroll to`);
                    return;
                }

                // Fix coordinate system mismatch: use getBoundingClientRect for viewport-relative coords
                const containerRect = container.getBoundingClientRect();
                const elRect = el.getBoundingClientRect();

                const elementTopInContainer = elRect.top - containerRect.top + container.scrollTop;
                const centerPosition = elementTopInContainer - (container.clientHeight / 2) + (elRect.height / 2);

                const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
                const scrollTop = Math.min(Math.max(0, centerPosition), maxScrollTop);

                container.scrollTo({
                    top: scrollTop,
                    behavior: 'smooth'
                });
            });
        });
    }, [containerId]);

    useEffect(() => {
        if (focusedStepIndex != null) {
            scrollToFocused(focusedStepIndex);
        }
    }, [focusedStepIndex, scrollToFocused]);

    const getVisibleNavigableIndices = useCallback((): number[] => {
        const container = document.getElementById(containerId);
        if (!container) return [];
        const nodeList = container.querySelectorAll(
            '[data-preview-line][data-marker="~"], [data-preview-line][data-marker="?"]'
        );
        const indices = Array.from(nodeList)
            .map((n) => parseInt((n as HTMLElement).getAttribute('data-step-index') || ''))
            .filter((n) => !Number.isNaN(n));
        indices.sort((a, b) => a - b);
        return indices;
    }, [containerId]);

    const goPrev = useCallback(() => {
        const pool = getVisibleNavigableIndices();
        if (pool.length === 0) return;
        const curPos = focusedStepIndex == null ? pool.length : pool.indexOf(focusedStepIndex);
        const nextIdx = curPos <= 0 ? pool[pool.length - 1] : pool[curPos - 1];
        setFocusedStepIndex(nextIdx);
    }, [getVisibleNavigableIndices, focusedStepIndex, setFocusedStepIndex]);

    const goNext = useCallback(() => {
        const pool = getVisibleNavigableIndices();
        if (pool.length === 0) return;
        const curPos = focusedStepIndex == null ? -1 : pool.indexOf(focusedStepIndex);
        const nextIdx = curPos >= pool.length - 1 ? pool[0] : pool[curPos + 1];
        setFocusedStepIndex(nextIdx);
    }, [getVisibleNavigableIndices, focusedStepIndex, setFocusedStepIndex]);

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        // Only handle arrow keys when the diff container is focused and no modifier keys are pressed
        const diffContainer = document.getElementById(containerId);
        if (!diffContainer?.contains(document.activeElement) || event.shiftKey || event.ctrlKey || event.metaKey) {
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            goNext();
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            goPrev();
        }
    }, [goNext, goPrev, containerId]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    return {
        goPrev,
        goNext,
        getVisibleNavigableIndices,
    };
}
