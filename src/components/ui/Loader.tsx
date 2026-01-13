import clsx from 'clsx'
import { useTheme } from '@/providers/ThemeProvider'

type LoaderAction = 'get' | 'write' | 'delete'
type ThemeMode = 'Light' | 'Dark'

interface LoaderProps {
    action?: LoaderAction
    theme?: ThemeMode // Optional manual override
    text?: string
    size?: number
    className?: string
}

const SVG_MAP: Record<`${LoaderAction}${ThemeMode}`, string> = {
    getLight: '/loader/Loading Light (GET).svg',
    getDark: '/loader/Loading Dark (GET).svg',
    writeLight: '/loader/Loading Light (WRITE).svg',
    writeDark: '/loader/Loading Dark (WRITE).svg',
    deleteLight: '/loader/Loading Light (DELETE).svg',
    deleteDark: '/loader/Loading Dark (DELETE).svg',
}

export function Loader({
    action = 'get',
    theme: manualTheme,
    text,
    size = 64,
    className,
}: LoaderProps) {
    const { theme: currentTheme } = useTheme()

    // Determine effective theme mode
    const systemMode: ThemeMode = currentTheme.includes('dark') ? 'Dark' : 'Light'
    const effectiveIsDark = manualTheme ? manualTheme === 'Dark' : systemMode === 'Dark'
    const modeStr: ThemeMode = effectiveIsDark ? 'Dark' : 'Light'

    const textColorClass = modeStr === 'Dark' ? 'text-white' : 'text-black'

    return (
        <div
            className={clsx('loader', className)}
            style={{ width: size }}
        >
            <img
                src={SVG_MAP[`${action}${modeStr}`]}
                alt={`Loading ${action}`}
                className="loader__svg"
            />

            {text && <div className={clsx("loader__text", textColorClass)}>{text}</div>}
        </div>
    )
}