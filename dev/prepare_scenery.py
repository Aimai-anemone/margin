"""Run with Pillow: python dev/prepare_scenery.py (never edits PNG originals)."""
from pathlib import Path
import hashlib
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
# Individually reviewed y positions, in original PNG pixels. 2148:384 == 1074:192.
# The first two crops exclude the white margins embedded in their originals.
CROPS = {
    '01-rain-window': (150, 'rain, lamp and lit windows; no white margins'),
    '02-bookshelf': (155, 'books and lamp; no white margins'),
    '03-cafe': (180, 'hanging lamp, cup and window'),
    '04-university-courtyard': (230, 'campus windows and courtyard lights'),
    '05-station-platform': (190, 'platform lamps and bench'),
    '06-way-home': (250, 'house lights and road'),
    '07-window-plants': (245, 'leaves and plant pots'),
    '08-morning-desk': (300, 'open book and morning window'),
    '09-library-seats': (260, 'desk lamps and seats'),
    '10-closed-bookshop': (210, 'bookshop window and door'),
    '11-record-shop': (180, 'lamp and record sleeves'),
    '12-bakery-window': (160, 'lamps and bread display'),
    '13-steaming-tea': (300, 'teapot, cup and steam'),
    '14-night-reading': (190, 'approved lamp glow and book composition'),
    '15-overcast-bus-stop': (250, 'bench including legs, shelter and distant street'),
    '16-railway-crossing': (250, 'crossing light and rails'),
    '17-riverside-path': (150, 'streetlamp, river and benches'),
    '18-city-from-bridge': (250, 'city lights and bridge railing'),
    '19-hillside-neighborhood': (270, 'hillside and lit houses'),
    '20-alley-after-rain': (200, 'door lights and wet alley'),
    '21-shopping-arcade': (180, 'hanging lights and shop windows'),
    '22-vending-machine': (230, 'complete illuminated vending machine and street'),
    '23-apartment-windows': (240, 'lit apartment windows'),
    '24-harbor-waiting-room': (300, 'waiting benches including legs, harbor and lighthouse'),
    '25-seaside-bench': (250, 'bench, sea and mountains'),
    '26-park-shade': (220, 'bench, shade and light'),
    '27-autumn-avenue': (200, 'autumn leaves, streetlamp and bench'),
    '28-snowy-houses': (250, 'snowy roofs and warm windows'),
    '29-spring-blossoms': (200, 'blossoms, wall and wooden gate'),
    '30-balcony-morning': (290, 'plant pots, railing and sunrise'),
}

def main():
    sources = sorted((ROOT / 'scenery-originals').glob('*.png'))
    if not sources:
        raise SystemExit('PNG originals are not in Git. Place the 30 originals in scenery-originals/ before running this optional tool.')
    assert {p.stem for p in sources} == set(CROPS), 'Expected exactly the 30 reviewed originals'
    originals = {p: hashlib.sha256(p.read_bytes()).digest() for p in sources}
    output = ROOT / 'public' / 'scenery'
    assert {p.stem for p in output.glob('*.webp')} == set(CROPS), 'Preserve existing image IDs'
    total = 0
    for source in sources:
        top, _ = CROPS[source.stem]
        with Image.open(source) as image:
            left = (image.width - 2148) // 2
            assert left >= 0 and top >= 0 and top + 384 <= image.height
            strip = image.convert('RGB').crop((left, top, left + 2148, top + 384))
            strip = strip.resize((1074, 192), Image.Resampling.LANCZOS)
            target = output / f'{source.stem}.webp'
            strip.save(target, 'WEBP', quality=82, method=6)
            total += target.stat().st_size
    assert all(hashlib.sha256(p.read_bytes()).digest() == digest for p, digest in originals.items())
    print(f'{len(sources)} strips, {total} bytes ({total / 1024:.1f} KiB); all original hashes unchanged')

if __name__ == '__main__':
    main()
