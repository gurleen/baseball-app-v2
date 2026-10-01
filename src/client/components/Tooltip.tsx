import {
	useEffect,
	useId,
	useLayoutEffect,
	useRef,
	useState,
	type CSSProperties,
	type ReactNode
} from 'react';
import { createPortal } from 'react-dom';

// Styled to match the @hydra-tv/ui Tooltip. That one is positioned inside its
// anchor, so a scroll container (e.g. `scrollX` around a table) clips it; this
// one is portaled to <body> with fixed positioning and kept inside the viewport.

const GAP = 6;
const VIEWPORT_MARGIN = 8;

const bubble: CSSProperties = {
	position: 'fixed',
	zIndex: 300,
	maxWidth: 260,
	background: 'var(--bg-0)',
	color: 'var(--fg-1)',
	border: '1px solid var(--line-3)',
	borderRadius: 'var(--radius-1)',
	boxShadow: 'var(--shadow-overlay)',
	padding: '4px 6px',
	fontSize: 11,
	fontFamily: 'var(--font-ui)',
	fontWeight: 'normal',
	letterSpacing: 'normal',
	textTransform: 'none',
	textAlign: 'left',
	whiteSpace: 'normal',
	pointerEvents: 'none'
};

export function Tooltip({ content, children }: { content: ReactNode; children: ReactNode }) {
	const id = useId();
	const anchorRef = useRef<HTMLSpanElement>(null);
	const bubbleRef = useRef<HTMLSpanElement>(null);
	const [visible, setVisible] = useState(false);
	const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

	// Measure before paint so the bubble never flashes at the wrong spot.
	useLayoutEffect(() => {
		if (!visible || !anchorRef.current || !bubbleRef.current) return;
		const anchor = anchorRef.current.getBoundingClientRect();
		const { width, height } = bubbleRef.current.getBoundingClientRect();
		const centered = anchor.left + anchor.width / 2 - width / 2;
		const left = Math.min(
			Math.max(centered, VIEWPORT_MARGIN),
			window.innerWidth - width - VIEWPORT_MARGIN
		);
		const above = anchor.top - height - GAP;
		const top = above >= VIEWPORT_MARGIN ? above : anchor.bottom + GAP;
		setPosition({ left, top });
	}, [visible]);

	// Fixed positioning would drift away from the anchor on scroll, so hide instead.
	useEffect(() => {
		if (!visible) return;
		const hide = () => setVisible(false);
		window.addEventListener('scroll', hide, { capture: true, passive: true });
		window.addEventListener('resize', hide);
		return () => {
			window.removeEventListener('scroll', hide, { capture: true });
			window.removeEventListener('resize', hide);
		};
	}, [visible]);

	const show = () => setVisible(true);
	const hide = () => setVisible(false);

	return (
		<span
			ref={anchorRef}
			tabIndex={0}
			aria-describedby={visible ? id : undefined}
			onMouseEnter={show}
			onMouseLeave={hide}
			onFocus={show}
			onBlur={hide}
			style={{ textDecoration: 'underline dotted', textUnderlineOffset: 3, outlineOffset: 2 }}
		>
			{children}
			{visible
				? createPortal(
						<span
							ref={bubbleRef}
							id={id}
							role="tooltip"
							style={{
								...bubble,
								left: position?.left ?? 0,
								top: position?.top ?? 0,
								visibility: position ? 'visible' : 'hidden'
							}}
						>
							{content}
						</span>,
						document.body
					)
				: null}
		</span>
	);
}
