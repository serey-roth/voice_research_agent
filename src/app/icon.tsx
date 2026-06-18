import { ImageResponse } from 'next/og'

export const contentType = 'image/png'
export const size = { width: 40, height: 40 }

export default function Icon() {
    return new ImageResponse(
        (
            <svg
                width="40"
                height="40"
                viewBox="0 0 40 40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <circle
                    cx="15"
                    cy="15"
                    r="10"
                    stroke="#181816"
                    strokeWidth="2.6"
                    strokeLinejoin="round"
                />
                <rect x="8" y="13.5" width="2.2" height="3.5" rx="1.1" fill="#5B4FE8" opacity="0.38" />
                <rect x="11" y="10.5" width="2.2" height="9.5" rx="1.1" fill="#5B4FE8" opacity="0.62" />
                <rect x="14" y="8" width="2.2" height="14" rx="1.1" fill="#5B4FE8" />
                <rect x="17" y="11" width="2.2" height="8" rx="1.1" fill="#5B4FE8" opacity="0.75" />
                <rect x="20" y="14" width="2.2" height="3" rx="1.1" fill="#5B4FE8" opacity="0.35" />
                <line
                    x1="23"
                    y1="23"
                    x2="29.5"
                    y2="29.5"
                    stroke="#181816"
                    strokeWidth="3"
                    strokeLinecap="round"
                />
            </svg>
        ),
        { ...size }
    )
}
