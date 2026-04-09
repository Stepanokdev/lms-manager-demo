"""
Dark accent color generation.
Ported from mvp-design-tokens/src/color-utils.js + tokenPipeline.js
"""
import math


def clamp(value: float, lo: float, hi: float) -> float:
    return min(max(value, lo), hi)


def normalize_hex(raw: str, fallback: str = "#3c68ff") -> str:
    if not isinstance(raw, str):
        return fallback
    h = raw.strip()
    if not h.startswith("#"):
        h = f"#{h}"
    if len(h) == 4:
        h = f"#{h[1]*2}{h[2]*2}{h[3]*2}"
    import re
    if re.match(r"^#[0-9a-fA-F]{6}$", h):
        return h.lower()
    return fallback


def hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    h = normalize_hex(hex_color)
    n = int(h[1:], 16)
    return (n >> 16) & 255, (n >> 8) & 255, n & 255


def rgb_to_hex(r: float, g: float, b: float) -> str:
    c = [max(0, min(255, round(v))) for v in (r, g, b)]
    return "#" + "".join(f"{v:02x}" for v in c)


def _srgb_to_linear(u: int) -> float:
    v = u / 255.0
    return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4


def _linear_to_srgb(u: float) -> float:
    v = clamp(u, 0, 1)
    return v * 12.92 if v <= 0.0031308 else 1.055 * (v ** (1 / 2.4)) - 0.055


def hex_to_hsl(hex_color: str) -> tuple[float, float, float]:
    r, g, b = hex_to_rgb(hex_color)
    rn, gn, bn = r / 255.0, g / 255.0, b / 255.0
    mx, mn = max(rn, gn, bn), min(rn, gn, bn)
    h = 0.0
    s = 0.0
    l = (mx + mn) / 2.0
    d = mx - mn
    if d != 0:
        s = d / (1 - abs(2 * l - 1))
        if mx == rn:
            h = ((gn - bn) / d + (6 if gn < bn else 0)) * 60
        elif mx == gn:
            h = ((bn - rn) / d + 2) * 60
        else:
            h = ((rn - gn) / d + 4) * 60
    return h, s, l


def hsl_to_hex(h: float, s: float, l: float) -> str:
    hue = ((h % 360) + 360) % 360
    sat = clamp(s, 0, 1)
    light = clamp(l, 0, 1)
    c = (1 - abs(2 * light - 1)) * sat
    x = c * (1 - abs((hue / 60) % 2 - 1))
    m = light - c / 2
    if hue < 60:
        r, g, b = c, x, 0
    elif hue < 120:
        r, g, b = x, c, 0
    elif hue < 180:
        r, g, b = 0, c, x
    elif hue < 240:
        r, g, b = 0, x, c
    elif hue < 300:
        r, g, b = x, 0, c
    else:
        r, g, b = c, 0, x
    return rgb_to_hex((r + m) * 255, (g + m) * 255, (b + m) * 255)


def relative_luminance(hex_color: str) -> float:
    r, g, b = hex_to_rgb(hex_color)
    return 0.2126 * _srgb_to_linear(r) + 0.7152 * _srgb_to_linear(g) + 0.0722 * _srgb_to_linear(b)


def _find_lightness_for_luminance(h: float, s: float, target_lum: float) -> float:
    low, high = 0.0, 1.0
    for _ in range(24):
        mid = (low + high) / 2
        candidate = hsl_to_hex(h, s, mid)
        lum = relative_luminance(candidate)
        if lum < target_lum:
            low = mid
        else:
            high = mid
    return (low + high) / 2


def adapt_accent_for_dark(base_hex: str, background: str = "#1d1d1d") -> str:
    """Generate a WCAG-compliant accent color for dark mode from a light accent."""
    base = normalize_hex(base_hex)
    bg = normalize_hex(background)

    target_contrast = 4.5
    max_brightness_cap = 0.85
    min_saturation = 0.4
    max_saturation = 0.8
    desaturate_dark_factor = 0.6

    l_bg = relative_luminance(bg)
    l_fg = relative_luminance(base)
    required_lum = clamp(target_contrast * (l_bg + 0.05) - 0.05, 0, 1)
    contrast = (max(l_fg, l_bg) + 0.05) / (min(l_fg, l_bg) + 0.05)

    h, s, _ = hex_to_hsl(base)
    is_grayscale = s <= 0.02

    within_range = (
        contrast >= target_contrast
        and l_fg >= required_lum
        and l_fg <= max_brightness_cap
        and (is_grayscale or (s <= max_saturation and (s >= min_saturation or s <= 0.05)))
    )

    if within_range:
        return base

    target_lum = clamp(l_fg, required_lum, max_brightness_cap)
    sat = s
    if not is_grayscale:
        sat = min(sat, max_saturation)
        if target_lum < 0.4:
            sat *= desaturate_dark_factor
        if sat < min_saturation:
            sat = min_saturation

    return hsl_to_hex(h, sat, _find_lightness_for_luminance(h, sat, target_lum))
