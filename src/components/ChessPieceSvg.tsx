import React from 'react';

interface ChessPieceSvgProps {
  type: string;  // 'p', 'n', 'b', 'r', 'q', 'k'
  color: string; // 'w', 'b'
  className?: string;
}

export const ChessPieceSvg: React.FC<ChessPieceSvgProps> = ({ type, color, className = "w-7 h-7" }) => {
  const isWhite = color === 'w';
  const fill = isWhite ? '#ffffff' : '#1e293b';
  const stroke = isWhite ? '#0f172a' : '#f8fafc';

  switch (type.toLowerCase()) {
    case 'p': // Pawn
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <path
            d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"
            fill={fill}
            stroke={stroke}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'n': // Knight
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <path
            d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"
            fill={fill}
            stroke={stroke}
            strokeWidth="1.8"
          />
          <path
            d="M24 18c.33 1.17 0 2-1 2s-1.33-.83-1-2c0-.33.33-.67.67-.67.33 0 .67.33 1.33.67z"
            fill={stroke}
          />
          <path
            d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0z"
            fill={stroke}
          />
          <path
            d="M15 15.5c-1 1.5-2.5 3-4.5 3.5-1.5.5-2 2-2 3.5 1 0 3-1 4.5-2.5 1.5-1.5 2.5-3.5 2-4.5z"
            fill={fill}
            stroke={stroke}
            strokeWidth="1.5"
          />
        </svg>
      );
    case 'b': // Bishop
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g fill={fill} stroke={stroke} strokeWidth="1.8" strokeLinecap="round">
            <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z" />
            <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z" />
            <path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z" />
          </g>
          <path d="M17.5 26h10M22.5 21v10" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case 'r': // Rook
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g fill={fill} stroke={stroke} strokeWidth="1.8" strokeLinecap="round">
            <path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5" />
            <path d="M34 14l-3 3H14l-3-3" />
            <path d="M31 17v12.5H14V17" />
            <path d="M31 29.5l1.5 2.5h-20l1.5-2.5" />
            <path d="M11 14h23" />
          </g>
        </svg>
      );
    case 'q': // Queen
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g fill={fill} stroke={stroke} strokeWidth="1.8" strokeLinecap="round">
            <path d="M8 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM24.5 7.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM41 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM16 8.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM33 8.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0z" />
            <path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11-6-14-3 14-8-11-2 12z" />
            <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 2-1 .5-2.5 0 0 0-1.5-1.5-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" />
            <path d="M11 38.5h23" />
          </g>
        </svg>
      );
    case 'k': // King
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g fill={fill} stroke={stroke} strokeWidth="1.8" strokeLinecap="round">
            <path d="M22.5 11.63V6M20 8h5" stroke={stroke} strokeWidth="2" />
            <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" />
            <path d="M11.5 37c5.5 3.5 16.5 3.5 22 0v-4H11.5v4z" />
            <path d="M11.5 30c5.5-2 16.5-2 22 0m-22 3.5c5.5-2 16.5-2 22 0" />
            <path d="M12.5 30c5.5-3 15.5-3 21 0 1-1.5 3-4 3-8.5 0-7-9.5-6.5-13.5-1-4-5.5-13.5-6-13.5 1 0 4.5 2 7 3 8.5z" />
          </g>
        </svg>
      );
    default:
      return null;
  }
};
