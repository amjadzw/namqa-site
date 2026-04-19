/* =============================================================
   Namqa Studio — Solutions complémentaires (SVG illustrations)
   4 vector illustrations in the indigo palette, matching the brand.
============================================================= */

window.__NAMQA_SOLUTIONS_SVG__ = {

  /* ========== 1. Programme de fidélité ========== */
  loyalty: `
  <svg viewBox="0 0 320 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Programme de fidélité">
    <defs>
      <linearGradient id="sol-card-g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#FF6B35"/>
        <stop offset="100%" stop-color="#E85420"/>
      </linearGradient>
      <linearGradient id="sol-cup-g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#FEFDF7"/>
        <stop offset="100%" stop-color="#DCE3FF"/>
      </linearGradient>
    </defs>
    <!-- Saucer -->
    <ellipse cx="130" cy="150" rx="90" ry="16" fill="#1E40FF" opacity="0.12"/>
    <ellipse cx="130" cy="146" rx="82" ry="12" fill="#DCE3FF"/>
    <!-- Cup -->
    <path d="M70 70 L70 130 Q70 146 100 146 L160 146 Q190 146 190 130 L190 70 Z" fill="url(#sol-cup-g)" stroke="#1E40FF" stroke-width="2"/>
    <path d="M190 85 Q220 85 220 105 Q220 125 190 125" fill="none" stroke="#1E40FF" stroke-width="2.5"/>
    <!-- Latte art heart -->
    <ellipse cx="130" cy="95" rx="50" ry="10" fill="#DCE3FF"/>
    <path d="M120 88 Q115 80 125 80 Q130 80 130 86 Q130 80 135 80 Q145 80 140 88 Q135 96 130 100 Q125 96 120 88 Z" fill="#FEFDF7"/>
    <!-- Steam -->
    <path d="M110 50 Q115 42 110 34 Q105 26 110 18" fill="none" stroke="#FF6B35" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
    <path d="M130 50 Q135 42 130 34 Q125 26 130 18" fill="none" stroke="#FF6B35" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
    <path d="M150 50 Q155 42 150 34 Q145 26 150 18" fill="none" stroke="#FF6B35" stroke-width="2" stroke-linecap="round" opacity="0.6"/>

    <!-- Loyalty card -->
    <rect x="155" y="165" width="140" height="78" rx="12" fill="url(#sol-card-g)" transform="rotate(-6 225 204)"/>
    <g transform="rotate(-6 225 204)">
      <text x="170" y="190" fill="#FEFDF7" font-family="Space Grotesk, sans-serif" font-size="10" font-weight="700" letter-spacing="2">NAMQA</text>
      <text x="170" y="218" fill="#FEFDF7" font-family="Space Grotesk, sans-serif" font-size="22" font-weight="800">14 pts</text>
      <!-- 10 stamp dots -->
      <g fill="#FEFDF7">
        <circle cx="175" cy="232" r="3.2"/>
        <circle cx="187" cy="232" r="3.2"/>
        <circle cx="199" cy="232" r="3.2"/>
        <circle cx="211" cy="232" r="3.2"/>
        <circle cx="223" cy="232" r="3.2"/>
      </g>
      <g fill="none" stroke="#FEFDF7" stroke-width="1.2">
        <circle cx="235" cy="232" r="3.2"/>
        <circle cx="247" cy="232" r="3.2"/>
        <circle cx="259" cy="232" r="3.2"/>
        <circle cx="271" cy="232" r="3.2"/>
        <circle cx="283" cy="232" r="3.2"/>
      </g>
    </g>

    <!-- Small QR -->
    <rect x="45" y="180" width="58" height="58" rx="8" fill="#FEFDF7" stroke="#1E40FF" stroke-width="2"/>
    <g fill="#0A1B8C">
      <rect x="51" y="186" width="14" height="14" rx="1"/>
      <rect x="83" y="186" width="14" height="14" rx="1"/>
      <rect x="51" y="218" width="14" height="14" rx="1"/>
      <rect x="70" y="205" width="6" height="6"/>
      <rect x="83" y="212" width="6" height="6"/>
      <rect x="91" y="220" width="6" height="6"/>
      <rect x="70" y="220" width="6" height="6"/>
    </g>

    <!-- +2€ badge -->
    <g transform="translate(82 135) rotate(-12)">
      <rect x="-22" y="-12" width="44" height="24" rx="12" fill="#1E40FF"/>
      <text x="0" y="4" fill="#FEFDF7" font-family="Space Grotesk, sans-serif" font-size="13" font-weight="800" text-anchor="middle">+2€</text>
    </g>
  </svg>`,

  /* ========== 2. Cartes prépayées / Cashless ========== */
  prepaid: `
  <svg viewBox="0 0 320 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Cartes prépayées cashless">
    <defs>
      <linearGradient id="sol-dome-g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#FEFDF7"/>
        <stop offset="100%" stop-color="#DCE3FF"/>
      </linearGradient>
      <linearGradient id="sol-card2-g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#3B5BFF"/>
        <stop offset="100%" stop-color="#0A1B8C"/>
      </linearGradient>
    </defs>
    <!-- Plate shadow -->
    <ellipse cx="160" cy="220" rx="120" ry="14" fill="#1E40FF" opacity="0.12"/>
    <!-- Plate -->
    <ellipse cx="160" cy="212" rx="114" ry="12" fill="#DCE3FF"/>
    <ellipse cx="160" cy="208" rx="110" ry="10" fill="#FEFDF7" stroke="#1E40FF" stroke-width="1.5"/>

    <!-- Dome (lifted) -->
    <g transform="translate(0 -35)">
      <path d="M60 178 Q160 70 260 178 Z" fill="url(#sol-dome-g)" stroke="#1E40FF" stroke-width="2"/>
      <path d="M60 178 Q160 70 260 178" fill="none" stroke="#1E40FF" stroke-width="2"/>
      <circle cx="160" cy="70" r="6" fill="#1E40FF"/>
      <!-- Sparkles -->
      <g fill="#FF6B35">
        <path d="M230 70 L232 78 L240 80 L232 82 L230 90 L228 82 L220 80 L228 78 Z"/>
        <path d="M90 90 L92 96 L98 98 L92 100 L90 106 L88 100 L82 98 L88 96 Z"/>
      </g>
    </g>

    <!-- Card being revealed -->
    <rect x="100" y="150" width="120" height="78" rx="12" fill="url(#sol-card2-g)"/>
    <circle cx="160" cy="189" r="22" fill="#FF6B35"/>
    <text x="160" y="196" fill="#FEFDF7" font-family="Space Grotesk, sans-serif" font-size="22" font-weight="800" text-anchor="middle">€</text>
    <text x="110" y="168" fill="#FEFDF7" font-family="Space Grotesk, sans-serif" font-size="8" font-weight="700" letter-spacing="1.5">CASHLESS</text>
    <rect x="110" y="214" width="28" height="5" rx="2" fill="#FEFDF7" opacity="0.6"/>
    <rect x="144" y="214" width="18" height="5" rx="2" fill="#FEFDF7" opacity="0.6"/>
  </svg>`,

  /* ========== 3. Avis client ========== */
  reviews: `
  <svg viewBox="0 0 320 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Avis client">
    <defs>
      <linearGradient id="sol-phone-g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#FEFDF7"/>
        <stop offset="100%" stop-color="#DCE3FF"/>
      </linearGradient>
    </defs>
    <!-- Phone -->
    <g transform="translate(60 30)">
      <rect x="0" y="0" width="140" height="220" rx="22" fill="#0A1B8C"/>
      <rect x="6" y="18" width="128" height="184" rx="10" fill="url(#sol-phone-g)"/>
      <circle cx="70" cy="10" r="3" fill="#FEFDF7" opacity="0.4"/>

      <!-- Review card 1 -->
      <g transform="translate(14 32)">
        <rect x="0" y="0" width="112" height="64" rx="8" fill="#FEFDF7" stroke="#DCE3FF" stroke-width="1"/>
        <circle cx="14" cy="14" r="8" fill="#FF6B35"/>
        <text x="28" y="17" fill="#0A1B8C" font-family="Inter, sans-serif" font-size="9" font-weight="700">Louise D.</text>
        <g fill="#FF6B35" transform="translate(28 22)">
          <text x="0" y="9" font-size="10" font-weight="700">★★★★★</text>
        </g>
        <rect x="6" y="40" width="100" height="4" rx="2" fill="#DCE3FF"/>
        <rect x="6" y="48" width="84" height="4" rx="2" fill="#DCE3FF"/>
        <rect x="6" y="56" width="70" height="4" rx="2" fill="#DCE3FF"/>
      </g>

      <!-- Review card 2 (half-hidden) -->
      <g transform="translate(14 104)" opacity="0.85">
        <rect x="0" y="0" width="112" height="48" rx="8" fill="#FEFDF7" stroke="#DCE3FF" stroke-width="1"/>
        <circle cx="14" cy="14" r="8" fill="#5A75FF"/>
        <text x="28" y="17" fill="#0A1B8C" font-family="Inter, sans-serif" font-size="9" font-weight="700">Marco R.</text>
        <g fill="#FF6B35" transform="translate(28 22)">
          <text x="0" y="9" font-size="10" font-weight="700">★★★★★</text>
        </g>
        <rect x="6" y="38" width="90" height="4" rx="2" fill="#DCE3FF"/>
      </g>

      <!-- Big rating chip -->
      <g transform="translate(14 160)">
        <rect x="0" y="0" width="112" height="34" rx="8" fill="#1E40FF"/>
        <text x="14" y="22" fill="#FEFDF7" font-family="Space Grotesk, sans-serif" font-size="18" font-weight="800">5,0</text>
        <text x="42" y="16" fill="#FEFDF7" font-family="Inter, sans-serif" font-size="7.5" font-weight="600">Note globale</text>
        <text x="42" y="26" fill="#FEFDF7" font-family="Inter, sans-serif" font-size="7.5" opacity="0.8">2 090 avis clients</text>
      </g>
    </g>

    <!-- Floating stars -->
    <g fill="#FF8C66">
      <path d="M240 60 L244 72 L256 72 L246 80 L250 92 L240 84 L230 92 L234 80 L224 72 L236 72 Z"/>
      <path d="M250 130 L252 136 L258 138 L252 140 L250 146 L248 140 L242 138 L248 136 Z" opacity="0.6"/>
      <path d="M30 100 L32 106 L38 108 L32 110 L30 116 L28 110 L22 108 L28 106 Z" opacity="0.7"/>
    </g>
  </svg>`,

  /* ========== 4. Base de données clients ========== */
  database: `
  <svg viewBox="0 0 320 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Base de données clients">
    <defs>
      <linearGradient id="sol-lap-g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#FEFDF7"/>
        <stop offset="100%" stop-color="#DCE3FF"/>
      </linearGradient>
    </defs>
    <!-- Laptop base -->
    <path d="M50 200 L270 200 L286 220 L34 220 Z" fill="#1E40FF"/>
    <path d="M50 200 L270 200 L286 220 L34 220 Z" fill="#FF6B35" opacity="0.3"/>
    <rect x="140" y="200" width="40" height="4" rx="2" fill="#1530CC"/>

    <!-- Laptop screen -->
    <rect x="60" y="50" width="200" height="150" rx="6" fill="#0A1B8C"/>
    <rect x="66" y="56" width="188" height="138" rx="4" fill="url(#sol-lap-g)"/>

    <!-- Dashboard: avatar chips row -->
    <g transform="translate(74 66)">
      <rect x="0" y="0" width="80" height="30" rx="6" fill="#FEFDF7" stroke="#DCE3FF" stroke-width="1"/>
      <circle cx="14" cy="15" r="8" fill="#FF6B35"/>
      <rect x="26" y="8" width="40" height="5" rx="2" fill="#0A1B8C"/>
      <rect x="26" y="17" width="28" height="4" rx="2" fill="#DCE3FF"/>
    </g>

    <!-- Bar chart -->
    <g transform="translate(162 66)">
      <rect x="0" y="0" width="88" height="58" rx="6" fill="#FEFDF7" stroke="#DCE3FF" stroke-width="1"/>
      <rect x="8" y="36" width="10" height="14" rx="1" fill="#5A75FF"/>
      <rect x="22" y="24" width="10" height="26" rx="1" fill="#FF6B35"/>
      <rect x="36" y="30" width="10" height="20" rx="1" fill="#5A75FF"/>
      <rect x="50" y="14" width="10" height="36" rx="1" fill="#FF6B35"/>
      <rect x="64" y="22" width="10" height="28" rx="1" fill="#5A75FF"/>
    </g>

    <!-- Line chart -->
    <g transform="translate(74 102)">
      <rect x="0" y="0" width="176" height="82" rx="6" fill="#FEFDF7" stroke="#DCE3FF" stroke-width="1"/>
      <polyline points="10,60 40,50 70,54 100,30 130,38 160,18" fill="none" stroke="#FF6B35" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="160" cy="18" r="3.5" fill="#FF6B35"/>
      <!-- Axis lines -->
      <line x1="10" y1="70" x2="166" y2="70" stroke="#DCE3FF" stroke-width="1"/>
      <!-- Donut -->
      <g transform="translate(18 8)">
        <circle cx="14" cy="14" r="10" fill="none" stroke="#DCE3FF" stroke-width="4"/>
        <circle cx="14" cy="14" r="10" fill="none" stroke="#FF6B35" stroke-width="4" stroke-dasharray="48 80" transform="rotate(-90 14 14)"/>
      </g>
      <text x="50" y="14" fill="#0A1B8C" font-family="Inter, sans-serif" font-size="8" font-weight="700">+32%</text>
      <text x="50" y="24" fill="#5A75FF" font-family="Inter, sans-serif" font-size="7">Fréquence</text>
    </g>

    <!-- Floating data dots -->
    <g fill="#FF6B35" opacity="0.5">
      <circle cx="40" cy="90" r="3"/>
      <circle cx="290" cy="120" r="3"/>
      <circle cx="30" cy="160" r="2"/>
      <circle cx="296" cy="70" r="2"/>
    </g>
  </svg>`
};
