// BUD & THINGS Tailwind preset — add to tailwind.config.js: presets: [require("./tailwind.preset.js")]
module.exports = {
  "theme": {
    "extend": {
      "colors": {
        "clay": {
          "50": "#F8F0E4",
          "100": "#F1E4D5",
          "200": "#EAD8C6",
          "300": "#D1C5B9",
          "400": "#B8A89A",
          "500": "#9E8B7C",
          "600": "#837061",
          "700": "#67574B",
          "800": "#4C4035",
          "900": "#422D24",
          "950": "#3D281E"
        },
        "terracotta": {
          "50": "#FFF5EC",
          "100": "#FDE8D8",
          "200": "#F3D6C1",
          "300": "#E7BEA3",
          "400": "#D39D7F",
          "500": "#BD7D5F",
          "600": "#A55B3F",
          "700": "#86472F",
          "800": "#65321D",
          "900": "#49200F",
          "950": "#2F1003"
        },
        "olive": {
          "50": "#F6F7F2",
          "100": "#ECEEE7",
          "200": "#DBDED5",
          "300": "#C6C9BD",
          "400": "#A9AD9E",
          "500": "#8D9280",
          "600": "#6B705C",
          "700": "#595D4C",
          "800": "#414436",
          "900": "#2C2F24",
          "950": "#191C13"
        },
        "sage": {
          "50": "#F6F8EE",
          "100": "#ECEEE3",
          "200": "#DBDECF",
          "300": "#C6CAB6",
          "400": "#9A9F85",
          "500": "#8D927A",
          "600": "#737763",
          "700": "#595D4D",
          "800": "#414437",
          "900": "#2D2F25",
          "950": "#1A1C15"
        },
        "gold": {
          "50": "#FEF6E6",
          "100": "#FBEBCD",
          "200": "#EEDAB4",
          "300": "#DEC490",
          "400": "#C9A96A",
          "500": "#A58B57",
          "600": "#867246",
          "700": "#695936",
          "800": "#4D4126",
          "900": "#362D19",
          "950": "#201A0C"
        },
        "brand": {
          "ivory": "#F8F0E4",
          "sand": "#EAD8C6",
          "terracotta": "#A55B3F",
          "olive": "#6B705C",
          "sage": "#9A9F85",
          "chocolate": "#3D281E",
          "gold": "#C9A96A"
        }
      },
      "fontFamily": {
        "display": [
          "Playfair Display",
          "Georgia",
          "serif"
        ],
        "sans": [
          "Montserrat",
          "Helvetica Neue",
          "Arial",
          "sans-serif"
        ]
      },
      "fontSize": {
        "caption": "0.75rem",
        "label": "0.6875rem",
        "body-s": "0.875rem",
        "body": "1rem",
        "body-l": "1.125rem",
        "h6": "1.25rem",
        "h5": "1.562rem",
        "h4": "1.938rem",
        "h3": "2.438rem",
        "h2": "3.25rem",
        "h1": "4.312rem",
        "display": "5.75rem"
      },
      "spacing": {
        "0": "0rem",
        "1": "0.25rem",
        "2": "0.5rem",
        "3": "0.75rem",
        "4": "1rem",
        "5": "1.5rem",
        "6": "2rem",
        "7": "3rem",
        "8": "4rem",
        "9": "6rem",
        "10": "8rem",
        "11": "12rem"
      },
      "boxShadow": {
        "flat": "none",
        "rest": "0 1px 2px rgba(61,40,30,.06), 0 1px 1px rgba(61,40,30,.04)",
        "lift": "0 6px 18px -6px rgba(61,40,30,.18), 0 2px 4px rgba(61,40,30,.06)",
        "float": "0 24px 48px -16px rgba(61,40,30,.28), 0 4px 10px rgba(61,40,30,.08)"
      },
      "transitionTimingFunction": {
        "settle": "cubic-bezier(.22,.8,.24,1)",
        "breathe": "cubic-bezier(.45,0,.55,1)",
        "exit": "cubic-bezier(.4,0,1,1)"
      },
      "transitionDuration": {
        "instant": "80ms",
        "quick": "160ms",
        "gentle": "280ms",
        "settle": "480ms",
        "slow": "800ms"
      }
    }
  }
};
