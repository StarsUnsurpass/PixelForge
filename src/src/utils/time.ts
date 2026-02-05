
export const formatTime = (seconds: number): string => {
    if (!Number.isFinite(seconds) || seconds < 0) return "00:00:00";

    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);

    const pad = (n: number) => n.toString().padStart(2, '0');

    return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(ms)}`;
};
